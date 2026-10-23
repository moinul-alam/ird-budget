import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getUtilityTypes } from '@/app/actions/admin-settings'
import { loadFormUtilitiesInitial } from '@/lib/office/load-form-data'
import { Form11Client } from './form-11-client'

export default async function Form11Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null

  const [utilityTypes, initialData] = await Promise.all([
    getUtilityTypes(),
    submissionId ? loadFormUtilitiesInitial(submissionId) : Promise.resolve([]),
  ])

  return (
    <Form11Client submissionId={submissionId} utilityTypes={utilityTypes} initialData={initialData} />
  )
}
