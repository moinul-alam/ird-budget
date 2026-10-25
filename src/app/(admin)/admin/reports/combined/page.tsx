import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { strings } from '@/lib/strings'
import { Card, CardContent } from '@/components/ui/card'
import { getActiveCycle, rollupOffices } from '@/lib/budget/report'
import { buildCodeWiseSpec, buildOfficeTotalsSpec } from '@/lib/report/specs'
import { RollupView } from '../_components/rollup-view'
import { ReportScopeSelect, type ScopeOption } from '../_components/report-scope-select'

export const metadata = {
  title: `${strings.reports.groupReport} | আইআরডি বাজেট ব্যবস্থাপনা`,
}

/**
 * Group roll-up (সমন্বিত রিপোর্ট): the offices covered by one গ্রুপ বাজেট rule
 * (office type × level, set on /admin/offices-management/group-budget), summed code
 * by code, plus the total of their totals.
 */
export default async function CombinedReportPage({
  searchParams,
}: {
  searchParams: Promise<{ rule?: string }>
}) {
  const session = await getAdminSession()
  if (!session) {
    redirect('/admin/login')
  }

  const [params, cycle, rules] = await Promise.all([
    searchParams,
    getActiveCycle(),
    prisma.adminGroupBudgetRule.findMany({
      where: { isGroupBudget: true },
      include: {
        officeType: { select: { name: true } },
        officeLevel: { select: { levelName: true } },
      },
      orderBy: { id: 'asc' },
    }),
  ])

  const options: ScopeOption[] = rules.map((r) => ({
    value: String(r.id),
    label: `${r.officeType?.name || 'অফিস'} — ${r.officeLevel?.levelName || 'সকল স্তর'}`,
  }))

  const selectedId = params.rule || options[0]?.value || ''
  const selectedRule = rules.find((r) => String(r.id) === selectedId) || null

  let report = null
  if (cycle && selectedRule) {
    const offices = await prisma.coreOffice.findMany({
      where: {
        officeTypeId: selectedRule.officeTypeId,
        ...(selectedRule.officeLevelId ? { officeLevelId: selectedRule.officeLevelId } : {}),
        isActive: true,
      },
      select: { id: true },
    })
    report = await rollupOffices(offices.map((o) => Number(o.id)), cycle.id)
  }

  // Named after the group rule on screen, so several groups can be exported in a row.
  const scopeName = options.find((o) => o.value === selectedId)?.label ?? ''
  const codeSpec = report
    ? buildCodeWiseSpec({
        title: strings.reports.groupReport,
        scopeName,
        fileName: [strings.reports.codeWiseFile, scopeName, cycle?.fiscal_year]
          .filter(Boolean)
          .join('-'),
        codes: report.codes,
        grandTotal: report.grand_total,
      })
    : null
  const officeSpec = report
    ? buildOfficeTotalsSpec({
        title: strings.reports.groupReport,
        scopeName,
        fileName: [strings.reports.officeWiseFile, scopeName, cycle?.fiscal_year]
          .filter(Boolean)
          .join('-'),
        offices: report.offices,
        grandTotal: report.grand_total,
      })
    : null

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
            {cycle ? `${cycle.budget_type} • ${cycle.fiscal_year}` : 'কোনো চক্র নেই'}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {strings.reports.groupReport}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          গ্রুপ বাজেটে অন্তর্ভুক্ত অফিসগুলোর কোডভিত্তিক মোট এবং সর্বমোট বাজেট
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-end gap-4">
          <ReportScopeSelect
            paramKey="rule"
            label="গ্রুপ সেটিং"
            value={selectedId}
            options={options}
            placeholder="গ্রুপ সেটিং নির্বাচন করুন"
          />
          {report && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                অফিস সংখ্যা
              </span>
              <span className="text-xl font-black text-slate-800 font-mono">
                {report.offices.length}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {!cycle ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-12 text-center text-slate-400 text-sm">
            কোনো বাজেট চক্র পাওয়া যায়নি।
          </CardContent>
        </Card>
      ) : options.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-12 text-center text-slate-400 text-sm">
            কোনো গ্রুপ বাজেট সেটিং তৈরি করা হয়নি।
          </CardContent>
        </Card>
      ) : report && codeSpec && officeSpec ? (
        <RollupView report={report} codeSpec={codeSpec} officeSpec={officeSpec} />
      ) : null}
    </div>
  )
}
