import { redirect } from 'next/navigation'
import Link from 'next/link'
import { strings } from '@/lib/strings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, BarChart3, CheckCircle2, Clock, Info, Lock, RotateCcw } from 'lucide-react'
import { toBanglaAmount, toBanglaDate, toBanglaNumber } from '@/lib/bangla'
import { getOfficeSession } from '@/lib/session'
import { getOfficeDashboard } from '@/lib/office/dashboard'
import { FORM_COUNT, FORM_ITEMS, FORM_SHADES } from '@/lib/office/forms'
import { UnlockBudgetCard } from './_components/unlock-budget-card'

export default async function DashboardPage() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const officeId = session.office_id ?? parseInt(session.id, 10)
  const data =
    officeId && !Number.isNaN(officeId)
      ? await getOfficeDashboard(officeId)
      : { header: null, cycle: null, submission: null, completedForms: [], totalBudgetAmount: 0 }

  const { header, cycle, submission, completedForms, totalBudgetAmount } = data

  // Hero: office name in large bold, with the department (head quarter) or the
  // head quarter name (field office) beneath it.
  const headerBlock = (
    <div className="text-center space-y-1.5">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
        {header?.officeName ?? session.name}
      </h1>
      {header?.subtitle ? (
        <p className="text-sm sm:text-base font-semibold text-slate-500">{header.subtitle}</p>
      ) : null}
    </div>
  )

  // ── No open cycle: message board, forms visible but locked ────────────────
  if (!cycle) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
        {headerBlock}

        {/* Message board */}
        <Card className="border-0 shadow-lg shadow-slate-200/60 overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 flex items-center justify-center">
                <Info className="h-7 w-7 text-blue-600" />
              </div>
              <div className="space-y-2 max-w-xl">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {strings.dashboard.noCycleTitle}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {strings.dashboard.noCycleMessage}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-bold">{strings.dashboard.formsLocked}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms — all visible, none actionable until a cycle opens */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-lg font-bold text-slate-900">
              {strings.dashboard.budgetForms} ({toBanglaNumber(FORM_COUNT)} টি)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FORM_ITEMS.map((form, idx) => (
                <div
                  key={form.key}
                  className="flex flex-col justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/60 opacity-70 cursor-not-allowed"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-extrabold font-mono shrink-0 grayscale"
                      style={FORM_SHADES[idx]}
                    >
                      {toBanglaNumber(form.num)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-600 line-clamp-1">{form.title}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{form.short}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200">
                    <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 text-slate-400 border-slate-300">
                      {strings.dashboard.formNotStarted}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                      <Lock className="h-3.5 w-3.5" />
                      <span>{strings.dashboard.fillNow}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Open cycle ────────────────────────────────────────────────────────────
  const isSubmitted = submission?.status === 'submitted'
  // A draft carrying a previous submission time is a revision the office unlocked.
  const isRevision = submission?.isRevision ?? false
  const completedCount = completedForms.length
  const progressPct = Math.round((completedCount / FORM_COUNT) * 100)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {headerBlock}

      {/* সেকশন ১: the cycle, answered by fiscal year / type / submission state */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Title box — prominent */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border border-blue-700 shadow-lg shadow-blue-600/20 flex flex-col justify-center min-h-[6.5rem] lg:scale-[1.04]">
          <span className="text-[18px] font-bold uppercase tracking-wider text-blue-100">
            {strings.dashboard.openCycleLabel}
          </span>
        </div>

        {/* অর্থবছর */}
        <div className="rounded-2xl p-5 bg-violet-50 border border-violet-200 flex flex-col justify-center min-h-[6.5rem]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-violet-500">
            {strings.dashboard.fiscalYearLabel}
          </span>
          <span className="mt-1.5 text-xl font-black text-violet-900 font-mono tracking-tight">
            {toBanglaNumber(cycle.fiscal_year)}
          </span>
        </div>

        {/* বাজেটের ধরন */}
        <div className="rounded-2xl p-5 bg-teal-50 border border-teal-200 flex flex-col justify-center min-h-[6.5rem]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
            {strings.dashboard.budgetTypeLabel}
          </span>
          <span className="mt-1.5 text-xl font-black text-teal-900 leading-tight">
            {cycle.budget_type}
          </span>
        </div>

        {/* দাখিলের অবস্থা */}
        <div
          className={`rounded-2xl p-5 border flex flex-col justify-center min-h-[6.5rem] ${isSubmitted ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}
        >
          <span
            className={`text-[11px] font-bold uppercase tracking-wider ${isSubmitted ? 'text-emerald-600' : 'text-amber-600'
              }`}
          >
            {strings.dashboard.submissionStateLabel}
          </span>
          <span
            className={`mt-1.5 flex items-center gap-1.5 text-sm font-black ${isSubmitted ? 'text-emerald-900' : 'text-amber-900'
              }`}
          >
            {isSubmitted ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : isRevision ? (
              <RotateCcw className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            {isSubmitted
              ? strings.dashboard.submittedOn
              : isRevision
                ? strings.dashboard.revisionNotSubmitted
                : strings.dashboard.notSubmitted}
          </span>
          {isSubmitted && submission?.submittedAt ? (
            <span className="mt-0.5 text-[11px] font-medium text-emerald-700">
              {toBanglaDate(submission.submittedAt)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Unlock: only while the budget is submitted and the cycle is still open */}
      {isSubmitted && submission ? (
        <UnlockBudgetCard submissionId={submission.id} />
      ) : null}

      {/* 3 summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: মোট বাজেটের পরিমাণ */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {strings.dashboard.totalBudget}
            </span>
            <div className="mt-3 text-2xl lg:text-3xl font-black text-blue-700 font-mono tracking-tight">
              ৳ {toBanglaAmount(totalBudgetAmount)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            {strings.dashboard.totalBudgetNote}
          </p>
        </div>

        {/* Card 2: পূরণকৃত ফর্ম */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {strings.dashboard.filledForms}
            </span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-black text-slate-800 font-mono">
                {toBanglaNumber(completedCount)}
              </span>
              <span className="text-slate-400 font-bold text-sm">
                / {toBanglaNumber(FORM_COUNT)} টি
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
              {completedCount === FORM_COUNT
                ? strings.dashboard.allFormsDone
                : `${toBanglaNumber(FORM_COUNT - completedCount)} ${strings.dashboard.formsRemaining}`}
            </p>
          </div>
        </div>

        {/* Card 3: চূড়ান্ত বাজেট — the whole card opens the budget sheet. Green
            while nothing is submitted, red-accented once it has been. */}
        <Link
          href="/office/budget-sheet"
          className={`group p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-all ${
            isSubmitted
              ? 'bg-red-50/70 border-red-200 hover:border-red-400'
              : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400'
          }`}
        >
          <span
            className={`text-xs font-bold uppercase tracking-wider block ${
              isSubmitted ? 'text-red-900' : 'text-emerald-900'
            }`}
          >
            {strings.dashboard.finalBudget}
          </span>

          <div className="flex-1 flex items-center justify-center text-center py-3">
            <span
              className={`text-xl font-black leading-snug ${
                isSubmitted ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {isSubmitted ? strings.dashboard.submittedBudgetView : strings.dashboard.finalBudgetReview}
            </span>
          </div>

          <div
            className={`flex items-center justify-end gap-1 text-xs font-bold ${
              isSubmitted ? 'text-red-700' : 'text-emerald-700'
            } group-hover:translate-x-0.5 transition-transform`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </div>

      {/* সেকশন ২: ফর্মের অগ্রগতি */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-lg font-bold text-slate-900">
            {strings.dashboard.formProgress}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FORM_ITEMS.map((form, idx) => {
              const isCompleted = completedForms.includes(form.key)
              return (
                <Link
                  key={form.key}
                  href={form.href}
                  className="flex flex-col justify-between p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md hover:bg-blue-50/30 transition-all group bg-white relative overflow-hidden"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-extrabold transition-colors font-mono shrink-0 ${isCompleted ? '' : 'group-hover:scale-105'
                        }`}
                      style={FORM_SHADES[idx]}
                    >
                      {toBanglaNumber(form.num)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1">
                        {form.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{form.short}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                    <Badge
                      variant={isCompleted ? 'default' : 'outline'}
                      className={`text-[11px] font-bold px-2 py-0.5 ${isCompleted
                        ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                        : 'text-slate-500 border-slate-300'
                        }`}
                    >
                      {isCompleted ? strings.dashboard.formComplete : strings.dashboard.formNotStarted}
                    </Badge>
                    <span className="flex items-center text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                      <span>{strings.dashboard.fillNow}</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
