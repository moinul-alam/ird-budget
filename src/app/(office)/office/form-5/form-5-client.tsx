'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaHazar, toBanglaNumber } from '@/lib/bangla'
import { AmountField } from '@/components/amount-field'
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
import { saveFormAllowanceRow } from '@/lib/actions/forms/allowances'
import { saveFormRestRecreation } from '@/lib/actions/forms/leave'
import { Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormAllowancesInitial } from '@/lib/office/load-form-data'
import { useState, useTransition } from 'react'
import { calculateAllowance } from '@/lib/budget/calculate'

/**
 * One row of `ref_allowance_types`. Everything the card renders comes from here,
 * so an allowance added by an administrator shows up without a code change.
 */
export interface AllowanceTypeRow {
  id: number
  name: string
  label_bn: string
  count_label_bn: string
  is_calculated: boolean
  /** The engine formula the calculated amount dispatches to (see RefFormulaType). */
  formula_key: string | null
  applicable_category: string | null
  has_basic: boolean
  has_amount: boolean
  has_due: boolean
}

export interface Form5ClientProps {
  submissionId: number | null
  allowanceTypes: AllowanceTypeRow[]
  initialData: FormAllowancesInitial
  initialLeaveData?: {
    rest_recreation_amount?: number
    rest_recreation_due?: number
  } | null
  /** Administrator rate the calculated দায়িত্ব ভাতা card is projected from. */
  dutyMonthlyRate?: number
  /** Administrator month count the দায়িত্ব ভাতা card is projected over. */
  dutyMonths?: number
  /** The cycle's বেতন-মাস, which annualises the calculated monthly cards. */
  salaryMonths?: number
}

interface AllowanceRowData {
  count: number
  total_basic: number
  amount: number
  due: number
}

/**
 * Light accent for each card's title bar — one tint per card position, so the
 * allowances read as distinct at a glance without the tint competing with the
 * figures underneath.
 */
const titleAccents = [
  'bg-blue-50/80 border-blue-100',
  'bg-emerald-50/80 border-emerald-100',
  'bg-amber-50/80 border-amber-100',
  'bg-violet-50/80 border-violet-100',
  'bg-rose-50/80 border-rose-100',
  'bg-cyan-50/80 border-cyan-100',
]

// The leave form collects this one allowance too and the budget engine reads it
// from the leave table, so it is written to both places.
const isRestRecreation = (t: AllowanceTypeRow) => t.name === 'restRecreation'

export function Form5Client({
  submissionId,
  allowanceTypes,
  initialData,
  initialLeaveData,
  dutyMonthlyRate = 0,
  dutyMonths = 0,
  salaryMonths = 0,
}: Form5ClientProps) {
  const typesById = new Map<number, AllowanceTypeRow>(allowanceTypes.map((t) => [t.id, t]))

  const [allowanceData, setAllowanceData] = useState<Record<number, AllowanceRowData>>(() => {
    const map: Record<number, AllowanceRowData> = {}

    initialData.forEach((row) => {
      const type = typesById.get(Number(row.allowance_type_id))
      if (!type) return
      map[type.id] = {
        count: Number(row.count) || 0,
        total_basic: Number(row.total_basic) || 0,
        amount: Number(row.amount) || 0,
        due: Number(row.due) || 0,
      }
    })

    const rest = allowanceTypes.find(isRestRecreation)
    const recreationAmount = Number(initialLeaveData?.rest_recreation_amount) || 0
    const recreationDue = Number(initialLeaveData?.rest_recreation_due) || 0
    if (rest && (recreationAmount > 0 || recreationDue > 0)) {
      map[rest.id] = {
        count: map[rest.id]?.count ?? 0,
        total_basic: map[rest.id]?.total_basic ?? 0,
        amount: recreationAmount,
        due: recreationDue,
      }
    }

    return map
  })

  const [, startTransition] = useTransition()

  // Modal State
  const [activeId, setActiveId] = useState<number | null>(null)
  const [countInput, setCountInput] = useState('')
  const [basicInput, setBasicInput] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [dueInput, setDueInput] = useState('')

  // Delete Confirmation State
  const [keyToDelete, setKeyToDelete] = useState<number | null>(null)

  const activeType = activeId === null ? undefined : typesById.get(activeId)

  const openModal = (type: AllowanceTypeRow) => {
    const existing = allowanceData[type.id]
    setActiveId(type.id)
    setCountInput(existing?.count ? String(existing.count) : '')
    setBasicInput(existing?.total_basic ? String(existing.total_basic) : '')
    setAmountInput(existing?.amount ? String(existing.amount) : '')
    setDueInput(existing?.due ? String(existing.due) : '')
  }

  const closeModal = () => {
    setActiveId(null)
    setCountInput('')
    setBasicInput('')
    setAmountInput('')
    setDueInput('')
  }

  // Writes one allowance to its table (and to the leave table for rest &
  // recreation). Returns the action result so failures can surface.
  const persistRow = async (type: AllowanceTypeRow, row: AllowanceRowData) => {
    if (!submissionId) return undefined

    if (isRestRecreation(type)) {
      const restRes = await saveFormRestRecreation(submissionId, {
        rest_recreation_amount: row.amount || 0,
        rest_recreation_due: row.due || 0,
      })
      if (restRes && 'error' in restRes && restRes.error) return restRes
    }

    return await saveFormAllowanceRow(submissionId, type.id, {
      count: row.count,
      total_basic: row.total_basic,
      amount: row.amount,
      due: row.due,
      applicable_category: type.applicable_category,
    })
  }

  const handleSaveModal = () => {
    if (!activeType) return

    const count = parseInt(countInput, 10) || 0
    const totalBasic = parseFloat(basicInput) || 0
    const due = parseFloat(dueInput) || 0
    let amount = parseFloat(amountInput) || 0

    // Calculated allowances derive their amount instead of taking one. The formula
    // is the card's administrator-set key, so the preview matches the budget engine.
    if (activeType.is_calculated) {
      amount = calculateAllowance(
        activeType.formula_key,
        { count, total_basic: totalBasic, amount, due },
        { dutyMonthlyRate, dutyMonths, salaryMonths }
      )
    }

    const updatedRow: AllowanceRowData = {
      count,
      total_basic: totalBasic,
      amount,
      due,
    }

    setAllowanceData((prev) => ({ ...prev, [activeType.id]: updatedRow }))
    closeModal()

    if (!submissionId) return
    startTransition(async () => {
      await persistRow(activeType, updatedRow)
    })
  }

  const handleConfirmDelete = () => {
    if (keyToDelete === null) return
    const type = typesById.get(keyToDelete)
    setKeyToDelete(null)
    if (!type) return

    setAllowanceData((prev) => {
      const copy = { ...prev }
      delete copy[type.id]
      return copy
    })

    if (!submissionId) return
    const zeroRow: AllowanceRowData = { count: 0, total_basic: 0, amount: 0, due: 0 }
    startTransition(async () => {
      await persistRow(type, zeroRow)
    })
  }

  // Check if a card has saved data
  const hasData = (id: number) => {
    const d = allowanceData[id]
    if (!d) return false
    return d.count > 0 || d.total_basic > 0 || d.amount > 0 || d.due > 0
  }

  // Save every card that holds data
  const handleSaveAll = async () => {
    if (!submissionId) return
    for (const type of allowanceTypes) {
      const row = allowanceData[type.id]
      if (!row) continue
      const res = await persistRow(type, row)
      if (res && 'error' in res && res.error) return res
    }
  }

  return (
    <FormShell
      title={strings.forms.form5.title}
      formNumber={5}
      prevHref="/office/form-4"
      nextHref="/office/form-6"
      onSave={submissionId ? handleSaveAll : undefined}
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header subtitle */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-800">{strings.form5.subtitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            নিচের কার্ডগুলো থেকে যে ভাতাগুলো আপনার অফিসের জন্য প্রযোজ্য, সেগুলোতে তথ্য যোগ করুন। অপ্রযোজ্য ভাতা খালি রাখুন।
          </p>
        </div>

        {allowanceTypes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center">
            <p className="text-sm text-slate-500">
              কোনো ভাতার ধরন এখনও কনফিগার করা হয়নি। প্রশাসনিক সেটিংস থেকে ভাতার ধরন যোগ করুন।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allowanceTypes.map((type, index) => {
              const data = allowanceData[type.id]
              const filled = hasData(type.id)

              return (
                <Card
                  key={type.id}
                  className={`flex flex-col justify-between transition-all duration-200 border rounded-2xl shadow-xs overflow-hidden ${
                    filled
                      ? 'border-blue-200 bg-white ring-1 ring-blue-100'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <CardHeader
                    className={cn(
                      'border-b px-4 py-2.5',
                      titleAccents[index % titleAccents.length]
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        {filled && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                        {type.label_bn}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    {filled ? (
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between py-0.5 border-b border-slate-100">
                          <span className="text-slate-500">{type.count_label_bn}</span>
                          <span className="font-bold font-mono text-slate-800">
                            {toBanglaNumber(data.count)} {strings.form5.personUnit}
                          </span>
                        </div>

                        {type.has_basic && (
                          <div className="flex justify-between py-0.5 border-b border-slate-100">
                            <span className="text-slate-500">{strings.form5.totalBasicMonthly} ({strings.hazar.badge})</span>
                            <span className="font-bold font-mono text-slate-800">
                              {toBanglaHazar(data.total_basic)}
                            </span>
                          </div>
                        )}

                        {type.has_amount && (
                          <div className="flex justify-between py-0.5 border-b border-slate-100">
                            <span className="text-slate-500">{strings.form5.amount} ({strings.hazar.badge})</span>
                            <span className="font-bold font-mono text-slate-800">
                              {toBanglaHazar(data.amount)}
                            </span>
                          </div>
                        )}

                        {type.has_due && (
                          <div className="flex justify-between py-0.5">
                            <span className="text-slate-500">{strings.form5.due} ({strings.hazar.badge})</span>
                            <span className="font-bold font-mono text-slate-700">
                              {data.due ? toBanglaHazar(data.due) : '—'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-3 text-center">
                        <p className="text-xs text-slate-400">তথ্য যুক্ত করা হয়নি</p>
                      </div>
                    )}

                    {/* Action button */}
                    <div>
                      {filled ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openModal(type)}
                            className="flex-1 text-blue-700 border-blue-200 hover:bg-blue-50 text-xs h-8 gap-1.5"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            {strings.form5.editAllowance}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setKeyToDelete(type.id)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                            title={strings.form5.deleteAllowance}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openModal(type)}
                          className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 text-xs h-8 gap-1.5 font-semibold"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {strings.form5.addAllowance}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog
        open={activeId !== null}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              {activeType?.label_bn}
            </DialogTitle>
          </DialogHeader>

          {activeType && (
            <div className="space-y-4 py-2">
              {/* Count Input */}
              <div className="space-y-1.5">
                <Label htmlFor="allowance_count">{activeType.count_label_bn}</Label>
                <Input
                  id="allowance_count"
                  type="number"
                  min="0"
                  placeholder="যেমন: ৩"
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                />
              </div>

              {/* Total Basic */}
              {activeType.has_basic && (
                <div className="space-y-1.5">
                  <Label htmlFor="allowance_basic">{strings.form5.totalBasicMonthly}</Label>
                  <AmountField
                    id="allowance_basic"
                    min="0"
                    placeholder="যেমন: ৭০"
                    value={basicInput}
                    onValueChange={(taka) => setBasicInput(taka)}
                  />
                </div>
              )}

              {/* Amount */}
              {activeType.has_amount && (
                <div className="space-y-1.5">
                  <Label htmlFor="allowance_amount">{strings.form5.amount}</Label>
                  <AmountField
                    id="allowance_amount"
                    min="0"
                    placeholder="যেমন: ১.৫"
                    value={amountInput}
                    onValueChange={(taka) => setAmountInput(taka)}
                  />
                </div>
              )}

              {/* Due */}
              {activeType.has_due && (
                <div className="space-y-1.5">
                  <Label htmlFor="allowance_due">{strings.form5.due}</Label>
                  <AmountField
                    id="allowance_due"
                    min="0"
                    placeholder="ঐচ্ছিক (বকেয়া থাকলে)"
                    value={dueInput}
                    onValueChange={(taka) => setDueInput(taka)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex sm:justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
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
      <Dialog
        open={keyToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setKeyToDelete(null)
        }}
      >
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
