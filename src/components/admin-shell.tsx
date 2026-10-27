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
  Calculator,
  LayoutGrid,
  KeyRound,
  ListChecks
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
      { href: '/admin/reports/submission-status', label: 'বাজেট দাখিলের অবস্থা', icon: ListChecks },
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

  // Profile dropdown menu (identity + logout only)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  // Features (function) menu — holds the navigation shortcuts, opened from the grid icon
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false)
  const featuresDropdownRef = useRef<HTMLDivElement>(null)

  // Close either dropdown when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setProfileDropdownOpen(false)
      }
      if (featuresDropdownRef.current && !featuresDropdownRef.current.contains(target)) {
        setFeaturesDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Role color profile: SuperAdmin = violet, Admin = blue. It drives the shell chrome (top bar,
  // drawer, borders, hover/active states, profile chips). Semantic accents inside the drawer
  // (group icons, the rose logout) keep their own colors.
  const shellSurface = isSuperAdmin ? 'bg-violet-950' : 'bg-blue-950'
  const shellBorder = isSuperAdmin ? 'border-violet-900/40' : 'border-blue-900/40'
  const shellDivider = isSuperAdmin ? 'border-violet-800/60' : 'border-blue-800/60'
  const shellHover = isSuperAdmin ? 'hover:bg-violet-900/60' : 'hover:bg-blue-900/60'
  const shellActive = isSuperAdmin ? 'bg-violet-600' : 'bg-blue-600'
  const shellAccent = isSuperAdmin ? 'text-violet-400' : 'text-blue-400'

  const topBarBg = `${shellSurface} text-white ${shellBorder}`
  const drawerBg = `${shellSurface} text-white ${shellBorder}`

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* 1. TOP BAR */}
      <header className={`h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 ${topBarBg} border-b z-30 shadow-md`}>
        {/* Left Section: Drawer Toggle Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen((prev) => !prev)}
            className={`p-2 rounded-xl text-slate-300 hover:text-white ${shellHover} transition-colors cursor-pointer`}
            title={drawerOpen ? 'ড্রয়ার সংকুচিত করুন' : 'ড্রয়ার প্রসারিত করুন'}
            aria-label="Toggle Navigation Drawer"
          >
            <Menu className="h-5 w-5" />
          </button>
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

        {/* Right Section: Features (function) menu + Profile menu */}
        <div className="flex items-center gap-2">
          {/* Features menu — all navigation shortcuts live here, behind the grid icon */}
          <div className="relative" ref={featuresDropdownRef}>
            <button
              onClick={() => {
                setFeaturesDropdownOpen((prev) => !prev)
                setProfileDropdownOpen(false)
              }}
              className={`flex items-center justify-center h-9 w-9 rounded-xl ${shellHover} transition-all cursor-pointer border ${featuresDropdownOpen
                ? isSuperAdmin ? 'bg-violet-600/20 text-violet-300 border-violet-500/40' : 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : shellDivider + ' text-slate-200'
                }`}
              title="ফিচারসমূহ"
              aria-label="Features"
            >
              <LayoutGrid className="h-[18px] w-[18px]" />
            </button>

            {featuresDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-2xl bg-white text-slate-800 shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-bold tracking-wide text-slate-400">ফিচারসমূহ</p>
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
                                onClick={() => setFeaturesDropdownOpen(false)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 transition-colors ${isSuperAdmin ? 'hover:text-violet-700 hover:bg-violet-50/80' : 'hover:text-blue-700 hover:bg-blue-50/80'}`}
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
              </div>
            )}
          </div>

          {/* Profile menu — identity and logout only */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => {
                setProfileDropdownOpen((prev) => !prev)
                setFeaturesDropdownOpen(false)
              }}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl ${shellHover} transition-all text-slate-200 cursor-pointer border ${shellDivider}`}
            >
              <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${isSuperAdmin
                ? 'bg-violet-600/30 text-violet-400 border-violet-500/40'
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
              <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl ring-1 ring-slate-900/5 z-50 animate-in fade-in zoom-in-95">
                <div className="max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain">
                  {/* Identity header — role-tinted gradient, so SuperAdmin and Admin read
                      apart at a glance and the popover opens on a deliberate, finished note
                      instead of a plain grey block. */}
                  <div
                    className={`px-4 py-4 ${isSuperAdmin
                      ? 'bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900'
                      : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-sm">
                        {isSuperAdmin ? <ShieldCheck className="h-5 w-5 text-white" /> : <Shield className="h-5 w-5 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black leading-snug text-white">
                          {session.username}
                        </p>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white ring-1 ring-inset ring-white/20">
                          <ShieldCheck className="h-3 w-3" />
                          {isSuperAdmin ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 space-y-0.5">
                    {/* Self-service profile — where either admin level rotates its own
                        password, since neither can do it from the user management screen
                        without a superadmin. */}
                    <Link
                      href="/admin/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-700 transition-colors ${isSuperAdmin ? 'hover:bg-violet-50' : 'hover:bg-blue-50'
                        }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-colors ${isSuperAdmin
                          ? 'bg-violet-50 text-violet-600 ring-violet-100 group-hover:bg-violet-100'
                          : 'bg-blue-50 text-blue-600 ring-blue-100 group-hover:bg-blue-100'
                          }`}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </span>
                      {strings.admin.profile.menuLink}
                    </Link>

                    <form action={logoutAdmin}>
                      <button
                        type="submit"
                        className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100 transition-colors group-hover:bg-rose-100">
                          <LogOut className="h-3.5 w-3.5" />
                        </span>
                        লগআউট
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
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
              {/* ড্যাশবোর্ড — the drawer leads with the overview, which is where a
                  console's sidebar normally puts its home link. */}
              <div className="pt-1">
                <Link
                  href="/admin/dashboard"
                  onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-bold ${pathname === '/admin/dashboard'
                    ? shellActive + ' text-white'
                    : 'text-slate-300 ' + shellHover + ' hover:text-white'
                    }`}
                >
                  <LayoutDashboard className={`h-4 w-4 shrink-0 ${pathname === '/admin/dashboard' ? 'text-white' : shellAccent}`} />
                  <span>{strings.dashboard.title}</span>
                </Link>
              </div>

              {/* গ্রুপ ১: অফিস ব্যবস্থাপনা  (Collapsible) */}
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => setOfficeGroupOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white ${shellHover} transition-colors cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building className="h-4 w-4 text-purple-400" />
                    <span>অফিস ব্যবস্থাপনা</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${officeGroupOpen ? 'rotate-180' : ''}`} />
                </button>

                {officeGroupOpen && (
                  <div className={`pl-3 space-y-1 pt-0.5 border-l-2 ${shellDivider} ml-3`}>
                    <Link
                      href="/admin/offices-config"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/offices-config')
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
                        }`}
                    >
                      <Building className="h-3.5 w-3.5 shrink-0" />
                      <span>অরগানোগ্রাম</span>
                    </Link>

                    <Link
                      href="/admin/offices-management/head-offices"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/offices-management/head-offices')
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
                        }`}
                    >
                      <Building className="h-3.5 w-3.5 shrink-0" />
                      <span>হেড অফিসসমূহ</span>
                    </Link>

                    <Link
                      href="/admin/offices-management/field-offices"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/offices-management/field-offices')
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
                        }`}
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span>মাঠ পর্যায়ের অফিসসমূহ</span>
                    </Link>

                    <Link
                      href="/admin/offices-management/group-budget"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/offices-management/group-budget')
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white ${shellHover} transition-colors cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="h-4 w-4 text-blue-400" />
                    <span>বাজেট সেটিংস</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${budgetGroupOpen ? 'rotate-180' : ''}`} />
                </button>

                {budgetGroupOpen && (
                  <div className={`pl-3 space-y-1 pt-0.5 border-l-2 ${shellDivider} ml-3`}>
                    <Link
                      href="/admin/budgets"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/budgets')
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
                        }`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                      <span>বাজেট দাখিল উন্মুক্তকরণ</span>
                    </Link>

                    <Link
                      href="/admin/codes"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/codes')
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
                        }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>ইকোনমিক কোড সেটিংস</span>
                    </Link>

                    <Link
                      href="/admin/settings"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname.startsWith('/admin/settings')
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
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
                          ? shellActive + ' text-white'
                          : 'text-slate-400 ' + shellHover + ' hover:text-white'
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white ${shellHover} transition-colors cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                    <span>প্রতিবেদনসমূহ</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${reportsGroupOpen ? 'rotate-180' : ''}`} />
                </button>

                {reportsGroupOpen && (
                  <div className={`pl-3 space-y-1 pt-0.5 border-l-2 ${shellDivider} ml-3`}>
                    <Link
                      href="/admin/reports/submission-status"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname === '/admin/reports/submission-status'
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
                        }`}
                    >
                      <ListChecks className="h-3.5 w-3.5 shrink-0" />
                      <span>বাজেট দাখিলের অবস্থা</span>
                    </Link>

                    <Link
                      href="/admin/reports/combined"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname === '/admin/reports/combined'
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
                        }`}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0" />
                      <span>সমন্বিত রিপোর্ট</span>
                    </Link>

                    <Link
                      href="/admin/reports/individual"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname === '/admin/reports/individual'
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
                        }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>অফিসভিত্তিক রিপোর্ট</span>
                    </Link>

                    <Link
                      href="/admin/reports/summary"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname === '/admin/reports/summary'
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white ${shellHover} transition-colors cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span>ইউজার সেটিংস</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${usersGroupOpen ? 'rotate-180' : ''}`} />
                </button>

                {usersGroupOpen && (
                  <div className={`pl-3 space-y-1 pt-0.5 border-l-2 ${shellDivider} ml-3`}>
                    <Link
                      href="/admin/offices-users"
                      onClick={() => { if (window.innerWidth < 1024) setDrawerOpen(false) }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${pathname === '/admin/offices-users'
                        ? shellActive + ' text-white'
                        : 'text-slate-400 ' + shellHover + ' hover:text-white'
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
                          ? shellActive + ' text-white'
                          : 'text-slate-400 ' + shellHover + ' hover:text-white'
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

            <div className={`p-3.5 border-t ${isSuperAdmin ? 'border-violet-900/40 bg-violet-900/20' : 'border-blue-900/40 bg-blue-900/20'}`}>
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
