'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { saveFormLeave } from '@/app/actions/forms'
import { Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react'
import { useState, useTransition } from 'react'

export interface Form4ClientProps {
  submissionId: number | null
  initialData: any
}

interface LeaveGroupData {
  count: number
  basic: number
  due: number
}

const LEAVE_CONFIGS = [
  {
    key: 'officer' as const,
    title: strings.form4.officerTitle,
    countLabel: strings.form4.officerCount,
    basicKey: 'leave_encashment_officer_basic' as const,
    dueKey: 'leave_encashment_officer_due' as const,
  },
  {
    key: 'staff' as const,
    title: strings.form4.staffTitle,
    countLabel: strings.form4.staffCount,
    basicKey: 'leave_encashment_staff_basic' as const,
    dueKey: 'leave_encashment_staff_due' as const,
  },
]

export function Form4Client({ submissionId, initialData }: Form4ClientProps) {
  // Store officer and staff data in state
  const [data, setData] = useState<{
    officer: LeaveGroupData
    staff: LeaveGroupData
  }>(() => {
    return {
      officer: {
        count: 0,
        basic: initialData?.leave_encashment_officer_basic || 0,
        due: initialData?.leave_encashment_officer_due || 0,
      },
      staff: {
        count: 0,
        basic: initialData?.leave_encashment_staff_basic || 0,
        due: initialData?.leave_encashment_staff_due || 0,
      },
    }
  })

  const [isPending, startTransition] = useTransition()

  // Modal State
  const [activeGroupKey, setActiveGroupKey] = useState<'officer' | 'staff' | null>(null)
  const [countInput, setCountInput] = useState('')
  const [basicInput, setBasicInput] = useState('')
  const [dueInput, setDueInput] = useState('')

  // Delete Confirmation State
  const [keyToDelete, setKeyToDelete] = useState<'officer' | 'staff' | null>(null)

  const activeConfig = LEAVE_CONFIGS.find((c) => c.key === activeGroupKey)

  const openModal = (key: 'officer' | 'staff') => {
    const existing = data[key]
    setActiveGroupKey(key)
    setCountInput(existing.count ? String(existing.count) : '')
    setBasicInput(existing.basic ? String(existing.basic) : '')
    setDueInput(existing.due ? String(existing.due) : '')
  }

  const closeModal = () => {
    setActiveGroupKey(null)
    setCountInput('')
    setBasicInput('')
    setDueInput('')
  }

  const handleSaveModal = async () => {
    if (!activeGroupKey) return
    const key = activeGroupKey

    const count = parseInt(countInput, 10) || 0
    const basic = parseFloat(basicInput) || 0
    const due = parseFloat(dueInput) || 0

    const updatedGroup: LeaveGroupData = { count, basic, due }

    const nextData = {
      ...data,
      [key]: updatedGroup,
    }

    setData(nextData)
    closeModal()

    if (submissionId) {
      startTransition(async () => {
        await saveFormLeave(submissionId, {
          leave_encashment_officer_basic: nextData.officer.basic,
          leave_encashment_officer_due: nextData.officer.due,
          leave_encashment_staff_basic: nextData.staff.basic,
          leave_encashment_staff_due: nextData.staff.due,
          rest_recreation_amount: initialData?.rest_recreation_amount || 0,
          rest_recreation_due: initialData?.rest_recreation_due || 0,
        })
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!keyToDelete) return
    const key = keyToDelete
    setKeyToDelete(null)

    const nextData = {
      ...data,
      [key]: { count: 0, basic: 0, due: 0 },
    }

    setData(nextData)

    if (submissionId) {
      startTransition(async () => {
        await saveFormLeave(submissionId, {
          leave_encashment_officer_basic: nextData.officer.basic,
          leave_encashment_officer_due: nextData.officer.due,
          leave_encashment_staff_basic: nextData.staff.basic,
          leave_encashment_staff_due: nextData.staff.due,
          rest_recreation_amount: initialData?.rest_recreation_amount || 0,
          rest_recreation_due: initialData?.rest_recreation_due || 0,
        })
      })
    }
  }

  const hasData = (key: 'officer' | 'staff') => {
    const item = data[key]
    return item.count > 0 || item.basic > 0 || item.due > 0
  }

  return (
    <FormShell
      title={strings.forms.form5.title}
      formNumber={5}
      prevHref="/office/form-5"
      nextHref="/office/form-7"
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header subtitle */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-800">
            {strings.form4.subtitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            কর্মকর্তা ও কর্মচারীদের মধ্যে যাদের জন্য ছুটি নগদায়ন প্রযোজ্য, সংশ্লিষ্ট কার্ডে তথ্য যোগ করুন।
          </p>
        </div>

        {/* 2 Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {LEAVE_CONFIGS.map((config) => {
            const item = data[config.key]
            const filled = hasData(config.key)

            return (
              <Card
                key={config.key}
                className={`flex flex-col justify-between transition-all duration-200 border rounded-2xl shadow-xs overflow-hidden ${
                  filled
                    ? 'border-blue-200 bg-white ring-1 ring-blue-100'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/80 px-5 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      {filled && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                      {config.title}
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {filled ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{config.countLabel}:</span>
                        <span className="font-bold font-mono text-slate-800">
                          {item.count ? `${toBanglaNumber(item.count)} ${strings.form4.personUnit}` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{strings.form4.monthlyTotalBasic}:</span>
                        <span className="font-bold font-mono text-slate-800">
                          {toBanglaAmount(item.basic)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">{strings.form4.due}:</span>
                        <span className="font-bold font-mono text-slate-700">
                          {item.due ? toBanglaAmount(item.due) : '—'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-xs text-slate-400">তথ্য যুক্ত করা হয়নি</p>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="pt-2">
                    {filled ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openModal(config.key)}
                          className="flex-1 text-blue-700 border-blue-200 hover:bg-blue-50 text-xs h-9 gap-1.5"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          {strings.form4.editLeave}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setKeyToDelete(config.key)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0"
                          title={strings.form4.deleteLeave}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openModal(config.key)}
                        className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 text-xs h-9 gap-1.5 font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {strings.form4.addLeave}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog open={activeGroupKey !== null} onOpenChange={(open) => {
        if (!open) closeModal()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              {activeConfig?.title}
            </DialogTitle>
          </DialogHeader>

          {activeConfig && (
            <div className="space-y-4 py-2">
              {/* Count Input */}
              <div className="space-y-1.5">
                <Label htmlFor="leave_count">{activeConfig.countLabel}</Label>
                <Input
                  id="leave_count"
                  type="number"
                  min="0"
                  placeholder="যেমন: ১"
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                />
              </div>

              {/* Monthly Total Basic */}
              <div className="space-y-1.5">
                <Label htmlFor="leave_basic">{strings.form4.monthlyTotalBasic}</Label>
                <Input
                  id="leave_basic"
                  type="number"
                  min="0"
                  placeholder="যেমন: ৫০000"
                  value={basicInput}
                  onChange={(e) => setBasicInput(e.target.value)}
                />
              </div>

              {/* Due */}
              <div className="space-y-1.5">
                <Label htmlFor="leave_due">{strings.form4.dueIfAny}</Label>
                <Input
                  id="leave_due"
                  type="number"
                  min="0"
                  placeholder="ঐচ্ছিক (বকেয়া থাকলে)"
                  value={dueInput}
                  onChange={(e) => setDueInput(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
            >
              {strings.close}
            </Button>
            <Button
              type="button"
              onClick={handleSaveModal}
              disabled={!countInput && !basicInput && !dueInput}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {strings.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={keyToDelete !== null} onOpenChange={(open) => {
        if (!open) setKeyToDelete(null)
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <Trash2 className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-800">
                তথ্য মুছে ফেলার নিশ্চিতকরণ
              </DialogTitle>
            </div>
            <p className="text-sm text-slate-500">
              আপনি কি নিশ্চিতভাবে এই ছুটি নগদায়নের তথ্য মুছে ফেলতে চান?
            </p>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setKeyToDelete(null)}
              className="text-slate-600"
            >
              {strings.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              মুছে ফেলুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormShell>
  )
}
