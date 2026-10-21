import { createOfficeClient } from '@/lib/supabase/server'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  TrendingUp,
  Landmark,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  PieChart as PieIcon,
  Layers,
  BarChart3
} from 'lucide-react'

export const metadata = {
  title: 'অ্যাডমিন ড্যাশবোর্ড | আইআরডি বাজেট ব্যবস্থাপনা',
}

export default async function AdminDashboardPage() {
  const supabase = createOfficeClient()

  // 1. Fetch active cycle (or latest cycle)
  const { data: cycles } = await supabase
    .from('cycles')
    .select('*')
    .order('id', { ascending: false })

  const activeCycle = cycles?.find((c: any) => c.status === 'open') || cycles?.[0] || null

  // 2. Fetch all offices with department and office_types
  const { data: offices } = await supabase
    .from('offices')
    .select(`
      id,
      name,
      budget_id,
      office_type_id,
      office_types (
        id,
        name,
        is_group_budget,
        department_id,
        departments (
          id,
          name
        )
      )
    `)
    .order('id')

  // 3. Fetch submissions for this cycle
  const cycleId = activeCycle?.id || 1
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id,
      office_id,
      cycle_id,
      status,
      submitted_at,
      budget_sheet (
        auto_value,
        manual_value
      )
    `)
    .eq('cycle_id', cycleId)

  // Submissions map
  const subMap = new Map<number, any>()
  let totalSubmittedBudget = 0
  let totalDraftBudget = 0

  if (submissions) {
    for (const sub of submissions) {
      let subTotal = 0
      if (sub.budget_sheet) {
        subTotal = sub.budget_sheet.reduce((sum: number, b: any) => {
          return sum + (Number(b.manual_value ?? b.auto_value) || 0)
        }, 0)
      }
      subMap.set(sub.office_id, {
        ...sub,
        total: subTotal,
      })

      if (sub.status === 'submitted') {
        totalSubmittedBudget += subTotal
      } else {
        totalDraftBudget += subTotal
      }
    }
  }

  const allOffices = offices || []
  const totalOfficesCount = allOffices.length

  // Categorize by Tax vs VAT (Customs & VAT)
  let taxTotal = 0
  let taxSubmitted = 0
  let vatTotal = 0
  let vatSubmitted = 0

  let groupBudgetOffices = 0
  let groupBudgetSubmitted = 0

  // Office list enhanced
  const officeStats = allOffices.map((off: any) => {
    const sub = subMap.get(off.id)
    const isSubmitted = sub?.status === 'submitted'
    const isDraft = sub?.status === 'draft'
    const status: 'submitted' | 'draft' | 'not_started' = isSubmitted
      ? 'submitted'
      : isDraft
      ? 'draft'
      : 'not_started'

    const depName = off.office_types?.departments?.name || ''
    const isTax = depName.includes('আয়কর') || off.office_types?.name?.toLowerCase().includes('tax')
    const isGroup = off.office_types?.is_group_budget || false

    if (isTax) {
      taxTotal++
      if (isSubmitted) taxSubmitted++
    } else {
      vatTotal++
      if (isSubmitted) vatSubmitted++
    }

    if (isGroup) {
      groupBudgetOffices++
      if (isSubmitted) groupBudgetSubmitted++
    }

    return {
      id: off.id,
      name: off.name,
      budget_id: off.budget_id,
      department: isTax ? 'আয়কর বিভাগ' : 'কাস্টম্‌স ও ভ্যাট',
      office_type: off.office_types?.name || 'অফিস',
      isGroup,
      status,
      submitted_at: sub?.submitted_at,
      totalBudget: sub?.total || 0,
    }
  })

  const submittedOfficesCount = officeStats.filter((o: any) => o.status === 'submitted').length
  const draftOfficesCount = officeStats.filter((o: any) => o.status === 'draft').length
  const notStartedOfficesCount = officeStats.filter((o: any) => o.status === 'not_started').length

  const submittedPercent = totalOfficesCount > 0 ? Math.round((submittedOfficesCount / totalOfficesCount) * 100) : 0
  const taxPercent = taxTotal > 0 ? Math.round((taxSubmitted / taxTotal) * 100) : 0
  const vatPercent = vatTotal > 0 ? Math.round((vatSubmitted / vatTotal) * 100) : 0

  // Format cycle title
  let cycleTitle = '২০২৬-২৭ অর্থবছর'
  let cycleTypeName = 'প্রাক্কলিত বাজেট'
  if (activeCycle) {
    let fy = activeCycle.fiscal_year || '২০২৬-২৭'
    if (fy.includes(':::name=')) {
      const parts = fy.split(':::name=')
      cycleTitle = `${toBanglaNumber(parts[0])} অর্থবছর`
      cycleTypeName = parts[1] || cycleTypeName
    } else {
      cycleTitle = `${toBanglaNumber(fy)} অর্থবছর`
      cycleTypeName = activeCycle.budget_type === 'revised' ? 'সংশোধিত বাজেট' : 'প্রাক্কলিত বাজেট'
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                কেন্দ্রীয় প্রশাসন ড্যাশবোর্ড
              </span>
              <Badge className="bg-emerald-600 text-white text-xs font-bold">
                {activeCycle?.status === 'open' ? 'বাজেট দাখিল উন্মুক্ত' : 'বাজেট দাখিল বন্ধ'}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {cycleTypeName} ({cycleTitle})
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              সারাদেশের সকল আয়কর অঞ্চল এবং কাস্টম্‌স ও ভ্যাট কমিশনারেটের দাখিলকৃত বাজেটের লাইভ মনিটরিং ও পরিসংখ্যান
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin/reports/individual"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>অফিসভিত্তিক প্রতিবেদন</span>
            </Link>
            <Link
              href="/admin/reports/combined"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2"
            >
              <Layers className="h-4 w-4" />
              <span>গ্রুপভিত্তিক প্রতিবেদন</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: দাখিলকৃত অফিস */}
        <Card className="border-slate-200 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                দাখিলকৃত অফিস
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono">
                {toBanglaNumber(submittedOfficesCount)}
              </span>
              <span className="text-slate-400 font-bold text-xs">
                / {toBanglaNumber(totalOfficesCount)} টি
              </span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${submittedPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              মোট {toBanglaNumber(submittedPercent)}% অফিস দাখিল সম্পন্ন করেছে
            </p>
          </CardContent>
        </Card>

        {/* Card 2: খসড়া ও অপ্রস্তুত অফিস */}
        <Card className="border-slate-200 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                অপেক্ষমাণ / খসড়া
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600 font-mono">
                {toBanglaNumber(draftOfficesCount)}
              </span>
              <span className="text-slate-400 font-bold text-xs">
                টি খসড়া, {toBanglaNumber(notStartedOfficesCount)} টি শুরু করেনি
              </span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${totalOfficesCount > 0 ? (draftOfficesCount / totalOfficesCount) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              বাজেট পূরণের কাজ চলমান রয়েছে
            </p>
          </CardContent>
        </Card>

        {/* Card 3: সর্বমোট দাখিলকৃত বাজেট */}
        <Card className="border-slate-200 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                সর্বমোট দাখিলকৃত বাজেট
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Coins className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-blue-700 font-mono truncate">
              ৳ {toBanglaAmount(totalSubmittedBudget)}
            </div>
            <p className="text-[11px] text-slate-400 mt-3 font-medium">
              খসড়া বাজেটসহ মোট: ৳ {toBanglaAmount(totalSubmittedBudget + totalDraftBudget)}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: গ্রুপ বাজেটের আওতাধীন */}
        <Card className="border-slate-200 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                গ্রুপ বাজেটের সার্কেল
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Landmark className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-700 font-mono">
                {toBanglaNumber(groupBudgetSubmitted)}
              </span>
              <span className="text-slate-400 font-bold text-xs">
                / {toBanglaNumber(groupBudgetOffices)} টি সার্কেল দাখিল
              </span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${groupBudgetOffices > 0 ? (groupBudgetSubmitted / groupBudgetOffices) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              উর্ধ্বতন রেঞ্জ/অঞ্চলের সমন্বিত বাজেটের জন্য
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphs / Two Department Comparison Section (Tax vs VAT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Department Breakdown */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50/80 to-white border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    আয়কর বিভাগ (Income Tax)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    কর অঞ্চল ও আপীল অঞ্চলের বাজেট অগ্রগতি
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border-blue-200">
                {toBanglaNumber(taxPercent)}% সম্পন্ন
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold">দাখিলকৃত আয়কর অফিস:</span>
              <span className="font-bold text-slate-900 font-mono">
                {toBanglaNumber(taxSubmitted)} / {toBanglaNumber(taxTotal)} টি
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${taxPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] text-slate-500 font-medium">মোট আয়কর অফিস</p>
                <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">{toBanglaNumber(taxTotal)}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[11px] text-emerald-700 font-medium">দাখিলকৃত</p>
                <p className="text-lg font-bold text-emerald-800 font-mono mt-0.5">{toBanglaNumber(taxSubmitted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customs & VAT Department Breakdown */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50/80 to-white border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    কাস্টম্‌স ও ভ্যাট বিভাগ (Customs & VAT)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    কাস্টম হাউস, ভ্যাট কমিশনারেটের বাজেট অগ্রগতি
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                {toBanglaNumber(vatPercent)}% সম্পন্ন
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-semibold">দাখিলকৃত কাস্টমস ও ভ্যাট অফিস:</span>
              <span className="font-bold text-slate-900 font-mono">
                {toBanglaNumber(vatSubmitted)} / {toBanglaNumber(vatTotal)} টি
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${vatPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] text-slate-500 font-medium">মোট কাস্টমস ও ভ্যাট অফিস</p>
                <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">{toBanglaNumber(vatTotal)}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[11px] text-emerald-700 font-medium">দাখিলকৃত</p>
                <p className="text-lg font-bold text-emerald-800 font-mono mt-0.5">{toBanglaNumber(vatSubmitted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions Live Table */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              অফিসসমূহের বাজেট দাখিলের বর্তমান অবস্থা
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              সকল অফিসের বাজেট আইডি, বিভাগ ও দাখিল স্ট্যাটাস
            </CardDescription>
          </div>
          <Link
            href="/admin/reports/individual"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>সকল অফিসের বিস্তারিত দেখুন</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16">ক্র.নং</th>
                  <th className="py-3.5 px-4">বাজেট আইডি</th>
                  <th className="py-3.5 px-4">অফিসের নাম</th>
                  <th className="py-3.5 px-4">বিভাগ</th>
                  <th className="py-3.5 px-4">বাজেটের পরিমাণ</th>
                  <th className="py-3.5 px-4 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officeStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      কোনো অফিস পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  officeStats.map((off: any, idx: number) => (
                    <tr key={off.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {off.budget_id}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {off.name}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                          off.department === 'আয়কর বিভাগ'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {off.department}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {off.totalBudget > 0 ? `৳ ${toBanglaAmount(off.totalBudget)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold gap-1 rounded-full px-2.5 py-0.5 ${
                            off.status === 'submitted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : off.status === 'draft'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          {off.status === 'submitted' ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>দাখিলকৃত</span>
                            </>
                          ) : off.status === 'draft' ? (
                            <>
                              <Clock className="h-3 w-3 text-amber-600" />
                              <span>খসড়া</span>
                            </>
                          ) : (
                            <span>শুরু হয়নি</span>
                          )}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
