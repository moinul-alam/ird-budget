import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { loadFormReturnInfoInitial } from '@/lib/office/load-form-data'
import { Form12Client } from './form-12-client'

export default async function Form12Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null

  const initialData = submissionId ? await loadFormReturnInfoInitial(submissionId) : null

  return <Form12Client submissionId={submissionId} initialData={initialData} />
}
