'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { saveFormBasic } from '@/app/actions/forms'
import { Info, Mail, MapPin, Phone, UserRound } from 'lucide-react'
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

/** Small red dot appended to the label of every field the schema requires. */
function RequiredMark() {
  return <span className="text-rose-500 ml-0.5">*</span>
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
    return await saveFormBasic(submissionId, formData)
  }, [submissionId, formState])

  return (
    <FormShell
      title={strings.forms.form1.title}
      formNumber={1}
      nextHref="/office/form-2"
      onSave={submissionId ? handleSave : undefined}
    >
      <form ref={formRef} className="p-6 lg:p-8 space-y-8">
        {/* Carried-over values from a previous submission are shown for editing. */}
        {initialData && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
            <p className="text-xs text-blue-800 font-medium leading-relaxed">
              {strings.form1.prefilledNote}
            </p>
          </div>
        )}

        {/* ফোকাল পয়েন্ট */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-blue-600" />
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {strings.form1.focalSection}
            </h2>
            <span className="text-[11px] text-slate-400 font-medium ml-auto">
              {strings.form1.requiredHint}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="head_of_office">
                {strings.form1.headOfOffice}
                <RequiredMark />
              </Label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="head_of_office"
                  name="head_of_office"
                  value={formState.head_of_office}
                  onChange={(e) => handleChange('head_of_office', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation">
                {strings.form1.designation}
                <RequiredMark />
              </Label>
              <Input
                id="designation"
                name="designation"
                value={formState.designation}
                onChange={(e) => handleChange('designation', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                {strings.form1.phone}
                <RequiredMark />
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  value={formState.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{strings.form1.phoneHint}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                {strings.form1.email}
                <RequiredMark />
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{strings.form1.emailHint}</p>
            </div>
          </div>
        </section>

        {/* যোগাযোগ ও ঠিকানা */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-emerald-600" />
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {strings.form1.contactSection}
            </h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {strings.form1.address}
              <RequiredMark />
            </Label>
            <Textarea
              id="address"
              name="address"
              placeholder={strings.form1.addressPlaceholder}
              value={formState.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={3}
            />
          </div>
        </section>
      </form>
    </FormShell>
  )
}
