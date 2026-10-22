import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getVehicleTypes } from '@/app/actions/admin-settings'
import { Form6Client } from './form-6-client'

export default async function Form6Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [vehicleTypes, rentConfigsRes, rentRes] = await Promise.all([
    getVehicleTypes(),
    supabase.from('vehicle_rent_config').select('*, car_type:car_type_id(id, name)'),
    submissionId
      ? supabase
          .from('form_vehicle_rent')
          .select('*, vehicle_rent_config(*, car_type:car_type_id(name))')
          .eq('submission_id', submissionId)
          .order('id')
      : Promise.resolve({ data: [] }),
  ])

  return (
    <Form6Client
      submissionId={submissionId}
      initialData={rentRes.data || []}
      carTypes={vehicleTypes}
      rentConfigs={rentConfigsRes.data || []}
    />
  )
}


