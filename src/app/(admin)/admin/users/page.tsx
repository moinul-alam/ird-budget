import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getAdminUsersList } from '@/app/actions/admin-users'
import { createOfficeClient } from '@/lib/supabase/server'
import { UsersClient } from './users-client'

export const metadata = {
  title: 'ইউজার ও অ্যাক্সেস কন্ট্রোল (ACL) | আইআরডি বাজেট সিস্টেম',
}

export default async function AdminUsersPage() {
  const session = await getAdminSession()

  if (!session || session.role !== 'superadmin') {
    redirect('/admin/dashboard')
  }

  const users = await getAdminUsersList()

  const supabase = createOfficeClient()
  const { data: officeTypes } = await supabase
    .from('office_types')
    .select('id, name')
    .order('id')

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          এডমিন ইউজার ব্যবস্থাপনা
        </h1>

      </div>

      <UsersClient
        initialUsers={users}
        officeTypes={officeTypes || []}
        currentUserId={session.id}
      />
    </div>
  )
}
