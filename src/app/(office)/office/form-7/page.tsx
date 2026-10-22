import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getVehicleTypes, getFuelTypes } from '@/app/actions/admin-settings'
import { Form5Client } from './form-5-client'

export default async function Form5Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [vehicleTypes, fuelTypes, configsRes, vehiclesRes] = await Promise.all([
    getVehicleTypes(),
    getFuelTypes(),
    supabase.from('vehicle_fuel_config').select('*, car_type:car_type_id(id, name), fuel_type:fuel_type_id(id, name)'),
    submissionId
      ? supabase
          .from('office_form_vehicles_govt')
          .select('*')
          .eq('submission_id', submissionId)
          .order('id')
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
