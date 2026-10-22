import { createOfficeClient } from '@/lib/supabase/server'
import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form7Client } from './form-7-client'

export default async function Form7Page() {
  const supabase = createOfficeClient()
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [typesRes, dataRes, itItemsRes] = await Promise.all([
    supabase.from('equipment_types').select('*').order('id'),
    submissionId ? supabase.from('form_it_equipment').select('*').eq('submission_id', submissionId) : Promise.resolve({ data: [] }),
    supabase.from('it_items').select('*').order('id'),
  ])

  // Map it_items to admin prices (single source of truth)
  const items = itItemsRes.data || []
  const findPrice = (keyword: string) => items.find((i: any) => i.name?.toLowerCase().includes(keyword))?.allotted_budget || 0

  const adminPrices = {
    computer: findPrice('computer'),
    printer: findPrice('printer'),
    scanner: findPrice('scanner'),
    photocopier: findPrice('accessor'), // Accessories/Photocopier — fallback
  }

  return (
    <Form7Client 
      submissionId={submissionId} 
      equipmentTypes={typesRes.data || []}
      initialData={dataRes.data || []}
      adminPrices={adminPrices}
    />
  )
}
