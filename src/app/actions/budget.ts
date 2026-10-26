'use server'

import { prisma } from '@/lib/db/client'
import { computeSubmissionSheet } from '@/lib/budget/sheet'
import { getOfficeSession, setOfficeSession } from '@/lib/session'

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
  missingForms?: string[]
}

/**
 * Loads and orchestrates the complete budget sheet rows for a submission
 */
export async function getBudgetSheetData(submissionId: number): Promise<BudgetSheetDataResponse> {
  if (!submissionId) {
    return {
      success: false,
      error: 'কোনো বাজেট দাখিল (Submission) আইডি পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।',
      rows: [],
      totalAuto: 0,
      totalManual: 0,
      officeLevel: '',
      officeName: '',
      headOfficeName: '',
    }
  }

  if (submissionId !== (await currentSubmissionId())) {
    return {
      success: false,
      error: NOT_OWNED,
      rows: [],
      totalAuto: 0,
      totalManual: 0,
      officeLevel: '',
      officeName: '',
      headOfficeName: '',
    }
  }

  try {
    // The sheet is compiled in one place (src/lib/budget/sheet.ts) so the reports,
    // which read the same rows, can never disagree with what the office sees here.
    const { rows: sheet, total, context: ctx } = await computeSubmissionSheet(submissionId)

    const submission = await prisma.officeSubmission.findUnique({
      where: { id: BigInt(submissionId) },
      select: {
        office: {
          select: {
            name: true,
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

    // Check which core forms might still be empty
    const missingForms: string[] = []
    if (!ctx.staff || ctx.staff.length === 0) missingForms.push('কর্মকর্তা/কর্মচারীর বেতন (ফরম ২/৩)')
    if (!ctx.utilities || ctx.utilities.length === 0) missingForms.push('ইউটিলিটি ও অন্যান্য বিল (ফরম ১১)')
    if (!ctx.houseRent) missingForms.push('অফিস ভবন ভাড়া (ফরম ৯)')

    return {
      success: true,
      rows,
      totalAuto,
      totalManual,
      officeLevel,
      officeName,
      headOfficeName,
      missingForms,
    }
  } catch (err: any) {
    console.error('getBudgetSheetData error:', err)
    return {
      success: false,
      error: `বাজেট হিসাব তৈরিতে সমস্যা হয়েছে: ${err?.message || 'অজ্ঞাত ত্রুটি'}`,
      rows: [],
      totalAuto: 0,
      totalManual: 0,
      officeLevel: '',
      officeName: '',
      headOfficeName: '',
    }
  }
}

/**
 * Recalculate Budget and refresh values
 */
export async function recalculateBudget(submissionId: number) {
  try {
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
  } catch (err: any) {
    return { success: false, error: err?.message || 'বাজেট পুনর্গণনা ব্যর্থ হয়েছে' }
  }
}

/** A manual amount the sheet holds in the browser until the office submits. */
export interface ManualValueEntry {
  /** The economic code itself (e.g. "3111303"), as shown on the sheet. */
  code: string
  /** The office's amount, or null when it cleared a previously entered one. */
  value: number | null
}

/**
 * The upsert statements for a batch of manual entries, with every code resolved to its
 * row id up front so N entries cost one lookup rather than N. Shared by the submit and
 * the save-without-submitting paths so both write the sheet the same way.
 *
 * The sheet sends the economic code itself (e.g. "3111303"), not a row id. Parsing it as
 * a number was the old bug: every code begins with digits, so the parse always succeeded
 * and the code was used as a primary key instead — which the foreign key on
 * office_budget_sheet.economic_code_id then rejected.
 */
async function buildManualEntryWrites(
  submissionId: number,
  manualValues: ManualValueEntry[]
) {
  if (manualValues.length === 0) return []

  const codeRows = await prisma.refEconomicCode.findMany({
    where: { code: { in: manualValues.map((entry) => entry.code) } },
    select: { id: true, code: true },
  })
  const idByCode = new Map(codeRows.map((row) => [row.code, row.id]))

  return manualValues.map((entry) => {
    const codeId = idByCode.get(entry.code)
    if (codeId === undefined) {
      throw new Error(`কোড শনাক্তকারী অকার্যকর: ${entry.code}`)
    }

    return prisma.officeBudgetSheet.upsert({
      where: {
        submissionId_economicCodeId: {
          submissionId: BigInt(submissionId),
          economicCodeId: codeId,
        },
      },
      update: {
        manualValue: entry.value,
        finalValue: entry.value || 0,
      },
      create: {
        submissionId: BigInt(submissionId),
        economicCodeId: codeId,
        autoValue: 0,
        manualValue: entry.value,
        finalValue: entry.value || 0,
      },
    })
  })
}

/**
 * Store the sheet's manual entries without changing the submission's status — what the
 * "save and leave" answer on the unsaved-changes dialog calls.
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
    const writes = await buildManualEntryWrites(submissionId, manualValues)
    if (writes.length === 0) return { success: true }

    await prisma.$transaction(writes)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: `সংরক্ষণ ত্রুটি: ${error.message}` }
  }
}

/**
 * Submit budget sheet, writing every manual entry the office made in this visit.
 *
 * The sheet keeps those entries in the browser and hands them over in this one call, so
 * a session with a dozen edited rows costs the database a single transaction instead of
 * a write per keystroke. The entries are written together with the status change: either
 * the whole sheet is submitted or nothing about it moves.
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
    await prisma.$transaction([
      ...(await buildManualEntryWrites(submissionId, manualValues)),
      prisma.officeSubmission.update({
        where: { id: BigInt(submissionId) },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
        },
      }),
    ])

    return { success: true }
  } catch (error: any) {
    return { success: false, error: `বাজেট দাখিল ব্যর্থ হয়েছে: ${error.message}` }
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
    const message = error instanceof Error ? error.message : 'অজ্ঞাত ত্রুটি'
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
  } catch (error: any) {
    return { success: false, error: `বাজেট আনলক ব্যর্থ হয়েছে: ${error.message}` }
  }
}
