'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { saveFormHouseRent, deleteFormHouseRent } from '@/app/actions/forms'
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  Info,
  Banknote,
  Receipt,
} from 'lucide-react'
import { useState, useTransition } from 'react'

export interface Form9ClientProps {
  submissionId: number | null
  initialData: any
  vatPercentage: number
  /** বেতন-ভাতা মাস (/admin/settings) — annualises the monthly rent like the sheet engine. */
  salaryMonths: number
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
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Top Disclaimer / Instruction Banner (Form 2B style: instructing only enter if applicable) */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 flex items-start gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-900">
                {strings.form9.title}
              </h3>
              <span className="text-[11px] font-semibold bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded-full">
                {strings.form9.applicableNote}
              </span>
            </div>
            <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
              {strings.form9.subtitle}
            </p>
          </div>
          {!data && (
            <Button
              type="button"
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5 rounded-xl font-medium shadow-xs"
            >
              <Plus className="h-4 w-4" />
              {strings.form9.addHouseRent}
            </Button>
          )}
        </div>

        {/* Empty State */}
        {!data ? (
          <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium text-base mb-2">
              {strings.form9.noHouseRent}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
              যদি আপনার অফিস ভাড়া ভবনে অবস্থিত হয়, তবে নিচের বাটনে চাপ দিয়ে চুক্তি ও ভাড়ার তথ্য যোগ করুন।
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={openAddModal}
              className="text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {strings.form9.addHouseRent}
            </Button>
          </div>
        ) : (
          /* Entered Information Card */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      ভাড়া সংক্রান্ত সংরক্ষিত বিবরণ
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      অফিস স্পেস ও চুক্তির বিস্তারিত তথ্য
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openAddModal}
                    className="text-blue-700 border-blue-200 hover:bg-blue-50 text-xs h-8 gap-1.5 rounded-lg"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    {strings.form9.editHouseRent}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 rounded-lg"
                    title={strings.form9.deleteHouseRent}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {/* ভ্যাট ব্যতিত মাসিক ভাড়া */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-500 font-medium">
                    {strings.form9.monthlyBillExVat}
                  </span>
                  <p className="text-lg font-bold text-slate-900 font-mono">
                    {toBanglaAmount(data.monthly_bill)}
                  </p>
                </div>

                {/* ভ্যাট ব্যতিত বকেয়া ভাড়া */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-500 font-medium">
                    {strings.form9.dueExVat}
                  </span>
                  <p className="text-lg font-bold text-slate-900 font-mono">
                    {data.due > 0 ? (
                      <span className="text-rose-600">{toBanglaAmount(data.due)}</span>
                    ) : (
                      <span className="text-slate-400 text-sm">কোনো বকেয়া নেই</span>
                    )}
                  </p>
                </div>

                {/* চুক্তির মেয়াদ */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {strings.form9.contractDuration}
                  </span>
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {data.contract_start_date ? data.contract_start_date : '—'} হতে{' '}
                    {data.contract_end_date ? data.contract_end_date : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Summary: ভ্যাটসহ বাৎসরিক অফিস ভাড়া ____ টাকা */}
            <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/70 rounded-2xl border border-blue-200/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-950">
                    {strings.form9.yearlyTotalWithVat}
                  </h4>
                  <p className="text-xs text-blue-700 mt-0.5">
                    ({strings.form9.vatRateNote}: {toBanglaNumber(vatRate)}% ভ্যাট সংযুক্ত)
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-2xl font-black text-blue-900 font-mono tracking-tight">
                  {toBanglaAmount(yearlyTotalWithVat)}
                </p>
                <p className="text-[11px] text-blue-600/90 mt-0.5">
                  (মাসিক ভাড়া × {toBanglaNumber(salaryMonths)} মাস × {toBanglaNumber(1 + vatRate / 100)}) + বকেয়া
                </p>
              </div>
            </div>
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
              <Input
                type="number"
                min="0"
                placeholder={strings.form9.monthlyBillExVatPlaceholder}
                value={monthlyInput}
                onChange={(e) => setMonthlyInput(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* ভ্যাট ব্যতিত বকেয়া ভাড়া (যদি থাকে) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form9.dueExVat}
              </Label>
              <Input
                type="number"
                min="0"
                placeholder={strings.form9.dueExVatPlaceholder}
                value={dueInput}
                onChange={(e) => setDueInput(e.target.value)}
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
