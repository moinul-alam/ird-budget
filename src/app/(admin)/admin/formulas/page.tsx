import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
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
  '3111306': 'মোট জনবল × ২ (সন্তানের সর্বোচ্চ সংখ্যা) × ডিফল্ট ভাতার হার × ১২ মাস',
  '3111310': 'গ্রেড স্ল্যাব অনুযায়ী নির্ধারিত হার (%) × মূল বেতন × ১২ মাস',
  '3111311': 'মোট কর্মকর্তা ও কর্মচারী সংখ্যা × মাসিক চিকিৎসা ভাতা (১৫০০/-) × ১২ মাস',
  '3111312': 'গ্রেড স্ল্যাব অনুযায়ী নির্ধারিত মাসিক মোবাইল ভাতা × ১২ মাস',
  '3111313': 'প্রাধিকারপ্রাপ্ত কর্মকর্তাদের মাসিক আবাসিক টেলিফোন বিল নগদায়ন × ১২ মাস',
  '3111314': 'টিফিন ভাতা প্রাপ্য কর্মচারীদের (গ্রেড ১১-২০) সংখ্যা × মাসিক হার × ১২ মাস',
  '3111316': 'ধোলাই ভাতা প্রাপ্য কর্মচারীদের (গ্রেড ১৬-২০) সংখ্যা × মাসিক হার × ১২ মাস',
  '3111325': 'সকল কর্মকর্তা ও কর্মচারীর মাসিক মূল বেতন × ২ (দুটি উৎসব বোনাস)',
  '3111327': 'চালকদের মাসিক অধিকাল ভাতা × ১২ মাস',
  '3111328': 'ম্যানুয়াল এন্ট্রি: ফরম থেকে সরাসরি ইনপুট অনুযায়ী',
  '3111331': 'প্রাধিকারপ্রাপ্ত কর্মকর্তাদের মাসিক আপ্যায়ন ভাতা × ১২ মাস',
  '3111335': 'সকল কর্মকর্তা ও কর্মচারীর মূল বেতন × ২০% (এককালীন নববর্ষ ভাতা)',
  '3111344': 'সাময়িক বরখাস্তকৃত কর্মকর্তা/কর্মচারীদের মূল বেতনের ৫০% (খোরপোষ) × ১২ মাস',
  '3111352': 'গ্রেড স্ল্যাব অনুযায়ী বিশেষ সুবিধার শতকরা হার (%) × মূল বেতন × ১২ মাস',
  '3211107': 'ভাড়া করা গাড়ির সংখ্যা × মাসিক ভাড়া × ১২ মাস',
  '3211113': 'ম্যানুয়াল এন্ট্রি: সংশ্লিষ্ট অফিসের বিবরণী অনুযায়ী বাৎসরিক বিদ্যুৎ বিলের প্রাক্কলন',
  '3211115': 'ম্যানুয়াল এন্ট্রি: সংশ্লিষ্ট অফিসের বিবরণী অনুযায়ী বাৎসরিক পানি ও পয়ঃনিষ্কাশন বিলের প্রাক্কলন',
  '3211117': 'ম্যানুয়াল এন্ট্রি: সংশ্লিষ্ট অফিসের বিবরণী অনুযায়ী বাৎসরিক ইন্টারনেট, ফ্যাক্স ও টেলেক্স বিলের প্রাক্কলন',
  '3211119': 'শুধুমাত্র কর সার্কেলের জন্য কার্যকর: দাখিলকৃত রিটার্ন সংখ্যা × রেজিস্ট্রি ডাক খরচ রেট (অন্যান্য অফিসের জন্য ম্যানুয়াল এন্ট্রি উন্মুক্ত)',
  '3211129': '(মাসিক অফিস ভবন ভাড়া × ১২ মাস × (১ + ভ্যাট ১৫%)) + বকেয়া ভাড়া',
  '3243301': 'গ্যাস ব্যতীত যেকোনো জ্বালানি তেল (পেট্রোল, অকটেন, ডিজেল): (গাড়ির সংখ্যা × মাসিক জ্বালানি লিটার × দর × ১২ মাস) + বার্ষিক লুব্রিকেন্ট',
  '3243302': 'শুধুমাত্র গ্যাস (সিএনজি/গ্যাস, কোনো তেল নয়): (গাড়ির সংখ্যা × মাসিক গ্যাস বরাদ্দ × দর × ১২ মাস) + বার্ষিক লুব্রিকেন্ট',
  '3255101': 'প্রিন্টারের সংখ্যা × প্রতি টোনারের মূল্য × ১২ মাস',
  '3258101': 'গাড়ির সংখ্যা × বাৎসরিক মেরামত বরাদ্দ (মোটরযান রক্ষণাবেক্ষণ)',
  '3258140': 'গাড়ির সংখ্যা × বাৎসরিক মেরামত বরাদ্দ (মোটরযান রক্ষণাবেক্ষণ)',
  '4112202': 'চাহিদাকৃত কম্পিউটার ও আনুষঙ্গিক সংখ্যা × প্রমিত সরকারি ক্রয়মূল্য',
}

export default async function SuperadminFormulasPage() {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    redirect('/admin/dashboard')
  }

  const codes = await prisma.refEconomicCode.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      isManual: true,
      formulaKey: true,
      sortOrder: true
    }
  })

  // Sort them code wise
  const list = codes.sort((a, b) => {
    return (a.code || '').localeCompare(b.code || '')
  })

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
          <Calculator className="h-7 w-7 text-emerald-600" />
          কোড ক্যালকুলেশন ফরমুলা
        </h1>
      </div>

      <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700">
              <tr>
                <th className="py-3.5 px-4 w-20 text-center">ক্রম</th>
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
