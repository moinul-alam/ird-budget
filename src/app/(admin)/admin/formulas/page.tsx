import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { createOfficeClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { toBanglaNumber } from '@/lib/bangla'
import { Calculator } from 'lucide-react'

// Calculation descriptions for all economic codes
const CODE_FORMULAS: Record<string, string> = {
  '3111101': 'কর্মকর্তাদের (গ্রেড ১-১০) মাসিক মূল বেতন × ১২ মাস + নবনিয়োগপ্রাপ্ত কর্মকর্তাদের মূল বেতন × অর্থবছরের অবশিষ্ট মাস',
  '3111110': 'পিআরএল গমনকারী কর্মকর্তাদের ছুটি নগদায়ন মূল বেতন (সর্বোচ্চ ১৮ মাস)',
  '3111201': 'কর্মচারীদের (গ্রেড ১১-২০) মাসিক মূল বেতন × ১২ মাস + নবনিয়োগপ্রাপ্ত কর্মচারীদের মূল বেতন × অর্থবছরের অবশিষ্ট মাস',
  '3111209': 'পিআরএল গমনকারী কর্মচারীদের ছুটি নগদায়ন মূল বেতন (সর্বোচ্চ ১৮ মাস)',
  '3111301': 'দায়িত্বপ্রাপ্ত কর্মকর্তা/কর্মচারী সংখ্যা × মাসিক দায়িত্ব ভাতার হার × ১২ মাস',
  '3111302': 'প্রযোজ্য গ্রেডের (১৫-২০) জনবল × মাসিক যাতায়াত ভাতা রেট × ১২ মাস',
  '3111306': 'সন্তানের সংখ্যা × মাসিক শিক্ষা ভাতার হার × ১২ মাস',
  '3111310': 'গ্রেড স্ল্যাব অনুযায়ী নির্ধারিত হার (%) × মূল বেতন × ১২ মাস',
  '3111311': 'মোট কর্মকর্তা ও কর্মচারী সংখ্যা × মাসিক চিকিৎসা ভাতা (১৫০০/-) × ১২ মাস',
  '3111312': 'গ্রেড স্ল্যাব অনুযায়ী নির্ধারিত মাসিক মোবাইল ভাতা × ১২ মাস',
  '3111313': 'প্রাধিকারপ্রাপ্ত কর্মকর্তাদের মাসিক আবাসিক টেলিফোন বিল নগদায়ন × ১২ মাস',
  '3111314': 'টিফিন ভাতা প্রাপ্য কর্মচারীদের (গ্রেড ১১-২০) সংখ্যা × মাসিক হার × ১২ মাস',
  '3111316': 'ধোলাই ভাতা প্রাপ্য কর্মচারীদের (গ্রেড ১৬-২০) সংখ্যা × মাসিক হার × ১২ মাস',
  '3111325': 'সকল কর্মকর্তা ও কর্মচারীর মাসিক মূল বেতন × ২ (দুটি উৎসব বোনাস)',
  '3111327': 'চালকদের মাসিক অধিকাল ভাতা × ১২ মাস',
  '3111328': 'যোগ্য কর্মকর্তা/কর্মচারীদের ৩ বছর পূর্তিতে ১৫ দিনের মূল বেতনের সমপরিমাণ অর্থ',
  '3111331': 'প্রাধিকারপ্রাপ্ত কর্মকর্তাদের (গ্রেড ১-৫) মাসিক আপ্যায়ন ভাতা × ১২ মাস',
  '3111335': 'সকল কর্মকর্তা ও কর্মচারীর মূল বেতন × ২০% (এককালীন নববর্ষ ভাতা)',
  '3111344': 'সাময়িক বরখাস্তকৃত কর্মকর্তা/কর্মচারীদের মূল বেতনের ৫০% (খোরপোষ) × ১২ মাস',
  '3111352': 'গ্রেড স্ল্যাব অনুযায়ী বিশেষ সুবিধার শতকরা হার (%) × মূল বেতন × ১২ মাস',
  '3211107': 'ভাড়া করা গাড়ির সংখ্যা × মাসিক ভাড়া × ১২ মাস',
  '3211113': 'বাৎসরিক বিদ্যুৎ বিলের প্রাক্কলিত মোট খরচ',
  '3211115': 'বাৎসরিক পানি ও পয়ঃনিষ্কাশন বিলের খরচ',
  '3211117': 'বাৎসরিক ইন্টারনেট, ফ্যাক্স ও টেলেক্স বিল',
  '3211119': 'দাখিলকৃত রিটার্ন সংখ্যা × রেজিস্ট্রি ডাক খরচ রেট',
  '3211129': '(মাসিক অফিস ভবন ভাড়া × ১২ মাস × (১ + ভ্যাট ১৫%)) + বকেয়া ভাড়া',
  '3243301': '(গাড়ির সংখ্যা × মাসিক পেট্রোল/অকটেন লিটার × দর × ১২ মাস) + বার্ষিক লুব্রিকেন্ট',
  '3243302': '(গাড়ির সংখ্যা × মাসিক ডিজেল/সিএনজি বরাদ্দ × দর × ১২ মাস) + বার্ষিক লুব্রিকেন্ট',
  '3255101': 'সচল প্রিন্টারের সংখ্যা × বাৎসরিক টোনার ব্যয় + কম্পিউটার সামগ্রী',
  '3258101': 'গাড়ির সংখ্যা × বাৎসরিক মেরামত বরাদ্দ + বিশেষ মেরামত ব্যয়',
  '4112202': 'চাহিদাকৃত কম্পিউটার ও আনুষঙ্গিক সংখ্যা × প্রমিত সরকারি ক্রয়মূল্য',
}

export default async function SuperadminFormulasPage() {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    redirect('/admin/dashboard')
  }

  const supabase = createOfficeClient()
  const { data: codes } = await supabase
    .from('expense_codes')
    .select('id, code, name, is_manual, formula_key, sort_order')
    .order('sort_order', { ascending: true })

  const list = codes || []

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
          <Calculator className="h-7 w-7 text-emerald-600" />
          ইকোনমিক কোড ক্যালকুলেশন সূত্রাবলী
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          সুপার অ্যাডমিন রেফারেন্স: বাজেট নির্ধারণের প্রতিটি ইকোনমিক কোডের হিসাব ও ফর্মুলার বিবরণী (রিড-অনলি)
        </p>
      </div>

      <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700">
              <tr>
                <th className="py-3.5 px-4 w-20 text-center">ক্র. নং</th>
                <th className="py-3.5 px-4 w-36 font-mono">ইকোনমিক কোড</th>
                <th className="py-3.5 px-5 w-72">কোডের নাম</th>
                <th className="py-3.5 px-6">ফরমুলার বিবরণ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((c: any, idx: number) => {
                const desc = CODE_FORMULAS[c.code] || (c.is_manual ? 'ম্যানুয়াল এন্ট্রি: সংশ্লিষ্ট অফিস নিজস্ব প্রাক্কলন অনুযায়ী সরাসরি বাজেট শিটে ইনপুট দেয়।' : 'সংশ্লিষ্ট ফরমের ইনপুট ও কনফিগারেশন রেট অনুযায়ী স্বয়ংক্রিয়ভাবে গণনাকৃত।')
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-xs font-medium text-slate-500">
                      {toBanglaNumber(idx + 1)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                      <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-800">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-600 leading-relaxed">
                      {desc}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
