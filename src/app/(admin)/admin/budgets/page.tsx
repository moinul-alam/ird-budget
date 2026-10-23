import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import {
  getBudgetTypes,
  getFiscalYears,
  getCyclesList,
} from '@/app/actions/admin-budgets'
import { AdminBudgetsClient } from './admin-budgets-client'

export const metadata = {
  title: 'বাজেট উন্মুক্তকরণ | আইআরডি বাজেট সিস্টেম',
  description: 'বাজেট সাইকেল নির্ধারণ, অর্থবছর ও বাজেটের ধরণ ব্যবস্থাপনা',
}

export default async function AdminBudgetsPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const [budgetTypes, fiscalYears, cycles] = await Promise.all([
    getBudgetTypes(),
    getFiscalYears(),
    getCyclesList(),
  ])

  return (
    <div className="space-y-6">
      <AdminBudgetsClient
        initialBudgetTypes={budgetTypes}
        initialFiscalYears={fiscalYears}
        initialCycles={cycles}
      />
    </div>
  )
}
