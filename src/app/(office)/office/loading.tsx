import { Loader2 } from 'lucide-react'
import { strings } from '@/lib/strings'

export default function OfficeLoading() {
  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-slate-200 rounded-md animate-pulse" />
      </div>

      {/* Form Content Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center text-slate-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          <p className="text-sm font-medium">{strings.loading}</p>
        </div>
      </div>

      {/* Navigation Skeleton */}
      <div className="mt-6 flex items-center justify-between">
        <div className="h-10 w-24 bg-slate-200 rounded-md animate-pulse" />
        <div className="h-10 w-24 bg-slate-200 rounded-md animate-pulse" />
      </div>
    </div>
  )
}
