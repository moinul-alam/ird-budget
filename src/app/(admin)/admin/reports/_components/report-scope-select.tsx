'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface ScopeOption {
  value: string
  label: string
}

/**
 * A report scope picker kept in the URL (`?level=` / `?rule=`) so a server
 * re-render — and any refresh — keeps the chosen scope, matching the convention
 * used by the admin settings tabs.
 */
export function ReportScopeSelect({
  paramKey,
  label,
  value,
  options,
  placeholder,
}: {
  paramKey: string
  label: string
  value: string
  options: ScopeOption[]
  placeholder: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramKey, next)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-1.5 w-full sm:max-w-md">
      <Label className="text-xs font-bold text-slate-700">{label}</Label>
      <Select value={value} onValueChange={(v) => v && handleChange(v)}>
        <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
          <SelectValue placeholder={placeholder}>
            {options.find((o) => o.value === value)?.label || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl text-xs max-h-72">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
