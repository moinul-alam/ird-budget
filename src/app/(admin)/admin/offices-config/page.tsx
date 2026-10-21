import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getDepartments, getOfficeTypesHierarchy } from '@/app/actions/admin-offices-config'
import { AdminOfficesConfigClient } from './admin-offices-config-client'

export const metadata = {
  title: 'অফিস কনফিগারেশন | আইআরডি বাজেট ব্যবস্থাপনা',
  description: 'বিভাগ, অফিস পদক্রম (হায়ারার্কি) এবং গ্রুপ বাজেট সেটিংস',
}

export default async function AdminOfficesConfigPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const [departments, officeTypes] = await Promise.all([
    getDepartments(),
    getOfficeTypesHierarchy(),
  ])

  return (
    <div className="space-y-6">
      <AdminOfficesConfigClient
        initialDepartments={departments}
        initialOfficeTypes={officeTypes}
      />
    </div>
  )
}
