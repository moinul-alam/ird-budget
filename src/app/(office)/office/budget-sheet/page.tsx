import { createOfficeClient } from '@/lib/supabase/server'
import { BudgetSheetClient } from './budget-sheet-client'

export default async function BudgetSheetPage() {
  const supabase = createOfficeClient()
  const submissionId = null

  let initialRows: any[] = []
  if (submissionId) {
    const { data } = await supabase
      .from('budget_sheet')
      .select('*, expense_codes(code, title, is_manual, sort_order)')
      .eq('submission_id', submissionId)
      
    // Sort by expense_codes.sort_order if available
    initialRows = (data || []).sort((a: any, b: any) => {
      const aOrder = a.expense_codes?.sort_order || 0
      const bOrder = b.expense_codes?.sort_order || 0
      return aOrder - bOrder
    })
  }

  return <BudgetSheetClient initialRows={initialRows} submissionId={submissionId} />
}
