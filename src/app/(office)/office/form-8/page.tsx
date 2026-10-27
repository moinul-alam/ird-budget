import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getVehicleTypes } from '@/lib/actions/admin-settings'
import {
  loadFormVehiclesRentInitial,
  loadSalaryMonths,
  loadVehicleRentConfigs,
} from '@/lib/office/load-form-data'
import { Form8Client } from './form-8-client'

export default async function Form8Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null

  const carTypes = await getVehicleTypes()

  // The rent rate is a global configuration, so no office-type lookup is needed here.
  const [rentConfigs, initialData, salaryMonths] = await Promise.all([
    loadVehicleRentConfigs(),
    submissionId ? loadFormVehiclesRentInitial(submissionId) : Promise.resolve([]),
    loadSalaryMonths(),
  ])

  return (
    <Form8Client
      submissionId={submissionId}
      initialData={initialData}
      carTypes={carTypes}
      rentConfigs={rentConfigs}
      salaryMonths={salaryMonths}
    />
  )
}
