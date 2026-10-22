import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form2bClient } from './form-2b-client'

export default async function Form2bPage() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData: any[] = []
  if (submissionId) {
    const { data } = await supabase
      .from('office_form_staff_suspended')
      .select('grade_id, suspended_count, suspended_monthly_basic, suspended_due_salary')
      .eq('submission_id', submissionId)
      .order('grade_id')
    initialData = (data || []).map((r: any) => ({
      grade_id: r.grade_id,
      suspended_count: Number(r.suspended_count || 0),
      suspended_total_basic: Number(r.suspended_monthly_basic || 0),
      suspended_due_salary: Number(r.suspended_due_salary || 0),
    }))
  }

  return (
    <Form2bClient
      initialData={initialData}
      submissionId={submissionId}
    />
  )
}
