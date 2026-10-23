'use server'

import { prisma } from '@/lib/db/client'
import { getBudgetContext } from '@/lib/budget/fetcher'
import { calculateAll } from '@/lib/budget/calculate'
import defaultCodesData from '@/lib/budget/default-codes.json'

export interface BudgetSheetRowItem {
  id: number
  code_id: number
  code: string
  name: string
  auto_value: number
  manual_value: number | null
  is_manual: boolean
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
    // 1. Fetch form context & rates
    const ctx = await getBudgetContext(submissionId)

    // 2. Fetch economic codes (fallback to default-codes.json)
    let dbCodes = await prisma.refEconomicCode.findMany({
      select: { id: true, code: true, name: true, isManual: true, sortOrder: true },
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    let activeCodes: Array<{ id: number; code: string; name: string; is_manual: boolean; sort_order: number }> = []

    if (dbCodes && dbCodes.length > 0) {
      activeCodes = dbCodes.map((c) => ({
        id: Number(c.id),
        code: c.code,
        name: c.name || '',
        is_manual: c.isManual,
        sort_order: Number(c.sortOrder || 0),
      }))
    } else {
      activeCodes = (defaultCodesData as any[]).map((c, idx) => ({
        id: idx + 1,
        code: c.code,
        name: c.name,
        is_manual: Boolean(c.is_manual),
        sort_order: Number(c.sort_order || idx + 1),
      }))
    }

    // Sort by sort_order
    activeCodes.sort((a, b) => a.sort_order - b.sort_order)

    // 3. Compute auto values
    const formulaCodes = activeCodes.filter((c) => !c.is_manual).map((c) => c.code)
    const calculatedValues = calculateAll(formulaCodes, ctx)

    // 4. Fetch manual overrides from office_budget_sheet table
    const dbBudgetSheet = await prisma.officeBudgetSheet.findMany({
      where: { submissionId: BigInt(submissionId) },
      select: { economicCodeId: true, manualValue: true },
    })

    const manualOverridesFromDb: Record<number, number> = {}
    for (const bs of dbBudgetSheet) {
      if (bs.manualValue !== null && bs.manualValue !== undefined) {
        manualOverridesFromDb[Number(bs.economicCodeId)] = Number(bs.manualValue)
      }
    }

    // 5. Build final row items
    const rows: BudgetSheetRowItem[] = activeCodes.map((c) => {
      const autoVal = c.is_manual ? 0 : (calculatedValues[c.code] || 0)
      const manualVal: number | null = manualOverridesFromDb[c.id] !== undefined ? manualOverridesFromDb[c.id] : null

      return {
        id: c.id,
        code_id: c.id,
        code: c.code,
        name: c.name,
        auto_value: autoVal,
        manual_value: manualVal,
        is_manual: c.is_manual,
        sort_order: c.sort_order,
      }
    })

    const totalAuto = rows.reduce((sum, r) => sum + (r.auto_value || 0), 0)
    const totalManual = rows.reduce((sum, r) => sum + (r.manual_value ?? r.auto_value ?? 0), 0)

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
