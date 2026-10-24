'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { strings } from '@/lib/strings'
import { logoutOffice as logout } from '@/app/actions/auth'
import {
  LayoutDashboard,
  BarChart3,
  LogOut,
  Menu,
  ChevronDown,
  User,
  History,
  Building2,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toBanglaNumber } from '@/lib/bangla'
import { FORM_ITEMS, FORM_SHADES, FORM_COUNT } from '@/lib/office/forms'
import { useFormGuard } from '@/components/form-guard-provider'
import { useState, useRef, useEffect } from 'react'

export function AppShell({
  children,
  user,
  hasOpenCycle,
}: {
  children: React.ReactNode
  user: { id: string; name: string; office_id?: number; budget_id?: string; submission_id?: number }
  /** When no cycle is open the forms are presented but not actionable. */
  hasOpenCycle: boolean
}) {
  const pathname = usePathname()
  const { requestNavigation } = useFormGuard()

  // Drawer open/collapse state (Desktop & Mobile) - default expanded on login/dashboard
  const [drawerOpen, setDrawerOpen] = useState(true)
  // Forms submenu accordion in drawer — collapsed until a cycle is open
  const [formsSubmenuOpen, setFormsSubmenuOpen] = useState(hasOpenCycle)
  
  // Profile dropdown menu in top bar
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  // Budget History Modal
  const [budgetsModalOpen, setBudgetsModalOpen] = useState(false)

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

  // Drawer navigation goes through the form guard: if the form on screen holds
  // unsaved edits, the office is asked before the page changes.
  const handleNav =
    (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }
      e.preventDefault()
      if (window.innerWidth < 1024) setDrawerOpen(false)
      requestNavigation(href)
    }

  // Theme colors for USER: slate-900 with rich indigo/blue accents
  const brandDarkBg = 'bg-slate-900 text-white'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* 1. TOP BAR: Same color as left drawer (slate-900) */}
      <header className={`h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 ${brandDarkBg} border-b border-slate-800 z-30 shadow-md`}>
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
            href="/dashboard"
            prefetch={true}
            onClick={handleNav('/dashboard')}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              pathname === '/dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-blue-400" />
            <span>ড্যাশবোর্ড</span>
          </Link>
        </div>

        {/* Middle Section: Application Logo + Name */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            <img
              src="/images/bdgovlogo.png"
              alt={strings.appName}
              className="h-8 w-8 object-contain"
            />
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-100 truncate max-w-[200px] sm:max-w-none font-title">
            {strings.appName}
          </span>
        </div>

        {/* Right Section: Profile Name with Dropdown */}
        <div className="relative" ref={profileDropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-all text-slate-200 cursor-pointer border border-slate-700/60"
          >
            <div className="h-7 w-7 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-xs shrink-0">
              <User className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold truncate max-w-[120px] sm:max-w-[200px]">
              {user.name}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white text-slate-800 shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-[11px] font-mono font-semibold text-slate-500 mt-0.5">
                  ({user.budget_id || user.id})
                </p>
              </div>

              <div className="p-1 space-y-0.5">
                <Link
                  href="/office/office-info"
                  prefetch={true}
                  onClick={(e) => {
                    setProfileDropdownOpen(false)
                    handleNav('/office/office-info')(e)
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <Building2 className="h-4 w-4 text-blue-600" />
                  অফিসের তথ্য
                </Link>
              </div>

              <div className="p-1 border-t border-slate-100 mt-1">
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
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

      {/* 2. BODY LAYOUT: Left Drawer + Main Workspace */}
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
            h-full ${brandDarkBg} border-r border-slate-800
            flex flex-col transition-all duration-200 ease-in-out shrink-0
            ${drawerOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'}
          `}
        >
          {/* Drawer Inner Nav */}
          <div className="w-72 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 custom-scrollbar">
              {/* Accordion: ফর্মসমূহ (clicking shows all forms serially) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setFormsSubmenuOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-extrabold text-slate-400 uppercase tracking-wider hover:bg-slate-800/60 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-blue-400" />
                    {strings.dashboard.budgetForms} ({toBanglaNumber(FORM_COUNT)} টি)
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      formsSubmenuOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {formsSubmenuOpen && (
                  <div className="mt-1 space-y-0.5 pl-2 border-l border-slate-800 ml-3">
                    {FORM_ITEMS.map((item, idx) => {
                      const isActive = pathname === item.href
                      const shade = FORM_SHADES[idx]
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/30'
                              : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                          }`}
                          onClick={handleNav(item.href)}
                        >
                          <span
                            className="h-6 w-6 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-extrabold font-mono"
                            style={shade}
                          >
                            {toBanglaNumber(item.num)}
                          </span>
                          <span className="truncate">{item.title}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* চূড়ান্ত বাজেট (Final Budget Sheet) — only while a cycle is open */}
              {hasOpenCycle && (
                <div className="pt-2">
                  <Link
                    href="/office/budget-sheet"
                    prefetch={true}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      pathname === '/office/budget-sheet'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-emerald-400 hover:bg-slate-800/80 hover:text-emerald-300'
                    }`}
                    onClick={handleNav('/office/budget-sheet')}
                  >
                    <BarChart3 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{strings.dashboard.finalBudget}</span>
                  </Link>
                </div>
              )}

              {/* দাখিলকৃত বাজেটসমূহ (Previous Submissions History) */}
              <button
                type="button"
                onClick={() => setBudgetsModalOpen(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all cursor-pointer text-left"
              >
                <History className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{strings.dashboard.submittedBudgets}</span>
              </button>
            </div>

            {/* Drawer Footer with Logout */}
            <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 border border-rose-900/40 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  লগআউট
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* 3. BUDGETS MODAL: View Old Submitted Budgets */}
      <Dialog open={budgetsModalOpen} onOpenChange={setBudgetsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 text-amber-600">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <History className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-slate-900">
                  দাখিলকৃত বাজেটসমূহ
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  আপনার অফিসের পূর্ববর্তী চক্র ও বর্তমান দাখিলকৃত বাজেটের তালিকা
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">অর্থবছর ২০২৫-২০২৬ (বর্তমান চক্র)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  আইডি: #{user.submission_id || 'খসড়া'}
                </p>
              </div>
              <Link
                href="/office/budget-sheet"
                onClick={() => setBudgetsModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs"
              >
                বাজেট শিট দেখুন
              </Link>
            </div>

            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <p className="text-xs text-slate-400 font-medium">
                কোনো আর্কাইভ বা পুরাতন চক্রের বাজেট সংরক্ষিত নেই।
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBudgetsModalOpen(false)}
              className="rounded-xl text-xs font-semibold w-full sm:w-auto"
            >
              বন্ধ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
