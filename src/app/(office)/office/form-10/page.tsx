import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import {
  getOfficeTypeIdForOffice,
  loadFormItEquipmentInitial,
  loadItConfigsForOfficeType,
} from '@/lib/office/load-form-data'
import { Form10Client } from './form-10-client'

export default async function Form10Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null
  const officeId = session.office_id ?? Number(session.id)
  const officeTypeId = await getOfficeTypeIdForOffice(officeId)

  // Equipment rows point at an admin_it_config entry, so the unit price always
  // comes from the same config the row references. Nothing is hardcoded here.
  const [itConfigs, initialData] = await Promise.all([
    officeTypeId ? loadItConfigsForOfficeType(officeTypeId) : Promise.resolve([]),
    submissionId ? loadFormItEquipmentInitial(submissionId) : Promise.resolve([]),
  ])

  return (
    <Form10Client
      submissionId={submissionId}
      itConfigs={itConfigs}
      initialData={initialData}
    />
  )
}
