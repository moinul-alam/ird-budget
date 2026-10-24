import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import {
  getOfficeTypeIdForOffice,
  loadFormItEquipmentInitial,
  loadItConfigsForOfficeType,
  loadSalaryMonths,
} from '@/lib/office/load-form-data'
import { Form10Client } from './form-10-client'

export default async function Form10Page() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id ?? null
  const officeId = session.office_id ?? Number(session.id)
  const officeTypeId = await getOfficeTypeIdForOffice(officeId)

  // The unit prices come from the equipment types the administrator edits on
  // /admin/settings?tab=equipment, and the annual multiplier from the
  // বেতন-ভাতা মাস tile. Nothing here is a constant.
  const [itConfigs, initialData, salaryMonths] = await Promise.all([
    officeTypeId ? loadItConfigsForOfficeType(officeTypeId) : Promise.resolve([]),
    submissionId ? loadFormItEquipmentInitial(submissionId) : Promise.resolve([]),
    loadSalaryMonths(),
  ])

  return (
    <Form10Client
      submissionId={submissionId}
      itConfigs={itConfigs}
      initialData={initialData}
      salaryMonths={salaryMonths}
    />
  )
}
