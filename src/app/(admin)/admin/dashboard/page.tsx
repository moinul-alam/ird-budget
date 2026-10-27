/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from '@/lib/db/client'
import { toBanglaNumber, cleanTypeName } from '@/lib/bangla'
import { rollupOffices } from '@/lib/budget/report'
import {
  AdminStatusCards,
  type StatusCardMetrics,
  type StatusLevelRow,
} from './status-cards'
import {
  DashboardAnalysisPanel,
  type PieNode,
  type DashboardAnalysis,
  type DepartmentCard,
} from './analysis-panel'
import { strings } from '@/lib/strings'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { FileSpreadsheet, Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'অ্যাডমিন ড্যাশবোর্ড',
}

export default async function AdminDashboardPage() {
  // 1. Fetch active cycle (or latest cycle)
  const cycles = await prisma.coreBudgetCycle.findMany({
    orderBy: { id: 'desc' },
    include: {
      fiscalYear: { select: { year: true } },
      budgetType: { select: { name: true } },
    },
  })

  //const activeCycle = cycles.find((c) => c.status === 'open') || cycles[0] || null

  const activeCycle = cycles.find((c: any) => c.status === 'open') || cycles[0] || null


  // 2. Fetch all offices with department, office_types and the level they sit on.
  // The level is what the status cards' detail modals group by, so it is read here
  // rather than in a second round trip.
  const offices = await prisma.coreOffice.findMany({
    include: {
      officeType: {
        include: {
          department: true,
        },
      },
      officeLevel: { select: { id: true, levelName: true, levelOrder: true } },
    },
    orderBy: { id: 'asc' },
  })

  // 3. Roll the cycle up through the same entry point every report uses, so this page's
  // figures can never disagree with the summary or individual reports.
  //
  // Reading `office_budget_sheet` directly is what made this card useless: that table
  // holds only the office's manual overrides, so a budget whose numbers come from the
  // forms summed to zero. `rollupOffices` computes a draft live and reads a submitted
  // budget from its frozen snapshot, and skips offices with no submission entirely —
  // so the work tracks the number of submissions, not the number of offices.
  const cycleId = activeCycle?.id || BigInt(1)
  const [rollup, groupRules] = await Promise.all([
    rollupOffices(
      offices.map((o) => Number(o.id)),
      Number(cycleId)
    ),
    // "গ্রুপ বাজেট" means one thing in this system: an office whose type × level is
    // covered by a flagged rule on /admin/offices-management/group-budget — the same set
    // the combined report builds. The office type's own `is_group_budget` column is a
    // separate control that screen never writes, which is why this card counted zero.
    prisma.adminGroupBudgetRule.findMany({
      where: { isGroupBudget: true },
      select: { officeTypeId: true, officeLevelId: true },
    }),
  ])

  const rollupByOffice = new Map(rollup.offices.map((o) => [o.office_id, o]))

  // A rule with no level covers every level of its office type, matching how the
  // combined report resolves its scope.
  const isGroupBudgetOffice = (officeTypeId: number | null, officeLevelId: number | null) =>
    officeTypeId !== null &&
    groupRules.some(
      (rule) =>
        Number(rule.officeTypeId) === officeTypeId &&
        (rule.officeLevelId === null || Number(rule.officeLevelId) === officeLevelId)
    )

  const allOffices = offices
  const totalOfficesCount = allOffices.length

  // 3. Fetch all active departments from DB
  const dbDepartments = await prisma.coreDepartment.findMany({
    orderBy: { id: 'asc' },
  })

  const departmentList = dbDepartments
  const departmentStatsMap = new Map<number, {
    id: number
    name: string
    totalOffices: number
    submittedOffices: number
    draftOffices: number
    totalBudget: number
  }>()

  // Initialize department stats
  departmentList.forEach((d) => {
    let rawName = d.name || ''
    if (rawName.includes(':::min=')) {
      rawName = rawName.split(':::min=')[0]
    }
    departmentStatsMap.set(Number(d.id), {
      id: Number(d.id),
      name: rawName,
      totalOffices: 0,
      submittedOffices: 0,
      draftOffices: 0,
      totalBudget: 0,
    })
  })

  let groupBudgetOffices = 0

  // Office list enhanced
  const officeStats = allOffices.map((off) => {
    const rolled = rollupByOffice.get(Number(off.id))
    const status: 'submitted' | 'draft' | 'not_started' = rolled?.status ?? 'not_started'
    const isSubmitted = status === 'submitted'
    const isDraft = status === 'draft'

    const deptId = Number(off.officeType?.departmentId || 0)
    let deptName = off.officeType?.department?.name || 'অনির্ধারিত বিভাগ'
    if (deptName.includes(':::min=')) {
      deptName = deptName.split(':::min=')[0]
    }
    const isGroup = isGroupBudgetOffice(
      off.officeTypeId !== null ? Number(off.officeTypeId) : null,
      off.officeLevelId !== null ? Number(off.officeLevelId) : null
    )
    const subBudget = rolled?.total ?? 0

    // Dynamic aggregation by department
    if (departmentStatsMap.has(deptId)) {
      const dStat = departmentStatsMap.get(deptId)!
      dStat.totalOffices++
      if (isSubmitted) {
        dStat.submittedOffices++
        dStat.totalBudget += subBudget
      } else if (isDraft) {
        dStat.draftOffices++
      }
    } else if (deptId) {
      departmentStatsMap.set(deptId, {
        id: deptId,
        name: deptName,
        totalOffices: 1,
        submittedOffices: isSubmitted ? 1 : 0,
        draftOffices: isDraft ? 1 : 0,
        totalBudget: isSubmitted ? subBudget : 0,
      })
    }

    if (isGroup) {
      groupBudgetOffices++
    }

    return {
      id: Number(off.id),
      name: off.name,
      budget_id: off.budgetId,
      department: deptName,
      office_type: off.officeType?.name || 'অফিস',
      // Levels are created on /admin/offices-config?tab=hierarchy. Level names repeat
      // across office types (every type has its own "সার্কেল"), so the office type is
      // carried alongside as the row's context line.
      levelId: off.officeLevel ? Number(off.officeLevel.id) : 0,
      levelName: off.officeLevel?.levelName || 'লেভেল নির্ধারিত নয়',
      levelOwner: cleanTypeName(off.officeType?.name) || null,
      levelOrder: off.officeLevel?.levelOrder ?? 999,
      isGroup,
      status,
      totalBudget: subBudget,
    }
  })

  /**
   * Groups a slice of the offices by their hierarchy level for a status card's modal.
   * Ordering follows the hierarchy's own level_order so the modal reads top-down the
   * same way /admin/offices-config?tab=hierarchy does.
   */
  const levelBreakdown = (
    predicate: (office: (typeof officeStats)[number]) => boolean
  ): StatusLevelRow[] => {
    const map = new Map<number, StatusLevelRow>()
    for (const off of officeStats) {
      if (!predicate(off)) continue
      const row = map.get(off.levelId) ?? {
        levelId: off.levelId,
        levelName: off.levelName,
        ownerName: off.levelOwner,
        levelOrder: off.levelOrder,
        count: 0,
        total: 0,
      }
      row.count++
      row.total += off.totalBudget
      map.set(off.levelId, row)
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        a.levelOrder - b.levelOrder ||
        (a.ownerName || '').localeCompare(b.ownerName || '') ||
        a.levelName.localeCompare(b.levelName)
    )
  }

  const sumCount = (rows: StatusLevelRow[]) => rows.reduce((sum, r) => sum + r.count, 0)
  const sumAmount = (rows: StatusLevelRow[]) => rows.reduce((sum, r) => sum + r.total, 0)

  const submittedRows = levelBreakdown((o) => o.status === 'submitted')
  const draftRows = levelBreakdown((o) => o.status === 'draft')
  const groupSubmittedRows = levelBreakdown((o) => o.isGroup && o.status === 'submitted')
  const groupDraftRows = levelBreakdown((o) => o.isGroup && o.status === 'draft')

  const statusCardMetrics: StatusCardMetrics = {
    submitted: {
      count: sumCount(submittedRows),
      amount: sumAmount(submittedRows),
      scopeCount: totalOfficesCount,
      rows: submittedRows,
    },
    draft: {
      count: sumCount(draftRows),
      amount: sumAmount(draftRows),
      scopeCount: totalOfficesCount,
      rows: draftRows,
    },
    groupSubmitted: {
      count: sumCount(groupSubmittedRows),
      amount: sumAmount(groupSubmittedRows),
      scopeCount: groupBudgetOffices,
      rows: groupSubmittedRows,
    },
    groupDraft: {
      count: sumCount(groupDraftRows),
      amount: sumAmount(groupDraftRows),
      scopeCount: groupBudgetOffices,
      rows: groupDraftRows,
    },
  }

  const departmentBreakdowns = Array.from(departmentStatsMap.values())

  // 4. Submitted-only aggregation behind the drill-down pie. The draft figures already
  // occupy the status cards above, so this section answers one question only: how the
  // submitted money is spread across departments, then office types, then levels.
  type MutablePieNode = {
    key: string
    label: string
    context: string | null
    amount: number
    count: number
    children: MutablePieNode[]
  }

  const submittedOffices = officeStats.filter((o) => o.status === 'submitted')
  const totalAmount = submittedOffices.reduce((sum, o) => sum + o.totalBudget, 0)
  const otherLabel = strings.admin.dashboard.analysis.otherLabel

  /**
   * Finds a node by key, creating it on first sight. Keys are ids or cleaned names —
   * never display labels — so two offices that share a label still fold into one slice.
   */
  const nodeIn = (
    list: MutablePieNode[],
    key: string,
    label: string,
    context: string | null
  ): MutablePieNode => {
    let node = list.find((n) => n.key === key)
    if (!node) {
      node = { key, label, context, amount: 0, count: 0, children: [] }
      list.push(node)
    }
    return node
  }

  // department → office type → level, in one pass, so every slice equals the sum of the
  // row beneath it and the root equals the grand total.
  const hierarchy: MutablePieNode[] = []
  for (const off of submittedOffices) {
    const typeName = cleanTypeName(off.office_type) || 'অফিস'
    const department = nodeIn(hierarchy, off.department, off.department, null)
    const officeType = nodeIn(department.children, typeName, typeName, null)
    const level = nodeIn(officeType.children, String(off.levelId), off.levelName, null)
    // One office counts once at each depth it appears on.
    for (const node of [department, officeType, level]) {
      node.amount += off.totalBudget
      node.count++
    }
  }

  /**
   * Sorts a level by amount and collapses everything past the sixth row into one
   * "অন্যান্য" slice. The residual carries no children, so only a slice worth opening
   * stays drillable.
   */
  const finalizeNodes = (nodes: MutablePieNode[]): PieNode[] => {
    const sorted = [...nodes].sort((a, b) => b.amount - a.amount)
    const head = sorted.slice(0, 6).map<PieNode>((n) => ({
      key: n.key,
      label: n.label,
      context: n.context,
      amount: n.amount,
      count: n.count,
      children: finalizeNodes(n.children),
    }))
    const tail = sorted.slice(6)
    if (tail.length === 0) return head
    return [
      ...head,
      {
        key: '__other__',
        label: otherLabel,
        context: null,
        amount: tail.reduce((sum, n) => sum + n.amount, 0),
        count: tail.reduce((sum, n) => sum + n.count, 0),
        children: [],
      },
    ]
  }

  const analysis: DashboardAnalysis = {
    totalAmount,
    totalSubmittedOffices: submittedOffices.length,
    hierarchy: finalizeNodes(hierarchy),
  }

  const departmentCards: DepartmentCard[] = departmentBreakdowns.map((dept) => ({
    id: dept.id,
    name: dept.name,
    totalOffices: dept.totalOffices,
    submittedOffices: dept.submittedOffices,
  }))

  // Format cycle title
  let cycleTitle = ''
  let cycleTypeName = ''
  const hasActiveCycle = Boolean(activeCycle)

  if (activeCycle) {
    // Both labels come from the reference tables, so a rename in
    // /admin/budgets flows straight through to this banner.
    cycleTitle = `${toBanglaNumber(activeCycle.fiscalYear.year)} অর্থবছর`
    cycleTypeName = activeCycle.budgetType.name
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {hasActiveCycle ? (
                <Badge className={activeCycle.status === 'open' ? 'bg-emerald-600 text-white text-xs font-bold' : 'bg-rose-600 text-white text-xs font-bold'}>
                  {activeCycle.status === 'open' ? 'বাজেট দাখিল উন্মুক্ত' : 'বাজেট দাখিল বন্ধ'}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-400 border-amber-500/50 bg-amber-950/40 text-xs font-bold">
                  কোনো বাজেট চক্র সক্রিয় নেই
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-title">
              {hasActiveCycle ? `${cycleTypeName} (${cycleTitle})` : 'কোনো সক্রিয় বাজেট চক্র পাওয়া যায়নি'}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {hasActiveCycle
                ? 'অভ্যন্তরীণ সম্পদ বিভাগের সকল দপ্তর ও আওতাধীন অফিসসমূহের বাজেট প্রস্তুতির ড্যাশবোর্ড'
                : 'বাজেট দাখিল ও পর্যবেক্ষণ শুরু করতে বাজেট উন্মুক্তকরণ থেকে নতুন বাজেট চক্র উন্মুক্ত করুন।'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!hasActiveCycle ? (
              <Link
                href="/admin/budgets"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <span>বাজেট চক্র তৈরি করুন</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/admin/reports/individual"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>অফিসভিত্তিক প্রতিবেদন</span>
                </Link>
                <Link
                  href="/admin/reports/combined"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2"
                >
                  <Layers className="h-4 w-4" />
                  <span>সমন্বিত প্রতিবেদন</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Top 4 status cards — each is split horizontally: how many offices on the top
          band, what those offices add up to on the bottom. Clicking one opens the
          level-wise breakdown behind its figure. */}
      <AdminStatusCards metrics={statusCardMetrics} />

      {/* The configurable analysis section: the comparison charts by default, with the
          pre-existing department progress cards one toggle away. */}
      <DashboardAnalysisPanel analysis={analysis} departments={departmentCards} />

    </div>
  )
}
