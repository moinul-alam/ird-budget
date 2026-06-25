'use client'

import { strings } from '@/lib/strings'
import { Button, buttonVariants } from '@/components/ui/button'
import { Save, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'

interface FormShellProps {
  title: string
  formNumber: number
  prevHref?: string
  nextHref?: string
  children: React.ReactNode
  onSave?: () => Promise<void>
}

export function FormShell({
  title,
  formNumber,
  prevHref,
  nextHref,
  children,
  onSave,
}: FormShellProps) {
  const [isPending, startTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const handleSave = () => {
    if (!onSave) return
    setSaveStatus('saving')
    startTransition(async () => {
      await onSave()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    })
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100 text-blue-700 text-sm font-bold font-mono">
              {formNumber}
            </span>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              {strings.saved}
            </span>
          )}
          {onSave && (
            <Button onClick={handleSave} disabled={isPending} size="sm">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {isPending ? strings.saving : strings.saving.replace('...', '')}
            </Button>
          )}
        </div>
      </div>

      {/* Form content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {children}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        {prevHref ? (
          <Link href={prevHref} prefetch={true} className={buttonVariants({ variant: "outline" })}>
            {strings.previous}
          </Link>
        ) : (
          <div />
        )}
        {nextHref && (
          <Link href={nextHref} prefetch={true} className={buttonVariants({ variant: "default" })}>
            {strings.next}
          </Link>
        )}
      </div>
    </div>
  )
}
