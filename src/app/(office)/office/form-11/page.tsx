import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getUtilityTypes } from '@/app/actions/admin-settings'
import { Form8Client } from './form-8-client'

export default async function Form8Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [utilityTypes, dataRes] = await Promise.all([
    getUtilityTypes(),
    submissionId ? supabase.from('form_utility').select('*').eq('submission_id', submissionId) : Promise.resolve({ data: [] })
  ])

  return (
    <Form8Client 
      submissionId={submissionId} 
      utilityTypes={utilityTypes}
      initialData={dataRes.data || []}
    />
  )
}


