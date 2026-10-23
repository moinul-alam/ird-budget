import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getAdminUsersList } from '@/app/actions/admin-users'
import { prisma } from '@/lib/db/client'
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

  const officeTypes = await prisma.coreOfficeType.findMany({
    select: {
      id: true,
      name: true
    },
    orderBy: { id: 'asc' }
  })

  const officeTypesMapped = officeTypes.map(ot => ({
    id: Number(ot.id),
    name: ot.name
  }))

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          এডমিন ইউজার ব্যবস্থাপনা
        </h1>

      </div>

      <UsersClient
        initialUsers={users}
        officeTypes={officeTypesMapped}
        currentUserId={session.id}
      />
    </div>
  )
}
