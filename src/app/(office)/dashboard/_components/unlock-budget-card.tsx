'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { strings } from '@/lib/strings'
import { unlockBudget } from '@/app/actions/budget'

/**
 * Shown under the submission-status box once a budget has been submitted. The
 * office can re-open its own submission for editing, so no administrator action
 * is required.
 */
export function UnlockBudgetCard({ submissionId }: { submissionId: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const res = await unlockBudget(submissionId)
      if (res?.error) {
        setError(res.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl border border-dashed border-slate-300 bg-white hover:border-amber-400 hover:bg-amber-50/60 text-slate-600 hover:text-amber-800 transition-all group cursor-pointer"
      >
        <Lock className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
        <span className="text-sm font-bold">{strings.dashboard.unlockPrompt}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 rounded-xl bg-amber-50">
                <RotateCcw className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {strings.dashboard.unlockModalTitle}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed pt-1">
              {strings.dashboard.unlockModalMessage}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              {strings.dashboard.unlockCancel}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {strings.dashboard.unlockConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
