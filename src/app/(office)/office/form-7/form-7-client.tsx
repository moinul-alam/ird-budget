'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { saveFormITEquipmentRow } from '@/app/actions/forms'
import { useState, useCallback } from 'react'

export interface Form7ClientProps {
  submissionId: number | null
  equipmentTypes: any[]
  initialData: any[]
}

export function Form7Client({ submissionId, equipmentTypes, initialData }: Form7ClientProps) {
  const [formData, setFormData] = useState<Record<number, any>>(
    initialData.reduce((acc, row) => ({ ...acc, [row.equipment_type_id]: row }), {})
  )

  const handleChange = useCallback((typeId: number, field: string, value: string) => {
    setFormData((prev) => {
      const existing = prev[typeId] || { 
        existing_count: 0, damaged_count: 0, toner_cost: 0, required_qty: 0, unit_budget: 0 
      }
      return { 
        ...prev, 
        [typeId]: { ...existing, [field]: parseInt(value) || 0 } 
      }
    })
  }, [])

  const handleBlur = useCallback(async (typeId: number) => {
    if (!submissionId) return
    const row = formData[typeId] || {}
    await saveFormITEquipmentRow(submissionId, typeId, {
      existing_count: row.existing_count || 0,
      damaged_count: row.damaged_count || 0,
      toner_cost: row.toner_cost || 0,
      required_qty: row.required_qty || 0,
      unit_budget: row.unit_budget || 0,
    })
  }, [submissionId, formData])

  return (
    <FormShell
      title={strings.forms.form7.title}
      formNumber={7}
      prevHref="/office/form-6"
      nextHref="/office/form-8"
    >
      <div className="p-6 lg:p-8 space-y-6">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-700 min-w-[150px]">{strings.form7.itemType}</th>
                <th className="p-4 font-semibold text-slate-700">{strings.form7.countLabel}</th>
                <th className="p-4 font-semibold text-slate-700">{strings.form7.damagedLabel}</th>
                <th className="p-4 font-semibold text-slate-700">{strings.form7.tonerLabel}</th>
                <th className="p-4 font-semibold text-slate-700 border-l border-slate-200 bg-blue-50/50">{strings.form7.requiredQty}</th>
                <th className="p-4 font-semibold text-slate-700 bg-blue-50/50">{strings.form7.unitBudget}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipmentTypes.map(type => {
                const row = formData[type.id] || { 
                  existing_count: '', damaged_count: '', toner_cost: '', required_qty: '', unit_budget: '' 
                }
                return (
                  <tr key={type.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800 border-r border-slate-100">
                      {type.name}
                    </td>
                    <td className="p-2">
                      <Input
                        type="number" min="0"
                        value={row.existing_count}
                        onChange={e => handleChange(type.id, 'existing_count', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number" min="0"
                        value={row.damaged_count}
                        onChange={e => handleChange(type.id, 'damaged_count', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number" min="0"
                        value={row.toner_cost}
                        onChange={e => handleChange(type.id, 'toner_cost', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        className="bg-white"
                        disabled={type.name !== 'প্রিন্টার' && type.name !== 'ফটোকপি মেশিন' && type.name !== 'ফ্যাক্স'}
                      />
                    </td>
                    <td className="p-2 border-l border-slate-200 bg-blue-50/20">
                      <Input
                        type="number" min="0"
                        value={row.required_qty}
                        onChange={e => handleChange(type.id, 'required_qty', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2 bg-blue-50/20">
                      <Input
                        type="number" min="0"
                        value={row.unit_budget}
                        onChange={e => handleChange(type.id, 'unit_budget', e.target.value)}
                        onBlur={() => handleBlur(type.id)}
                        className="bg-white"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </FormShell>
  )
}
