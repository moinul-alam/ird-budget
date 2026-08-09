'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { saveFormAllowanceRow } from '@/app/actions/forms'
import { useState, useCallback, useMemo } from 'react'
import { calculateAllowance } from '@/lib/budget/calculate'

export interface Form3ClientProps {
  submissionId: number | null
  allowanceTypes: any[]
  initialData: any[]
}

export function Form3Client({ submissionId, allowanceTypes, initialData }: Form3ClientProps) {
  const [formData, setFormData] = useState<Record<number, any>>(
    initialData.reduce((acc, row) => ({ ...acc, [row.allowance_type_id]: row }), {})
  )

  const handleChange = useCallback((typeId: number, field: string, value: string) => {
    setFormData((prev) => {
      const existing = prev[typeId] || { count: 0, total_basic: 0, amount: 0, due: 0 }
      const updated = { ...existing, [field]: parseInt(value) || 0 }
      
      const type = allowanceTypes.find(t => t.id === typeId)
      if (type?.is_calculated) {
        updated.amount = calculateAllowance(type.name, updated.count, updated.total_basic)
      }
      
      return { ...prev, [typeId]: updated }
    })
  }, [allowanceTypes])

  const handleBlur = useCallback(async (typeId: number) => {
    if (!submissionId) return
    const row = formData[typeId] || { count: 0, total_basic: 0, amount: 0, due: 0 }
    await saveFormAllowanceRow(submissionId, typeId, {
      count: row.count || 0,
      total_basic: row.total_basic || 0,
      amount: row.amount || 0,
      due: row.due || 0
    })
  }, [submissionId, formData])

  const totals = useMemo(() => {
    let amount = 0
    let due = 0
    Object.values(formData).forEach(row => {
      amount += (row.amount || 0)
      due += (row.due || 0)
    })
    return { amount, due }
  }, [formData])

  return (
    <FormShell
      title={strings.forms.form3.title}
      formNumber={3}
      prevHref="/office/form-2"
      nextHref="/office/form-4"
    >
      <div className="p-6 lg:p-8 space-y-6">
        <div className="mb-4">
          <p className="text-slate-500 text-sm flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {strings.form3.calculatedNote}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              {strings.form3.manualNote}
            </span>
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-700 w-1/4">{strings.form3.allowanceType}</th>
                <th className="p-4 font-semibold text-slate-700 w-1/6">{strings.form3.countLabel}</th>
                <th className="p-4 font-semibold text-slate-700 w-1/5">{strings.form3.basicLabel}</th>
                <th className="p-4 font-semibold text-slate-700 w-1/5">{strings.form3.amountLabel}</th>
                <th className="p-4 font-semibold text-slate-700 w-1/6">{strings.form3.dueLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allowanceTypes.map(type => {
                const row = formData[type.id] || { count: '', total_basic: '', amount: '', due: '' }
                const isCalculated = type.is_calculated
                return (
                  <tr key={type.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isCalculated ? 'bg-blue-500' : 'bg-slate-300'}`} />
                        {strings.form3[type.name as keyof typeof strings.form3] || type.title_bn}
                      </div>
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        value={row.count || ''}
                        onChange={e => handleChange(type.id, 'count', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        className="w-full bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        value={row.total_basic || ''}
                        onChange={e => handleChange(type.id, 'total_basic', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        className="w-full bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        value={row.amount || ''}
                        onChange={e => handleChange(type.id, 'amount', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        readOnly={isCalculated}
                        className={`w-full ${isCalculated ? 'bg-slate-50 text-slate-500 border-slate-200/50' : 'bg-white'}`}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        value={row.due || ''}
                        onChange={e => handleChange(type.id, 'due', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        className="w-full bg-white"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-800">
              <tr>
                <td colSpan={3} className="p-4 text-right border-r border-slate-200">{strings.total}:</td>
                <td className="p-4 text-blue-700 font-mono">{totals.amount}</td>
                <td className="p-4 text-blue-700 font-mono">{totals.due}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </FormShell>
  )
}
