'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { saveFormReturnInfo } from '@/app/actions/forms'
import { useState, useCallback } from 'react'

export interface Form10ClientProps {
  submissionId: number | null
  initialData: any
}

export function Form10Client({ submissionId, initialData }: Form10ClientProps) {
  const [formData, setFormData] = useState({
    tin_count: initialData?.tin_count || '',
    return_submitted_count: initialData?.return_submitted_count || '',
  })

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: parseInt(value) || '' 
    }))
  }, [])

  const handleBlur = useCallback(async () => {
    if (!submissionId) return
    await saveFormReturnInfo(submissionId, {
      tin_count: formData.tin_count || 0,
      return_submitted_count: formData.return_submitted_count || 0,
    })
  }, [submissionId, formData])

  // Calculation for postal expense (50 taka per return)
  const submittedCount = parseInt(String(formData.return_submitted_count)) || 0
  const postalRate = 50
  const postalTotal = submittedCount * postalRate

  return (
    <FormShell
      title={strings.forms.form10.title}
      formNumber={10}
      prevHref="/office/form-9"
      nextHref="/office/form-summary"
    >
      <div className="p-6 lg:p-8 space-y-8">
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {strings.form10.tinCount}
              </label>
              <Input
                type="number" min="0"
                value={formData.tin_count}
                onChange={e => handleChange('tin_count', e.target.value)}
                onBlur={handleBlur}
                className="bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {strings.form10.returnCount}
              </label>
              <Input
                type="number" min="0"
                value={formData.return_submitted_count}
                onChange={e => handleChange('return_submitted_count', e.target.value)}
                onBlur={handleBlur}
                className="bg-white"
              />
            </div>

          </div>
        </div>

        {/* Calculation Preview */}
        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">{strings.form10.postalExpense}</h3>
            <p className="text-sm text-blue-700">{strings.form10.postalNote}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-600 font-medium mb-1">মোট পরিমাণ</div>
            <div className="text-2xl font-bold text-blue-800 font-mono">
              {postalTotal > 0 ? postalTotal.toLocaleString('en-IN') : '0'} ৳
            </div>
          </div>
        </div>

      </div>
    </FormShell>
  )
}
