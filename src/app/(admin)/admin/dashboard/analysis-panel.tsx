'use client'

import { Fragment, useRef, useState } from 'react'
import { strings } from '@/lib/strings'
import { toBanglaAmount, toBanglaAmountCompact, toBanglaNumber } from '@/lib/bangla'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, ChevronRight, MousePointerClick, PieChart } from 'lucide-react'

/** A slice of the drill-down pie: an amount, its office count and the level below it. */
export type PieNode = {
  key: string
  label: string
  /** Context line under the label — the office type a level belongs to. */
  context: string | null
  amount: number
  count: number
  /** department → office type → level; empty on the leaf level. */
  children: PieNode[]
}

/** Everything the analysis section needs, already aggregated on the server. */
export type DashboardAnalysis = {
  totalAmount: number
  totalSubmittedOffices: number
  /** Top of the drill-down: one node per department. */
  hierarchy: PieNode[]
}

/** The department progress cards that predate the charts. */
export type DepartmentCard = {
  id: number
  name: string
  totalOffices: number
  submittedOffices: number
}

type View = 'charts' | 'departments'

/**
 * Slice colours are literal hex rather than Tailwind classes: they are passed to SVG
 * `fill` and to inline `backgroundColor`, and the last entry is the fixed grey the
 * "অন্যান্য" slice always takes.
 */
const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#94a3b8']

export function DashboardAnalysisPanel({
  analysis,
  departments,
}: {
  analysis: DashboardAnalysis
  departments: DepartmentCard[]
}) {
  // The charts are the default lens; the department cards stay one click away for
  // admins who are used to them.
  const [view, setView] = useState<View>('charts')
  const s = strings.admin.dashboard.analysis

  const toggleClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
      active ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
    }`

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900 font-title">{s.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{s.subtitle}</p>
        </div>

        {/* Admin's choice of lens: the comparison charts or the per-department cards. */}
        <div className="self-start sm:self-auto flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setView('charts')}
            className={toggleClass(view === 'charts')}
          >
            <PieChart className="h-3.5 w-3.5" />
            <span>{s.viewCharts}</span>
          </button>
          <button
            type="button"
            onClick={() => setView('departments')}
            className={toggleClass(view === 'departments')}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>{s.viewDepartments}</span>
          </button>
        </div>
      </div>

      {view === 'charts' ? (
        <DrilldownPiePanel
          nodes={analysis.hierarchy}
          totalAmount={analysis.totalAmount}
          totalSubmittedOffices={analysis.totalSubmittedOffices}
        />
      ) : departments.length === 0 ? (
        <Card className="border-slate-200 shadow-sm rounded-2xl p-8 text-center text-sm text-slate-400">
          {s.departmentsEmpty}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {departments.map((dept, dIdx) => {
            const percent =
              dept.totalOffices > 0
                ? Math.round((dept.submittedOffices / dept.totalOffices) * 100)
                : 0
            const isFirst = dIdx % 2 === 0
            const colorClass = isFirst
              ? {
                  badge: 'text-blue-700 bg-blue-50 border-blue-200',
                  iconBg: 'bg-blue-600',
                  bar: 'bg-blue-600',
                  gradient: 'from-blue-50/80 to-white',
                }
              : {
                  badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                  iconBg: 'bg-emerald-600',
                  bar: 'bg-emerald-600',
                  gradient: 'from-emerald-50/80 to-white',
                }

            return (
              <Card key={dept.id} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader
                  className={`bg-gradient-to-r ${colorClass.gradient} border-b border-slate-100 pb-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl ${colorClass.iconBg} text-white flex items-center justify-center font-bold shadow-xs`}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900 font-title">
                          {dept.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 font-medium">
                          বিভাগভিত্তিক বাজেট প্রস্তুতি ও দাখিল অগ্রগতি
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-mono text-xs font-bold ${colorClass.badge}`}
                    >
                      {toBanglaNumber(percent)}% সম্পন্ন
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-semibold">
                      দাখিলকৃত {dept.name} অফিস:
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {toBanglaNumber(dept.submittedOffices)} /{' '}
                      {toBanglaNumber(dept.totalOffices)} টি
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`${colorClass.bar} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-center">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[11px] text-slate-500 font-medium">মোট অফিস</p>
                      <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                        {toBanglaNumber(dept.totalOffices)}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-[11px] text-emerald-700 font-medium">দাখিলকৃত</p>
                      <p className="text-lg font-bold text-emerald-800 font-mono mt-0.5">
                        {toBanglaNumber(dept.submittedOffices)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** Point on a circle; 0° is up and the angle grows clockwise. */
function polarPoint(center: number, radius: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) }
}

/**
 * One pie slice as an SVG path: a wedge from the centre out to the outer arc. Passing a
 * positive `rInner` instead carves a ring; a ring leaves a hole in the middle, which is
 * why the plain pie is the default here.
 */
function sectorPath(start: number, end: number, rOuter: number, rInner: number, center: number) {
  const largeArc = end - start > 180 ? 1 : 0
  const o1 = polarPoint(center, rOuter, start)
  const o2 = polarPoint(center, rOuter, end)
  if (rInner <= 0) {
    return `M ${center} ${center} L ${o1.x} ${o1.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${o2.x} ${o2.y} Z`
  }
  const i2 = polarPoint(center, rInner, end)
  const i1 = polarPoint(center, rInner, start)
  return `M ${o1.x} ${o1.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${rInner} ${rInner} 0 ${largeArc} 0 ${i1.x} ${i1.y} Z`
}

/** One line of the hover tooltip. */
function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[10px] leading-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold font-mono">{value}</span>
    </div>
  )
}

/**
 * The interactive pie. Hovering a slice pops it out of the ring and opens a tooltip;
 * clicking a slice that has a level under it descends into that level, replacing the
 * chart — department → office type → level — with a breadcrumb back up.
 */
function DrilldownPiePanel({
  nodes,
  totalAmount,
  totalSubmittedOffices,
}: {
  nodes: PieNode[]
  totalAmount: number
  totalSubmittedOffices: number
}) {
  const s = strings.admin.dashboard.analysis
  // Each entry is a slice the admin opened, so the last is the pie on screen and the
  // ones before it are its breadcrumbs.
  const [path, setPath] = useState<PieNode[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const scope = path.length > 0 ? path[path.length - 1] : null
  const slices = scope ? scope.children : nodes
  const scopeTotal = scope ? scope.amount : totalAmount
  const scopeOffices = scope ? scope.count : totalSubmittedOffices
  const hoveredNode = slices.find((node) => node.key === hovered) ?? null

  // Slice geometry, in the SVG's own 0–200 user space. A plain pie: every wedge runs
  // from the centre out, so the scope's own name and total are read from the caption
  // above the chart rather than from a hole in the middle of it.
  const CENTER = 100
  const R_OUTER = 92
  const R_INNER = 0

  let angle = 0
  const sectors = slices.map((node, i) => {
    // A level whose offices all submitted zero would otherwise draw nothing.
    const fraction = scopeTotal > 0 ? node.amount / scopeTotal : slices.length > 0 ? 1 / slices.length : 0
    const start = angle
    angle += fraction * 360
    return {
      node,
      start,
      // The last edge is snapped shut so the pie closes without a hairline gap; a lone
      // slice would otherwise begin and end on the same point and draw nothing at all.
      end: i === slices.length - 1 ? (slices.length === 1 ? 359.99 : 360) : angle,
      color: PIE_COLORS[i % PIE_COLORS.length],
      share: Math.round(fraction * 100),
      // The share bar keeps a visible stub: a one-percent slice would otherwise render as
      // an empty track.
      barWidth: Math.max(2, fraction * 100),
    }
  })

  /** Whether any slice on screen leads somewhere, which is what the hint chip promises. */
  const canDrillAnything = slices.some((node) => node.children.length > 0)

  const openSlice = (node: PieNode) => {
    if (node.children.length > 0) setPath((current) => [...current, node])
  }

  const hoveredShare =
    hoveredNode && scopeTotal > 0 ? Math.round((hoveredNode.amount / scopeTotal) * 100) : 0
  // Near the top of the chart there is no room above the cursor, so the tooltip flips
  // underneath rather than being clipped by the card.
  const tooltipBelow = (cursor?.y ?? 0) < 110

  if (slices.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <PanelHeader icon={PieChart} title={s.pieTitle} subtitle={s.pieSubtitle} />
        <CardContent className="p-8 text-center text-sm text-slate-400">{s.empty}</CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <PanelHeader icon={PieChart} title={s.pieTitle} subtitle={s.pieSubtitle} />
      <CardContent className="space-y-6 p-6">
        {/* Breadcrumb: the way back up the department → type → level tree, with a nudge
            that the slices themselves are clickable. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setPath([])}
              className={`rounded-lg px-2.5 py-1 transition-colors ${
                path.length === 0
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {s.allDepartments}
            </button>
            {path.map((node, i) => (
              <Fragment key={node.key}>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <button
                  type="button"
                  onClick={() => setPath(path.slice(0, i + 1))}
                  className={`max-w-[14rem] rounded-lg px-2.5 py-1 transition-colors ${
                    i === path.length - 1
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {node.label}
                </button>
              </Fragment>
            ))}
          </div>

          {canDrillAnything && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">
              <MousePointerClick className="h-3 w-3" />
              {s.drillHint}
            </span>
          )}
        </div>

        {/* The summary, the pie and the legend form one group: held tight together and
            centred in the card, so the figure never drifts off to one side of a wide
            card. It only turns side-by-side once there is room for both columns. */}
        <div className="flex flex-col items-center gap-8 xl:flex-row xl:items-center xl:justify-center xl:gap-12">
          <div className="flex shrink-0 flex-col items-center">
            {/* A plain pie has no hole to hold the total, so the scope's own summary is
                captioned directly above the slices. */}
            <div className="mb-4 text-center">
              <p className="text-xs font-bold leading-5 text-slate-500">
                {scope ? scope.label : s.totalSubmittedAmount}
              </p>
              <p className="mt-0.5 text-xl font-black font-mono leading-7 tracking-tight text-slate-900 sm:text-2xl">
                ৳ {toBanglaAmountCompact(scopeTotal)}
              </p>
              <p className="mt-1.5 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold leading-4 text-slate-600">
                {toBanglaNumber(scopeOffices)} {s.unitOffices}
              </p>
            </div>

            <div
              ref={chartRef}
              className="relative h-60 w-60 sm:h-72 sm:w-72 xl:h-[340px] xl:w-[340px]"
              onMouseLeave={() => {
                setHovered(null)
                setCursor(null)
              }}
            >
              {/* `overflow-visible` keeps the exploded slice inside the card: a slice that
                  slides outward would otherwise be clipped by the SVG's own viewport. */}
              <svg
                viewBox="0 0 200 200"
                className="h-full w-full overflow-visible"
                style={{ filter: 'drop-shadow(0 10px 18px rgba(15, 23, 42, 0.12))' }}
              >
                {sectors.map((sector) => {
                  const isHovered = hovered === sector.node.key
                  const bisector = ((sector.start + sector.end) / 2 - 90) * (Math.PI / 180)
                  // Hovering slides the slice out along its own bisector — the classic
                  // "exploded" pie — while the rest thin out so the point of interest wins.
                  const shift = isHovered ? 8 : 0
                  const canDrill = sector.node.children.length > 0
                  return (
                    <path
                      key={sector.node.key}
                      d={sectorPath(sector.start, sector.end, R_OUTER, R_INNER, CENTER)}
                      fill={sector.color}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      className={`transition-all duration-200 ease-out ${
                        canDrill ? 'cursor-pointer' : 'cursor-default'
                      }`}
                      style={{
                        transform: `translate(${Math.cos(bisector) * shift}px, ${Math.sin(bisector) * shift}px)`,
                        opacity: hovered && !isHovered ? 0.35 : 1,
                      }}
                      onMouseEnter={() => setHovered(sector.node.key)}
                      onMouseMove={(event) => {
                        const rect = chartRef.current?.getBoundingClientRect()
                        if (!rect) return
                        setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top })
                      }}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => openSlice(sector.node)}
                    />
                  )
                })}
              </svg>

              {hoveredNode && cursor && (
                <div
                  className="pointer-events-none absolute z-20 w-52 rounded-2xl border border-white/10 bg-slate-900/95 px-3.5 py-3 text-white shadow-2xl backdrop-blur-sm"
                  style={{
                    left: cursor.x,
                    top: cursor.y,
                    transform: tooltipBelow
                      ? 'translate(-50%, 14px)'
                      : 'translate(-50%, calc(-100% - 14px))',
                  }}
                >
                  <p className="text-xs font-bold leading-5">{hoveredNode.label}</p>
                  {hoveredNode.context && (
                    <p className="text-[11px] leading-4 text-slate-400">{hoveredNode.context}</p>
                  )}
                  <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                    <TooltipRow
                      label={s.tooltipAmount}
                      value={`৳ ${toBanglaAmount(hoveredNode.amount)}`}
                    />
                    <TooltipRow
                      label={s.tooltipOffices}
                      value={`${toBanglaNumber(hoveredNode.count)} ${s.unitOffices}`}
                    />
                    <TooltipRow label={s.tooltipShare} value={`${toBanglaNumber(hoveredShare)}%`} />
                  </div>
                  {hoveredNode.children.length > 0 && (
                    <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-300">
                      <ChevronRight className="h-3 w-3" />
                      {s.drillHint}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* The legend doubles as the way in: each row opens the same slice the pie does,
              carries its own share bar, and the leaf rows simply read out their totals. */}
          <ul className="w-full max-w-md space-y-2">
            {sectors.map((sector) => {
              const canDrill = sector.node.children.length > 0
              const isHovered = hovered === sector.node.key
              return (
                <li key={sector.node.key}>
                  <button
                    type="button"
                    onClick={() => openSlice(sector.node)}
                    onMouseEnter={() => setHovered(sector.node.key)}
                    onMouseLeave={() => setHovered(null)}
                    className={`flex w-full items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left transition-all duration-200 ${
                      isHovered
                        ? '-translate-y-0.5 border-slate-200 shadow-md'
                        : 'border-slate-100 shadow-2xs'
                    } ${canDrill ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span
                      className="h-10 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: sector.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold leading-5 text-slate-800">
                        {sector.node.label}
                      </span>
                      {sector.node.context && (
                        <span className="block text-[11px] leading-4 text-slate-400">
                          {sector.node.context}
                        </span>
                      )}
                      <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${sector.barWidth}%`,
                            backgroundColor: sector.color,
                          }}
                        />
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block whitespace-nowrap text-xs font-black font-mono leading-5 text-slate-900">
                        ৳ {toBanglaAmount(sector.node.amount)}
                      </span>
                      <span className="block whitespace-nowrap text-[11px] leading-4 text-slate-400">
                        {toBanglaNumber(sector.node.count)} {s.unitOffices} ·{' '}
                        {toBanglaNumber(sector.share)}%
                      </span>
                    </span>
                    {canDrill && (
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-all duration-200 ${
                          isHovered ? 'translate-x-0.5 text-slate-500' : 'text-slate-300'
                        }`}
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

/** The shared card header: dark icon tile, title and one-line explanation. */
function PanelHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof PieChart
  title: string
  subtitle: string
}) {
  return (
    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-base font-bold text-slate-900 font-title">{title}</CardTitle>
          <CardDescription className="text-xs text-slate-500 font-medium">{subtitle}</CardDescription>
        </div>
      </div>
    </CardHeader>
  )
}
