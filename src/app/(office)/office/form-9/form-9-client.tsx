'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { saveFormHouseRent } from '@/app/actions/forms'
import { useState, useCallback } from 'react'

export interface Form9ClientProps {
  submissionId: number | null
  initialData: any
}

export function Form9Client({ submissionId, initialData }: Form9ClientProps) {
  const [formData, setFormData] = useState({
    monthly_bill: initialData?.monthly_bill || '',
    due: initialData?.due || '',
    contract_start_date: initialData?.contract_start_date || '',
    contract_end_date: initialData?.contract_end_date || '',
  })

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: field.includes('date') ? value : (parseInt(value) || '') 
    }))
  }, [])

  const handleBlur = useCallback(async () => {
    if (!submissionId) return
    await saveFormHouseRent(submissionId, {
      monthly_bill: formData.monthly_bill || 0,
      due: formData.due || 0,
      contract_start_date: formData.contract_start_date || null,
      contract_end_date: formData.contract_end_date || null,
    })
  }, [submissionId, formData])

  // Calculation for preview
  const monthly = parseFloat(String(formData.monthly_bill)) || 0
  const vat = monthly * 0.15 // 15% VAT assumption based on standard
  const yearlyTotal = Math.round((monthly + vat) * 12 + (parseFloat(String(formData.due)) || 0))

  return (
    <FormShell
      title={strings.forms.form9.title}
      formNumber={9}
      prevHref="/office/form-8"
      nextHref="/office/form-10"
    >
      <div className="p-6 lg:p-8 space-y-8">
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {strings.form9.monthlyBill}
              </label>
              <Input
                type="number" min="0"
                value={formData.monthly_bill}
                onChange={e => handleChange('monthly_bill', e.target.value)}
                onBlur={handleBlur}
                className="bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {strings.form9.due}
              </label>
              <Input
                type="number" min="0"
                value={formData.due}
                onChange={e => handleChange('due', e.target.value)}
                onBlur={handleBlur}
                className="bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {strings.form9.contractStart}
              </label>
              <Input
                type="date"
                value={formData.contract_start_date}
                onChange={e => handleChange('contract_start_date', e.target.value)}
                onBlur={handleBlur}
                className="bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {strings.form9.contractEnd}
              </label>
              <Input
                type="date"
                value={formData.contract_end_date}
                onChange={e => handleChange('contract_end_date', e.target.value)}
                onBlur={handleBlur}
                className="bg-white"
              />
            </div>

          </div>
        </div>

        {/* VAT and Total Preview */}
        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">গণনাকৃত মোট</h3>
            <p className="text-sm text-blue-700">{strings.form9.vatNote}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-600 font-medium mb-1">{strings.total} (বার্ষিক)</div>
            <div className="text-2xl font-bold text-blue-800 font-mono">
              {yearlyTotal > 0 ? yearlyTotal.toLocaleString('en-IN') : '0'} ৳
            </div>
          </div>
        </div>

      </div>
    </FormShell>
  )
}
