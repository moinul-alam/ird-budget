import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getAllOfficeUsersList } from '@/lib/actions/office-users'
import { prisma } from '@/lib/db/client'
import { OfficeUsersClient } from './office-users-client'

export const metadata = {
  title: 'সকল অফিস ইউজার ব্যবস্থাপনা',
}

export default async function AdminOfficesUsersPage() {
  const session = await getAdminSession()

  if (!session || session.role !== 'superadmin') {
    redirect('/admin/dashboard')
  }

  const { offices, defaultPassword } = await getAllOfficeUsersList()

  const [officeTypes, parentOffices] = await Promise.all([
    prisma.coreOfficeType.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' }
    }),
    prisma.coreOffice.findMany({
      where: { parentOfficeId: null },
      select: { id: true, name: true },
      orderBy: { id: 'asc' }
    })
  ])

  const normalizedOfficeTypes = officeTypes.map(ot => ({ id: String(ot.id), name: ot.name }))
  const normalizedParentOffices = parentOffices.map(po => ({ id: String(po.id), name: po.name }))

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          অফিস ইউজার ব্যবস্থাপনা
        </h1>
      </div>

      <OfficeUsersClient
        initialOffices={offices}
        defaultPassword={defaultPassword}
        officeTypes={normalizedOfficeTypes}
        parentOffices={normalizedParentOffices}
      />
    </div>
  )
}
