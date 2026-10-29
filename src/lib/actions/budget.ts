'use server'

import { errorMessage } from '@/lib/errors'

import { prisma } from '@/lib/db/client'
import {
  computeSubmissionSheet,
  getSubmissionSheet,
  writeSubmissionSnapshot,
} from '@/lib/budget/sheet'
import { getConfigFingerprint } from '@/lib/budget/fetcher'
import { getOfficeSession, setOfficeSession } from '@/lib/session'
import { guardDigitCap } from './forms/guard'

/**
 * The submission the signed-in office owns, or null when there is no session.
 * Every office-side read and write below is scoped through this — the submission id
 * arrives from the client, so it can never be trusted on its own.
 */
async function currentSubmissionId(): Promise<number | null> {
  const session = await getOfficeSession()
  return session?.submission_id ?? null
}

/** Shown when a caller names a submission its own office does not own. */
const NOT_OWNED = 'এই দাখিলে আপনার অফিসের প্রবেশাধিকার নেই।'

export interface BudgetSheetRowItem {
  id: number
  code_id: number
  code: string
  name: string
  /** Budget category the code belongs to, used to break the sheet into groups. */
  category_id: number | null
  category_code: string
  category_name: string
  auto_value: number
  manual_value: number | null
  is_manual: boolean
  /** Computed by the engine but overridable by the office (e.g. ডাক). */
  allow_manual_override: boolean
  /** The form numbers whose data produced this code's amount, so the office knows
   *  which form to edit; empty for a manual code, which takes a direct entry. */
  source_forms: number[]
  sort_order: number
}

interface BudgetSheetDataResponse {
  success: boolean
  error?: string
  rows: BudgetSheetRowItem[]
  totalAuto: number
  totalManual: number
  /** The office's level name, shown as context on the sheet header. */
  officeLevel: string
  /** Office name, used as the report/download header. */
  officeName: string
  /** Head quarter (department for a head office, parent office for a field office). */
  headOfficeName: string
  /** The office's 13-digit budget id, shown as the identity line on the sheet header. */
  budgetId: string
  /** True when the office reports to a parent, i.e. it sits below the ministry /
   *  department / head-office tiers and so shows its parent office as its head office. */
  isFieldOffice: boolean
  missingForms?: string[]
  /** True when the rows are the frozen snapshot of an already-submitted budget. */
  isSubmitted: boolean
  /** Snapshot only: the admin's rates/config changed after this budget was submitted.
   *  Informational — a submitted budget is never re-priced. */
  configStale: boolean
  /** Snapshot only: when the submitted figures were captured. */
  capturedAt: string | null
}

/** The response shape every failure path returns, so the new fields are never forgotten. */
function emptySheetResponse(error: string): BudgetSheetDataResponse {
  return {
    success: false,
    error,
    rows: [],
    totalAuto: 0,
    totalManual: 0,
    officeLevel: '',
    officeName: '',
    headOfficeName: '',
    budgetId: '',
    isFieldOffice: false,
    isSubmitted: false,
    configStale: false,
    capturedAt: null,
  }
}

/**
 * Loads and orchestrates the complete budget sheet rows for a submission
 */
export async function getBudgetSheetData(submissionId: number): Promise<BudgetSheetDataResponse> {
  if (!submissionId) {
    return emptySheetResponse(
      'কোনো বাজেট দাখিল (Submission) আইডি পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।'
    )
  }

  if (submissionId !== (await currentSubmissionId())) {
    return emptySheetResponse(NOT_OWNED)
  }

  try {
    // The sheet is compiled in one place (src/lib/budget/sheet.ts) so the reports,
    // which read the same rows, can never disagree with what the office sees here.
    // A submitted budget returns its frozen snapshot; a draft is computed live.
    const { rows: sheet, total, context: ctx, source, configStale, capturedAt } =
      await getSubmissionSheet(submissionId)

    const submission = await prisma.officeSubmission.findUnique({
      where: { id: BigInt(submissionId) },
      select: {
        office: {
          select: {
            name: true,
            budgetId: true,
            parentOfficeId: true,
            officeLevel: { select: { levelName: true } },
            department: { select: { name: true } },
            parentOffice: { select: { name: true } },
          },
        },
      },
    })
    const office = submission?.office
    const officeLevel = office?.officeLevel?.levelName || ''
    // A head office (no parent) reports its department; a field office its parent.
    const headOfficeName = office
      ? office.parentOfficeId === null
        ? office.department?.name ?? ''
        : office.parentOffice?.name ?? ''
      : ''
    const officeName = office?.name || ''
    const budgetId = office?.budgetId || ''
    // A parent link is what separates a field office from the ministry / department /
    // head-office tiers — those sit at the top of the chain and have nothing above them.
    const isFieldOffice = office?.parentOfficeId !== null && office?.parentOfficeId !== undefined

    const rows: BudgetSheetRowItem[] = sheet.map((r) => ({
      id: r.id,
      code_id: r.id,
      code: r.code,
      name: r.name,
      category_id: r.category_id,
      category_code: r.category_code,
      category_name: r.category_name,
      auto_value: r.auto_value,
      manual_value: r.manual_value,
      is_manual: r.is_manual,
      allow_manual_override: r.allow_manual_override,
      source_forms: r.source_forms,
      sort_order: r.sort_order,
    }))

    const totalAuto = rows.reduce((sum, r) => sum + (r.auto_value || 0), 0)
    const totalManual = total

    // Check which core forms might still be empty. A frozen snapshot no longer reads
    // the forms at all, so there is nothing to point the office at.
    const missingForms: string[] = []
    if (ctx) {
      if (!ctx.staff || ctx.staff.length === 0) missingForms.push('কর্মকর্তা/কর্মচারীর বেতন (ফরম ২/৩)')
      if (!ctx.utilities || ctx.utilities.length === 0) missingForms.push('ইউটিলিটি ও অন্যান্য বিল (ফরম ১১)')
      if (!ctx.houseRent) missingForms.push('অফিস ভবন ভাড়া (ফরম ৯)')
    }

    return {
      success: true,
      rows,
      totalAuto,
      totalManual,
      officeLevel,
      officeName,
      headOfficeName,
      budgetId,
      isFieldOffice,
      missingForms,
      isSubmitted: source === 'snapshot',
      configStale: Boolean(configStale),
      capturedAt: capturedAt ? capturedAt.toISOString() : null,
    }
  } catch (err) {
    console.error('getBudgetSheetData error:', err)
    return emptySheetResponse(
      `বাজেট হিসাব তৈরিতে সমস্যা হয়েছে: ${errorMessage(err) || 'অজ্ঞাত ত্রুটি'}`
    )
  }
}

/**
 * Recalculate Budget and refresh values.
 *
 * Only a draft recomputes: it is derived from the forms every time it is opened, so a
 * refresh re-reads them. A submitted budget reads its frozen snapshot, which cannot
 * change — recalculating it is meaningless, so this reports that rather than pretending
 * to do something.
 */
export async function recalculateBudget(submissionId: number) {
  try {
    if (submissionId !== (await currentSubmissionId())) {
      return { success: false, error: NOT_OWNED }
    }

    const submission = await prisma.officeSubmission.findUnique({
      where: { id: BigInt(submissionId) },
      select: { status: true },
    })
    if (submission?.status === 'submitted') {
      return { success: false, error: 'দাখিলকৃত বাজেট চূড়ান্তভাবে সংরক্ষিত — পুনর্গণনার প্রয়োজন নেই।' }
    }

    const data = await getBudgetSheetData(submissionId)
    if (!data.success) {
      return { success: false, error: data.error }
    }
    return {
      success: true,
      rows: data.rows,
      totalAuto: data.totalAuto,
      totalManual: data.totalManual,
      missingForms: data.missingForms,
    }
  } catch (err) {
    return { success: false, error: errorMessage(err) || 'বাজেট পুনর্গণনা ব্যর্থ হয়েছে' }
  }
}

/** A manual amount the sheet holds in the browser until the office submits. */
export interface ManualValueEntry {
  /** The economic code itself (e.g. "3111303"), as shown on the sheet. */
  code: string
  /** The office's amount, or null when it cleared a previously entered one. */
  value: number | null
}

/** `status` of the submission, or null when the id names nothing. */
async function submissionStatus(submissionId: number): Promise<string | null> {
  const sub = await prisma.officeSubmission.findUnique({
    where: { id: BigInt(submissionId) },
    select: { status: true },
  })
  return sub?.status ?? null
}

/** Shown when the office tries to write to a budget that is already dakhil. */
const ALREADY_SUBMITTED =
  'বাজেট ইতিমধ্যে দাখিল করা হয়েছে এবং চূড়ান্তভাবে সংরক্ষিত। সংশোধন করতে হলে প্রথমে আনলক করুন।'

/** One entry of `manual_values` once its economic code has been resolved to a row id. */
interface ResolvedManualEntry {
  codeId: number
  value: number | null
}

/**
 * Resolves each entry's economic code to the row it belongs to, so both the write path
 * and the snapshot's overlay can work from ids rather than codes. One lookup for the
 * whole batch.
 *
 * The sheet sends the economic code itself (e.g. "3111303"), not a row id. Parsing it as
 * a number was the old bug: every code begins with digits, so the parse always succeeded
 * and the code was used as a primary key instead — which the foreign key on
 * office_budget_sheet.economic_code_id then rejected.
 */
async function resolveManualEntries(manualValues: ManualValueEntry[]): Promise<ResolvedManualEntry[]> {
  if (manualValues.length === 0) return []

  const codeRows = await prisma.refEconomicCode.findMany({
    where: { code: { in: manualValues.map((entry) => entry.code) } },
    select: { id: true, code: true },
  })
  const idByCode = new Map(codeRows.map((row) => [row.code, Number(row.id)]))

  return manualValues.map((entry) => {
    const codeId = idByCode.get(entry.code)
    if (codeId === undefined) {
      throw new Error(`কোড শনাক্তকারী অকার্যকর: ${entry.code}`)
    }
    return { codeId, value: entry.value }
  })
}

/** The upsert for one resolved manual entry, bound to whichever client is writing. */
function manualEntryWrite(
  client: Pick<typeof prisma, 'officeBudgetSheet'>,
  submissionId: number,
  entry: ResolvedManualEntry
) {
  return client.officeBudgetSheet.upsert({
    where: {
      submissionId_economicCodeId: {
        submissionId: BigInt(submissionId),
        economicCodeId: BigInt(entry.codeId),
      },
    },
    update: {
      manualValue: entry.value,
      finalValue: entry.value || 0,
    },
    create: {
      submissionId: BigInt(submissionId),
      economicCodeId: BigInt(entry.codeId),
      autoValue: 0,
      manualValue: entry.value,
      finalValue: entry.value || 0,
    },
  })
}

/**
 * Store the sheet's manual entries without changing the submission's status — what the
 * সংরক্ষণ button and the "save and leave" answer on the unsaved-changes dialog both call.
 * A submitted budget is frozen, so it rejects this outright.
 */
export async function saveManualValues(
  submissionId: number,
  manualValues: ManualValueEntry[]
) {
  if (!submissionId) {
    return { success: false, error: 'বাজেট আইডি পাওয়া যায়নি' }
  }

  if (submissionId !== (await currentSubmissionId())) {
    return { success: false, error: NOT_OWNED }
  }

  try {
    if ((await submissionStatus(submissionId)) === 'submitted') {
      return { success: false, error: ALREADY_SUBMITTED }
    }

    const capGuard = await guardDigitCap(submissionId, manualValues.map((entry) => entry.value))
    if (capGuard) return { success: false, error: capGuard.error }

    const resolved = await resolveManualEntries(manualValues)
    if (resolved.length === 0) return { success: true }

    await prisma.$transaction(resolved.map((entry) => manualEntryWrite(prisma, submissionId, entry)))
    return { success: true }
  } catch (error) {
    return { success: false, error: `সংরক্ষণ ত্রুটি: ${errorMessage(error)}` }
  }
}

/**
 * Submit budget sheet, writing every manual entry the office made in this visit and
 * freezing the resulting sheet.
 *
 * The entries are written together with the status change and the snapshot, so a
 * submission can never exist without the frozen figures that back it. The pending entries
 * are overlaid onto the computed sheet *before* the transaction, because the engine reads
 * through its own connection and would not see rows this transaction has yet to commit.
 *
 * Re-submitting is refused: a submitted budget is immutable, and the only route back to
 * editing is an explicit unlock (which makes the next submit a new snapshot version).
 */
export async function submitBudget(
  submissionId: number,
  manualValues: ManualValueEntry[] = []
) {
  if (!submissionId) {
    return { success: false, error: 'বাজেট আইডি পাওয়া যায়নি' }
  }

  if (submissionId !== (await currentSubmissionId())) {
    return { success: false, error: NOT_OWNED }
  }

  try {
    if ((await submissionStatus(submissionId)) === 'submitted') {
      return { success: false, error: ALREADY_SUBMITTED }
    }

    const capGuard = await guardDigitCap(submissionId, manualValues.map((entry) => entry.value))
    if (capGuard) return { success: false, error: capGuard.error }

    const resolved = await resolveManualEntries(manualValues)
    const overrides = new Map<number, number | null>(
      resolved.map((entry) => [entry.codeId, entry.value])
    )

    // The sheet the office is about to make final, with the entries still held in the
    // browser already applied.
    const sheet = await computeSubmissionSheet(submissionId, overrides)
    const configFingerprint = await getConfigFingerprint()

    await prisma.$transaction(async (tx) => {
      for (const entry of resolved) {
        await manualEntryWrite(tx, submissionId, entry)
      }

      await writeSubmissionSnapshot(tx, submissionId, sheet, configFingerprint)

      await tx.officeSubmission.update({
        where: { id: BigInt(submissionId) },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
        },
      })
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: `বাজেট দাখিল ব্যর্থ হয়েছে: ${errorMessage(error)}` }
  }
}

/**
 * Start this office's budget for the open cycle. The dashboard offer calls this and
 * only then does the draft row exist — signing in no longer creates one.
 *
 * Idempotent: `upsert` returns the row that is already there, so a second click or two
 * tabs racing each other cannot trip the (office, cycle) unique key.
 */
export async function startBudget() {
  const session = await getOfficeSession()
  if (!session) {
    return { success: false, error: 'অনুগ্রহ করে পুনরায় লগইন করুন।' }
  }

  const officeId = session.office_id ?? Number(session.id)
  if (!officeId || Number.isNaN(officeId)) {
    return { success: false, error: 'অফিস শনাক্ত করা যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।' }
  }

  try {
    const cycle = await prisma.coreBudgetCycle.findFirst({
      where: { status: 'open' },
      orderBy: { id: 'desc' },
      select: { id: true },
    })

    if (!cycle) {
      return { success: false, error: 'বর্তমানে কোনো বাজেট চক্র চালু নেই।' }
    }

    const submission = await prisma.officeSubmission.upsert({
      where: {
        officeId_cycleId: { officeId: BigInt(officeId), cycleId: cycle.id },
      },
      update: {},
      create: {
        officeId: BigInt(officeId),
        cycleId: cycle.id,
        status: 'draft',
      },
      select: { id: true },
    })

    // Every form reads the submission id from the session cookie, so it has to carry
    // the new row before the dashboard (and the drawer beneath it) re-renders.
    await setOfficeSession({ ...session, submission_id: Number(submission.id) })

    return { success: true }
  } catch (error) {
    const message = errorMessage(error) || 'অজ্ঞাত ত্রুটি'
    return { success: false, error: `বাজেট শুরু করা যায়নি: ${message}` }
  }
}

/**
 * Re-open a submitted budget for editing. `submitted_at` is left in place so the
 * dashboard can tell an in-progress revision from a never-submitted form.
 */
export async function unlockBudget(submissionId: number) {
  if (!submissionId) {
    return { success: false, error: 'বাজেট আইডি পাওয়া যায়নি' }
  }

  if (submissionId !== (await currentSubmissionId())) {
    return { success: false, error: NOT_OWNED }
  }

  try {
    const sub = await prisma.officeSubmission.findUnique({
      where: { id: BigInt(submissionId) },
      select: { status: true },
    })

    if (!sub) {
      return { success: false, error: 'বাজেট দাখিল পাওয়া যায়নি' }
    }
    if (sub.status !== 'submitted') {
      return { success: false, error: 'বাজেট ইতিমধ্যে সম্পাদনাযোগ্য অবস্থায় আছে' }
    }

    await prisma.officeSubmission.update({
      where: { id: BigInt(submissionId) },
      data: { status: 'draft' },
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: `বাজেট আনলক ব্যর্থ হয়েছে: ${errorMessage(error)}` }
  }
}
