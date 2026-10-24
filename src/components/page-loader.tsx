import { cn } from '@/lib/utils'
import { strings } from '@/lib/strings'

/**
 * The app-wide loading placeholder: a shimmering skeleton of the page it stands in
 * for, rather than a lone spinner, so the layout does not jump when the real content
 * arrives. Drop it into any route's `loading.tsx`.
 */
export function PageLoader({
  label = strings.loading,
  className,
}: {
  /** Status line under the skeleton. */
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto w-full animate-in fade-in duration-300',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {/* Indeterminate progress bar — the one moving cue in an otherwise still page. */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden bg-blue-100/60">
        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[loader-slide_1.2s_ease-in-out_infinite]" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-3">
          <div className="h-8 w-52 rounded-lg bg-slate-200/80 animate-pulse" />
          <div className="h-4 w-36 rounded bg-slate-200/60 animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-xl bg-slate-200/80 animate-pulse" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="h-3 w-24 rounded bg-slate-200/70 animate-pulse" />
            <div className="h-7 w-28 rounded bg-slate-200/80 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center px-6 h-14 bg-slate-100/70 border-b border-slate-100">
          <div className="h-4 w-40 rounded bg-slate-200/80 animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-3.5 w-6 rounded bg-slate-200/60 animate-pulse" />
              <div className="h-3.5 w-20 rounded bg-slate-200/70 animate-pulse" />
              <div className="h-3.5 flex-1 max-w-[320px] rounded bg-slate-200/60 animate-pulse" />
              <div className="ml-auto h-3.5 w-24 rounded bg-slate-200/70 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm font-semibold text-slate-400">{label}</p>
    </div>
  )
}
