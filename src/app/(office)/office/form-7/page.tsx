import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getVehicleTypes, getFuelTypes } from '@/lib/actions/admin-settings'
import {
  loadFormVehiclesGovtInitial,
  loadVehicleFuelConfigs,
} from '@/lib/office/load-form-data'
import { Form7Client } from './form-7-client'

export default async function Form7Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null

  const [carTypes, fuelTypes] = await Promise.all([getVehicleTypes(), getFuelTypes()])

  // The selectable rows and their maintenance allowance come from the global vehicle
  // fuel configuration, so no office-type lookup is needed here.
  const [fuelConfigs, initialData] = await Promise.all([
    loadVehicleFuelConfigs(),
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
