import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form6Client } from './form-6-client'
import { loadFormLeaveEncashmentInitial } from '@/lib/office/load-form-data'

export default async function Form4Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const initialData =
    submissionId != null ? await loadFormLeaveEncashmentInitial(submissionId) : null

  return <Form6Client submissionId={submissionId} initialData={initialData} />
}
