import { Fragment } from 'react'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock } from 'lucide-react'
import { groupCodesByCategory } from '@/lib/budget/group-codes'
import { reportStatusLabel } from '@/lib/report/specs'
import { ReportDownloader } from '@/components/report-downloader'
import type { ReportSpec } from '@/lib/report/export'
import type { RollupReport } from '@/lib/budget/report'

/**
 * The code-wise + office-wise body shared by the level and group roll-ups: a
 * category-grouped code table (each code summed across the offices in scope) and
 * each office's own grand total below it. Its two download buttons are fed specs
 * built by the page, so each file mirrors the table above it.
 */
export function RollupView({
  report,
  codeSpec,
  officeSpec,
}: {
  report: RollupReport
  codeSpec: ReportSpec
  officeSpec: ReportSpec
}) {
  const groups = groupCodesByCategory(report.codes)
  const activeCodes = report.codes.filter((c) => c.amount !== 0).length

  let rowNumber = 0

  return (
    <div className="space-y-6">
      {/* Code-wise totals */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base font-bold text-slate-900">
            কোডভিত্তিক মোট ({toBanglaNumber(activeCodes)} টি খাত)
          </CardTitle>
          <ReportDownloader spec={codeSpec} />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">ক্রম</th>
                  <th className="py-3 px-4 w-32">কোড</th>
                  <th className="py-3 px-4">খরচের বিবরণ</th>
                  <th className="py-3 px-4 w-48 text-right">পরিমাণ (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      কোনো তথ্য পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  groups.map((group) => (
                    <Fragment key={`cat-${group.category_id}`}>
                      <tr className="bg-slate-50/60">
                        <td colSpan={3} className="py-2.5 px-4 font-bold text-slate-700">
                          {group.category_name || 'অন্যান্য'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-700 text-right">
                          {toBanglaAmount(group.subtotal)}
                        </td>
                      </tr>
                      {group.codes.map((code) => {
                        rowNumber += 1
                        return (
                          <tr key={code.code} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-slate-500">
                              {toBanglaNumber(rowNumber)}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">
                              {code.code}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">{code.name}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right">
                              {code.amount ? toBanglaAmount(code.amount) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50/70 border-t-2 border-blue-200">
                  <td colSpan={3} className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                    সর্বমোট
                  </td>
                  <td className="py-3.5 px-4 font-mono font-black text-blue-800 text-sm text-right">
                    {toBanglaAmount(report.grand_total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Per-office totals */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base font-bold text-slate-900">
            অফিসভিত্তিক মোট ({toBanglaNumber(report.offices.length)} টি অফিস)
          </CardTitle>
          <ReportDownloader spec={officeSpec} />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">ক্রম</th>
                  <th className="py-3 px-4 w-40">বাজেট আইডি</th>
                  <th className="py-3 px-4">অফিসের নাম</th>
                  <th className="py-3 px-4 w-32 text-center">দাখিল স্ট্যাটাস</th>
                  <th className="py-3 px-4 w-48 text-right">মোট বাজেট (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.offices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      কোনো অফিস পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  report.offices.map((office, idx) => (
                    <tr key={office.office_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {office.budget_id}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{office.name}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-bold gap-1 rounded-full px-2.5 py-0.5 ${
                            office.status === 'submitted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : office.status === 'draft'
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          {office.status === 'submitted' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : office.status === 'draft' ? (
                            <Clock className="h-3 w-3" />
                          ) : null}
                          <span>{reportStatusLabel(office.status)}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right">
                        {office.total ? toBanglaAmount(office.total) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50/70 border-t-2 border-blue-200">
                  <td colSpan={4} className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                    সর্বমোট
                  </td>
                  <td className="py-3.5 px-4 font-mono font-black text-blue-800 text-sm text-right">
                    {toBanglaAmount(report.grand_total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
