import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin-shell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  return (
    <AdminShell session={session}>
      {children}
    </AdminShell>
  )
}

