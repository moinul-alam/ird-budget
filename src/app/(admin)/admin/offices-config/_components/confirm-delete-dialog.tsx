'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { ConfirmModalState } from '../_types/offices-config'

interface ConfirmDeleteDialogProps {
  confirmModal: ConfirmModalState
  setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>
  isPending: boolean
}

export function ConfirmDeleteDialog({
  confirmModal,
  setConfirmModal,
  isPending,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={confirmModal.open}
      onOpenChange={(open) => !open && setConfirmModal((prev) => ({ ...prev, open: false }))}
    >
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>{confirmModal.title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-xs text-slate-600 leading-relaxed">
            {confirmModal.description}
          </p>
        </div>
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
            className="rounded-xl text-xs font-semibold"
          >
            বাতিল
          </Button>
          <Button
            type="button"
            onClick={confirmModal.onConfirm}
            disabled={isPending}
            className="rounded-xl text-white font-bold text-xs bg-rose-600 hover:bg-rose-700"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            মুছে ফেলা নিশ্চিত করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
