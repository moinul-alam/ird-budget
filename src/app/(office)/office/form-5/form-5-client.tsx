'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { saveFormVehicleRow, deleteFormVehicleRow } from '@/app/actions/forms'
import { useState, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export interface Form5ClientProps {
  submissionId: number | null
  initialData: any[]
}

export function Form5Client({ submissionId, initialData }: Form5ClientProps) {
  const [rows, setRows] = useState<any[]>(
    initialData.length > 0 ? initialData : [{ id: `temp-${Date.now()}` }]
  )

  const handleAddRow = () => {
    setRows(prev => [...prev, { id: `temp-${Date.now()}` }])
  }

  const handleRemoveRow = async (id: any, index: number) => {
    if (typeof id === 'number' && submissionId) {
      await deleteFormVehicleRow(id)
    }
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: string, value: string) => {
    setRows(prev => {
      const newRows = [...prev]
      newRows[index] = { 
        ...newRows[index], 
        [field]: ['vehicle_type', 'fuel_type'].includes(field) ? value : (parseFloat(value) || 0)
      }
      return newRows
    })
  }

  const handleBlur = async (index: number) => {
    if (!submissionId) return
    const row = rows[index]
    
    if (!row.vehicle_type || !row.fuel_type) return

    const res = await saveFormVehicleRow(submissionId, {
      id: typeof row.id === 'number' ? row.id : undefined,
      vehicle_type: row.vehicle_type || '',
      fuel_type: row.fuel_type || '',
      count: row.count || 0,
      fuel_allowance: row.fuel_allowance || 0,
      fuel_rate: row.fuel_rate || 0,
      maintenance_cost: row.maintenance_cost || 0,
      additional_expense: row.additional_expense || 0,
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
      title={strings.forms.form5.title}
      formNumber={5}
      prevHref="/office/form-4"
      nextHref="/office/form-6"
    >
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex justify-end mb-4">
          <Button onClick={handleAddRow} variant="outline" className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200">
            <Plus className="w-4 h-4 mr-2" />
            {strings.form5.addVehicle}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-700">{strings.form5.vehicleType}</th>
                <th className="p-4 font-semibold text-slate-700">{strings.form5.fuelType}</th>
                <th className="p-4 font-semibold text-slate-700">{strings.form5.countLabel}</th>
                <th className="p-4 font-semibold text-slate-700">{strings.form5.maintenanceCost}</th>
                <th className="p-4 font-semibold text-slate-700">{strings.form5.additionalExpense}</th>
                <th className="p-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 bg-slate-50/50">
                    {strings.form5.noVehicle}
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
                        className="bg-white min-w-[120px]"
                        placeholder="যেমন: জিপ"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.fuel_type || ''}
                        onChange={e => handleChange(idx, 'fuel_type', e.target.value)}
                        onBlur={() => handleBlur(idx)}
                        className="bg-white min-w-[120px]"
                        placeholder="যেমন: অকটেন"
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
                        value={row.maintenance_cost || ''}
                        onChange={e => handleChange(idx, 'maintenance_cost', e.target.value)}
                        onBlur={() => handleBlur(idx)}
                        className="bg-white"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number" min="0"
                        value={row.additional_expense || ''}
                        onChange={e => handleChange(idx, 'additional_expense', e.target.value)}
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
      </div>
    </FormShell>
  )
}
