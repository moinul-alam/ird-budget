'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveFormStaffRow } from '@/app/actions/forms'
import { useState, useCallback } from 'react'

interface StaffRowData {
  grade_id: number
  count: number
  total_basic: number
  due_salary: number
  suspended_count: number
  suspended_total_basic: number
  suspended_due_salary: number
}

interface Form2ClientProps {
  initialData: StaffRowData[]
  submissionId: number | null
}

const ALL_GRADES = Array.from({ length: 20 }, (_, i) => i + 1)

export function Form2Client({ initialData, submissionId }: Form2ClientProps) {
  const [rows, setRows] = useState<Record<number, StaffRowData>>(() => {
    const map: Record<number, StaffRowData> = {}
    ALL_GRADES.forEach((g) => {
      const existing = initialData.find((d) => d.grade_id === g)
      map[g] = existing || {
        grade_id: g,
        count: 0,
        total_basic: 0,
        due_salary: 0,
        suspended_count: 0,
        suspended_total_basic: 0,
        suspended_due_salary: 0,
      }
    })
    return map
  })

  const handleChange = useCallback((gradeId: number, field: keyof StaffRowData, value: string) => {
    const num = value === '' ? 0 : Number(value)
    if (isNaN(num)) return
    setRows((prev) => ({
      ...prev,
      [gradeId]: { ...prev[gradeId], [field]: num },
    }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!submissionId) return
    // Save all grades
    for (const grade of ALL_GRADES) {
      await saveFormStaffRow(submissionId, grade, rows[grade])
    }
  }, [submissionId, rows])

  const renderSection = (grades: number[], title: string) => (
    <div className="space-y-4 mb-8">
      <h3 className="font-bold text-lg text-slate-800">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="p-3">{strings.fields.grade}</th>
              <th className="p-3">{strings.fields.count}</th>
              <th className="p-3">{strings.fields.totalBasic}</th>
              <th className="p-3">{strings.fields.dueSalary}</th>
              <th className="p-3">{strings.fields.suspendedCount}</th>
              <th className="p-3">{strings.fields.suspendedBasic}</th>
              <th className="p-3">{strings.fields.suspendedDue}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grades.map((grade) => {
              const r = rows[grade]
              return (
                <tr key={grade} className="hover:bg-slate-50/50">
                  <td className="p-3 font-medium">Grade {grade}</td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={r.count || ''}
                      onChange={(e) => handleChange(grade, 'count', e.target.value)}
                      className="w-20"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={r.total_basic || ''}
                      onChange={(e) => handleChange(grade, 'total_basic', e.target.value)}
                      className="w-32"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={r.due_salary || ''}
                      onChange={(e) => handleChange(grade, 'due_salary', e.target.value)}
                      className="w-32"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={r.suspended_count || ''}
                      onChange={(e) => handleChange(grade, 'suspended_count', e.target.value)}
                      className="w-20"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={r.suspended_total_basic || ''}
                      onChange={(e) => handleChange(grade, 'suspended_total_basic', e.target.value)}
                      className="w-32"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={r.suspended_due_salary || ''}
                      onChange={(e) => handleChange(grade, 'suspended_due_salary', e.target.value)}
                      className="w-32"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  const officers = ALL_GRADES.filter((g) => g <= 9)
  const staff = ALL_GRADES.filter((g) => g > 9)

  return (
    <FormShell
      title={strings.forms.form2.title}
      formNumber={2}
      prevHref="/office/form-1"
      nextHref="/office/form-3"
      onSave={submissionId ? handleSave : undefined}
    >
      <div className="p-6">
        {renderSection(officers, strings.form2.officerGrades)}
        {renderSection(staff, strings.form2.staffGrades)}
      </div>
    </FormShell>
  )
}
