import { Loader2 } from 'lucide-react'
import { strings } from '@/lib/strings'

export default function DashboardLoading() {
  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
      </div>

      {/* Content Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center text-slate-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          <p className="text-sm font-medium">{strings.loading}</p>
        </div>
      </div>
    </div>
  )
}
