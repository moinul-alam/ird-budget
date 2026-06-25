'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { saveFormLeave } from '@/app/actions/forms'
import { useState, useCallback } from 'react'

export interface Form4ClientProps {
  submissionId: number | null
  initialData: any
}

export function Form4Client({ submissionId, initialData }: Form4ClientProps) {
  const [formData, setFormData] = useState({
    leave_encashment_officer_basic: initialData?.leave_encashment_officer_basic || '',
    leave_encashment_officer_due: initialData?.leave_encashment_officer_due || '',
    leave_encashment_staff_basic: initialData?.leave_encashment_staff_basic || '',
    leave_encashment_staff_due: initialData?.leave_encashment_staff_due || '',
    rest_recreation_amount: initialData?.rest_recreation_amount || '',
    rest_recreation_due: initialData?.rest_recreation_due || '',
  })

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: parseInt(value) || '' }))
  }, [])

  const handleBlur = useCallback(async () => {
    if (!submissionId) return
    await saveFormLeave(submissionId, {
      leave_encashment_officer_basic: formData.leave_encashment_officer_basic || 0,
      leave_encashment_officer_due: formData.leave_encashment_officer_due || 0,
      leave_encashment_staff_basic: formData.leave_encashment_staff_basic || 0,
      leave_encashment_staff_due: formData.leave_encashment_staff_due || 0,
      rest_recreation_amount: formData.rest_recreation_amount || 0,
      rest_recreation_due: formData.rest_recreation_due || 0,
    })
  }, [submissionId, formData])

  return (
    <FormShell
      title={strings.forms.form4.title}
      formNumber={4}
      prevHref="/office/form-3"
      nextHref="/office/form-5"
    >
      <div className="p-6 lg:p-8 space-y-8">
        
        {/* Leave Encashment */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
            {strings.form4.leaveEncashmentTitle}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Officer */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h3 className="font-semibold text-slate-700 mb-4">{strings.form4.officerSection}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{strings.form4.basicLabel}</label>
                  <Input
                    type="number" min="0"
                    value={formData.leave_encashment_officer_basic}
                    onChange={e => handleChange('leave_encashment_officer_basic', e.target.value)}
                    onBlur={handleBlur}
                    className="bg-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">{strings.form4.calculationNote}: {formData.leave_encashment_officer_basic ? formData.leave_encashment_officer_basic * 12 : 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{strings.form4.dueLabel}</label>
                  <Input
                    type="number" min="0"
                    value={formData.leave_encashment_officer_due}
                    onChange={e => handleChange('leave_encashment_officer_due', e.target.value)}
                    onBlur={handleBlur}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Staff */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h3 className="font-semibold text-slate-700 mb-4">{strings.form4.staffSection}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{strings.form4.basicLabel}</label>
                  <Input
                    type="number" min="0"
                    value={formData.leave_encashment_staff_basic}
                    onChange={e => handleChange('leave_encashment_staff_basic', e.target.value)}
                    onBlur={handleBlur}
                    className="bg-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">{strings.form4.calculationNote}: {formData.leave_encashment_staff_basic ? formData.leave_encashment_staff_basic * 12 : 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{strings.form4.dueLabel}</label>
                  <Input
                    type="number" min="0"
                    value={formData.leave_encashment_staff_due}
                    onChange={e => handleChange('leave_encashment_staff_due', e.target.value)}
                    onBlur={handleBlur}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rest and Recreation */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
            {strings.form4.restRecreationTitle}
          </h2>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{strings.form4.restRecreationAmount}</label>
              <Input
                type="number" min="0"
                value={formData.rest_recreation_amount}
                onChange={e => handleChange('rest_recreation_amount', e.target.value)}
                onBlur={handleBlur}
                className="bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{strings.form4.restRecreationDue}</label>
              <Input
                type="number" min="0"
                value={formData.rest_recreation_due}
                onChange={e => handleChange('rest_recreation_due', e.target.value)}
                onBlur={handleBlur}
                className="bg-white"
              />
            </div>
          </div>
        </div>

      </div>
    </FormShell>
  )
}
