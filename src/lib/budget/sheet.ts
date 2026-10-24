import { prisma } from '@/lib/db/client'
import { getBudgetContext } from './fetcher'
import { calculateAll, type BudgetContext } from './calculate'

/**
 * The single place a submission's code-wise amounts are produced. The office's own
 * budget sheet and every report read from here, so a report can never disagree with
 * the sheet the office sees.
 */

/** One row of `ref_economic_codes` in sheet order, with its category attached. */
export interface EconomicCodeRef {
  id: number
  code: string
  name: string
  category_id: number | null
  category_code: string
  category_name: string
  category_sort_order: number
  is_manual: boolean
  allow_manual_override: boolean
  sort_order: number
}

/**
 * The codes the administrator enabled for one office level on /admin/codes. A level
 * with no rows at all is *not* an open level: nothing was granted, so nothing is
 * returned — the same reading the admin screen itself shows.
 */
async function getLevelEnabledCodeIds(officeLevelId: number | null): Promise<number[]> {
  if (officeLevelId === null) return []

  const rows = await prisma.officeLevelEconomicCodeMapping.findMany({
    where: { officeLevelId: BigInt(officeLevelId), isEnabled: true },
    select: { economicCodeId: true },
  })
  return rows.map((r) => Number(r.economicCodeId))
}

/** The office's level, which is what the administrator grants codes against. */
async function getSubmissionOfficeLevelId(submissionId: number): Promise<number | null> {
  const submission = await prisma.officeSubmission.findUnique({
    where: { id: BigInt(submissionId) },
    select: { office: { select: { officeLevelId: true } } },
  })
  return submission?.office?.officeLevelId ? Number(submission.office.officeLevelId) : null
}

/**
 * The active codes in sheet order. Reference data only — never a hardcoded list.
 *
 * Pass an office's level to get only the codes the administrator granted that level;
 * omit the argument entirely for the global reference list the reports roll up against.
 */
export async function getActiveEconomicCodes(
  officeLevelId?: number | null
): Promise<EconomicCodeRef[]> {
  // `undefined` = global list; a number or an explicit null = one office, which is
  // gated by its level's mapping.
  const enabledCodeIds = officeLevelId === undefined ? null : await getLevelEnabledCodeIds(officeLevelId)

  const dbCodes = await prisma.refEconomicCode.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      categoryId: true,
      isManual: true,
      allowManualOverride: true,
      sortOrder: true,
      category: { select: { code: true, title: true, sortOrder: true } },
    },
    where:
      enabledCodeIds === null
        ? { isActive: true }
        : { isActive: true, id: { in: enabledCodeIds.map((id) => BigInt(id)) } },
    orderBy: { sortOrder: 'asc' },
  })

  return dbCodes.map((c) => ({
    id: Number(c.id),
    code: c.code,
    name: c.name || '',
    category_id: c.categoryId ? Number(c.categoryId) : null,
    category_code: c.category?.code || '',
    category_name: c.category?.title || '',
    category_sort_order: Number(c.category?.sortOrder ?? 0),
    is_manual: c.isManual,
    allow_manual_override: c.allowManualOverride,
    sort_order: Number(c.sortOrder || 0),
  }))
}

export interface SheetRow extends EconomicCodeRef {
  /** Engine value. Always 0 for a manual code, which only takes an input. */
  auto_value: number
  /** The office's override, or null when it has not set one. */
  manual_value: number | null
  /** `manual_value` when set, otherwise `auto_value` — the figure that counts. */
  final_value: number
}

export interface SubmissionSheet {
  rows: SheetRow[]
  /** Sum of every row's `final_value`. */
  total: number
  /** The same context the rows were computed from, so callers avoid a second fetch. */
  context: BudgetContext
}

/** Sums every row against the same code list, zero-filling codes the office left empty. */
function buildRows(
  codes: EconomicCodeRef[],
  calculated: Record<string, number>,
  manualByCode: Map<number, number>
): SheetRow[] {
  return codes.map((c) => {
    const auto = c.is_manual ? 0 : calculated[c.code] || 0
    const manual = manualByCode.has(c.id) ? manualByCode.get(c.id)! : null
    return {
      ...c,
      auto_value: auto,
      manual_value: manual,
      final_value: manual ?? auto,
    }
  })
}

/**
 * Computes one submission's full code-wise sheet: the engine's formula values with
 * the office's manual overrides laid on top.
 */
export async function computeSubmissionSheet(submissionId: number): Promise<SubmissionSheet> {
  // The office's level decides which codes it is even allowed to see, so it is
  // resolved before the code list is asked for.
  const [context, officeLevelId] = await Promise.all([
    getBudgetContext(submissionId),
    getSubmissionOfficeLevelId(submissionId),
  ])
  const codes = await getActiveEconomicCodes(officeLevelId)

  const formulaCodes = codes.filter((c) => !c.is_manual).map((c) => c.code)
  const calculated = calculateAll(formulaCodes, context)

  const manualRows = await prisma.officeBudgetSheet.findMany({
    where: { submissionId: BigInt(submissionId) },
    select: { economicCodeId: true, manualValue: true },
  })

  const manualByCode = new Map<number, number>()
  for (const r of manualRows) {
    if (r.manualValue !== null && r.manualValue !== undefined) {
      manualByCode.set(Number(r.economicCodeId), Number(r.manualValue))
    }
  }

  const rows = buildRows(codes, calculated, manualByCode)
  return { rows, total: rows.reduce((sum, r) => sum + r.final_value, 0), context }
}
