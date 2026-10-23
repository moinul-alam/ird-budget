import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form10Client } from './form-10-client'

export default async function Form10Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData = null
  if (submissionId) {
    // Return info data loading via Prisma
  }

  return <Form10Client submissionId={submissionId} initialData={initialData} />
}


