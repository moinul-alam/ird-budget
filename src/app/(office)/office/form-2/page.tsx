import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form2Client } from './form-2-client'
import { loadFormStaffWorkingInitial } from '@/lib/office/load-form-data'

export default async function Form2Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const initialData =
    submissionId != null ? await loadFormStaffWorkingInitial(submissionId) : []

  return (
    <Form2Client
      initialData={initialData}
      submissionId={submissionId}
    />
  )
}
