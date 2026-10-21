'use client'

import { strings } from '@/lib/strings'
import { toBanglaNumber } from '@/lib/bangla'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Save, Loader2, CheckCircle, ArrowLeft, ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface FormShellProps {
  title: string
  formNumber: number
  prevHref?: string
  nextHref?: string
  children: React.ReactNode
  onSave?: () => Promise<void>
  onReset?: () => Promise<void> | void
}

export function FormShell({
  title,
  formNumber,
  prevHref,
  nextHref,
  children,
  onSave,
  onReset,
}: FormShellProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleSaveOnly = () => {
    if (!onSave) return
    setSaveStatus('saving')
    startTransition(async () => {
      try {
        await onSave()
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } catch (e) {
        setSaveStatus('idle')
      }
    })
  }

  const handleSaveAndNext = () => {
    setSaveStatus('saving')
    startTransition(async () => {
      try {
        if (onSave) {
          await onSave()
        }
        setSaveStatus('saved')
        if (nextHref) {
          router.push(nextHref)
        }
      } catch (e) {
        setSaveStatus('idle')
      }
    })
  }

  const handleConfirmReset = async () => {
    setIsResetting(true)
    try {
      if (onReset) {
        await onReset()
      } else {
        router.refresh()
      }
    } finally {
      setIsResetting(false)
      setResetModalOpen(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header: Centered title with Back on Left and Next on Right */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
        {/* Left: Previous Button */}
        <div className="w-32 flex justify-start">
          {prevHref ? (
            <Link
              href={prevHref}
              prefetch={true}
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'rounded-xl text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-50',
              })}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{strings.previous}</span>
            </Link>
          ) : (
            <div />
          )}
        </div>

        {/* Center: Form Number & Title */}
        <div className="flex-1 text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs sm:text-sm font-black font-mono border border-blue-200 shadow-2xs">
            ফর্ম {toBanglaNumber(formNumber)}
          </span>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight">
            {title}
          </h1>
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 flex items-center gap-1 font-bold animate-in fade-in">
              <CheckCircle className="h-3.5 w-3.5" />
              সংরক্ষিত
            </span>
          )}
        </div>

        {/* Right: Next Button */}
        <div className="w-32 flex justify-end">
          {nextHref ? (
            <Link
              href={nextHref}
              prefetch={true}
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'rounded-xl text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-50',
              })}
            >
              <span>{strings.next}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {children}
      </div>

      {/* Bottom Center 3 Action Buttons: [Reset] [Save] [Save and Next] */}
      <div className="py-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 border-t border-slate-200/60">
        {/* 1. Reset Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setResetModalOpen(true)}
          disabled={isPending || isResetting}
          className="rounded-xl border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-xs sm:text-sm font-bold gap-1.5 px-4 sm:px-5 py-2.5 shadow-2xs transition-all"
        >
          <RotateCcw className="h-4 w-4 text-slate-500" />
          রিসেট
        </Button>

        {/* 2. Save Button (Saves and stays on page) */}
        {onSave && (
          <Button
            type="button"
            onClick={handleSaveOnly}
            disabled={isPending}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold gap-1.5 px-5 sm:px-6 py-2.5 shadow-sm transition-all"
          >
            {isPending && saveStatus === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            সংরক্ষণ করুন
          </Button>
        )}

        {/* 3. Save & Next Button (Saves and proceeds to next form) */}
        {nextHref ? (
          <Button
            type="button"
            onClick={handleSaveAndNext}
            disabled={isPending}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold gap-1.5 px-5 sm:px-6 py-2.5 shadow-sm transition-all"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            সংরক্ষণ ও পরবর্তী
          </Button>
        ) : (
          <Link
            href="/office/budget-sheet"
            className={buttonVariants({
              variant: 'default',
              className: 'rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold gap-1.5 px-5 sm:px-6 py-2.5 shadow-sm',
            })}
          >
            চূড়ান্ত বাজেট দেখুন
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        )}
      </div>

      {/* Safety Confirmation Dialog for Reset */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                আপনি কি নিশ্চিতভাবে এই ফর্মটি রিসেট করতে চান?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed pt-1">
              রিসেট করলে এই ফর্মে সম্প্রতি দেওয়া অসঙ্গতিপূর্ণ বা অপূর্ণ তথ্য পূর্বাবস্থায় ফিরে যাবে।
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetModalOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={isResetting}
              className="rounded-xl text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700"
            >
              {isResetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              হ্যাঁ, রিসেট করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
