import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { loadFormHouseRentInitial, loadVatPercentage, loadSalaryMonths } from '@/lib/office/load-form-data'
import { Form9Client } from './form-9-client'

export default async function Form9Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null

  // The VAT rate and the budget-months multiplier are admin rates, not constants:
  // changing them in /admin/settings must change what this form projects.
  const [initialData, vatPercentage, salaryMonths] = await Promise.all([
    submissionId ? loadFormHouseRentInitial(submissionId) : Promise.resolve(null),
    loadVatPercentage(),
    loadSalaryMonths(),
  ])

  return (
    <Form9Client
      submissionId={submissionId}
      initialData={initialData}
      vatPercentage={vatPercentage}
      salaryMonths={salaryMonths}
    />
  )
}
