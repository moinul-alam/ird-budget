'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateMyOfficeProfile,
  getParentOffices,
  getOfficeTypes,
  getOfficeLevelsForType,
  type MyOfficeProfile,
} from '@/app/actions/office'
import { toEnglishNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Building2, PencilLine, Loader2, CheckCircle, AlertTriangle, Lock, X } from 'lucide-react'

interface SelectOption {
  id: string
  name: string
}

interface DepartmentOption extends SelectOption {
  ministry_id?: string
}

interface OfficeInfoClientProps {
  profile: MyOfficeProfile
  ministries: SelectOption[]
  departments: DepartmentOption[]
  initialOfficeTypes: SelectOption[]
  initialParentOffices: SelectOption[]
  initialLevels: SelectOption[]
}

/** A single read-only row of the registration data. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">{value || '—'}</p>
    </div>
  )
}

export function OfficeInfoClient({
  profile,
  ministries,
  departments,
  initialOfficeTypes,
  initialParentOffices,
  initialLevels,
}: OfficeInfoClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [current, setCurrent] = useState(profile)
  const [editing, setEditing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Draft values while editing.
  const [draft, setDraft] = useState({
    name: profile.name,
    budgetId: profile.budgetId,
    ministryId: profile.ministryId,
    departmentId: profile.departmentId,
    officeTypeId: profile.officeTypeId,
    officeLevelId: profile.officeLevelId,
    parentOfficeId: profile.parentOfficeId,
  })

  const [officeTypes, setOfficeTypes] = useState<SelectOption[]>(initialOfficeTypes)
  const [parentOffices, setParentOffices] = useState<SelectOption[]>(initialParentOffices)
  const [levels, setLevels] = useState<SelectOption[]>(initialLevels)

  const visibleDepartments = draft.ministryId
    ? departments.filter((d) => d.ministry_id === draft.ministryId)
    : departments

  const startEditing = () => {
    setConfirmOpen(false)
    setDraft({
      name: current.name,
      budgetId: current.budgetId,
      ministryId: current.ministryId,
      departmentId: current.departmentId,
      officeTypeId: current.officeTypeId,
      officeLevelId: current.officeLevelId,
      parentOfficeId: current.parentOfficeId,
    })
    setOfficeTypes(initialOfficeTypes)
    setParentOffices(initialParentOffices)
    setLevels(initialLevels)
    setError(null)
    setSaved(false)
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setError(null)
  }

  const handleMinistryChange = (ministryId: string) => {
    setDraft((prev) => ({
      ...prev,
      ministryId,
      departmentId: '',
      officeTypeId: '',
      officeLevelId: '',
      parentOfficeId: '',
    }))
    setOfficeTypes([])
    setParentOffices([])
    setLevels([])
  }

  const handleDepartmentChange = async (departmentId: string) => {
    setDraft((prev) => ({
      ...prev,
      departmentId,
      officeTypeId: '',
      officeLevelId: '',
      parentOfficeId: '',
    }))
    setOfficeTypes([])
    setParentOffices([])
    setLevels([])

    if (!departmentId) return
    const [types, parents] = await Promise.all([
      getOfficeTypes(departmentId),
      getParentOffices(departmentId),
    ])
    setOfficeTypes(types)
    setParentOffices(parents)
  }

  const handleOfficeTypeChange = async (officeTypeId: string) => {
    setDraft((prev) => ({ ...prev, officeTypeId, officeLevelId: '' }))
    setLevels([])

    if (!officeTypeId) return
    const list = await getOfficeLevelsForType(Number(officeTypeId))
    setLevels(list)
  }

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const res = await updateMyOfficeProfile({
        name: draft.name,
        budgetId: toEnglishNumber(draft.budgetId.trim()),
        officeTypeId: draft.officeTypeId,
        officeLevelId: draft.officeLevelId,
        parentOfficeId: draft.parentOfficeId,
      })

      if (res.error) {
        setError(res.error)
        return
      }

      const findName = (list: SelectOption[], id: string) => list.find((o) => o.id === id)?.name || ''
      const nextProfile: MyOfficeProfile = {
        ...current,
        name: draft.name.trim(),
        budgetId: toEnglishNumber(draft.budgetId.trim()),
        ministryId: draft.ministryId,
        ministryName: findName(ministries, draft.ministryId),
        departmentId: draft.departmentId,
        departmentName: findName(visibleDepartments, draft.departmentId),
        officeTypeId: draft.officeTypeId,
        officeTypeName: findName(officeTypes, draft.officeTypeId),
        officeLevelId: draft.officeLevelId,
        officeLevelName: findName(levels, draft.officeLevelId),
        parentOfficeId: draft.parentOfficeId,
        parentOfficeName: findName(parentOffices, draft.parentOfficeId),
      }

      setCurrent(nextProfile)
      setEditing(false)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header: title on the left, correction button on the top-right */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight">
              অফিসের তথ্য
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              নিবন্ধনের সময় প্রদানকৃত তথ্য
            </p>
          </div>
        </div>

        {!editing && (
          <Button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-xl text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          >
            <PencilLine className="h-4 w-4" />
            অফিসের তথ্য সংশোধণ
          </Button>
        )}

        {editing && (
          <Button
            type="button"
            variant="outline"
            onClick={cancelEditing}
            className="rounded-xl text-xs font-bold gap-1.5 border-slate-300 text-slate-700 shrink-0"
          >
            <X className="h-4 w-4" />
            বাতিল
          </Button>
        )}
      </div>

      {saved && !editing && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          অফিসের তথ্য সফলভাবে সংরক্ষণ হয়েছে।
        </div>
      )}

      <Card className="rounded-3xl border-slate-200/80 shadow-xs">
        <CardContent className="p-6 lg:p-8">
          {error && (
            <div className="mb-6 flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-rose-600" />
              {error}
            </div>
          )}

          {/* READ-ONLY VIEW */}
          {!editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <InfoRow label="মন্ত্রণালয় / বিভাগ" value={current.ministryName} />
              <InfoRow label="দপ্তর / সংস্থা" value={current.departmentName} />
              <InfoRow label="অফিসের ধরণ" value={current.officeTypeName} />
              <InfoRow label="মাঠ পর্যায়ের অফিসের স্তর" value={current.officeLevelName} />
              <InfoRow label="হেড অফিসের নাম" value={current.parentOfficeName} />
              <InfoRow label="মাঠ পর্যায়ের অফিসের নাম" value={current.name} />
              <InfoRow label="অফিসের বাজেট আইডি" value={current.budgetId} />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  অফিস আইডি (স্থায়ী)
                </p>
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-sm font-bold font-mono text-slate-500">
                    #{current.id}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* EDIT FORM */}
          {editing && (
            <div className="space-y-6">
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  সংশোধনের সময় বাজেট আইডি ভুল হলে লগইনে সমস্যা হতে পারে। অফিস আইডি
                  (স্থায়ী) কখনো পরিবর্তন হয় না, তাই তথ্যের ধারাবাহিকতা অটুট থাকে।
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>মন্ত্রণালয় / বিভাগ</Label>
                  <select
                    value={draft.ministryId}
                    onChange={(e) => handleMinistryChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  >
                    <option value="">মন্ত্রণালয়/বিভাগ নির্বাচন করুন</option>
                    {ministries.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>দপ্তর / সংস্থা</Label>
                  <select
                    value={draft.departmentId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    disabled={!draft.ministryId}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">দপ্তর নির্বাচন করুন</option>
                    {visibleDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>অফিসের ধরণ</Label>
                  <select
                    value={draft.officeTypeId}
                    onChange={(e) => handleOfficeTypeChange(e.target.value)}
                    disabled={!draft.departmentId}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">অফিসের ধরণ নির্বাচন করুন</option>
                    {officeTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>মাঠ পর্যায়ের অফিসের স্তর</Label>
                  <select
                    value={draft.officeLevelId}
                    onChange={(e) => setDraft((prev) => ({ ...prev, officeLevelId: e.target.value }))}
                    disabled={!draft.officeTypeId}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">স্তর নির্বাচন করুন</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>হেড অফিসের নাম</Label>
                  <select
                    value={draft.parentOfficeId}
                    onChange={(e) => setDraft((prev) => ({ ...prev, parentOfficeId: e.target.value }))}
                    disabled={!draft.departmentId}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">হেড অফিস নির্বাচন করুন</option>
                    {parentOffices.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>মাঠ পর্যায়ের অফিসের নাম</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    className="rounded-xl border-slate-200 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label>অফিসের বাজেট আইডি</Label>
                  <Input
                    value={draft.budgetId}
                    onChange={(e) => setDraft((prev) => ({ ...prev, budgetId: e.target.value }))}
                    className="rounded-xl border-slate-200 font-mono font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    অফিস আইডি (স্থায়ী)
                  </Label>
                  <Input
                    readOnly
                    value={current.id}
                    className="bg-slate-100 font-mono text-slate-500 font-bold rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEditing}
                  className="rounded-xl text-xs font-bold border-slate-300 text-slate-700"
                >
                  বাতিল
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  সংরক্ষণ করুন
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation prompt before unlocking the form */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-extrabold text-slate-900">
              অফিসের তথ্য সংশোধণ
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              আপনি কি নিবন্ধনের সময় প্রদানকৃত অফিসের তথ্য পরিবর্তন করতে চান? হ্যাঁ নির্বাচন
              করলে সকল ঘর সম্পাদনযোগ্য হয়ে যাবে এবং আপনি সংরক্ষণ করে নিশ্চিত করতে পারবেন।
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="rounded-xl text-xs font-bold border-slate-300 text-slate-700"
            >
              না
            </Button>
            <Button
              type="button"
              onClick={startEditing}
              className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              হ্যাঁ, সংশোধন করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
