'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { strings } from '@/lib/strings'
import { logoutOffice as logout } from '@/app/actions/auth'
import {
  LayoutDashboard,
  FileText,
  Users,
  Gift,
  CalendarDays,
  Car,
  CarFront,
  Monitor,
  Zap,
  Building2,
  Mail,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'


const FORM_NAV_ITEMS = [
  { href: '/office/form-1', label: strings.forms.form1.short, icon: FileText },
  { href: '/office/form-2', label: strings.forms.form2.short, icon: Users },
  { href: '/office/form-3', label: strings.forms.form3.short, icon: Gift },
  { href: '/office/form-4', label: strings.forms.form4.short, icon: CalendarDays },
  { href: '/office/form-5', label: strings.forms.form5.short, icon: Car },
  { href: '/office/form-6', label: strings.forms.form6.short, icon: CarFront },
  { href: '/office/form-7', label: strings.forms.form7.short, icon: Monitor },
  { href: '/office/form-8', label: strings.forms.form8.short, icon: Zap },
  { href: '/office/form-9', label: strings.forms.form9.short, icon: Building2 },
  { href: '/office/form-10', label: strings.forms.form10.short, icon: Mail },
] as const

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { id: string; name: string }
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">{strings.appName}</span>
            </Link>
            <button
              className="lg:hidden p-1 rounded-md hover:bg-slate-800"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* Dashboard */}
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${pathname === '/dashboard'
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {strings.dashboard.title}
            </Link>

            {/* Divider */}
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ফর্মসমূহ</p>
            </div>

            {/* Form links */}
            {FORM_NAV_ITEMS.map((item, idx) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                    ${isActive
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="flex items-center justify-center h-5 w-5 shrink-0 text-xs font-mono text-slate-500">
                    {idx + 1}
                  </span>
                  {item.label}
                </Link>
              )
            })}

            {/* Budget Sheet */}
            <div className="pt-2">
              <Link
                href="/office/budget-sheet"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${pathname === '/office/budget-sheet'
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                onClick={() => setSidebarOpen(false)}
              >
                <BarChart3 className="h-4 w-4 shrink-0" />
                {strings.budgetSheet.title}
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400 truncate max-w-[160px]">
                {user.name}
              </div>
              <form action={logout}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
          <span className="text-sm font-bold text-slate-800">{strings.appName}</span>
          <div className="w-9" /> {/* Spacer */}
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
