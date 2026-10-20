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
      .from('form_staff')
      .select('*')
      .eq('submission_id', submissionId)
      .order('grade_id')
    initialData = data || []
  }

  return (
    <Form2bClient
      initialData={initialData}
      submissionId={submissionId}
    />
  )
}
