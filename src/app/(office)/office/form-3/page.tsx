import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form3Client } from './form-3-client'
import { loadFormStaffSuspendedInitial, loadGrades } from '@/lib/office/load-form-data'

export default async function Form3Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [initialData, grades] = await Promise.all([
    submissionId != null ? loadFormStaffSuspendedInitial(submissionId) : Promise.resolve([]),
    loadGrades(),
  ])

  return (
    <Form3Client
      initialData={initialData}
      submissionId={submissionId}
      grades={grades}
    />
  )
}
