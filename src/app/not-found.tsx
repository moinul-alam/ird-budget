import Link from 'next/link'
import { SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { strings } from '@/lib/strings'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-slate-50 px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <SearchX className="size-8" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-wide text-emerald-700">৪০৪</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{strings.errors.notFoundTitle}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{strings.errors.notFoundMessage}</p>
        <div className="mt-8 flex justify-center">
          <Button variant="default" size="lg" render={<Link href="/" />}>
            {strings.errors.backHome}
          </Button>
        </div>
      </div>
    </main>
  )
}
