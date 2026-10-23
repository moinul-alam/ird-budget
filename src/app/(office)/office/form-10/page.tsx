import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Form7Client } from './form-7-client'

export default async function Form7Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  const [typesRes, dataRes, itItemsRes] = await Promise.all([
    Promise.resolve({ data: [] }),
    Promise.resolve({ data: [] }),
    Promise.resolve({ data: [] }),
  ])

  // Map it_items to admin prices (single source of truth)
  const items = itItemsRes.data || []
  const findPrice = (keyword: string) => {
    return 0
  }

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
