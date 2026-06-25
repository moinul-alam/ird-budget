import { createClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form2Client } from './form-2-client'

export default async function Form2Page() {
  const supabase = await createClient()

  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData: any[] = []
  if (submissionId) {
    const { data } = await supabase
      .from('form_staff')
      .select('*')
      .eq('submission_id', submissionId)
    initialData = data || []
  }

  return (
    <Form2Client
      initialData={initialData}
      submissionId={submissionId}
    />
  )
}
