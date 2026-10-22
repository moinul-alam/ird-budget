import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form2Client } from './form-2-client'

export default async function Form2Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData: any[] = []
  if (submissionId) {
    const { data } = await supabase
      .from('office_form_staff_working')
      .select('grade_id, staff_count, monthly_basic, due_salary')
      .eq('submission_id', submissionId)
    initialData = (data || []).map((r: any) => ({
      grade_id: r.grade_id,
      count: Number(r.staff_count || 0),
      total_basic: Number(r.monthly_basic || 0),
      due_salary: Number(r.due_salary || 0),
    }))
  }

  return (
    <Form2Client
      initialData={initialData}
      submissionId={submissionId}
    />
  )
}


