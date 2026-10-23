import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form9Client } from './form-9-client'

export default async function Form9Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData = null
  let vatPercentage = 15 // Standard default fallback
  if (submissionId) {
    // House rent data loading via Prisma
  }

  return (
    <Form9Client
      submissionId={submissionId}
      initialData={initialData}
      vatPercentage={vatPercentage}
    />
  )
}


