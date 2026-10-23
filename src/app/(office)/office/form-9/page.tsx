import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { loadFormHouseRentInitial, loadVatPercentage } from '@/lib/office/load-form-data'
import { Form9Client } from './form-9-client'

export default async function Form9Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null

  // The VAT rate is an admin rate, not a constant: changing it in
  // /admin/settings must change what this form projects.
  const [initialData, vatPercentage] = await Promise.all([
    submissionId ? loadFormHouseRentInitial(submissionId) : Promise.resolve(null),
    loadVatPercentage(),
  ])

  return (
    <Form9Client
      submissionId={submissionId}
      initialData={initialData}
      vatPercentage={vatPercentage}
    />
  )
}
