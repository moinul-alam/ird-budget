import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form2bClient } from './form-2b-client'
import { loadFormStaffSuspendedInitial } from '@/lib/office/load-form-data'

export default async function Form2bPage() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const initialData =
    submissionId != null ? await loadFormStaffSuspendedInitial(submissionId) : []

  return (
    <Form2bClient
      initialData={initialData}
      submissionId={submissionId}
    />
  )
}
