import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getGroupBudgetSettings, getOfficeTypes, getOfficeLevels } from '@/app/actions/admin-offices-config'
import { GroupBudgetClient } from './group-budget-client'

export const metadata = {
  title: 'গ্রুপ বাজেট নির্ধারণ',
}

export default async function AdminGroupBudgetPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/dashboard')
  }

  const [groupSettings, officeTypes, officeLevels] = await Promise.all([
    getGroupBudgetSettings(),
    getOfficeTypes(),
    getOfficeLevels(),
  ])

  return (
    <GroupBudgetClient
      initialGroupSettings={groupSettings}
      officeTypes={officeTypes}
      officeLevels={officeLevels}
    />
  )
}
