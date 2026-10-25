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
  title: `${strings.reports.codeWiseReport} | আইআরডি বাজেট ব্যবস্থাপনা`,
}

/**
 * Level roll-up (কোডভিত্তিক সারসংক্ষেপ): one office level's offices summed together,
 * code by code, plus the total of their totals. A level belongs to an office type,
 * so the scope is the pair.
 */
export default async function SummaryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>
}) {
  const session = await getAdminSession()
  if (!session) {
    redirect('/admin/login')
  }

  const [params, cycle, levels] = await Promise.all([
    searchParams,
    getActiveCycle(),
    prisma.coreOfficeLevel.findMany({
      include: {
        officeType: { select: { name: true } },
        ministry: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: [{ officeTypeId: 'asc' }, { levelOrder: 'asc' }],
    }),
  ])

  // A level's owner names it: an office type for the field hierarchy, otherwise the
  // ministry or department that owns it. Without this every ministry/department level
  // reads as a generic "অফিস — দপ্তর" and cannot be told apart in the dropdown.
  const options: ScopeOption[] = levels.map((l) => ({
    value: String(l.id),
    label: `${l.officeType?.name || l.ministry?.name || l.department?.name || 'অফিস'} — ${l.levelName}`,
  }))

  const selectedId = params.level || options[0]?.value || ''
  const selectedLevel = levels.find((l) => String(l.id) === selectedId) || null

  let report = null
  if (cycle && selectedLevel) {
    const offices = await prisma.coreOffice.findMany({
      where: {
        officeTypeId: selectedLevel.officeTypeId,
        officeLevelId: selectedLevel.id,
        isActive: true,
      },
      select: { id: true },
    })
    report = await rollupOffices(offices.map((o) => Number(o.id)), cycle.id)
  }

  // The two downloadable files are named after the level on screen, so several levels
  // can be exported without the downloads overwriting one another.
  const scopeName = options.find((o) => o.value === selectedId)?.label ?? ''
  const fileStem = [strings.reports.codeWiseFile, scopeName, cycle?.fiscal_year]
    .filter(Boolean)
    .join('-')
  const codeSpec = report
    ? buildCodeWiseSpec({
        title: strings.reports.codeWiseReport,
        scopeName,
        fileName: fileStem,
        codes: report.codes,
        grandTotal: report.grand_total,
      })
    : null
  const officeSpec = report
    ? buildOfficeTotalsSpec({
        title: strings.reports.codeWiseReport,
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
          {strings.reports.codeWiseReport}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          নির্বাচিত স্তরের অন্তর্ভুক্ত সকল অফিসের কোডভিত্তিক মোট এবং সর্বমোট বাজেট
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-end gap-4">
          <ReportScopeSelect
            paramKey="level"
            label="অফিসের স্তর"
            value={selectedId}
            options={options}
            placeholder="অফিসের স্তর নির্বাচন করুন"
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
            কোনো অফিস স্তর নির্ধারিত নেই।
          </CardContent>
        </Card>
      ) : report && codeSpec && officeSpec ? (
        <RollupView report={report} codeSpec={codeSpec} officeSpec={officeSpec} />
      ) : null}
    </div>
  )
}
