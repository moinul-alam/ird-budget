import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getVehicleTypes, getFuelTypes, getFuelCategories } from '@/lib/actions/admin-settings'
import {
  loadFormVehiclesGovtInitial,
  loadSalaryMonths,
  loadVehicleFuelConfigs,
} from '@/lib/office/load-form-data'
import { Form7Client } from './form-7-client'

export default async function Form7Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null

  const [carTypes, fuelTypes, fuelCategories] = await Promise.all([
    getVehicleTypes(),
    getFuelTypes(),
    // Each category carries the engine code its cars' fuel cost lands in, so the
    // form's preview cards read the code as data rather than matching on a name.
    getFuelCategories(),
  ])

  // The selectable rows and their maintenance allowance come from the global vehicle
  // fuel configuration, so no office-type lookup is needed here. বেতন-মাস is the one
  // number the engine annualises with, so the cards below mirror the sheet exactly.
  const [fuelConfigs, initialData, salaryMonths] = await Promise.all([
    loadVehicleFuelConfigs(),
    submissionId ? loadFormVehiclesGovtInitial(submissionId) : Promise.resolve([]),
    loadSalaryMonths(),
  ])

  return (
    <Form7Client
      submissionId={submissionId}
      initialData={initialData}
      carTypes={carTypes}
      fuelTypes={fuelTypes}
      fuelConfigs={fuelConfigs}
      fuelCategories={fuelCategories}
      salaryMonths={salaryMonths}
    />
  )
}
