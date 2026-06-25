import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form8Client } from './form-8-client'

export default async function Form8Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [typesRes, dataRes] = await Promise.all([
    supabase.from('utility_types').select('*').order('id'),
    submissionId ? supabase.from('form_utility').select('*').eq('submission_id', submissionId) : Promise.resolve({ data: [] })
  ])

  return (
    <Form8Client 
      submissionId={submissionId} 
      utilityTypes={typesRes.data || []}
      initialData={dataRes.data || []}
    />
  )
}


