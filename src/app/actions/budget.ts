'use server'

import { prisma } from '@/lib/db/client'
import { computeSubmissionSheet } from '@/lib/budget/sheet'

export interface BudgetSheetRowItem {
  id: number
  code_id: number
  code: string
  name: string
  auto_value: number
  manual_value: number | null
  is_manual: boolean
  /** Computed by the engine but overridable by the office (e.g. ডাক). */
  allow_manual_override: boolean
  sort_order: number
}

interface BudgetSheetDataResponse {
  success: boolean
  error?: string
  rows: BudgetSheetRowItem[]
  totalAuto: number
  totalManual: number
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
    }
  }

  try {
    // The sheet is compiled in one place (src/lib/budget/sheet.ts) so the reports,
    // which read the same rows, can never disagree with what the office sees here.
    const { rows: sheet, total, context: ctx } = await computeSubmissionSheet(submissionId)

    const rows: BudgetSheetRowItem[] = sheet.map((r) => ({
      id: r.id,
      code_id: r.id,
      code: r.code,
      name: r.name,
      auto_value: r.auto_value,
      manual_value: r.manual_value,
      is_manual: r.is_manual,
      allow_manual_override: r.allow_manual_override,
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

/**
 * Save manual override value for an economic code
 */
export async function saveManualValue(
  submissionId: number,
  codeIdentifier: string | number,
  manualValue: number | null
) {
  if (!submissionId) {
    return { success: false, error: 'বাজেট আইডি পাওয়া যায়নি' }
  }

  try {
    let codeIdNum = typeof codeIdentifier === 'number' ? codeIdentifier : parseInt(codeIdentifier, 10)

    if (isNaN(codeIdNum)) {
      // Lookup code by code string
      const cData = await prisma.refEconomicCode.findFirst({
        where: { code: String(codeIdentifier) },
        select: { id: true },
      })

      if (cData?.id) {
        codeIdNum = Number(cData.id)
      }
    }

    if (isNaN(codeIdNum)) {
      return { success: false, error: 'কোড শনাক্তকারী অকার্যকর' }
    }

    await prisma.officeBudgetSheet.upsert({
      where: {
        submissionId_economicCodeId: {
          submissionId: BigInt(submissionId),
          economicCodeId: BigInt(codeIdNum),
        },
      },
      update: {
        manualValue: manualValue,
        finalValue: manualValue || 0,
      },
      create: {
        submissionId: BigInt(submissionId),
        economicCodeId: BigInt(codeIdNum),
        autoValue: 0,
        manualValue: manualValue,
        finalValue: manualValue || 0,
      },
    })

    return { success: true }
  } catch (err: any) {
    console.error('saveManualValue error:', err)
    return { success: false, error: `সংরক্ষণ ত্রুটি: ${err?.message || 'অজ্ঞাত ত্রুটি'}` }
  }
}

/**
 * Submit budget sheet
 */
export async function submitBudget(submissionId: number) {
  if (!submissionId) {
    return { success: false, error: 'বাজেট আইডি পাওয়া যায়নি' }
  }

  try {
    await prisma.officeSubmission.update({
      where: { id: BigInt(submissionId) },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
      },
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: `বাজেট দাখিল ব্যর্থ হয়েছে: ${error.message}` }
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
