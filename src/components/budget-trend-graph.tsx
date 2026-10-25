import { cn } from '@/lib/utils'

/** Bar heights, low to high, as a percentage of the chart's own height. */
const DEFAULT_BARS = [34, 48, 62, 76, 90, 100]

interface BudgetTrendGraphProps {
  /** Bar heights, low to high, as a percentage of the chart's own height. */
  bars?: number[]
  /** Placement and sizing. Pass positioning here, e.g. `absolute inset-0 -z-10`. */
  className?: string
}

/**
 * Animated budget trend: a row of bars growing from the baseline one after another, so the
 * chart reads as a budget being built up. Flex bars rather than an SVG line, so it stretches
 * with its column without distorting a stroke; the first and last keyframes match, so the
 * loop never snaps. The `budget-bar` keyframes live in `globals.css`.
 *
 * Nothing renders it by default — drop it in wherever it is wanted:
 *
 *   import { BudgetTrendGraph } from '@/components/budget-trend-graph'
 *   <BudgetTrendGraph className="absolute inset-0 -z-10" />
 */
export function BudgetTrendGraph({ bars = DEFAULT_BARS, className }: BudgetTrendGraphProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none flex h-24 items-end gap-2.5 border-b border-slate-200/80 px-4',
        className,
      )}
    >
      {bars.map((height, index) => (
        <span
          key={index}
          style={{ height: `${height}%`, animationDelay: `${index * 0.12}s` }}
          className="flex-1 origin-bottom rounded-t-lg bg-gradient-to-t from-blue-600/70 to-blue-400/60 animate-[budget-bar_5.2s_ease-in-out_infinite] motion-reduce:animate-none"
        />
      ))}
    </div>
  )
}
