import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getFormNewStaffRows, NewStaffRecord } from '@/app/actions/forms'
import { Form4Client } from './form-4-client'
import { loadSubmissionFiscalYear } from '@/lib/office/load-form-data'

export default async function Form4Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData: NewStaffRecord[] = []
  let fiscalYear = '2026-2027'

  if (submissionId) {
    initialData = await getFormNewStaffRows(submissionId)
    const fy = await loadSubmissionFiscalYear(submissionId)
    if (fy) fiscalYear = fy
  }

  return (
    <Form4Client
      initialData={initialData}
      submissionId={submissionId}
      fiscalYear={fiscalYear}
    />
  )
}
