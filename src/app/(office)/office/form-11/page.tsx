import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getUtilityTypes } from '@/app/actions/admin-settings'
import { Form8Client } from './form-8-client'

export default async function Form8Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [utilityTypes, dataRes] = await Promise.all([
    getUtilityTypes(),
    Promise.resolve({ data: [] })
  ])

  return (
    <Form8Client 
      submissionId={submissionId} 
      utilityTypes={utilityTypes}
      initialData={dataRes.data || []}
    />
  )
}


