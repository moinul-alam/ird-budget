import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getDepartments, getOfficeTypes, getMinistries, getOfficeLevels } from '@/app/actions/admin-offices-config'
import { AdminOfficesConfigClient } from './admin-offices-config-client'

export const metadata = {
  title: 'অফিস কনফিগারেশন',
  description: 'মন্ত্রণালয়/বিভাগ, দপ্তর/সংস্থা, অফিসের ধরণ এবং মাঠ অফিসের স্তর',
}

export default async function AdminOfficesConfigPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const [ministries, departments, officeTypes, officeLevels] = await Promise.all([
    getMinistries(),
    getDepartments(),
    getOfficeTypes(),
    getOfficeLevels(),
  ])

  return (
    <div className="space-y-6">
      <AdminOfficesConfigClient
        initialMinistries={ministries}
        initialDepartments={departments}
        initialOfficeTypes={officeTypes}
        initialOfficeLevels={officeLevels}
      />
    </div>
  )
}
