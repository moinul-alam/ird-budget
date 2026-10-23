import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form4Client } from './form-4-client'
import { loadFormLeaveEncashmentInitial } from '@/lib/office/load-form-data'

export default async function Form4Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const initialData =
    submissionId != null ? await loadFormLeaveEncashmentInitial(submissionId) : null

  return <Form4Client submissionId={submissionId} initialData={initialData} />
}
