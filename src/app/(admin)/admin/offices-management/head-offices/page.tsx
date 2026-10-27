import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getHeadOffices } from '@/lib/actions/admin-offices-management'
import { getMinistries, getDepartments, getOfficeTypes } from '@/lib/actions/admin-offices-config'
import { HeadOfficesClient } from './head-offices-client'

export const metadata = {
  title: 'হেড অফিসসমূহ',
}

export default async function AdminHeadOfficesPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/dashboard')
  }

  const [headOffices, ministries, departments, officeTypes] = await Promise.all([
    getHeadOffices(),
    getMinistries(),
    getDepartments(),
    getOfficeTypes(),
  ])

  return (
    <HeadOfficesClient
      initialHeadOffices={headOffices}
      ministries={ministries}
      departments={departments}
      officeTypes={officeTypes}
    />
  )
}
