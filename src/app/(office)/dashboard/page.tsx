import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { strings } from '@/lib/strings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { BarChart3, ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'

// 12 forms organized serially
const FORM_LIST = [
  { key: 'form1' as const, num: 1, href: '/office/form-1' },
  { key: 'form2' as const, num: 2, href: '/office/form-2' },
  { key: 'form3' as const, num: 3, href: '/office/form-3' },
  { key: 'form4' as const, num: 4, href: '/office/form-4' },
  { key: 'form5' as const, num: 5, href: '/office/form-5' },
  { key: 'form6' as const, num: 6, href: '/office/form-6' },
  { key: 'form7' as const, num: 7, href: '/office/form-7' },
  { key: 'form8' as const, num: 8, href: '/office/form-8' },
  { key: 'form9' as const, num: 9, href: '/office/form-9' },
  { key: 'form10' as const, num: 10, href: '/office/form-10' },
  { key: 'form11' as const, num: 11, href: '/office/form-11' },
  { key: 'form12' as const, num: 12, href: '/office/form-12' },
] as const

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const sessionStr = cookieStore.get('office_session')?.value
  
  if (!sessionStr) {
    redirect('/')
  }

  let office: any
  try {
    office = JSON.parse(sessionStr)
  } catch {
    redirect('/')
  }

  const submissionId = office?.submission_id || null

  // Track completion and total budget
  const completedForms = new Set<string>()
  let submissionStatus = 'draft' as 'draft' | 'submitted'
  let totalBudgetAmount = 0
  let cycleInfo = {
    fiscal_year: '২০২৬-২৭',
    budget_type_name: 'প্রাক্কলিত বাজেট',
    status: 'open',
  }

  if (submissionId) {
    // Dashboard data loading via Prisma
  }

  const isSubmitted = submissionStatus === 'submitted'
  const completedCount = completedForms.size

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* 1. সেকশন ১: বাজেট দাখিলের অবস্থা (Status Title with 3 badges) */}
      <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/80 overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white/70 pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  বাজেট দাখিলের অবস্থা
                </CardTitle>

                {/* Badge 1: বাজেটের ধরণ */}
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-800 border-blue-300 font-bold px-3 py-1 rounded-xl text-xs shadow-2xs"
                >
                  {cycleInfo.budget_type_name}
                </Badge>

                {/* Badge 2: অর্থবছর */}
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-800 border-purple-300 font-bold px-3 py-1 rounded-xl text-xs shadow-2xs"
                >
                  {cycleInfo.fiscal_year} অর্থবছর
                </Badge>

                {/* Badge 3: খসড়া / দাখিলকৃত */}
                <Badge
                  variant="outline"
                  className={`px-3 py-1 text-xs font-bold gap-1.5 rounded-xl shadow-2xs ${
                    isSubmitted
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {isSubmitted ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>দাখিলকৃত</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <span>খসড়া</span>
                    </>
                  )}
                </Badge>
              </div>

              <p className="text-xs text-slate-500 mt-1.5">
                {strings.dashboard.welcome} • {office.name}
              </p>
            </div>
          </div>
        </CardHeader>

        {/* 3 Cards */}
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: মোট বাজেটের পরিমাণ */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  মোট বাজেটের পরিমাণ
                </span>
                <div className="mt-3 text-2xl lg:text-3xl font-black text-blue-700 font-mono tracking-tight">
                  ৳ {toBanglaAmount(totalBudgetAmount)}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                সকল ফরমের প্রাক্কলিত সর্বমোট বরাদ্দ
              </p>
            </div>

            {/* Card 2: পূরণকৃত ফর্ম */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  পূরণকৃত ফর্ম
                </span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-black text-slate-800 font-mono">
                    {toBanglaNumber(completedCount)}
                  </span>
                  <span className="text-slate-400 font-bold text-sm">
                    / {toBanglaNumber(FORM_LIST.length)} টি
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / FORM_LIST.length) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                  {completedCount === FORM_LIST.length
                    ? 'সকল ফরমের তথ্য সম্পন্ন হয়েছে'
                    : `${toBanglaNumber(FORM_LIST.length - completedCount)} টি ফরম পূরণ বাকি আছে`}
                </p>
              </div>
            </div>

            {/* Card 3: বাজেট ফর্ম */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white border border-blue-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
                  বাজেট ফর্ম
                </span>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  সকল ১২টি ফরমের সমন্বিত চূড়ান্ত হিসাব পর্যালোচনা ও দাখিল সম্পন্ন করুন।
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href="/office/budget-sheet"
                  className={buttonVariants({
                    variant: 'default',
                    size: 'sm',
                    className: 'w-full text-xs font-bold rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 shadow-xs'
                  })}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>চূড়ান্ত বাজেট দেখুন</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. সেকশন ২: ফর্মের অগ্রগতি (Form Progress - 3 forms in a row, with 12th card as Final Budget) */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                {strings.dashboard.formProgress}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                প্রতিটি ফরম নির্বাচন করে তথ্য এন্ট্রি বা পরিবর্তন করুন
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              প্রতি সারিতে ৩ টি ফরম
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* 3 Forms in a Row (grid-cols-1 md:grid-cols-2 lg:grid-cols-3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FORM_LIST.map((form) => {
              const isCompleted = completedForms.has(form.key)
              return (
                <Link
                  key={form.key}
                  href={form.href}
                  className="flex flex-col justify-between p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md hover:bg-blue-50/30 transition-all group bg-white relative overflow-hidden"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-extrabold transition-colors font-mono shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}
                    >
                      {toBanglaNumber(form.num)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1">
                        {strings.forms[form.key].title}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {strings.forms[form.key].short}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                    <Badge
                      variant={isCompleted ? 'default' : 'outline'}
                      className={`text-[11px] font-bold px-2 py-0.5 ${
                        isCompleted
                          ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                          : 'text-slate-500 border-slate-300'
                      }`}
                    >
                      {isCompleted ? strings.dashboard.formComplete : strings.dashboard.formNotStarted}
                    </Badge>
                    <span className="flex items-center text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                      <span>প্রবেশ করুন</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </span>
                  </div>
                </Link>
              )
            })}

            {/* 12th Card: বাজেট দেখুন (After Form 11 - with different background color) */}
            <Link
              href="/office/budget-sheet"
              className="flex flex-col justify-between p-4 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-100/40 hover:border-emerald-500 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-emerald-950 group-hover:text-emerald-800 transition-colors">
                    চূড়ান্ত বাজেট দেখুন
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5 font-medium truncate">
                    সার্বিক বাজেট শিট ও দাখিল
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-emerald-200/80">
                <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  চূড়ান্ত পর্যালোচনা
                </Badge>
                <span className="flex items-center text-xs font-bold text-emerald-800 group-hover:translate-x-0.5 transition-transform">
                  <span>বাজেট দেখুন</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


