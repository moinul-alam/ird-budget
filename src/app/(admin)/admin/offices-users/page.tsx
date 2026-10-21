import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { getAllOfficeUsersList } from '@/app/actions/office-users'
import { createOfficeClient } from '@/lib/supabase/server'
import { OfficeUsersClient } from './office-users-client'

export const metadata = {
  title: 'সকল অফিস ইউজার ব্যবস্থাপনা | আইআরডি বাজেট সিস্টেম',
}

export default async function AdminOfficesUsersPage() {
  const session = await getAdminSession()

  if (!session || session.role !== 'superadmin') {
    redirect('/admin/dashboard')
  }

  const offices = await getAllOfficeUsersList()

  const supabase = createOfficeClient()
  const [{ data: officeTypes }, { data: parentOffices }] = await Promise.all([
    supabase.from('office_types').select('id, name').order('id'),
    supabase.from('parent_offices').select('id, name').order('id'),
  ])

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          অফিস ইউজার ব্যবস্থাপনা (Offices & Passwords)
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          সিস্টেমের সমস্ত অফিসের বাজেট আইডি (যেমন: ১০১, ১০২), বর্তমান পাসওয়ার্ড পর্যবেক্ষণ এবং যেকোনো অফিসের পাসওয়ার্ড রিসেট করুন
        </p>
      </div>

      <OfficeUsersClient
        initialOffices={offices}
        officeTypes={officeTypes || []}
        parentOffices={parentOffices || []}
      />
    </div>
  )
}
