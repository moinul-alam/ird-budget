'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { strings } from '@/lib/strings'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Layers3,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** One office level's share of a card's total — the rows of the detail modal. */
export type StatusLevelRow = {
  levelId: number
  levelName: string
  /** The office type the level belongs to, when it is a field-office tier. */
  ownerName: string | null
  /** Position in the hierarchy (matches /admin/offices-config?tab=hierarchy). */
  levelOrder: number
  count: number
  total: number
}

export type StatusCardMetric = {
  /** Offices in this state. */
  count: number
  /** What those offices add up to. */
  amount: number
  /** Denominator for the progress bar — every office the card could have counted. */
  scopeCount: number
  rows: StatusLevelRow[]
}

export type StatusCardMetrics = {
  submitted: StatusCardMetric
  draft: StatusCardMetric
  groupSubmitted: StatusCardMetric
  groupDraft: StatusCardMetric
}

type CardKey = keyof StatusCardMetrics

/**
 * Per-card colour profile. Every class is written out in full here so Tailwind's
 * source scanner emits it — building class names by interpolation would silently
 * drop the styles.
 */
type CardTone = {
  label: string
  caption: string
  icon: LucideIcon
  /** Modal header gradient. */
  header: string
  /** Top band of the card. */
  band: string
  iconChip: string
  value: string
  bar: string
  ring: string
  soft: string
  rowCountLabel: string
  subtitle: string
}

const STATUS_CARD_SCOPE: CardKey[] = ['submitted', 'draft', 'groupSubmitted', 'groupDraft']

export function AdminStatusCards({ metrics }: { metrics: StatusCardMetrics }) {
  const [openKey, setOpenKey] = useState<CardKey | null>(null)

  const s = strings.admin.dashboard.statusCards

  const meta: Record<CardKey, CardTone> = {
    submitted: {
      label: s.submittedOffices,
      caption: s.submittedCaption,
      icon: CheckCircle2,
      header: 'from-emerald-600 via-emerald-700 to-emerald-900',
      band: 'from-emerald-50 to-white',
      iconChip: 'bg-emerald-600 text-white',
      value: 'text-emerald-700',
      bar: 'bg-emerald-600',
      ring: 'hover:ring-emerald-300',
      soft: 'bg-emerald-50 text-emerald-700',
      rowCountLabel: s.modal.submittedCountColumn,
      subtitle: s.modal.submittedSubtitle,
    },
    draft: {
      label: s.draftOffices,
      caption: s.draftCaption,
      icon: Clock,
      header: 'from-amber-500 via-amber-600 to-amber-800',
      band: 'from-amber-50 to-white',
      iconChip: 'bg-amber-500 text-white',
      value: 'text-amber-600',
      bar: 'bg-amber-500',
      ring: 'hover:ring-amber-300',
      soft: 'bg-amber-50 text-amber-700',
      rowCountLabel: s.modal.draftCountColumn,
      subtitle: s.modal.draftSubtitle,
    },
    groupSubmitted: {
      label: s.groupSubmittedOffices,
      caption: s.groupSubmittedCaption,
      icon: Layers,
      header: 'from-violet-600 via-violet-700 to-violet-900',
      band: 'from-violet-50 to-white',
      iconChip: 'bg-violet-600 text-white',
      value: 'text-violet-700',
      bar: 'bg-violet-600',
      ring: 'hover:ring-violet-300',
      soft: 'bg-violet-50 text-violet-700',
      rowCountLabel: s.modal.submittedCountColumn,
      subtitle: s.modal.groupSubmittedSubtitle,
    },
    groupDraft: {
      label: s.groupDraftOffices,
      caption: s.groupDraftCaption,
      icon: Layers3,
      header: 'from-sky-600 via-sky-700 to-sky-900',
      band: 'from-sky-50 to-white',
      iconChip: 'bg-sky-600 text-white',
      value: 'text-sky-700',
      bar: 'bg-sky-600',
      ring: 'hover:ring-sky-300',
      soft: 'bg-sky-50 text-sky-700',
      rowCountLabel: s.modal.draftCountColumn,
      subtitle: s.modal.groupDraftSubtitle,
    },
  }

  const openMetric = openKey ? metrics[openKey] : null
  const openTone = openKey ? meta[openKey] : null

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STATUS_CARD_SCOPE.map((key) => {
          const tone = meta[key]
          const metric = metrics[key]
          const Icon = tone.icon
          const percent =
            metric.scopeCount > 0 ? Math.round((metric.count / metric.scopeCount) * 100) : 0

          return (
            <button
              key={key}
              type="button"
              onClick={() => setOpenKey(key)}
              aria-haspopup="dialog"
              className={`group w-full overflow-hidden rounded-2xl bg-white text-left ring-1 ring-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${tone.ring}`}
            >
              {/* Top band — how many offices */}
              <div className={`bg-gradient-to-br ${tone.band} px-5 pt-5 pb-4`}>
                <div className="flex items-start justify-between gap-3">
                  {/* min-h keeps all four labels on the same baseline even when the
                      longer group-budget labels wrap to a second line. */}
                  <span className="min-h-10 text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-5">
                    {tone.label}
                  </span>
                  <span className={`p-2 rounded-xl shrink-0 ${tone.iconChip}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className={`text-3xl font-black font-mono leading-none ${tone.value}`}>
                    {toBanglaNumber(metric.count)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    / {toBanglaNumber(metric.scopeCount)} {s.unitOffices}
                  </span>
                </div>

                <div className="mt-3 h-1.5 w-full rounded-full bg-white ring-1 ring-inset ring-slate-200/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${tone.bar}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-2 min-h-8 text-[10px] font-medium text-slate-400 leading-4">
                  {tone.caption}
                </p>
              </div>

              {/* Bottom band — what the figure comes to */}
              <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {s.budgetAmount}
                  </p>
                  <p className="mt-0.5 text-lg font-black font-mono text-slate-900 leading-6">
                    ৳ {toBanglaAmount(metric.amount)}
                  </p>
                </div>
                <span className={`flex items-center gap-1 text-[11px] font-bold shrink-0 ${tone.value}`}>
                  <span>{s.viewDetails}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <Dialog open={openKey !== null} onOpenChange={(open) => !open && setOpenKey(null)}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-2xl gap-0 overflow-hidden rounded-3xl bg-white p-0 ring-1 ring-slate-900/5"
        >
          {openMetric && openTone && (
            <>
              {/* Gradient header */}
              <div className={`relative bg-gradient-to-br ${openTone.header} px-6 pt-5 pb-5 text-white`}>
                <div className="flex items-start gap-3.5 pr-12">
                  <span className="h-11 w-11 shrink-0 rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-sm flex items-center justify-center">
                    <openTone.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="text-base font-black leading-6 text-white">
                      {openTone.label}
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 text-[11px] font-medium text-white/75 leading-5">
                      {openTone.subtitle}
                    </DialogDescription>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-sm px-3 py-1.5 text-[11px] font-bold">
                    <span className="text-white/70">{openTone.rowCountLabel}:</span>
                    <span className="font-mono">{toBanglaNumber(openMetric.count)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-sm px-3 py-1.5 text-[11px] font-bold">
                    <span className="text-white/70">{s.budgetAmount}:</span>
                    <span className="font-mono">৳ {toBanglaAmount(openMetric.amount)}</span>
                  </span>
                </div>

                <DialogCloseButton onClick={() => setOpenKey(null)} label={s.modal.close} />
              </div>

              {/* Level-wise table */}
              <div className="px-6 py-5">
                {openMetric.rows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-xs font-medium text-slate-400">
                    {s.modal.empty}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">{s.modal.levelColumn}</th>
                          <th className="px-4 py-3 text-center">{openTone.rowCountLabel}</th>
                          <th className="px-4 py-3 text-right">{s.modal.amountColumn}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {openMetric.rows.map((row) => {
                          const share =
                            openMetric.amount > 0 ? Math.round((row.total / openMetric.amount) * 100) : 0
                          const hasOrder = row.levelOrder < 999
                          return (
                            <tr key={row.levelId} className="transition-colors hover:bg-slate-50/70">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono ${openTone.soft}`}
                                  >
                                    {hasOrder ? toBanglaNumber(row.levelOrder) : '—'}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    {row.ownerName && (
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-4">
                                        {row.ownerName}
                                      </p>
                                    )}
                                    <p className="font-bold text-slate-800 leading-5">
                                      {row.levelName}
                                    </p>
                                    <div className="mt-1 h-1 w-full max-w-[150px] rounded-full bg-slate-100 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${openTone.bar}`}
                                        style={{ width: `${share}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="font-mono font-bold text-slate-900">
                                  {toBanglaNumber(row.count)}
                                </span>
                                <span className="font-medium text-slate-400"> টি</span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                                ৳ {toBanglaAmount(row.total)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white">
                          <td className="px-4 py-3 font-bold">{s.modal.totalRow}</td>
                          <td className="px-4 py-3 text-center font-mono font-bold">
                            {toBanglaNumber(openMetric.count)} টি
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            ৳ {toBanglaAmount(openMetric.amount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** The dialog's own close affordance, tinted for the coloured header. */
function DialogCloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <X className="h-4 w-4" />
    </button>
  )
}
