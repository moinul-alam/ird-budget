import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form5Client } from './form-5-client'

export default async function Form5Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [carsRes, fuelsRes, configsRes, vehiclesRes] = await Promise.all([
    supabase.from('car_types').select('*').order('id'),
    supabase.from('fuel_types').select('*').order('id'),
    supabase.from('vehicle_fuel_config').select('*, car_type:car_type_id(id, name), fuel_type:fuel_type_id(id, name)'),
    submissionId
      ? supabase
          .from('form_vehicles')
          .select('*, vehicle_fuel_config(*, car_type:car_type_id(name), fuel_type:fuel_type_id(name))')
          .eq('submission_id', submissionId)
          .order('id')
      : Promise.resolve({ data: [] }),
  ])

  return (
    <Form5Client
      submissionId={submissionId}
      initialData={vehiclesRes.data || []}
      carTypes={carsRes.data || []}
      fuelTypes={fuelsRes.data || []}
      fuelConfigs={configsRes.data || []}
    />
  )
}


