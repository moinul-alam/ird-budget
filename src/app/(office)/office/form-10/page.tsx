import { createClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form10Client } from './form-10-client'

export default async function Form10Page() {
  const supabase = await createClient()

  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData = null
  if (submissionId) {
    const { data } = await supabase
      .from('form_return_info')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle()
    initialData = data
  }

  return <Form10Client submissionId={submissionId} initialData={initialData} />
}
