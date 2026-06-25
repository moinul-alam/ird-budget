import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form3Client } from './form-3-client'

export default async function Form3Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [typesRes, dataRes] = await Promise.all([
    supabase.from('allowance_types').select('*').order('id'),
    submissionId ? supabase.from('form_allowances').select('*').eq('submission_id', submissionId) : Promise.resolve({ data: [] })
  ])

  return (
    <Form3Client 
      submissionId={submissionId} 
      allowanceTypes={typesRes.data || []}
      initialData={dataRes.data || []}
    />
  )
}


