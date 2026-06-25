import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form1Client } from './form-1-client'

export default async function Form1Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData = null
  if (submissionId) {
    const { data } = await supabase
      .from('form_basic')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle()
    initialData = data
  }

  return (
    <Form1Client
      initialData={initialData}
      submissionId={submissionId}
    />
  )
}

