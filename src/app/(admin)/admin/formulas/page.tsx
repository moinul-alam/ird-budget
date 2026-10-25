import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { Card } from '@/components/ui/card'
import { toBanglaNumber } from '@/lib/bangla'
import { Calculator } from 'lucide-react'

export default async function SuperadminFormulasPage() {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    redirect('/admin/dashboard')
  }

  // How each code is calculated is data, not prose: the code names the engine
  // formula it dispatches to (ref_formula_types) and the forms that feed it. Both
  // are admin rows, so this page can never drift from what the engine actually does.
  const codes = await prisma.refEconomicCode.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      isManual: true,
      sourceForms: true,
      formula: { select: { labelBn: true } },
      sortOrder: true,
    },
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
                <th className="py-3.5 px-5 w-64">গণনা ফর্মুলা</th>
                <th className="py-3.5 px-6">বিবরণ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((c, idx) => {
                const forms = (c.sourceForms || [])
                  .map(Number)
                  .filter((n) => n > 0)
                  .sort((a, b) => a - b)

                const formulaLabel = c.formula?.labelBn ?? null

                const desc = c.isManual
                  ? 'ম্যানুয়াল এন্ট্রি: সংশ্লিষ্ট অফিস নিজস্ব প্রাক্কলন অনুযায়ী সরাসরি বাজেট শিটে ইনপুট দেয়।'
                  : formulaLabel
                    ? `"${formulaLabel}" ফর্মুলা অনুযায়ী স্বয়ংক্রিয়ভাবে গণনাকৃত।`
                    : 'সংশ্লিষ্ট ফরমের ইনপুট ও অ্যাডমিন-নির্ধারিত হার অনুযায়ী স্বয়ংক্রিয়ভাবে গণনাকৃত।'

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
                    <td className="py-3.5 px-5 text-xs">
                      {c.isManual ? (
                        <span className="inline-block px-2 py-0.5 rounded border border-slate-200 bg-slate-50 font-semibold text-slate-500">
                          ম্যানুয়াল এন্ট্রি
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700">
                            {formulaLabel || 'ফর্মুলা নির্ধারিত হয়নি'}
                          </span>
                          {forms.length > 0 && (
                            <div className="text-[11px] text-slate-500">
                              সোর্স ফরম: {forms.map((f) => toBanglaNumber(f)).join(', ')}
                            </div>
                          )}
                        </div>
                      )}
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
