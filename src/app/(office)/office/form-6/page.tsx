import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form6Client } from './form-6-client'

export default async function Form6Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData: any[] = []
  if (submissionId) {
    const { data } = await supabase
      .from('form_vehicle_rent')
      .select('*')
      .eq('submission_id', submissionId)
      .order('id')
    initialData = data || []
  }

  return <Form6Client submissionId={submissionId} initialData={initialData} />
}


