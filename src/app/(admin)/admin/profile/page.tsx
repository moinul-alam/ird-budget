import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { strings } from '@/lib/strings'
import { getAdminProfile } from '@/app/actions/admin-profile'
import { AdminProfileClient } from './profile-client'

export const metadata = {
  title: strings.admin.profile.title,
}

export default async function AdminProfilePage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const profile = await getAdminProfile()

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          {strings.admin.profile.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1.5 font-medium">
          {strings.admin.profile.subtitle}
        </p>
      </div>

      <AdminProfileClient
        username={profile?.username ?? session.username}
        role={session.role}
        createdAt={profile?.createdAt ?? null}
      />
    </div>
  )
}
