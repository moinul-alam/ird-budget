import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { BudgetSheetClient } from './budget-sheet-client'

export default async function BudgetSheetPage() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null
  const supabase = createOfficeClient()

  let initialRows: any[] = []
  if (submissionId) {
    const { data } = await supabase
      .from('budget_sheet')
      .select('*, expense_codes(code, name, is_manual, sort_order)')
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

