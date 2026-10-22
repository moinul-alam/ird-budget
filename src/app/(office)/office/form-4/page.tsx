import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getFormNewStaffRows, NewStaffRecord } from '@/app/actions/forms'
import { Form4Client } from './form-4-client'

export default async function Form4Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData: NewStaffRecord[] = []
  let fiscalYear = '2026-2027'

  if (submissionId) {
    initialData = await getFormNewStaffRows(submissionId)

    // Retrieve fiscal year from cycle
    const { data: sub } = await supabase
      .from('submissions')
      .select('cycle_id, cycles(fiscal_year)')
      .eq('id', submissionId)
      .maybeSingle()
    
    const cy = (sub as any)?.cycles
    if (cy?.fiscal_year) {
      fiscalYear = cy.fiscal_year.split(':::')[0]
    }
  }

  return (
    <Form4Client
      initialData={initialData}
      submissionId={submissionId}
      fiscalYear={fiscalYear}
    />
  )
}
