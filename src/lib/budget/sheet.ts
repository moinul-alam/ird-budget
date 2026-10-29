import { prisma } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'
import { getBudgetContext, getRefData, getConfigFingerprint } from './fetcher'
import { calculateAll, type BudgetContext } from './calculate'
import { DEFAULT_DIGIT_CAP } from './hazar'

/**
 * The single place a submission's code-wise amounts are produced. The office's own
 * budget sheet and every report read from here, so a report can never disagree with
 * the sheet the office sees.
 *
 * A draft is *computed* here, live, from the forms plus the office's manual overrides.
 * A submitted budget is *read* from its frozen snapshot instead — see `getSubmissionSheet`,
 * which is the only entry point callers should use.
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
 * The digit cap the office's level allows in an amount field — the safety net that stops
 * an office typing today's taka figure into a হাজার box. A level the administrator left
 * unset, or an office with no level at all, falls back to the default.
 */
export async function getSubmissionDigitCap(submissionId: number): Promise<number> {
  const officeLevelId = await getSubmissionOfficeLevelId(submissionId)
  if (officeLevelId === null) return DEFAULT_DIGIT_CAP

  const level = await prisma.coreOfficeLevel.findUnique({
    where: { id: BigInt(officeLevelId) },
    select: { digitCap: true },
  })
  return level?.digitCap ?? DEFAULT_DIGIT_CAP
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
  /** The context the rows were computed from. Null for a frozen snapshot, which
   *  was derived from the forms once and must never read them again. */
  context: BudgetContext | null
  /** Whether these rows were computed now or read from the submission's snapshot. */
  source: 'live' | 'snapshot'
  /** Snapshot only — when the values were captured. */
  capturedAt?: Date
  /** Snapshot only — the administrator's rates/config have changed since capture, so
   *  a fresh draft of the same forms would compute different numbers. Purely
   *  informational: a submitted budget is immutable and is never re-priced. */
  configStale?: boolean
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
 *
 * `manualOverrides` (keyed by economic code id) is the submit path's hook: the office's
 * typed-in entries have not been written yet at the point the snapshot is built, so they
 * are supplied here and take precedence over whatever the database currently holds. A
 * `null` value means the office cleared the entry, so the row falls back to its computed value.
 */
export async function computeSubmissionSheet(
  submissionId: number,
  manualOverrides?: Map<number, number | null>
): Promise<SubmissionSheet> {
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

  if (manualOverrides) {
    for (const [codeId, value] of manualOverrides) {
      if (value === null) manualByCode.delete(codeId)
      else manualByCode.set(codeId, value)
    }
  }

  const rows = buildRows(codes, calculated, manualByCode)
  return {
    rows,
    total: rows.reduce((sum, r) => sum + r.final_value, 0),
    context,
    source: 'live',
  }
}

/**
 * The submitted branch: the newest snapshot's rows, rendered exactly as captured.
 * Returns null when a submission has no snapshot, which lets the caller fall back to
 * a live computation rather than rendering an empty sheet.
 */
async function readSnapshotSheet(submissionId: number): Promise<SubmissionSheet | null> {
  const snapshot = await prisma.officeBudgetSnapshot.findFirst({
    where: { submissionId: BigInt(submissionId) },
    orderBy: { version: 'desc' },
    select: {
      configFingerprint: true,
      capturedAt: true,
      total: true,
      rows: {
        orderBy: [{ categorySortOrder: 'asc' }, { sortOrder: 'asc' }],
      },
    },
  })

  if (!snapshot || snapshot.rows.length === 0) return null

  const currentFingerprint = await getConfigFingerprint()

  const rows: SheetRow[] = snapshot.rows.map((r) => ({
    // A code the admin has since deleted has no id to key on; the row's own id is
    // negated so it stays unique and cannot be mistaken for a live code.
    id: r.economicCodeId !== null ? Number(r.economicCodeId) : -Number(r.id),
    code: r.code,
    name: r.name,
    category_id: r.categoryId !== null ? Number(r.categoryId) : null,
    category_code: r.categoryCode,
    category_name: r.categoryName,
    category_sort_order: r.categorySortOrder,
    is_manual: r.isManual,
    allow_manual_override: r.allowManualOverride,
    // Display-only on a frozen sheet; nothing recomputes from it.
    formula_key: null,
    source_forms: r.sourceForms.map(Number),
    sort_order: r.sortOrder,
    auto_value: Number(r.autoValue),
    manual_value: r.manualValue !== null ? Number(r.manualValue) : null,
    final_value: Number(r.finalValue),
  }))

  return {
    rows,
    total: Number(snapshot.total),
    context: null,
    source: 'snapshot',
    capturedAt: snapshot.capturedAt,
    configStale: snapshot.configFingerprint !== currentFingerprint,
  }
}

/**
 * The one entry point every reader uses: the office's budget sheet, the dashboard total
 * and all three reports. A submitted budget returns its frozen snapshot; a draft is
 * computed live. Because both branches live here, no two surfaces can diverge.
 */
export async function getSubmissionSheet(submissionId: number): Promise<SubmissionSheet> {
  const submission = await prisma.officeSubmission.findUnique({
    where: { id: BigInt(submissionId) },
    select: { status: true },
  })

  if (submission?.status === 'submitted') {
    const snapshot = await readSnapshotSheet(submissionId)
    // A submitted row should always have a snapshot — the two are written together.
    // Falling back keeps a legacy/incomplete row readable rather than blank.
    if (snapshot) return snapshot
  }

  return computeSubmissionSheet(submissionId)
}

/**
 * Freezes a computed sheet as the submission's next snapshot version. Called inside the
 * same transaction that flips the status to `submitted`, so "submitted" and "has a
 * snapshot" can never come apart.
 *
 * The rows are copied out in full — code, name and category included — so a later rename,
 * re-categorisation or level-grant change cannot alter how a submitted budget reads.
 */
export async function writeSubmissionSnapshot(
  tx: Prisma.TransactionClient,
  submissionId: number,
  sheet: SubmissionSheet,
  configFingerprint: string
): Promise<void> {
  const latest = await tx.officeBudgetSnapshot.findFirst({
    where: { submissionId: BigInt(submissionId) },
    orderBy: { version: 'desc' },
    select: { version: true },
  })

  const snapshot = await tx.officeBudgetSnapshot.create({
    data: {
      submissionId: BigInt(submissionId),
      version: (latest?.version ?? 0) + 1,
      configFingerprint,
      total: sheet.total,
    },
    select: { id: true },
  })

  // Nothing to store when the office's level was granted no codes at all.
  if (sheet.rows.length === 0) return

  await tx.officeBudgetSnapshotRow.createMany({
    data: sheet.rows.map((r) => ({
      snapshotId: snapshot.id,
      // Only a still-existing code keeps its link; a deleted one is dropped rather
      // than failing the insert, since the display fields are stored regardless.
      economicCodeId: r.id > 0 ? BigInt(r.id) : null,
      code: r.code,
      name: r.name,
      categoryId: r.category_id !== null ? BigInt(r.category_id) : null,
      categoryCode: r.category_code,
      categoryName: r.category_name,
      categorySortOrder: r.category_sort_order,
      sortOrder: r.sort_order,
      isManual: r.is_manual,
      allowManualOverride: r.allow_manual_override,
      sourceForms: r.source_forms,
      autoValue: r.auto_value,
      manualValue: r.manual_value,
      finalValue: r.final_value,
    })),
  })
}
