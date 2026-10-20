import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { strings } from '@/lib/strings'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  if (!user) {
    redirect('/superadmin/login')
  }

  // TODO: Add actual role check for 'admin'
  const isAdmin = true // placeholder
  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-xl font-bold">{strings.admin.dashboard.title}</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin/dashboard" className="block px-4 py-2 rounded hover:bg-slate-800">
            {strings.dashboard.title}
          </Link>
          <Link href="/admin/settings" className="block px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 font-medium">
            {strings.admin.settings.short}
          </Link>
          <Link href="/admin/reports/combined" className="block px-4 py-2 rounded hover:bg-slate-800">
            {strings.reports.groupReport}
          </Link>
          <Link href="/admin/reports/individual" className="block px-4 py-2 rounded hover:bg-slate-800">
            {strings.reports.officeReport}
          </Link>
          <Link href="/admin/reports/summary" className="block px-4 py-2 rounded hover:bg-slate-800">
            {strings.reports.codeWiseReport}
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
