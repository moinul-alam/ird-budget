import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form4Client } from './form-4-client'

export default async function Form4Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData = null
  if (submissionId) {
    const { data } = await supabase
      .from('form_leave')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle()
    initialData = data
  }

  return <Form4Client submissionId={submissionId} initialData={initialData} />
}


