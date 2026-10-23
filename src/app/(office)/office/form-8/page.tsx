import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getVehicleTypes } from '@/app/actions/admin-settings'
import { Form6Client } from './form-6-client'

export default async function Form6Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [vehicleTypes, rentConfigsRes, rentRes] = await Promise.all([
    getVehicleTypes(),
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
    <Form6Client
      submissionId={submissionId}
      initialData={rentRes.data || []}
      carTypes={vehicleTypes}
      rentConfigs={rentConfigsRes.data || []}
    />
  )
}
