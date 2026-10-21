import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getDepartments, getOfficeTypesHierarchy, getMinistries, getOfficeLevels, getGroupBudgetSettings } from '@/app/actions/admin-offices-config'
import { AdminOfficesConfigClient } from './admin-offices-config-client'

export const metadata = {
  title: 'অফিস কনফিগারেশন | আইআরডি বাজেট ব্যবস্থাপনা',
  description: 'মন্ত্রণালয়/বিভাগ, দপ্তর/সংস্থা, মাঠ অফিসের স্তর এবং গ্রুপ বাজেট সেটিংস',
}

export default async function AdminOfficesConfigPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const [ministries, departments, officeTypes, officeLevels, groupSettings] = await Promise.all([
    getMinistries(),
    getDepartments(),
    getOfficeTypesHierarchy(),
    getOfficeLevels(),
    getGroupBudgetSettings(),
  ])

  return (
    <div className="space-y-6">
      <AdminOfficesConfigClient
        initialMinistries={ministries}
        initialDepartments={departments}
        initialOfficeTypes={officeTypes}
        initialOfficeLevels={officeLevels}
        initialGroupSettings={groupSettings}
      />
    </div>
  )
}
