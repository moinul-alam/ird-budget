'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { saveFormUtilityRow } from '@/app/actions/forms'
import { useState, useCallback, useMemo } from 'react'

export interface Form8ClientProps {
  submissionId: number | null
  utilityTypes: any[]
  initialData: any[]
}

export function Form8Client({ submissionId, utilityTypes, initialData }: Form8ClientProps) {
  const [formData, setFormData] = useState<Record<number, any>>(
    initialData.reduce((acc, row) => ({ ...acc, [row.utility_type_id]: row }), {})
  )

  const handleChange = useCallback((typeId: number, field: string, value: string) => {
    setFormData((prev) => {
      const existing = prev[typeId] || { annual_cost: 0, due: 0 }
      return { 
        ...prev, 
        [typeId]: { ...existing, [field]: parseInt(value) || 0 } 
      }
    })
  }, [])

  const handleBlur = useCallback(async (typeId: number) => {
    if (!submissionId) return
    const row = formData[typeId] || {}
    await saveFormUtilityRow(submissionId, typeId, {
      annual_cost: row.annual_cost || 0,
      due: row.due || 0,
    })
  }, [submissionId, formData])

  const totals = useMemo(() => {
    let annual_cost = 0
    let due = 0
    Object.values(formData).forEach(row => {
      annual_cost += (row.annual_cost || 0)
      due += (row.due || 0)
    })
    return { annual_cost, due }
  }, [formData])

  return (
    <FormShell
      title={strings.forms.form8.title}
      formNumber={8}
      prevHref="/office/form-7"
      nextHref="/office/form-9"
    >
      <div className="p-6 lg:p-8 space-y-6">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-700 w-1/3">{strings.form8.utilityType}</th>
                <th className="p-4 font-semibold text-slate-700 w-1/3">{strings.form8.annualCost}</th>
                <th className="p-4 font-semibold text-slate-700 w-1/3">{strings.form8.due}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {utilityTypes.map(type => {
                const row = formData[type.id] || { annual_cost: '', due: '' }
                return (
                  <tr key={type.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800 border-r border-slate-100">
                      {type.name}
                    </td>
                    <td className="p-2">
                      <Input
                        type="number" min="0"
                        value={row.annual_cost}
                        onChange={e => handleChange(type.id, 'annual_cost', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number" min="0"
                        value={row.due}
                        onChange={e => handleChange(type.id, 'due', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        className="bg-white"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-800">
              <tr>
                <td className="p-4 text-right border-r border-slate-200">{strings.total}:</td>
                <td className="p-4 text-blue-700 font-mono">{totals.annual_cost}</td>
                <td className="p-4 text-blue-700 font-mono">{totals.due}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </FormShell>
  )
}
