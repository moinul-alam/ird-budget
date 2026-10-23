import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getVehicleTypes, getFuelTypes } from '@/app/actions/admin-settings'
import { Form5Client } from './form-5-client'

export default async function Form5Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [vehicleTypes, fuelTypes, configsRes, vehiclesRes] = await Promise.all([
    getVehicleTypes(),
    getFuelTypes(),
    Promise.resolve({ data: [] }),
    submissionId
      ? Promise.resolve({ data: [] })
        //   .select('*')
        //   .eq('submission_id', submissionId)
        //   .order('id')
        Promise.resolve({ data: [] })
      : Promise.resolve({ data: [] }),
  ])

  return (
    <Form5Client
      submissionId={submissionId}
      initialData={vehiclesRes.data || []}
      carTypes={vehicleTypes}
      fuelTypes={fuelTypes}
      fuelConfigs={configsRes.data || []}
    />
  )
}
