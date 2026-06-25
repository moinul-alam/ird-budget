import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form7Client } from './form-7-client'

export default async function Form7Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [typesRes, dataRes] = await Promise.all([
    supabase.from('equipment_types').select('*').order('id'),
    submissionId ? supabase.from('form_it_equipment').select('*').eq('submission_id', submissionId) : Promise.resolve({ data: [] })
  ])

  return (
    <Form7Client 
      submissionId={submissionId} 
      equipmentTypes={typesRes.data || []}
      initialData={dataRes.data || []}
    />
  )
}


