import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getVehicleTypes, getFuelTypes } from '@/app/actions/admin-settings'
import {
  getOfficeTypeIdForOffice,
  loadFormVehiclesGovtInitial,
  loadVehicleFuelConfigsForOfficeType,
} from '@/lib/office/load-form-data'
import { Form7Client } from './form-7-client'

export default async function Form7Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null
  const officeId = session.office_id ?? Number(session.id)

  const [carTypes, fuelTypes] = await Promise.all([getVehicleTypes(), getFuelTypes()])

  // The selectable rows and their maintenance allowance come from the
  // per-office-type config, so the office type has to be resolved first.
  const officeTypeId = await getOfficeTypeIdForOffice(officeId)

  const [fuelConfigs, initialData] = await Promise.all([
    officeTypeId ? loadVehicleFuelConfigsForOfficeType(officeTypeId) : Promise.resolve([]),
    submissionId ? loadFormVehiclesGovtInitial(submissionId) : Promise.resolve([]),
  ])

  return (
    <Form7Client
      submissionId={submissionId}
      initialData={initialData}
      carTypes={carTypes}
      fuelTypes={fuelTypes}
      fuelConfigs={fuelConfigs}
    />
  )
}
