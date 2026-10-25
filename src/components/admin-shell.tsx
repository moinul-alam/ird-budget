'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Shield,
  Menu,
  ChevronDown,
  Building,
  Building2,
  SlidersHorizontal,
  Calculator
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
  superAdminOnly?: boolean
}

type AdminNavGroup = {
  label: string
  icon: LucideIcon
  iconClass: string
  items: AdminNavItem[]
}

// Mirrors the current admin sidebar structure so the profile menu stays in sync
const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'অফিস ব্যবস্থাপনা',
    icon: Building,
    iconClass: 'text-purple-500',
    items: [
      { href: '/admin/offices-config', label: 'অরগানোগ্রাম', icon: Building },
      { href: '/admin/offices-management/head-offices', label: 'হেড অফিসসমূহ', icon: Building },
      { href: '/admin/offices-management/field-offices', label: 'মাঠ পর্যায়ের অফিসসমূহ', icon: Building2 },
      { href: '/admin/offices-management/group-budget', label: 'গ্রুপ বাজেট নির্ধারণ', icon: Layers },
    ],
  },
  {
    label: 'বাজেট সেটিংস',
    icon: SlidersHorizontal,
    iconClass: 'text-blue-500',
    items: [
      { href: '/admin/budgets', label: 'বাজেট দাখিল উন্মুক্তকরণ', icon: SlidersHorizontal },
      { href: '/admin/codes', label: 'ইকোনমিক কোড সেটিংস', icon: FileText },
      { href: '/admin/settings', label: 'প্রাপ্যতা ও বরাদ্দ নির্ধারণ', icon: Settings },
      { href: '/admin/formulas', label: 'কোড ক্যালকুলেশন ফরমুলা', icon: Calculator, superAdminOnly: true },
    ],
  },
  {
    label: 'প্রতিবেদনসমূহ',
    icon: FileSpreadsheet,
    iconClass: 'text-emerald-500',
    items: [
      { href: '/admin/reports/combined', label: 'সমন্বিত রিপোর্ট', icon: Layers },
      { href: '/admin/reports/individual', label: 'অফিসভিত্তিক রিপোর্ট', icon: FileText },
      { href: '/admin/reports/summary', label: 'কোডভিত্তিক সারসংক্ষেপ রিপোর্ট', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'ইউজার সেটিংস',
    icon: Users,
    iconClass: 'text-purple-500',
    items: [
      { href: '/admin/offices-users', label: 'অফিস ইউজারসমূহ', icon: Users },
      { href: '/admin/users', label: 'এডমিন ইউজার সেটিংস', icon: ShieldCheck, superAdminOnly: true },
    ],
  },
]

export function AdminShell({
  children,
  session,
}: {
  children: React.ReactNode
  session: {
    username: string
    role: string
    office_id?: number
  }
}) {
  const pathname = usePathname()
  const isSuperAdmin = session.role === 'superadmin'

  // Drawer collapsible state (default expanded)
  const [drawerOpen, setDrawerOpen] = useState(true)

  // 4 Collapsible menu groups: default collapsed (false)
  const [budgetGroupOpen, setBudgetGroupOpen] = useState(false)
  const [officeGroupOpen, setOfficeGroupOpen] = useState(false)
  const [reportsGroupOpen, setReportsGroupOpen] = useState(false)
  const [usersGroupOpen, setUsersGroupOpen] = useState(false)

  // Profile dropdown menu
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Admin color scheme: distinct tone (Superadmin: dark emerald/slate-950, Admin: dark indigo/slate-900)
  const topBarBg = isSuperAdmin
    ? 'bg-slate-950 text-white border-emerald-900/40'
    : 'bg-slate-900 text-white border-slate-800'

  const drawerBg = isSuperAdmin
    ? 'bg-slate-950 text-white border-emerald-900/30'
    : 'bg-slate-900 text-white border-slate-800'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* 1. TOP BAR */}
      <header className={`h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 ${topBarBg} border-b z-30 shadow-md`}>
        {/* Left Section: Drawer Toggle Button & Dashboard Shortcut */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen((prev) => !prev)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={drawerOpen ? 'ড্রয়ার সংকুচিত করুন' : 'ড্রয়ার প্রসারিত করুন'}
            aria-label="Toggle Navigation Drawer"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/admin/dashboard"
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${pathname === '/admin/dashboard'
              ? isSuperAdmin ? 'bg-emerald-600 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
          >
            <LayoutDashboard className={`h-4 w-4 ${isSuperAdmin ? 'text-emerald-400' : 'text-blue-400'}`} />
            <span>{strings.dashboard.title}</span>
          </Link>
        </div>

        {/* Middle Section: Application Logo + Title */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            <img
              src="/images/bdgovlogo.png"
              alt={strings.appName}
              className="h-8 w-8 object-contain"
            />
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-100 max-w-[200px] sm:max-w-none font-title pl-0.5">
            {strings.appName}
            <span className="ml-2 text-xs font-normal text-slate-400 hidden md:inline">
              ({isSuperAdmin ? 'সুপার অ্যাডমিন প্যানেল' : 'অ্যাডমিন প্যানেল'})
            </span>
          </span>
        </div>

        {/* Right Section: Profile Name with Dropdown */}
        <div className="relative" ref={profileDropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-all text-slate-200 cursor-pointer border border-slate-700/60"
          >
            <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${isSuperAdmin
              ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40'
              : 'bg-blue-600/30 text-blue-400 border-blue-500/40'
              }`}>
              {isSuperAdmin ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold block truncate max-w-[120px]">
                {session.username}
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                {isSuperAdmin ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন'}
              </span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-2xl bg-white text-slate-800 shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border ${isSuperAdmin
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                    {isSuperAdmin ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 pl-0.5">{session.username}</p>
                    <p className="text-[11px] font-semibold text-slate-500 pl-0.5">
                      {isSuperAdmin ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-1.5">
                {ADMIN_NAV_GROUPS.map((group) => {
                  const visibleItems = group.items.filter((item) => !item.superAdminOnly || isSuperAdmin)
                  if (visibleItems.length === 0) return null
                  const GroupIcon = group.icon
                  return (
                    <div
                      key={group.label}
                      className="pb-1.5 mb-1.5 border-b border-slate-100 last:border-0 last:mb-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 px-2.5 py-1.5">
                        <GroupIcon className={`h-3.5 w-3.5 shrink-0 ${group.iconClass}`} />
                        <span className="pl-0.5 text-[10px] font-bold tracking-wide text-slate-400">
                          {group.label}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {visibleItems.map((item) => {
                          const ItemIcon = item.icon
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 transition-colors"
                            >
                              <ItemIcon className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="pl-0.5">{item.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="p-1.5 border-t border-slate-100">
                <form action={logoutAdmin}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="h-4 w-4 text-rose-600" />
                    লগআউট
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. BODY LAYOUT: Left Drawer + Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {drawerOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Left Drawer */}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-40 lg:z-10
            h-full ${drawerBg} border-r
            flex flex-col transition-all duration-200 ease-in-out shrink-0
            ${drawerOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'}
          `}
        >
          <div className="w-64 flex flex-col h-full">
            <nav className="flex-1 p-3.5 space-y-2 overflow-y-auto">
              {/* গ্রুপ ১: অফিস ব্যবস্থাপনা  (Collapsible) */}
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => setOfficeGroupOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Building className="h-4 w-4 text-purple-400" />
                    <span>অফিস ব্যবস্থাপনা</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${officeGroupOpen ? 'rotate-180' : ''}`} />
                </button>

                {officeGroupOpen && (
                  <div className="pl-3 space-y-1 pt-0.5 border-l-2 border-slate-700/60 ml-3">
                    <Link
                      href="/admin/offices-config"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/offices-config')
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Building className="h-3.5 w-3.5 shrink-0" />
                      <span>অরগানোগ্রাম</span>
                    </Link>

                    <Link
                      href="/admin/offices-management/head-offices"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/offices-management/head-offices')
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Building className="h-3.5 w-3.5 shrink-0" />
                      <span>হেড অফিসসমূহ</span>
                    </Link>

                    <Link
                      href="/admin/offices-management/field-offices"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/offices-management/field-offices')
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span>মাঠ পর্যায়ের অফিসসমূহ</span>
                    </Link>

                    <Link
                      href="/admin/offices-management/group-budget"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/offices-management/group-budget')
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0" />
                      <span>গ্রুপ বাজেট নির্ধারণ</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* গ্রুপ ২: অফিস ব্যবস্থাপনা (Collapsible - After Budget Settings, Before Reports) */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setBudgetGroupOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="h-4 w-4 text-blue-400" />
                    <span>বাজেট সেটিংস</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${budgetGroupOpen ? 'rotate-180' : ''}`} />
                </button>

                {budgetGroupOpen && (
                  <div className="pl-3 space-y-1 pt-0.5 border-l-2 border-slate-700/60 ml-3">
                    <Link
                      href="/admin/budgets"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/budgets')
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                      <span>বাজেট দাখিল উন্মুক্তকরণ</span>
                    </Link>

                    <Link
                      href="/admin/codes"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/codes')
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>ইকোনমিক কোড সেটিংস</span>
                    </Link>

                    <Link
                      href="/admin/settings"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/settings')
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Settings className="h-3.5 w-3.5 shrink-0" />
                      <span>প্রাপ্যতা ও বরাদ্দ নির্ধারণ</span>
                    </Link>

                    {isSuperAdmin && (
                      <Link
                        href="/admin/formulas"
                        onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/formulas')
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                      >
                        <Calculator className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>কোড ক্যালকুলেশন ফরমুলা</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>





              {/* গ্রুপ ২: প্রতিবেদনসমূহ (Collapsible) */}
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => setReportsGroupOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                    <span>প্রতিবেদনসমূহ</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${reportsGroupOpen ? 'rotate-180' : ''}`} />
                </button>

                {reportsGroupOpen && (
                  <div className="pl-3 space-y-1 pt-0.5 border-l-2 border-slate-700/60 ml-3">
                    <Link
                      href="/admin/reports/combined"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname === '/admin/reports/combined'
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0" />
                      <span>সমন্বিত রিপোর্ট</span>
                    </Link>

                    <Link
                      href="/admin/reports/individual"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname === '/admin/reports/individual'
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>অফিসভিত্তিক রিপোর্ট</span>
                    </Link>

                    <Link
                      href="/admin/reports/summary"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname === '/admin/reports/summary'
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                      <span>কোডভিত্তিক সারসংক্ষেপ রিপোর্ট</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* গ্রুপ ৩: ইউজার সেটিংস (Collapsible) */}
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => setUsersGroupOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span>ইউজার সেটিংস</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${usersGroupOpen ? 'rotate-180' : ''}`} />
                </button>

                {usersGroupOpen && (
                  <div className="pl-3 space-y-1 pt-0.5 border-l-2 border-slate-700/60 ml-3">
                    <Link
                      href="/admin/offices-users"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname === '/admin/offices-users'
                        ? isSuperAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>অফিস ইউজারসমূহ</span>
                    </Link>

                    {isSuperAdmin && (
                      <Link
                        href="/admin/users"
                        onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname === '/admin/users'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                        <span>এডমিন ইউজার সেটিংস</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </nav>

            <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
              <form action={logoutAdmin}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 text-xs font-bold transition-colors border border-rose-900/40 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  লগআউট
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
