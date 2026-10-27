'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { strings } from '@/lib/strings'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <AlertTriangle className="size-8" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">{strings.errors.errorTitle}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{strings.errors.errorMessage}</p>
        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-slate-400">{error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="default" size="lg" onClick={() => reset()}>
            <RotateCcw aria-hidden="true" />
            {strings.errors.retry}
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/" />}>
            {strings.errors.backHome}
          </Button>
        </div>
      </div>
    </main>
  )
}
