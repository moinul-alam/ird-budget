import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getFieldOffices, getHeadOffices } from '@/app/actions/admin-offices-management'
import { getMinistries, getDepartments, getOfficeTypesHierarchy } from '@/app/actions/admin-offices-config'
import { FieldOfficesClient } from './field-offices-client'

export const metadata = {
  title: 'মাঠ পর্যায়ের সকল অফিস | আইআরডি বাজেট সিস্টেম',
}

export default async function AdminFieldOfficesPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/dashboard')
  }

  const [fieldOffices, headOffices, ministries, departments, officeTypes] = await Promise.all([
    getFieldOffices(),
    getHeadOffices(),
    getMinistries(),
    getDepartments(),
    getOfficeTypesHierarchy(),
  ])

  return (
    <FieldOfficesClient
      initialFieldOffices={fieldOffices}
      headOffices={headOffices}
      ministries={ministries}
      departments={departments}
      officeTypes={officeTypes}
    />
  )
}
