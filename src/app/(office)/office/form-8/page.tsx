import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getVehicleTypes } from '@/app/actions/admin-settings'
import {
  getOfficeTypeIdForOffice,
  loadFormVehiclesRentInitial,
  loadSalaryMonths,
  loadVehicleRentConfigsForOfficeType,
} from '@/lib/office/load-form-data'
import { Form8Client } from './form-8-client'

export default async function Form8Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null
  const officeId = session.office_id ?? Number(session.id)

  const carTypes = await getVehicleTypes()

  // The rent rate is configured per office type, so resolve that first.
  const officeTypeId = await getOfficeTypeIdForOffice(officeId)

  const [rentConfigs, initialData, salaryMonths] = await Promise.all([
    officeTypeId ? loadVehicleRentConfigsForOfficeType(officeTypeId) : Promise.resolve([]),
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
