'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaNumber } from '@/lib/bangla'
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
import { saveFormReturnInfo, deleteFormReturnInfo } from '@/app/actions/forms'
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Users,
  CheckCircle2,
  UserX,
  BadgeAlert,
} from 'lucide-react'
import { useState, useTransition } from 'react'

export interface Form12ClientProps {
  submissionId: number | null
  initialData: any
}

export function Form12Client({ submissionId, initialData }: Form12ClientProps) {
  // Store return info record
  const [data, setData] = useState<{
    tin_count: number
    return_submitted_count: number
  } | null>(() => {
    if (
      initialData &&
      (Number(initialData.tin_count || 0) > 0 ||
        Number(initialData.return_submitted_count || 0) > 0)
    ) {
      return {
        tin_count: Number(initialData.tin_count || 0),
        return_submitted_count: Number(initialData.return_submitted_count || 0),
      }
    }
    return null
  })

  const [isPending, startTransition] = useTransition()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tinInput, setTinInput] = useState('')
  const [returnInput, setReturnInput] = useState('')

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Calculations
  const tinCount = data?.tin_count || 0
  const returnCount = data?.return_submitted_count || 0
  const nonFilerCount = Math.max(0, tinCount - returnCount)

  const openAddModal = () => {
    setTinInput(data?.tin_count ? String(data.tin_count) : '')
    setReturnInput(data?.return_submitted_count ? String(data.return_submitted_count) : '')
    setIsModalOpen(true)
  }

  const handleSaveModal = () => {
    const totalTin = parseInt(tinInput, 10) || 0
    const totalReturn = parseInt(returnInput, 10) || 0

    const payload = {
      tin_count: totalTin,
      return_submitted_count: totalReturn,
    }

    setData(payload)

    if (submissionId) {
      startTransition(async () => {
        await saveFormReturnInfo(submissionId, payload)
      })
    }

    setIsModalOpen(false)
  }

  const handleConfirmDelete = () => {
    setData(null)
    if (submissionId) {
      startTransition(async () => {
        await deleteFormReturnInfo(submissionId)
      })
    }
    setShowDeleteConfirm(false)
  }

  const handleSaveAll = async () => {
    if (!submissionId || !data) return
    return await saveFormReturnInfo(submissionId, {
      tin_count: data.tin_count,
      return_submitted_count: data.return_submitted_count,
    })
  }

  return (
    <FormShell
      title={strings.forms.form12.title}
      formNumber={12}
      prevHref="/office/form-11"
      nextHref="/office/budget-sheet"
      onSave={submissionId ? handleSaveAll : undefined}
    >
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Top Disclaimer / Instruction Banner with emphatic TAX OFFICE emphasis (Form 2B style) */}
        <div className="bg-rose-50/80 border border-rose-200/90 rounded-2xl p-5 flex items-start gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
            <BadgeAlert className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-rose-900">
                {strings.form12.title}
              </h3>
              <span className="text-[11px] font-semibold bg-rose-200/80 text-rose-800 px-2 py-0.5 rounded-full">
                {strings.form12.emphasisDisclaimer}
              </span>
            </div>
            <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
              {strings.form12.cautionNotice}
            </p>
          </div>
          {!data && (
            <Button
              type="button"
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5 rounded-xl font-medium shadow-xs"
            >
              <Plus className="h-4 w-4" />
              {strings.form12.addReturnInfo}
            </Button>
          )}
        </div>

        {/* Empty State */}
        {!data ? (
          <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium text-base mb-5 max-w-lg mx-auto">
              {strings.form12.noReturnInfo}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={openAddModal}
              className="text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {strings.form12.addReturnInfo}
            </Button>
          </div>
        ) : (
          /* Entered Information Cards */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      সার্কেল রিটার্ন ও টিআইএন বিবরণী
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      ডাক ব্যয় ও প্রাক্কলনে ব্যবহারের জন্য সংরক্ষিত তথ্য
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
                    {strings.form12.editReturnInfo}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 rounded-lg"
                    title={strings.form12.deleteReturnInfo}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Saved Info Cards: 3 stats cards in one line */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* ১. সার্কেলে মোট টিআইএন */}
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100/80 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-blue-900 font-medium">
                      {strings.form12.circleTinDisplay}
                    </span>
                    <p className="text-xl font-bold text-blue-950 font-mono mt-0.5">
                      {toBanglaNumber(tinCount)} <span className="text-xs font-normal text-blue-700">{strings.form12.personUnit}</span>
                    </p>
                  </div>
                </div>

                {/* ২. দাখিলকৃত রিটার্ন */}
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100/80 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-emerald-900 font-medium">
                      {strings.form12.circleReturnDisplay}
                    </span>
                    <p className="text-xl font-bold text-emerald-950 font-mono mt-0.5">
                      {toBanglaNumber(returnCount)} <span className="text-xs font-normal text-emerald-700">{strings.form12.personUnit}</span>
                    </p>
                  </div>
                </div>

                {/* ৩. নন-ফাইলার (subtraction of above 2) */}
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100/80 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-amber-900 font-medium">
                      {strings.form12.nonFilerDisplay}
                    </span>
                    <p className="text-xl font-bold text-amber-950 font-mono mt-0.5">
                      {toBanglaNumber(nonFilerCount)} <span className="text-xs font-normal text-amber-700">{strings.form12.personUnit}</span>
                    </p>
                  </div>
                </div>
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
              <FileText className="w-5 h-5 text-blue-600" />
              {data ? strings.form12.editModalTitle : strings.form12.modalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* সার্কেলের মোট টিআইএন এর সংখ্যা */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form12.circleTinCount} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ৫০০০"
                value={tinInput}
                onChange={(e) => setTinInput(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* সার্কেলে দাখিলকৃত মোট রিটার্নের সংখ্যা */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form12.circleReturnCount} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ৩৫০০"
                value={returnInput}
                onChange={(e) => setReturnInput(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* Live Non-filer preview in modal */}
            {tinInput && returnInput && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-700">
                <span className="font-medium">{strings.form12.nonFilerDisplay}:</span>
                <span className="font-bold text-amber-800">
                  {toBanglaNumber(
                    Math.max(
                      0,
                      (parseInt(tinInput, 10) || 0) - (parseInt(returnInput, 10) || 0)
                    )
                  )}{' '}
                  {strings.form12.personUnit}
                </span>
              </div>
            )}
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
              disabled={!tinInput || !returnInput || isPending}
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
              {strings.form12.confirmDeleteTitle}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            {strings.form12.confirmDeleteDesc}
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
