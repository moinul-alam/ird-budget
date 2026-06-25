import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form9Client } from './form-9-client'

export default async function Form9Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData = null
  if (submissionId) {
    const { data } = await supabase
      .from('form_house_rent')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle()
    initialData = data
  }

  return <Form9Client submissionId={submissionId} initialData={initialData} />
}


