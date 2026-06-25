'use client'

import { strings } from '@/lib/strings'
import { toBanglaAmount } from '@/lib/bangla'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Calculator, ArrowLeft, Send, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { recalculateBudget, saveManualValue, submitBudget } from '@/app/actions/budget'
import { useRouter } from 'next/navigation'

interface BudgetRow {
  id: number
  code_id: number
  auto_value: number
  manual_value: number | null
  expense_codes: {
    code: string
    title: string
    is_manual: boolean
    sort_order: number
  }
}

export function BudgetSheetClient({ initialRows, submissionId }: { initialRows: BudgetRow[], submissionId: number | null }) {
  const [rows, setRows] = useState<BudgetRow[]>(initialRows)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleRecalculate = () => {
    if (!submissionId) return
    startTransition(async () => {
      await recalculateBudget(submissionId)
      router.refresh()
    })
  }

  const handleManualChange = async (codeId: number, value: string) => {
    if (!submissionId) return
    const num = value === '' ? null : Number(value)
    if (num !== null && isNaN(num)) return

    // Optimistic UI update
    setRows(prev => prev.map(r => r.code_id === codeId ? { ...r, manual_value: num } : r))

    // Debounced or direct save (using direct for simplicity here, debounce recommended for prod)
    if (num !== null) {
      await saveManualValue(submissionId, codeId, num)
    }
  }

  const handleSubmit = () => {
    if (!submissionId) return
    startTransition(async () => {
      await submitBudget(submissionId)
      router.push('/dashboard')
    })
  }

  const totalAuto = rows.reduce((sum, r) => sum + (r.auto_value || 0), 0)
  const totalManual = rows.reduce((sum, r) => sum + (r.manual_value || r.auto_value || 0), 0)

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{strings.budgetSheet.title}</h1>
          <p className="text-slate-500 mt-1">{strings.budgetSheet.autoNote}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleRecalculate} disabled={isPending || !submissionId}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          {isPending ? strings.budgetSheet.recalculating : strings.budgetSheet.recalculateButton}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Table</CardTitle>
          <CardDescription>
            {submissionId ? 'Review your calculated budget and add manual entries.' : 'Submission context not loaded.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="p-3">{strings.budgetSheet.codeColumn}</th>
                  <th className="p-3">{strings.budgetSheet.nameColumn}</th>
                  <th className="p-3 text-right">{strings.budgetSheet.calculatedColumn}</th>
                  <th className="p-3 text-right">{strings.budgetSheet.finalColumn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No budget entries found. Please Recalculate or wait for data to load.
                    </td>
                  </tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium font-mono text-slate-600">{row.expense_codes?.code}</td>
                    <td className="p-3">{row.expense_codes?.title}</td>
                    <td className="p-3 text-right font-mono">
                      {row.expense_codes?.is_manual ? '—' : toBanglaAmount(row.auto_value)}
                    </td>
                    <td className="p-2 text-right">
                      {row.expense_codes?.is_manual ? (
                        <Input
                          type="number"
                          className="w-32 ml-auto text-right"
                          value={row.manual_value ?? ''}
                          onChange={(e) => handleManualChange(row.code_id, e.target.value)}
                          placeholder="0"
                        />
                      ) : (
                        <span className="font-mono px-3">{toBanglaAmount(row.manual_value ?? row.auto_value)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                <tr>
                  <td colSpan={2} className="p-3 text-right">{strings.budgetSheet.totalRow}</td>
                  <td className="p-3 text-right font-mono">{toBanglaAmount(totalAuto)}</td>
                  <td className="p-3 text-right font-mono">{toBanglaAmount(totalManual)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4">
        <Link href="/office/form-10" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {strings.previous}
        </Link>
        <Button 
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" 
          onClick={handleSubmit}
          disabled={isPending || !submissionId || rows.length === 0}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit Budget
        </Button>
      </div>
    </div>
  )
}
