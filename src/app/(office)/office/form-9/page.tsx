import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form9Client } from './form-9-client'

export default async function Form9Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialData = null
  let vatPercentage = 15 // Standard default fallback
  if (submissionId) {
    const [houseRes, rateRes] = await Promise.all([
      supabase.from('office_form_house_rent').select('*').eq('submission_id', submissionId).maybeSingle(),
      supabase.from('admin_rates').select('value').eq('key', 'vat_percentage').maybeSingle(),
    ])
    initialData = houseRes.data
    if (rateRes.data && rateRes.data.value != null) {
      vatPercentage = Number(rateRes.data.value)
    }
  }

  return (
    <Form9Client
      submissionId={submissionId}
      initialData={initialData}
      vatPercentage={vatPercentage}
    />
  )
}


