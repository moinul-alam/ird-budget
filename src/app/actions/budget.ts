'use server'

import { createOfficeClient } from '@/lib/supabase/server'
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

// Helper to parse manual budget overrides from form_basic.address tag
function parseManualValuesFromAddress(address: string | null | undefined, submissionId: number): Record<string, number> {
  if (!address) return {}
  try {
    const subTag = `:::manual_budget_${submissionId}=`
    const genericTag = `:::manual_budget=`
    const activeTag = address.includes(subTag) ? subTag : address.includes(genericTag) ? genericTag : null
    if (!activeTag) return {}
    const raw = address.split(activeTag)[1]?.split(':::')[0]
    if (!raw) return {}
    return JSON.parse(decodeURIComponent(raw)) || {}
  } catch {
    return {}
  }
}

// Helper to encode manual budget overrides into form_basic.address tag
function encodeManualValuesIntoAddress(address: string | null | undefined, submissionId: number, manualMap: Record<string, number>): string {
  const baseAddress = (address || '').split(':::manual_budget_')[0]?.split(':::manual_budget=')[0] || ''
  const subTag = `:::manual_budget_${submissionId}=`
  const encoded = encodeURIComponent(JSON.stringify(manualMap))
  return `${baseAddress}${subTag}${encoded}`
}

/**
 * Loads and orchestrates the complete budget sheet rows for a submission:
 * 1. Loads codes from core_expense_codes (falling back to default-codes.json)
 * 2. Fetches submission form context and rates
 * 3. Calculates formula values for all auto codes
 * 4. Merges manual overrides from office_budget_sheet
 * 5. Returns sorted rows with error messaging if anything is incomplete
 */
export async function getBudgetSheetData(submissionId: number): Promise<BudgetSheetDataResponse> {
  const supabase = createOfficeClient()

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

    // 2. Fetch expense codes (fallback to default-codes.json)
    let { data: dbCodes, error: codeErr } = await supabase
      .from('core_economic_codes')
      .select('id, code, name, is_manual, sort_order')

    if (codeErr || !dbCodes || dbCodes.length === 0) {
      const fallbackRes = await supabase
        .from('core_expense_codes')
        .select('id, code, name, is_manual, sort_order')
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        dbCodes = fallbackRes.data
      }
    }

    let activeCodes: Array<{ id: number; code: string; name: string; is_manual: boolean; sort_order: number }> = []

    if (dbCodes && dbCodes.length > 0) {
      activeCodes = dbCodes.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name || '',
        is_manual: Boolean(c.is_manual),
        sort_order: Number(c.sort_order || 0),
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
    const { data: dbBudgetSheet } = await supabase
      .from('office_budget_sheet')
      .select('code_id, manual_value')
      .eq('submission_id', submissionId)

    const manualOverridesFromDb: Record<number, number> = {}
    if (dbBudgetSheet && dbBudgetSheet.length > 0) {
      for (const bs of dbBudgetSheet) {
        if (bs.manual_value !== null && bs.manual_value !== undefined) {
          manualOverridesFromDb[bs.code_id] = Number(bs.manual_value)
        }
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

    // Check which core forms might still be empty to provide helpful feedback
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
  const supabase = createOfficeClient()

  if (!submissionId) {
    return { success: false, error: 'বাজেট আইডি পাওয়া যায়নি' }
  }

  try {
    let codeIdNum = typeof codeIdentifier === 'number' ? codeIdentifier : parseInt(codeIdentifier, 10)

    if (isNaN(codeIdNum)) {
      // Lookup code by code string in core_expense_codes
      const { data: cData } = await supabase
        .from('core_expense_codes')
        .select('id')
        .eq('code', String(codeIdentifier))
        .maybeSingle()

      if (cData?.id) {
        codeIdNum = cData.id
      }
    }

    if (isNaN(codeIdNum)) {
      return { success: false, error: 'কোড শনাক্তকারী অকার্যকর' }
    }

    const { error: upsertErr } = await supabase
      .from('office_budget_sheet')
      .upsert(
        {
          submission_id: submissionId,
          code_id: codeIdNum,
          auto_value: 0,
          manual_value: manualValue,
          final_value: manualValue || 0,
        },
        { onConflict: 'submission_id,code_id' }
      )

    if (upsertErr) {
      return { success: false, error: `সংরক্ষণ ত্রুটি: ${upsertErr.message}` }
    }

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
  const supabase = createOfficeClient()

  if (!submissionId) {
    return { success: false, error: 'বাজেট আইডি পাওয়া যায়নি' }
  }

  // Change submission status to 'submitted'
  const { error } = await supabase
    .from('office_submissions')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', submissionId)

  if (error) {
    return { success: false, error: `বাজেট দাখিল ব্যর্থ হয়েছে: ${error.message}` }
  }

  return { success: true }
}
