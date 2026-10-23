import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form1Client } from './form-1-client'
import { loadFormBasicInitial } from '@/lib/office/load-form-data'

export default async function Form1Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const initialData =
    submissionId != null ? await loadFormBasicInitial(submissionId) : null

  return (
    <Form1Client
      initialData={initialData}
      submissionId={submissionId}
    />
  )
}
