import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form2Client } from './form-2-client'
import { loadFormStaffWorkingInitial, loadGrades, loadSalaryMonths } from '@/lib/office/load-form-data'

export default async function Form2Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [initialData, grades, salaryMonths] = await Promise.all([
    submissionId != null ? loadFormStaffWorkingInitial(submissionId) : Promise.resolve([]),
    loadGrades(),
    loadSalaryMonths(),
  ])

  return (
    <Form2Client
      initialData={initialData}
      submissionId={submissionId}
      grades={grades}
      salaryMonths={salaryMonths}
    />
  )
}
