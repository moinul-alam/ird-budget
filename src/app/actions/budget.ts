'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getBudgetContext } from '@/lib/budget/fetcher'
import { calculateAll, codeFormulas } from '@/lib/budget/calculate'

export async function recalculateBudget(submissionId: number) {
  const supabase = createOfficeClient()

  // 1. Fetch form data & rates
  const ctx = await getBudgetContext(submissionId)

  // 2. Fetch active expense codes assigned to this office type
  // For now, we'll fetch all active expense codes. In reality, we'd join with office_type_codes
  const { data: codesData } = await supabase
    .from('expense_codes')
    .select('id, code, is_manual')
    .eq('is_active', true)

  if (!codesData) return { error: 'Failed to load expense codes' }

  // 3. Calculate auto values
  const formulaCodes = (codesData || []).filter((c: any) => !c.is_manual).map((c: any) => c.code)
  const calculatedValues = calculateAll(formulaCodes, ctx)

  // 4. Upsert into budget_sheet
  for (const row of codesData) {
    if (row.is_manual) continue // manual items don't get auto-calculated

    const autoValue = calculatedValues[row.code] || 0

    // Upsert logic (simplifying for Next.js - could use Supabase RPC or single upsert query)
    const { data: existing } = await supabase
      .from('budget_sheet')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('code_id', row.id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('budget_sheet')
        .update({ auto_value: autoValue })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('budget_sheet')
        .insert({
          submission_id: submissionId,
          code_id: row.id,
          auto_value: autoValue,
          manual_value: null, // ensure manual value is untouched or null initially
        })
    }
  }

  return { success: true }
}

export async function saveManualValue(submissionId: number, codeId: number, manualValue: number) {
  const supabase = createOfficeClient()

  const { data: existing } = await supabase
    .from('budget_sheet')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('code_id', codeId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('budget_sheet')
      .update({ manual_value: manualValue })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('budget_sheet')
      .insert({
        submission_id: submissionId,
        code_id: codeId,
        auto_value: 0,
        manual_value: manualValue,
      })
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function submitBudget(submissionId: number) {
  const supabase = createOfficeClient()

  // Change submission status to 'submitted'
  const { error } = await supabase
    .from('submissions')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', submissionId)

  if (error) return { error: error.message }

  return { success: true }
}
