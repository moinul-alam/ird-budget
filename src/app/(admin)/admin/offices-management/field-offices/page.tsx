import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getFieldOffices, getHeadOffices } from '@/lib/actions/admin-offices-management'
import { getMinistries, getDepartments, getOfficeTypes, getOfficeLevels } from '@/lib/actions/admin-offices-config'
import { FieldOfficesClient } from './field-offices-client'

export const metadata = {
  title: 'মাঠ পর্যায়ের সকল অফিস',
}

export default async function AdminFieldOfficesPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/dashboard')
  }

  const [fieldOffices, headOffices, ministries, departments, officeTypes, officeLevels] = await Promise.all([
    getFieldOffices(),
    getHeadOffices(),
    getMinistries(),
    getDepartments(),
    getOfficeTypes(),
    getOfficeLevels(),
  ])

  return (
    <FieldOfficesClient
      initialFieldOffices={fieldOffices}
      headOffices={headOffices}
      ministries={ministries}
      departments={departments}
      officeTypes={officeTypes}
      officeLevels={officeLevels}
    />
  )
}
