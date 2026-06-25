import { createClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { strings } from '@/lib/strings'
import { Form1Client } from './form-1-client'

export default async function Form1Page() {
  const supabase = await createClient()

  const session = await getOfficeSession()
  if (!session) redirect('/')

  // TODO: Get submissionId from server-side session/context
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
