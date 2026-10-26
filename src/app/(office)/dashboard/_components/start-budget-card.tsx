'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Files, Loader2 } from 'lucide-react'
import { strings } from '@/lib/strings'
import { startBudget } from '@/app/actions/budget'

/**
 * The offer shown while a cycle is open but this office has not started yet. Nothing
 * is written to the database until the office accepts it — the draft is created by the
 * button, not by the login.
 */
export function StartBudgetCard() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleStart = () => {
    setError(null)
    startTransition(async () => {
      const res = await startBudget()
      if (res?.error) {
        setError(res.error)
        return
      }
      // The new submission id travels in the session cookie, so the whole office
      // shell (drawer, form locks, dashboard) has to re-read from the server.
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-sm">
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
      <div className="p-6 sm:p-9 flex flex-col items-center text-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 flex items-center justify-center">
          <Files className="h-8 w-8 text-blue-600" />
        </div>

        <div className="space-y-2 max-w-xl">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {strings.dashboard.startCardTitle}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {strings.dashboard.startCardMessage}
          </p>
        </div>

        {error && (
          <div className="w-full max-w-xl p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {isPending ? strings.dashboard.starting : strings.dashboard.startButton}
        </button>
      </div>
    </div>
  )
}
