'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AmountField } from '@/components/amount-field'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { saveFormHouseRent, deleteFormHouseRent } from '@/lib/actions/forms/house-rent'
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { HazarAmount } from '@/components/hazar-amount'
import type { FormHouseRentInitial } from '@/lib/office/load-form-data'
import { useState, useTransition } from 'react'
import type { ReactNode } from 'react'

export interface Form9ClientProps {
  submissionId: number | null
  initialData: FormHouseRentInitial
  vatPercentage: number
  /** বেতন-মাস (/admin/budgets, set on the budget cycle) — annualises the monthly rent like the sheet engine. */
  salaryMonths: number
}

/**
 * Colour profile of this form. The toolbar's solid button, the table card's tinted
 * strip and every row action read from here, so the list keeps one hue throughout.
 */
const accent = {
  solidButton: 'bg-blue-600 hover:bg-blue-700 text-white',
  rowAction: 'text-slate-500 hover:text-blue-600 hover:bg-blue-50',
  header: 'bg-blue-50/70 border-blue-100',
  dot: 'bg-blue-600',
  value: 'text-blue-700',
  card: 'bg-gradient-to-br from-slate-50 to-blue-50/40 border-blue-100',
}

/** The quiet uppercase heading every column shares; only the alignment varies. */
const COL_HEAD = 'px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500'

/** One cell of the bottom সারসংক্ষেপ. */
function SummaryBox({
  label,
  value,
  valueClass,
}: {
  label: string
  value: ReactNode
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
      <span className="block text-[11px] font-medium text-slate-500">{label}</span>
      <span className={cn('mt-0.5 block font-mono text-lg font-bold text-slate-800', valueClass)}>
        {value}
      </span>
    </div>
  )
}

export function Form9Client({
  submissionId,
  initialData,
  vatPercentage = 15,
  salaryMonths,
}: Form9ClientProps) {
  // Store house rent record
  const [data, setData] = useState<{
    monthly_bill: number
    due: number
    contract_start_date: string
    contract_end_date: string
  } | null>(() => {
    if (
      initialData &&
      (Number(initialData.monthly_bill || 0) > 0 ||
        Number(initialData.due || 0) > 0 ||
        initialData.contract_start_date ||
        initialData.contract_end_date)
    ) {
      return {
        monthly_bill: Number(initialData.monthly_bill || 0),
        due: Number(initialData.due || 0),
        contract_start_date: initialData.contract_start_date || '',
        contract_end_date: initialData.contract_end_date || '',
      }
    }
    return null
  })

  const [isPending, startTransition] = useTransition()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [monthlyInput, setMonthlyInput] = useState('')
  const [dueInput, setDueInput] = useState('')
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Calculations
  const monthly = data?.monthly_bill || 0
  const due = data?.due || 0
  const vatRate = vatPercentage || 0
  // Formula: ভ্যাটসহ বাৎসরিক অফিস ভাড়া = (ভ্যাট ব্যতিত মাসিক ভাড়া × বেতন-ভাতা মাস × (১ + ভ্যাট%)) + ভ্যাট ব্যতিত বকেয়া ভাড়া
  const yearlyTotalWithVat = Math.round(monthly * salaryMonths * (1 + vatRate / 100) + due)

  // The record as a one-row list, so the table reads the same way as every other form.
  const rows = data ? [data] : []
  // Arrears are the exception, not the rule — with none entered the column is just
  // noise, so it is dropped and the remaining columns take back its width.
  const hasDue = rows.some((r) => (r.due || 0) > 0)

  const openAddModal = () => {
    setMonthlyInput(data?.monthly_bill ? String(data.monthly_bill) : '')
    setDueInput(data?.due ? String(data.due) : '')
    setStartDateInput(data?.contract_start_date || '')
    setEndDateInput(data?.contract_end_date || '')
    setIsModalOpen(true)
  }

  const handleSaveModal = () => {
    const monthlyBill = parseInt(monthlyInput, 10) || 0
    const dueAmount = parseInt(dueInput, 10) || 0
    const startDate = startDateInput.trim() || null
    const endDate = endDateInput.trim() || null

    const payload = {
      monthly_bill: monthlyBill,
      due: dueAmount,
      contract_start_date: startDate,
      contract_end_date: endDate,
    }

    setData({
      monthly_bill: monthlyBill,
      due: dueAmount,
      contract_start_date: startDate || '',
      contract_end_date: endDate || '',
    })

    if (submissionId) {
      startTransition(async () => {
        await saveFormHouseRent(submissionId, payload)
      })
    }

    setIsModalOpen(false)
  }

  const handleConfirmDelete = () => {
    setData(null)
    if (submissionId) {
      startTransition(async () => {
        await deleteFormHouseRent(submissionId)
      })
    }
    setShowDeleteConfirm(false)
  }

  const handleSaveAll = async () => {
    if (!submissionId || !data) return
    return await saveFormHouseRent(submissionId, {
      monthly_bill: data.monthly_bill,
      due: data.due,
      contract_start_date: data.contract_start_date,
      contract_end_date: data.contract_end_date,
    })
  }

  return (
    <FormShell
      title={strings.forms.form9.title}
      formNumber={9}
      prevHref="/office/form-8"
      nextHref="/office/form-10"
      onSave={submissionId ? handleSaveAll : undefined}
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Toolbar — the one entry point for the rent record, with the হাজার-unit
            convention spelled out beside it. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* Height-matched to the button (h-8) so the toolbar reads as one strip. */}
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 shadow-sm sm:h-8 sm:py-0">
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs font-medium leading-snug text-amber-900 sm:text-sm sm:whitespace-nowrap">
              {strings.hazar.hint}
            </p>
          </div>
          <Button
            type="button"
            onClick={openAddModal}
            className={cn('shrink-0 gap-1.5 rounded-xl', accent.solidButton)}
          >
            <Plus className="h-4 w-4" />
            {strings.form9.addHouseRent}
          </Button>
        </div>

        {/* The legal/explanatory note that carries this form's meaning. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            {strings.form9.applicableNote}
          </span>
          <p className="text-xs text-slate-500">{strings.form9.subtitle}</p>
        </div>

        {/* Data Table or Empty State */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center">
            <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-base font-medium text-slate-600">{strings.form9.noHouseRent}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className={cn('flex items-center gap-2 border-b px-4 py-2.5', accent.header)}>
                <span className={cn('h-2 w-2 rounded-full', accent.dot)} />
                <h3 className="text-sm font-bold text-slate-800">{strings.form9.title}</h3>
              </div>
              <Table className="min-w-[640px] table-fixed">
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className={cn(COL_HEAD, 'w-[8%] text-center')}>{strings.form9.serialColumn}</TableHead>
                    <TableHead className={cn(COL_HEAD, hasDue ? 'w-[18%]' : 'w-[22%]', 'text-center')}>{strings.form9.monthlyBillExVat}</TableHead>
                    {hasDue && (
                      <TableHead className={cn(COL_HEAD, 'w-[14%] text-center')}>{strings.form9.dueExVat}</TableHead>
                    )}
                    <TableHead className={cn(COL_HEAD, hasDue ? 'w-[15%]' : 'w-[17%]', 'text-center')}>{strings.form9.contractStart}</TableHead>
                    <TableHead className={cn(COL_HEAD, hasDue ? 'w-[15%]' : 'w-[17%]', 'text-center')}>{strings.form9.contractEnd}</TableHead>
                    <TableHead className={cn(COL_HEAD, hasDue ? 'w-[19%]' : 'w-[24%]', 'text-center')}>{strings.form9.yearlyTotalWithVat}</TableHead>
                    <TableHead className={cn(COL_HEAD, 'w-[12%] text-center')}>অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx} className="border-slate-100 even:bg-slate-50/50 hover:bg-slate-50">
                      <TableCell className="px-4 py-2.5 text-center text-slate-400">
                        {toBanglaNumber(idx + 1)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-center font-semibold text-slate-800">
                        <HazarAmount taka={row.monthly_bill} />
                      </TableCell>
                      {hasDue && (
                        <TableCell className="px-4 py-2.5 text-center font-medium text-slate-600">
                          <HazarAmount taka={row.due} />
                        </TableCell>
                      )}
                      <TableCell className="px-4 py-2.5 text-center font-medium text-slate-600">
                        {row.contract_start_date || strings.na}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-center font-medium text-slate-600">
                        {row.contract_end_date || strings.na}
                      </TableCell>
                      <TableCell className={cn('px-4 py-2.5 text-center font-semibold', accent.value)}>
                        <HazarAmount taka={yearlyTotalWithVat} />
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={openAddModal}
                            className={cn('h-8 w-8 p-0', accent.rowAction)}
                            title={strings.form9.editHouseRent}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title={strings.form9.deleteHouseRent}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary Card */}
            <Card className={cn('border shadow-xs', accent.card)}>
              <CardContent className="space-y-4 p-5">
                <div className={cn('grid grid-cols-1 gap-3', hasDue ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                  <SummaryBox
                    label={strings.form9.monthlyBillExVat}
                    value={<HazarAmount taka={monthly} />}
                  />
                  {hasDue && (
                    <SummaryBox
                      label={strings.form9.dueExVat}
                      value={<HazarAmount taka={due} />}
                    />
                  )}
                  <SummaryBox
                    label={strings.form9.yearlyTotalWithVat}
                    value={<HazarAmount taka={yearlyTotalWithVat} />}
                    valueClass={accent.value}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {strings.form9.vatRateNote}: {toBanglaNumber(vatRate)}% ভ্যাট সংযুক্ত
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              {data ? strings.form9.editModalTitle : strings.form9.modalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* ভ্যাট ব্যতিত মাসিক ভাড়া */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form9.monthlyBillExVat} <span className="text-rose-500">*</span>
              </Label>
              <AmountField
                placeholder={strings.form9.monthlyBillExVatPlaceholder}
                value={monthlyInput}
                onValueChange={(taka) => setMonthlyInput(taka)}
                className="bg-white"
              />
            </div>

            {/* ভ্যাট ব্যতিত বকেয়া ভাড়া (যদি থাকে) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form9.dueExVat}
              </Label>
              <AmountField
                placeholder={strings.form9.dueExVatPlaceholder}
                value={dueInput}
                onValueChange={(taka) => setDueInput(taka)}
                className="bg-white"
              />
            </div>

            {/* চুক্তির মেয়াদ: শুরুর তারিখ ও শেষের তারিখ */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                {strings.form9.contractDuration}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500">{strings.form9.contractStart}</span>
                  <Input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500">{strings.form9.contractEnd}</span>
                  <Input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isPending}
            >
              {strings.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSaveModal}
              disabled={!monthlyInput || isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? strings.saving : strings.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(open) => !open && setShowDeleteConfirm(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              {strings.form9.confirmDeleteTitle}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            {strings.form9.confirmDeleteDesc}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isPending}
            >
              {strings.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              {isPending ? strings.saving : strings.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormShell>
  )
}
