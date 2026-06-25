'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { saveFormVehicleRentRow, deleteFormVehicleRentRow } from '@/app/actions/forms'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export interface Form6ClientProps {
  submissionId: number | null
  initialData: any[]
}

export function Form6Client({ submissionId, initialData }: Form6ClientProps) {
  const [rows, setRows] = useState<any[]>(
    initialData.length > 0 ? initialData : [{ id: `temp-${Date.now()}` }]
  )

  const handleAddRow = () => {
    setRows(prev => [...prev, { id: `temp-${Date.now()}` }])
  }

  const handleRemoveRow = async (id: any, index: number) => {
    if (typeof id === 'number' && submissionId) {
      await deleteFormVehicleRentRow(id)
    }
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: string, value: string) => {
    setRows(prev => {
      const newRows = [...prev]
      newRows[index] = { 
        ...newRows[index], 
        [field]: field === 'vehicle_type' ? value : (parseFloat(value) || 0)
      }
      return newRows
    })
  }

  const handleBlur = async (index: number) => {
    if (!submissionId) return
    const row = rows[index]
    
    if (!row.vehicle_type) return

    const res = await saveFormVehicleRentRow(submissionId, {
      id: typeof row.id === 'number' ? row.id : undefined,
      vehicle_type: row.vehicle_type || '',
      count: row.count || 0,
      monthly_allowance: row.monthly_allowance || 0,
    })

    if (res.success && res.id && typeof row.id !== 'number') {
      setRows(prev => {
        const newRows = [...prev]
        newRows[index] = { ...newRows[index], id: res.id }
        return newRows
      })
    }
  }

  return (
    <FormShell
      title={strings.forms.form6.title}
      formNumber={6}
      prevHref="/office/form-5"
      nextHref="/office/form-7"
    >
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex justify-end mb-4">
          <Button onClick={handleAddRow} variant="outline" className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200">
            <Plus className="w-4 h-4 mr-2" />
            {strings.form6.addVehicle}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-700">{strings.form6.vehicleType}</th>
                <th className="p-4 font-semibold text-slate-700">{strings.form6.countLabel}</th>
                <th className="p-4 font-semibold text-slate-700">{strings.form6.monthlyAllowance}</th>
                <th className="p-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 bg-slate-50/50">
                    {strings.form6.noVehicle}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2">
                      <Input
                        value={row.vehicle_type || ''}
                        onChange={e => handleChange(idx, 'vehicle_type', e.target.value)}
                        onBlur={() => handleBlur(idx)}
                        className="bg-white min-w-[200px]"
                        placeholder="যেমন: মাইক্রোবাস"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number" min="0"
                        value={row.count || ''}
                        onChange={e => handleChange(idx, 'count', e.target.value)}
                        onBlur={() => handleBlur(idx)}
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number" min="0"
                        value={row.monthly_allowance || ''}
                        onChange={e => handleChange(idx, 'monthly_allowance', e.target.value)}
                        onBlur={() => handleBlur(idx)}
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveRow(row.id, idx)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-500 mt-2">{strings.form6.calculationNote}</p>
      </div>
    </FormShell>
  )
}
