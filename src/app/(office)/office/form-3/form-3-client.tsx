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
import { saveFormAllowanceRow, saveFormRestRecreation } from '@/app/actions/forms'
import { Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { calculateAllowance } from '@/lib/budget/calculate'

export interface Form3ClientProps {
  submissionId: number | null
  allowanceTypes: any[]
  initialData: any[]
  initialLeaveData?: {
    rest_recreation_amount?: number
    rest_recreation_due?: number
  } | null
}

interface AllowanceRowData {
  count: number
  total_basic: number
  amount: number
  due: number
}

// 6 specific allowances (3 top row, 3 bottom row)
const ALLOWANCE_CONFIGS = [
  {
    key: 'overtime',
    nameBn: strings.form3.overtime,
    countLabel: strings.form3.driverCount,
    displayCountLabel: strings.form3.driverLabel,
    hasBasic: true,
    hasAmount: false,
    hasDue: true,
    dueLabel: strings.form3.dueSalaryIfAny,
    isCalculated: true,
  },
  {
    key: 'duty',
    nameBn: strings.form3.duty,
    countLabel: strings.form3.officerCount,
    displayCountLabel: strings.form3.officerLabel,
    hasBasic: false,
    hasAmount: false,
    hasDue: false,
    dueLabel: '',
    isCalculated: true,
  },
  {
    key: 'dress',
    nameBn: strings.form3.dress,
    countLabel: strings.form3.staffCount,
    displayCountLabel: strings.form3.staffLabel,
    hasBasic: false,
    hasAmount: true,
    amountLabel: strings.form3.amount,
    hasDue: true,
    dueLabel: strings.form3.due,
    isCalculated: false,
  },
  {
    key: 'risk',
    nameBn: strings.form3.risk,
    countLabel: strings.form3.staffCount,
    displayCountLabel: strings.form3.staffLabel,
    hasBasic: false,
    hasAmount: true,
    amountLabel: strings.form3.amountTotal,
    hasDue: true,
    dueLabel: strings.form3.due,
    isCalculated: false,
  },
  {
    key: 'hill',
    nameBn: strings.form3.hill,
    countLabel: strings.form3.staffCount,
    displayCountLabel: strings.form3.staffLabel,
    hasBasic: false,
    hasAmount: true,
    amountLabel: strings.form3.amountTotal,
    hasDue: true,
    dueLabel: strings.form3.due,
    isCalculated: false,
  },
  {
    key: 'restRecreation',
    nameBn: strings.form3.restRecreation,
    countLabel: strings.form3.officerStaffCount,
    displayCountLabel: strings.form3.officerStaffLabel,
    hasBasic: false,
    hasAmount: true,
    amountLabel: strings.form3.totalAmount,
    hasDue: true,
    dueLabel: strings.form3.dueIfAny,
    isCalculated: false,
  },
]

export function Form3Client({ submissionId, allowanceTypes, initialData, initialLeaveData }: Form3ClientProps) {
  // Map allowance_types by name
  const typesByName = new Map<string, any>()
  allowanceTypes.forEach((t) => {
    typesByName.set(t.name, t)
  })

  // State: store data keyed by allowance name (including restRecreation)
  const [allowanceData, setAllowanceData] = useState<Record<string, AllowanceRowData>>(() => {
    const map: Record<string, AllowanceRowData> = {}
    
    // Seed standard allowances
    initialData.forEach((row) => {
      const type = allowanceTypes.find((t) => t.id === row.allowance_type_id)
      if (type) {
        map[type.name] = {
          count: row.count || 0,
          total_basic: row.total_basic || 0,
          amount: row.amount || 0,
          due: row.due || 0,
        }
      }
    })

    // Seed restRecreation from initialLeaveData or standard allowance fallback
    const recreationAmount = initialLeaveData?.rest_recreation_amount || 0
    const recreationDue = initialLeaveData?.rest_recreation_due || 0
    if (recreationAmount > 0 || recreationDue > 0) {
      map['restRecreation'] = {
        count: map['restRecreation']?.count || 0,
        total_basic: 0,
        amount: recreationAmount,
        due: recreationDue,
      }
    }

    return map
  })

  const [isPending, startTransition] = useTransition()

  // Modal State
  const [activeAllowanceKey, setActiveAllowanceKey] = useState<string | null>(null)
  const [countInput, setCountInput] = useState('')
  const [basicInput, setBasicInput] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [dueInput, setDueInput] = useState('')

  // Delete Confirmation State
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)

  const activeConfig = ALLOWANCE_CONFIGS.find((c) => c.key === activeAllowanceKey)

  const openModal = (key: string) => {
    const existing = allowanceData[key]
    setActiveAllowanceKey(key)
    setCountInput(existing?.count ? String(existing.count) : '')
    setBasicInput(existing?.total_basic ? String(existing.total_basic) : '')
    setAmountInput(existing?.amount ? String(existing.amount) : '')
    setDueInput(existing?.due ? String(existing.due) : '')
  }

  const closeModal = () => {
    setActiveAllowanceKey(null)
    setCountInput('')
    setBasicInput('')
    setAmountInput('')
    setDueInput('')
  }

  const handleSaveModal = async () => {
    if (!activeConfig) return
    const key = activeConfig.key

    const count = parseInt(countInput, 10) || 0
    const totalBasic = parseFloat(basicInput) || 0
    let amount = parseFloat(amountInput) || 0
    const due = parseFloat(dueInput) || 0

    // Auto-compute amount if calculated type
    if (activeConfig.isCalculated) {
      amount = calculateAllowance(key, count, totalBasic)
    }

    const updatedRow: AllowanceRowData = {
      count,
      total_basic: totalBasic,
      amount,
      due,
    }

    setAllowanceData((prev) => ({
      ...prev,
      [key]: updatedRow,
    }))

    closeModal()

    if (!submissionId) return

    if (key === 'restRecreation') {
      // Save to form_leave for budget engine synchronization
      startTransition(async () => {
        await saveFormRestRecreation(submissionId, {
          rest_recreation_amount: amount,
          rest_recreation_due: due,
        })
        // Also save to form_allowances if restRecreation allowance_type exists
        const type = typesByName.get('restRecreation') || typesByName.get('recreation')
        if (type) {
          await saveFormAllowanceRow(submissionId, type.id, updatedRow)
        }
      })
    } else {
      const type = typesByName.get(key)
      if (type) {
        startTransition(async () => {
          await saveFormAllowanceRow(submissionId, type.id, updatedRow)
        })
      }
    }
  }

  const handleConfirmDelete = async () => {
    if (!keyToDelete) return
    const key = keyToDelete
    setKeyToDelete(null)

    const zeroRow: AllowanceRowData = { count: 0, total_basic: 0, amount: 0, due: 0 }

    setAllowanceData((prev) => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })

    if (!submissionId) return

    if (key === 'restRecreation') {
      startTransition(async () => {
        await saveFormRestRecreation(submissionId, {
          rest_recreation_amount: 0,
          rest_recreation_due: 0,
        })
        const type = typesByName.get('restRecreation') || typesByName.get('recreation')
        if (type) {
          await saveFormAllowanceRow(submissionId, type.id, zeroRow)
        }
      })
    } else {
      const type = typesByName.get(key)
      if (type) {
        startTransition(async () => {
          await saveFormAllowanceRow(submissionId, type.id, zeroRow)
        })
      }
    }
  }

  // Check if a card has saved data
  const hasData = (key: string) => {
    const d = allowanceData[key]
    if (!d) return false
    return d.count > 0 || d.total_basic > 0 || d.amount > 0 || d.due > 0
  }

  return (
    <FormShell
      title={strings.forms.form3.title}
      formNumber={3}
      prevHref="/office/form-2b"
      nextHref="/office/form-4"
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header subtitle */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-800">
            {strings.form3.subtitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            নিচের কার্ডগুলো থেকে যে ভাতাগুলো আপনার অফিসের জন্য প্রযোজ্য, সেগুলোতে তথ্য যোগ করুন। অপ্রযোজ্য ভাতা খালি রাখুন।
          </p>
        </div>

        {/* 6 Cards Layout: 3 cards top row, 3 cards bottom row */}
        <div className="space-y-6">
          {/* Top Row: 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ALLOWANCE_CONFIGS.slice(0, 3).map((config) => {
              const data = allowanceData[config.key]
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
                        {config.nameBn}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {filled ? (
                      <div className="space-y-2 text-sm">
                        {/* Overtime (চালক) */}
                        {config.key === 'overtime' && (
                          <>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                              <span className="text-slate-500">{config.displayCountLabel}:</span>
                              <span className="font-bold font-mono text-slate-800">
                                {toBanglaNumber(data.count)} {strings.form3.personUnit}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                              <span className="text-slate-500">{strings.form3.basicLabelMonthly}:</span>
                              <span className="font-bold font-mono text-slate-800">
                                {toBanglaAmount(data.total_basic)}
                              </span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-slate-500">{strings.form3.dueSalary}:</span>
                              <span className="font-bold font-mono text-slate-700">
                                {data.due ? toBanglaAmount(data.due) : '—'}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Duty (দায়িত্ব ভাতা) */}
                        {config.key === 'duty' && (
                          <div className="flex justify-between py-1">
                            <span className="text-slate-500">{config.displayCountLabel}:</span>
                            <span className="font-bold font-mono text-slate-800">
                              {toBanglaNumber(data.count)} {strings.form3.personUnit}
                            </span>
                          </div>
                        )}

                        {/* Dress (পোশাক ভাতা) */}
                        {config.key === 'dress' && (
                          <>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                              <span className="text-slate-500">{config.displayCountLabel}:</span>
                              <span className="font-bold font-mono text-slate-800">
                                {toBanglaNumber(data.count)} {strings.form3.personUnit}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                              <span className="text-slate-500">{strings.form3.amount}:</span>
                              <span className="font-bold font-mono text-slate-800">
                                {toBanglaAmount(data.amount)}
                              </span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-slate-500">{strings.form3.due}:</span>
                              <span className="font-bold font-mono text-slate-700">
                                {data.due ? toBanglaAmount(data.due) : '—'}
                              </span>
                            </div>
                          </>
                        )}
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
                            {strings.form3.editAllowance}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setKeyToDelete(config.key)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0"
                            title={strings.form3.deleteAllowance}
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
                          {strings.form3.addAllowance}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Bottom Row: 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ALLOWANCE_CONFIGS.slice(3, 6).map((config) => {
              const data = allowanceData[config.key]
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
                        {config.nameBn}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {filled ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">{config.displayCountLabel}:</span>
                          <span className="font-bold font-mono text-slate-800">
                            {data.count ? `${toBanglaNumber(data.count)} ${strings.form3.personUnit}` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">{config.amountLabel}:</span>
                          <span className="font-bold font-mono text-slate-800">
                            {toBanglaAmount(data.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">{strings.form3.due}:</span>
                          <span className="font-bold font-mono text-slate-700">
                            {data.due ? toBanglaAmount(data.due) : '—'}
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
                            {strings.form3.editAllowance}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setKeyToDelete(config.key)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0"
                            title={strings.form3.deleteAllowance}
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
                          {strings.form3.addAllowance}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog open={activeAllowanceKey !== null} onOpenChange={(open) => {
        if (!open) closeModal()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              {activeConfig?.nameBn}
            </DialogTitle>
          </DialogHeader>

          {activeConfig && (
            <div className="space-y-4 py-2">
              {/* Count Input */}
              <div className="space-y-1.5">
                <Label htmlFor="allowance_count">{activeConfig.countLabel}</Label>
                <Input
                  id="allowance_count"
                  type="number"
                  min="0"
                  placeholder="যেমন: ৩"
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                />
              </div>

              {/* Total Basic (overtime only) */}
              {activeConfig.hasBasic && (
                <div className="space-y-1.5">
                  <Label htmlFor="allowance_basic">{strings.form3.totalBasicMonthly}</Label>
                  <Input
                    id="allowance_basic"
                    type="number"
                    min="0"
                    placeholder="যেমন: ৭০০০০"
                    value={basicInput}
                    onChange={(e) => setBasicInput(e.target.value)}
                  />
                </div>
              )}

              {/* Amount (dress, risk, hill, restRecreation) */}
              {activeConfig.hasAmount && (
                <div className="space-y-1.5">
                  <Label htmlFor="allowance_amount">{activeConfig.amountLabel}</Label>
                  <Input
                    id="allowance_amount"
                    type="number"
                    min="0"
                    placeholder="যেমন: ১৫০০"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                  />
                </div>
              )}

              {/* Due (overtime, dress, risk, hill, restRecreation) */}
              {activeConfig.hasDue && (
                <div className="space-y-1.5">
                  <Label htmlFor="allowance_due">{activeConfig.dueLabel}</Label>
                  <Input
                    id="allowance_due"
                    type="number"
                    min="0"
                    placeholder="ঐচ্ছিক (বকেয়া থাকলে)"
                    value={dueInput}
                    onChange={(e) => setDueInput(e.target.value)}
                  />
                </div>
              )}
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
              disabled={!countInput && !basicInput && !amountInput && !dueInput}
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
              আপনি কি নিশ্চিতভাবে এই ভাতার তথ্য মুছে ফেলতে চান?
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
