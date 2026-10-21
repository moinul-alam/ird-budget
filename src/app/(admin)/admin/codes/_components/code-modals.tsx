'use client'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { BudgetCategoryItem } from '@/app/actions/admin-codes'
import { CategoryModalState, CodeModalState } from '../_types/codes'

interface CategoryModalProps {
  modal: CategoryModalState
  setModal: React.Dispatch<React.SetStateAction<CategoryModalState>>
  onSave: () => void
  isPending: boolean
}

export function CategoryModal({
  modal,
  setModal,
  onSave,
  isPending,
}: CategoryModalProps) {
  return (
    <Dialog open={modal.open} onOpenChange={(open) => !open && setModal((prev) => ({ ...prev, open: false }))}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            {modal.id ? 'বাজেট ক্যাটাগরি সম্পাদনা' : 'নতুন বাজেট ক্যাটাগরি তৈরি'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">বাজেট ক্যাটাগরি নাম (যেমন: নগদ মজুরি ও বেতন)</Label>
            <Input
              type="text"
              value={modal.title}
              onChange={(e) => setModal((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="ক্যাটাগরির শিরোনাম লিখুন..."
              className="rounded-xl border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">ক্যাটাগরি কোড (শুধুমাত্র সংখ্যা, যেমন: ৩১১১)</Label>
            <Input
              type="text"
              value={modal.code}
              onChange={(e) => setModal((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, '') }))}
              placeholder="যেমন: 3111"
              className="rounded-xl border-slate-200 font-mono font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Hierarchy (ক্রম)</Label>
            <Input
              type="number"
              min={1}
              value={modal.hierarchy_order}
              onChange={(e) => setModal((prev) => ({ ...prev, hierarchy_order: parseInt(e.target.value, 10) || 1 }))}
              className="rounded-xl border-slate-200 font-mono"
            />
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setModal((prev) => ({ ...prev, open: false }))}
            className="rounded-xl text-xs font-semibold"
          >
            বাতিল
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            সংরক্ষণ করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CodeModalProps {
  modal: CodeModalState
  setModal: React.Dispatch<React.SetStateAction<CodeModalState>>
  categories: BudgetCategoryItem[]
  onSave: () => void
  isPending: boolean
}

export function CodeModal({
  modal,
  setModal,
  categories,
  onSave,
  isPending,
}: CodeModalProps) {
  return (
    <Dialog
      open={modal.open}
      onOpenChange={(open) => !open && setModal((prev) => ({ ...prev, open: false }))}
    >
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            {modal.id ? 'অর্থনৈতিক কোড সম্পাদনা' : 'নতুন অর্থনৈতিক কোড যুক্ত করুন'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Code Category (ক্যাটাগরি নির্বাচন করুন)</Label>
            <Select
              value={modal.parent_code}
              onValueChange={(val) => {
                if (val) {
                  const cat = categories.find((c) => c.code === val)
                  setModal((prev) => ({
                    ...prev,
                    parent_code: val,
                    parent_title: cat?.title || '',
                  }))
                }
              }}
            >
              <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.code}>
                    {c.code} - {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Economic Code (বাজেট কোড)</Label>
            <Input
              type="text"
              value={modal.code}
              onChange={(e) => setModal((prev) => ({ ...prev, code: e.target.value.trim() }))}
              placeholder="যেমন: 3111101"
              className="rounded-xl border-slate-200 font-mono font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Code Description (কোডের বিবরণ)</Label>
            <Input
              type="text"
              value={modal.name}
              onChange={(e) => setModal((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="যেমন: মূল বেতন (অফিসার)"
              className="rounded-xl border-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">ক্রম (Hierarchy Order)</Label>
            <Input
              type="number"
              min={1}
              value={modal.hierarchy_order}
              onChange={(e) =>
                setModal((prev) => ({ ...prev, hierarchy_order: parseInt(e.target.value, 10) || 1 }))
              }
              className="rounded-xl border-slate-200 font-mono"
            />
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setModal((prev) => ({ ...prev, open: false }))}
            className="rounded-xl text-xs font-semibold"
          >
            বাতিল
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            সংরক্ষণ করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ConfirmToggleAllDialogProps {
  modal: {
    open: boolean
    enableAll: boolean
    title: string
    description: string
  }
  setModal: React.Dispatch<React.SetStateAction<{
    open: boolean
    enableAll: boolean
    title: string
    description: string
  }>>
  onConfirm: () => void
  isPending: boolean
}

export function ConfirmToggleAllDialog({
  modal,
  setModal,
  onConfirm,
  isPending,
}: ConfirmToggleAllDialogProps) {
  return (
    <Dialog open={modal.open} onOpenChange={(open) => !open && setModal((prev) => ({ ...prev, open: false }))}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            {modal.title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-xs text-slate-600 leading-relaxed">
            {modal.description}
          </p>
        </div>
        <DialogFooter className="pt-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setModal((prev) => ({ ...prev, open: false }))}
            className="rounded-xl text-xs font-semibold"
          >
            বাতিল
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm()
              setModal((prev) => ({ ...prev, open: false }))
            }}
            disabled={isPending}
            className={`rounded-xl text-white font-bold text-xs ${
              modal.enableAll
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {modal.enableAll ? 'হ্যাঁ, সকল চালু করুন' : 'হ্যাঁ, সকল বন্ধ করুন'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
