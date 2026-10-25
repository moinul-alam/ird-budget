import { prisma } from '@/lib/db/client'
import { getBudgetContext, getRefData } from './fetcher'
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
  /** The engine formula this code dispatches to (see RefFormulaType); null for a manual code. */
  formula_key: string | null
  /** The form numbers whose data produced this code's amount. */
  source_forms: number[]
  sort_order: number
}

/**
 * The codes the administrator enabled for one office level on /admin/codes. A level
 * with no rows at all is *not* an open level: nothing was granted, so nothing is
 * returned — the same reading the admin screen itself shows.
 */
async function getLevelEnabledCodeIds(officeLevelId: number | null): Promise<number[]> {
  if (officeLevelId === null) return []

  const ref = await getRefData()
  return ref.levelCodeMappings
    .filter((m) => m.officeLevelId === officeLevelId)
    .map((m) => m.economicCodeId)
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

  // Both the catalogue and the per-level grants are administrator-owned reference
  // data, so they come from the shared cache rather than being re-read per render.
  const ref = await getRefData()
  const categoryById = new Map(ref.budgetCategories.map((c) => [c.id, c]))
  const categoryOf = (categoryId: number | null) =>
    categoryId === null ? undefined : categoryById.get(categoryId)

  const codes = ref.economicCodes.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name || '',
    category_id: c.categoryId,
    category_code: categoryOf(c.categoryId)?.code || '',
    category_name: categoryOf(c.categoryId)?.title || '',
    category_sort_order: categoryOf(c.categoryId)?.sortOrder ?? 0,
    is_manual: c.isManual,
    allow_manual_override: c.allowManualOverride,
    formula_key: c.formulaKey,
    source_forms: c.sourceForms,
    sort_order: c.sortOrder,
  }))

  // The catalogue arrives in sheet order from the cache, so filtering keeps it.
  if (enabledCodeIds === null) return codes

  const enabled = new Set(enabledCodeIds)
  return codes.filter((c) => enabled.has(c.id))
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

  // Only a computed code has a formula to dispatch; a manual code takes an input,
  // so the engine is asked for the rest with the key each names.
  const formulaCodes = codes
    .filter((c) => !c.is_manual)
    .map((c) => ({ code: c.code, formula_key: c.formula_key }))
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
