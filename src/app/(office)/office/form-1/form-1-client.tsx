'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { saveFormBasic } from '@/app/actions/forms'
import { useState, useCallback, useRef } from 'react'

interface Form1ClientProps {
  initialData: {
    head_of_office: string
    designation: string
    phone: string
    email: string
    address: string
  } | null
  submissionId: number | null
}

export function Form1Client({ initialData, submissionId }: Form1ClientProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [formState, setFormState] = useState({
    head_of_office: initialData?.head_of_office ?? '',
    designation: initialData?.designation ?? '',
    phone: initialData?.phone ?? '',
    email: initialData?.email ?? '',
    address: initialData?.address ?? '',
  })

  const handleChange = useCallback((field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!submissionId) return
    const formData = new FormData()
    Object.entries(formState).forEach(([key, value]) => {
      formData.set(key, value)
    })
    await saveFormBasic(submissionId, formData)
  }, [submissionId, formState])

  return (
    <FormShell
      title={strings.forms.form1.title}
      formNumber={1}
      nextHref="/office/form-2"
      onSave={submissionId ? handleSave : undefined}
    >
      <form ref={formRef} className="p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="head_of_office">{strings.form1.headOfOffice}</Label>
            <Input
              id="head_of_office"
              name="head_of_office"
              placeholder={strings.form1.headOfOfficePlaceholder}
              value={formState.head_of_office}
              onChange={(e) => handleChange('head_of_office', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="designation">{strings.form1.designation}</Label>
            <Input
              id="designation"
              name="designation"
              placeholder={strings.form1.designationPlaceholder}
              value={formState.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{strings.form1.phone}</Label>
            <Input
              id="phone"
              name="phone"
              placeholder={strings.form1.phonePlaceholder}
              value={formState.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{strings.form1.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={strings.form1.emailPlaceholder}
              value={formState.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">{strings.form1.address}</Label>
          <Textarea
            id="address"
            name="address"
            placeholder={strings.form1.addressPlaceholder}
            value={formState.address}
            onChange={(e) => handleChange('address', e.target.value)}
            rows={3}
          />
        </div>
      </form>
    </FormShell>
  )
}
