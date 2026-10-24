import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form5Client } from './form-5-client'
import {
  loadAllowanceTypes,
  loadDutyAllowanceMonthlyRate,
  loadFormAllowancesInitial,
  loadFormRestRecreationInitial,
} from '@/lib/office/load-form-data'

export default async function Form3Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [allowanceTypes, initialData, initialLeaveData, dutyMonthlyRate] = await Promise.all([
    loadAllowanceTypes(),
    submissionId ? loadFormAllowancesInitial(submissionId) : Promise.resolve([]),
    submissionId ? loadFormRestRecreationInitial(submissionId) : Promise.resolve(null),
    loadDutyAllowanceMonthlyRate(),
  ])

  return (
    <Form5Client
      submissionId={submissionId}
      allowanceTypes={allowanceTypes}
      initialData={initialData}
      initialLeaveData={initialLeaveData}
      dutyMonthlyRate={dutyMonthlyRate}
    />
  )
}
