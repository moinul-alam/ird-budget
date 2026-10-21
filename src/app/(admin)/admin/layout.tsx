import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { strings } from '@/lib/strings'
import { logoutAdmin } from '@/app/actions/auth'
import { 
  LayoutDashboard, 
  Settings, 
  FileText, 
  Layers, 
  FileSpreadsheet, 
  Users, 
  LogOut,
  ShieldCheck,
  Shield
} from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const isSuperAdmin = session.role === 'superadmin'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            {isSuperAdmin ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            ) : (
              <Shield className="h-5 w-5 text-blue-400" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isSuperAdmin ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 truncate">{strings.admin.dashboard.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">ইউজার: {session.username}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <Link 
            href="/admin/dashboard" 
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm font-medium"
          >
            <LayoutDashboard className="h-4 w-4 text-slate-400" />
            {strings.dashboard.title}
          </Link>

          <Link 
            href="/admin/settings" 
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm font-medium"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            {strings.admin.settings.short}
          </Link>

          <div className="pt-3 pb-1">
            <span className="px-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">প্রতিবেদনসমূহ</span>
          </div>

          <Link 
            href="/admin/reports/combined" 
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm font-medium"
          >
            <Layers className="h-4 w-4 text-slate-400" />
            {strings.reports.groupReport}
          </Link>

          <Link 
            href="/admin/reports/individual" 
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm font-medium"
          >
            <FileText className="h-4 w-4 text-slate-400" />
            {strings.reports.officeReport}
          </Link>

          <Link 
            href="/admin/reports/summary" 
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm font-medium"
          >
            <FileSpreadsheet className="h-4 w-4 text-slate-400" />
            {strings.reports.codeWiseReport}
          </Link>

          {isSuperAdmin && (
            <>
              <div className="pt-3 pb-1">
                <span className="px-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">অ্যাক্সেস কন্ট্রোল (ACL)</span>
              </div>
              <Link 
                href="/admin/users" 
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm font-medium"
              >
                <ShieldCheck className="h-4 w-4 text-purple-400" />
                অ্যাক্সেস রোল (Admin Roles)
              </Link>
              <Link 
                href="/admin/offices-users" 
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm font-medium"
              >
                <Users className="h-4 w-4 text-emerald-400" />
                অফিস ইউজারসমূহ (Office Users)
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <form action={logoutAdmin}>
            <button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 text-sm font-semibold transition-colors border border-rose-900/40"
            >
              <LogOut className="h-4 w-4" />
              লগআউট
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
