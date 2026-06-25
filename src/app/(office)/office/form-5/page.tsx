import { createClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form5Client } from './form-5-client'

export default async function Form5Page() {
  const supabase = await createClient()

  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData: any[] = []
  if (submissionId) {
    const { data } = await supabase
      .from('form_vehicles')
      .select('*')
      .eq('submission_id', submissionId)
      .order('id')
    initialData = data || []
  }

  return <Form5Client submissionId={submissionId} initialData={initialData} />
}
