'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { strings } from '@/lib/strings'
import { toBanglaNumber } from '@/lib/bangla'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, CircleDashed, Clock, SlidersHorizontal } from 'lucide-react'

/** One office's submission state in the selected cycle. */
export interface StatusOfficeRow {
  id: number
  budgetId: string
  name: string
  officeType: string
  status: 'submitted' | 'draft' | 'not_started'
}

/** A cycle as the two pickers need it: fiscal year × budget type. */
export interface CycleOption {
  id: number
  year: string
  typeName: string
  isOpen: boolean
}

type StatusKey = StatusOfficeRow['status']
type StatusFilter = 'all' | StatusKey

const STATUS_FILTERS: StatusFilter[] = ['all', 'submitted', 'draft', 'not_started']

/** One labelled dropdown of the scope box. */
function SelectField({
  label,
  value,
  display,
  placeholder,
  onChange,
  children,
}: {
  label: string
  value: string
  display: string
  placeholder: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-slate-700">{label}</Label>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger className="w-full h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold transition-colors hover:border-slate-300 focus-visible:border-blue-500">
          <SelectValue placeholder={placeholder}>{display}</SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl text-xs max-h-72">{children}</SelectContent>
      </Select>
    </div>
  )
}

export function SubmissionStatusClient({
  rows,
  cycles,
  selectedYear,
  selectedType,
}: {
  rows: StatusOfficeRow[]
  cycles: CycleOption[]
  selectedYear: string
  selectedType: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const s = strings.reports.submissionStatus

  const [officeTypeFilter, setOfficeTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Both pickers carry the cycle in the URL, so a refresh keeps the chosen one.
  const applyCycle = (year: string, typeName: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('fy', year)
    params.set('bt', typeName)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Only the years and types that actually have a cycle are offered, so the pair always
  // resolves to one.
  const yearOptions = useMemo(
    () => Array.from(new Set(cycles.map((c) => c.year))).sort((a, b) => b.localeCompare(a, 'bn')),
    [cycles]
  )

  const typeOptions = useMemo(() => {
    const forYear = cycles.filter((c) => c.year === selectedYear).map((c) => c.typeName)
    const list = forYear.length > 0 ? forYear : cycles.map((c) => c.typeName)
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'bn'))
  }, [cycles, selectedYear])

  const handleYearChange = (year: string) => {
    // Switching to a year that lacks the current type jumps to one the year does have,
    // instead of asking the server for a cycle that does not exist.
    const available = cycles.filter((c) => c.year === year).map((c) => c.typeName)
    applyCycle(year, available.includes(selectedType) ? selectedType : available[0] ?? selectedType)
  }

  // Office types come from the rows themselves, so the filter never goes stale as types
  // are added and needs no hardcoded names.
  const officeTypeOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.officeType))).sort((a, b) =>
        a.localeCompare(b, 'bn')
      ),
    [rows]
  )

  // A cycle switch can leave the previous type selection behind; fall back to "all".
  useEffect(() => {
    if (officeTypeFilter !== 'all' && !officeTypeOptions.includes(officeTypeFilter)) {
      setOfficeTypeFilter('all')
    }
  }, [officeTypeOptions, officeTypeFilter])

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (officeTypeFilter !== 'all' && row.officeType !== officeTypeFilter) return false
        if (statusFilter !== 'all' && row.status !== statusFilter) return false
        return true
      }),
    [rows, officeTypeFilter, statusFilter]
  )

  const statusMeta: Record<
    StatusKey,
    { label: string; badge: string; iconClass: string; Icon: typeof CheckCircle2 }
  > = {
    submitted: {
      label: s.statusSubmitted,
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      iconClass: 'text-emerald-600',
      Icon: CheckCircle2,
    },
    draft: {
      label: s.statusDraft,
      badge: 'bg-amber-50 text-amber-700 border-amber-300',
      iconClass: 'text-amber-600',
      Icon: Clock,
    },
    not_started: {
      label: s.statusNotStarted,
      badge: 'bg-slate-100 text-slate-500 border-slate-300',
      iconClass: 'text-slate-400',
      Icon: CircleDashed,
    },
  }

  const statusFilterLabel: Record<StatusFilter, string> = {
    all: s.allStatuses,
    submitted: s.statusSubmitted,
    draft: s.statusDraft,
    not_started: s.statusNotStarted,
  }

  const isOpenCycle = Boolean(
    cycles.find((c) => c.year === selectedYear && c.typeName === selectedType)?.isOpen
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{s.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{s.subtitle}</p>
        </div>

        <div className="px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">
            {s.resultCount}
          </span>
          <span className="text-xl font-black text-blue-700 font-mono">
            {toBanglaNumber(filteredRows.length)}
          </span>
        </div>
      </div>

      {/* One box for the cycle scope and the two filters */}
      <Card className="overflow-hidden rounded-3xl border-0 ring-1 ring-slate-900/5 shadow-sm bg-white">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-9 w-9 shrink-0 rounded-xl bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur-sm flex items-center justify-center">
              <SlidersHorizontal className="h-4 w-4 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-5">{s.scopeTitle}</p>
              <p className="text-[11px] text-slate-400 leading-4">{s.scopeSubtitle}</p>
            </div>
          </div>

          {isOpenCycle && (
            <Badge className="shrink-0 bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30 text-[10px] font-bold rounded-full px-2.5 py-0.5">
              {s.openBadge}
            </Badge>
          )}
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SelectField
              label={s.fiscalYearLabel}
              value={selectedYear}
              display={selectedYear || s.fiscalYearPlaceholder}
              placeholder={s.fiscalYearPlaceholder}
              onChange={handleYearChange}
            >
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectField>

            <SelectField
              label={s.budgetTypeLabel}
              value={selectedType}
              display={selectedType || s.budgetTypePlaceholder}
              placeholder={s.budgetTypePlaceholder}
              onChange={(next) => applyCycle(selectedYear, next)}
            >
              {typeOptions.map((typeName) => (
                <SelectItem key={typeName} value={typeName}>
                  {typeName}
                </SelectItem>
              ))}
            </SelectField>

            {/* Office type filter — a dropdown because the number of types is unbounded */}
            <SelectField
              label={s.officeTypeLabel}
              value={officeTypeFilter}
              display={officeTypeFilter === 'all' ? s.allOfficeTypes : officeTypeFilter}
              placeholder={s.allOfficeTypes}
              onChange={setOfficeTypeFilter}
            >
              <SelectItem value="all">{s.allOfficeTypes}</SelectItem>
              {officeTypeOptions.map((typeName) => (
                <SelectItem key={typeName} value={typeName}>
                  {typeName}
                </SelectItem>
              ))}
            </SelectField>

            <SelectField
              label={s.statusLabel}
              value={statusFilter}
              display={statusFilterLabel[statusFilter]}
              placeholder={s.allStatuses}
              onChange={(next) => setStatusFilter(next as StatusFilter)}
            >
              {STATUS_FILTERS.map((key) => (
                <SelectItem key={key} value={key}>
                  {statusFilterLabel[key]}
                </SelectItem>
              ))}
            </SelectField>
          </div>
        </CardContent>
      </Card>

      {/* Office-wise submission status */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-base font-bold text-slate-900">
            {s.tableTitle} ({toBanglaNumber(filteredRows.length)} {s.unitOffices})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">{s.serialColumn}</th>
                  <th className="py-3 px-4 w-32">{s.budgetIdColumn}</th>
                  <th className="py-3 px-4">{s.officeNameColumn}</th>
                  <th className="py-3 px-4 w-56">{s.officeTypeColumn}</th>
                  <th className="py-3 px-4 text-center w-40">{s.statusColumn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      {cycles.length === 0 ? s.noCycle : s.empty}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const meta = statusMeta[row.status]
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-500">
                          {toBanglaNumber(idx + 1)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700 text-sm">
                          {row.budgetId}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{row.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {row.officeType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold gap-1 rounded-full px-2.5 py-0.5 ${meta.badge}`}
                          >
                            <meta.Icon className={`h-3 w-3 ${meta.iconClass}`} />
                            <span>{meta.label}</span>
                          </Badge>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
