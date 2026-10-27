import { prisma } from '@/lib/db/client'
import { getSubmissionSheet, getActiveEconomicCodes } from './sheet'

/**
 * Rolls several offices' code-wise budgets into one figure set.
 *
 * Each office's numbers come from the same branch point its own budget sheet uses
 * (`getSubmissionSheet`): a submitted budget is read from its frozen snapshot, a draft
 * is recomputed from the forms. Because the report reads through that one entry point
 * it can never disagree with the sheet an office saw when it submitted.
 */

export interface ReportCodeTotal {
  code_id: number
  code: string
  name: string
  category_id: number | null
  category_name: string
  category_sort_order: number
  sort_order: number
  /** Sum of this code across every office in scope. */
  amount: number
}

export interface ReportOfficeTotal {
  office_id: number
  budget_id: string
  name: string
  status: 'submitted' | 'draft' | 'not_started'
  submission_id: number | null
  /** The office's own grand total. */
  total: number
}

export interface RollupReport {
  codes: ReportCodeTotal[]
  offices: ReportOfficeTotal[]
  /** Sum of every office total — the "total of totals". */
  grand_total: number
}

export interface ActiveCycle {
  id: number
  title: string
  fiscal_year: string
  budget_type: string
}

/** The open cycle, or the newest one when none is open. */
export async function getActiveCycle(): Promise<ActiveCycle | null> {
  const cycles = await prisma.coreBudgetCycle.findMany({
    orderBy: { id: 'desc' },
    include: {
      fiscalYear: { select: { year: true } },
      budgetType: { select: { name: true } },
    },
  })

  const cycle = cycles.find((c) => c.status === 'open') || cycles[0]
  if (!cycle) return null

  return {
    id: Number(cycle.id),
    title: cycle.title,
    fiscal_year: cycle.fiscalYear?.year ?? '',
    budget_type: cycle.budgetType?.name ?? '',
  }
}

/** How many submissions are computed at once. The DB is remote, so we batch rather
 *  than fire every office's ~15 queries simultaneously. */
const CONCURRENCY = 4

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    results.push(...(await Promise.all(batch.map(fn))))
  }
  return results
}

/**
 * Sums the code-wise budget of every office in `officeIds` for one cycle.
 * Offices without a submission in the cycle are reported with a zero total.
 *
 * Pass the office level when the whole scope shares one: the code list is then the
 * set the administrator opened for that level, so the report shows only those codes
 * instead of the full catalogue padded with zeroes. Omit it for a scope spanning
 * several levels, where each office contributes whatever its own level was granted.
 */
export async function rollupOffices(
  officeIds: number[],
  cycleId: number,
  officeLevelId?: number | null
): Promise<RollupReport> {
  if (officeIds.length === 0) {
    return { codes: [], offices: [], grand_total: 0 }
  }

  const ids = officeIds.map((id) => BigInt(id))

  const [offices, submissions, codes] = await Promise.all([
    prisma.coreOffice.findMany({
      where: { id: { in: ids } },
      select: { id: true, budgetId: true, name: true },
      orderBy: { budgetId: 'asc' },
    }),
    prisma.officeSubmission.findMany({
      where: { cycleId: BigInt(cycleId), officeId: { in: ids } },
      select: { id: true, officeId: true, status: true },
    }),
    getActiveEconomicCodes(officeLevelId),
  ])

  const submissionByOffice = new Map<number, { id: number; status: string }>()
  for (const s of submissions) {
    submissionByOffice.set(Number(s.officeId), { id: Number(s.id), status: s.status })
  }

  const codeTotals = new Map<number, number>()

  const officeTotals = await mapLimit(offices, CONCURRENCY, async (off): Promise<ReportOfficeTotal> => {
    const sub = submissionByOffice.get(Number(off.id))
    let total = 0

    if (sub) {
      const sheet = await getSubmissionSheet(sub.id)
      for (const row of sheet.rows) {
        codeTotals.set(row.id, (codeTotals.get(row.id) || 0) + row.final_value)
      }
      total = sheet.total
    }

    return {
      office_id: Number(off.id),
      budget_id: off.budgetId,
      name: off.name,
      status: sub ? (sub.status === 'submitted' ? 'submitted' : 'draft') : 'not_started',
      submission_id: sub?.id ?? null,
      total,
    }
  })

  return {
    // A single-level scope arrives here already narrowed to that level's opened codes,
    // so the rows below line up with what the level was granted. A multi-level scope
    // keeps the global list and lets each gated office sheet contribute only its own
    // rows; codes no office was granted simply sum to zero.
    codes: codes.map((c) => ({
      code_id: c.id,
      code: c.code,
      name: c.name,
      category_id: c.category_id,
      category_name: c.category_name,
      category_sort_order: c.category_sort_order,
      sort_order: c.sort_order,
      amount: codeTotals.get(c.id) || 0,
    })),
    offices: officeTotals,
    grand_total: officeTotals.reduce((sum, o) => sum + o.total, 0),
  }
}
