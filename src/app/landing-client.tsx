'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { strings } from '@/lib/strings'
import { toEnglishNumber, toBanglaNumber } from '@/lib/bangla'
import { searchOffice, getDepartments, getParentOffices, getOfficeTypes, getMinistriesList, getOfficeLevelsForType } from '@/app/actions/office'
import { loginOffice, registerOffice } from '@/app/actions/auth'
import {
  Search,
  Plus,
  X,
  ArrowRight,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  FileText,
  Calculator,
  BarChart3,
  LogIn,
  ShieldCheck,
  Check,
} from 'lucide-react'

type ViewState = 'search' | 'found' | 'notFound'

interface FoundOffice {
  id: string
  name: string
}

interface SelectOption {
  id: string
  name: string
}

/** Numbered walk-through shown beside the card on wide screens. Mirrors the flow below. */
const STEPS = [
  {
    title: 'বাজেট আইডি দিয়ে সার্চ করুন',
    detail: 'অফিসের বাজেট আইডি লিখে সার্চ করুন।',
  },
  {
    title: 'অফিস নিশ্চিত করুন',
    detail: 'পাওয়া যাওয়া অফিসটি আপনার কিনা যাচাই করে পাসওয়ার্ড দিন।',
  },
  {
    title: 'ফরম পূরণ করে বাজেট দাখিল করুন',
    detail: 'ফরম ১ থেকে ১২ পূরণ করে বাজেট দাখিল করুন।',
  },
]

const FEATURES = [
  { icon: FileText, title: 'ফরম ১–১২', detail: 'নির্ধারিত ফরমে বাজেট প্রস্তুত' },
  { icon: Calculator, title: 'স্বয়ংক্রিয় হিসাব', detail: 'সূত্র অনুযায়ী স্বয়ংক্রিয় নিরূপণ' },
  { icon: BarChart3, title: 'প্রতিবেদন', detail: 'অফিসভিত্তিক ও সমন্বিত রিপোর্ট' },
]

export function LandingClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Search state
  const [budgetId, setBudgetId] = useState('')
  const [view, setView] = useState<ViewState>('search')
  const [foundOffice, setFoundOffice] = useState<FoundOffice | null>(null)

  // Registration modal
  const [showRegModal, setShowRegModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Registration form (matching মাঠ পর্যায়ের সকল অফিস)
  const [regName, setRegName] = useState('')
  const [regBudgetId, setRegBudgetId] = useState('')
  const [ministries, setMinistries] = useState<SelectOption[]>([])
  const [departments, setDepartments] = useState<(SelectOption & { ministry_id?: string })[]>([])
  const [parentOffices, setParentOffices] = useState<SelectOption[]>([])
  const [officeTypes, setOfficeTypes] = useState<SelectOption[]>([])
  const [selectedMinistry, setSelectedMinistry] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedParent, setSelectedParent] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [officeLevels, setOfficeLevels] = useState<SelectOption[]>([])
  const [regError, setRegError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [showForgotModal, setShowForgotModal] = useState(false)

  // Search handler
  const handleSearch = () => {
    if (!budgetId.trim()) return
    const englishId = toEnglishNumber(budgetId.trim())
    setLoginError(null)

    startTransition(async () => {
      const result = await searchOffice(englishId)
      if (result.found && result.office) {
        setFoundOffice(result.office)
        setView('found')
      } else {
        setFoundOffice(null)
        setView('notFound')
      }
    })
  }

  // Confirm office
  const handleConfirm = () => {
    if (!foundOffice) return
    const englishId = toEnglishNumber(budgetId.trim())
    setLoginError(null)
    startTransition(async () => {
      const result = await loginOffice(englishId, password)
      if (result.success) {
        router.push('/dashboard')
      } else if (result.error) {
        setLoginError(result.error)
      }
    })
  }

  // Reset search
  const handleReset = () => {
    setBudgetId('')
    setView('search')
    setFoundOffice(null)
  }

  // Open registration modal
  const handleOpenRegModal = async () => {
    setRegBudgetId(budgetId.trim())
    setShowRegModal(true)
    const [mins, deps] = await Promise.all([
      getMinistriesList(),
      getDepartments(),
    ])
    setMinistries(mins)
    setDepartments(deps)
    if (mins.length > 0) {
      setSelectedMinistry(mins[0].id)
    }
  }

  // Ministry change
  const handleMinistryChange = (minId: string) => {
    setSelectedMinistry(minId)
    setSelectedDept('')
    setSelectedParent('')
    setSelectedType('')
    setParentOffices([])
    setOfficeTypes([])
  }

  // Department change → load parent offices (head offices) + office types
  const handleDeptChange = async (deptId: string) => {
    setSelectedDept(deptId)
    setSelectedParent('')
    setSelectedType('')
    setParentOffices([])
    setOfficeTypes([])

    if (!deptId) return

    const [parents, types] = await Promise.all([
      getParentOffices(deptId),
      getOfficeTypes(deptId),
    ])
    setParentOffices(parents)
    setOfficeTypes(types)
    setSelectedLevel('')
    setOfficeLevels([])
  }


  // Office type change → load levels
  const handleTypeChange = async (typeId: string) => {
    setSelectedType(typeId)
    setSelectedLevel('')
    setOfficeLevels([])
    if (!typeId) return
    const levels = await getOfficeLevelsForType(parseInt(typeId, 10))
    setOfficeLevels(levels)
  }

  // Filtered departments for selected ministry
  const filteredDepartments = selectedMinistry
    ? departments.filter((d) => d.ministry_id === selectedMinistry)
    : departments

  // Preview
  const handlePreview = () => {
    if (!regName.trim() || !regBudgetId.trim() || !selectedType || !selectedParent) return
    setShowPreviewModal(true)
  }

  // Submit registration
  const handleRegSubmit = () => {
    startTransition(async () => {
      setRegError(null)
      const formData = new FormData()
      formData.set('name', regName.trim())
      formData.set('budget_id', toEnglishNumber(regBudgetId.trim()))
      formData.set('type_id', selectedType)
      formData.set('parent_id', selectedParent)
      formData.set('level_id', selectedLevel)

      const result = await registerOffice(formData)
      if (result.error) {
        setRegError(result.error)
        setShowPreviewModal(false)
        return
      }
      if (result.success) {
        router.push('/dashboard')
      }
    })
  }

  // Helper to get selected option text
  const getMinistryName = () => ministries.find(m => m.id === selectedMinistry)?.name || ''
  const getDeptName = () => departments.find(d => d.id === selectedDept)?.name || ''
  const getParentName = () => parentOffices.find(p => p.id === selectedParent)?.name || strings.na
  const getTypeName = () => officeTypes.find(t => t.id === selectedType)?.name || ''

  const cardHeading =
    view === 'found' ? 'অফিস নিশ্চিত করুন' : view === 'notFound' ? 'অফিস পাওয়া যায়নি' : 'অফিস লগিন'
  const cardHint =
    view === 'found'
      ? 'অফিসটি সঠিক হলে পাসওয়ার্ড দিয়ে প্রবেশ করুন।'
      : view === 'notFound'
        ? 'এই বাজেট আইডিটি নিবন্ধিত নয়।'
        : null

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-slate-50">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-blue-200/35 blur-3xl" />
        <div className="absolute -bottom-52 -right-40 h-[34rem] w-[34rem] rounded-full bg-indigo-200/35 blur-3xl" />
      </div>

      {/* ================ HEADER ================ */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/images/bdgovlogo.png"
              alt="গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের লোগো"
              width={44}
              height={44}
              priority
              className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11"
            />
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-bold leading-tight text-slate-900 sm:text-base">
                {strings.landing.title}
              </p>
              <p className="truncate text-[11px] font-medium leading-tight text-slate-500 sm:text-xs">
                {strings.landing.subtitle}
              </p>
            </div>
          </div>

          <Link
            href="/admin/login"
            className="group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 sm:px-4 sm:text-sm"
          >
            <ShieldCheck className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-600" />
            {strings.landing.adminLogin}
          </Link>
        </div>
      </header>

      {/* ================ MAIN ================ */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.05fr_minmax(0,24rem)] lg:gap-14 lg:py-16">
        {/* ---------- Action card (first on mobile, right on desktop) ---------- */}
        <section className="order-1 w-full lg:order-2">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)] sm:rounded-[32px] sm:p-9">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" />
            <div className={`mb-7 border-b border-slate-100 pb-6 pt-1 ${view === 'search' ? 'text-center' : ''}`}>
              {view === 'search' && (
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30">
                  <LogIn className="h-6 w-6" />
                </div>
              )}
              <h2 className="font-heading text-xl font-bold text-slate-900">{cardHeading}</h2>
              {cardHint && <p className="mt-1.5 text-sm font-medium text-slate-500">{cardHint}</p>}
            </div>

            {/* SEARCH VIEW */}
            {view === 'search' && (
              <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} className="space-y-5">
                <div>
                  <label htmlFor="budget_id" className="mb-2.5 block text-sm font-bold text-slate-700">
                    {strings.landing.enterBudgetId}
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      id="budget_id"
                      value={budgetId}
                      onChange={(e) => setBudgetId(e.target.value)}
                      placeholder={strings.landing.budgetIdPlaceholder}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-base font-semibold text-slate-900 transition-all placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="group order-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 font-heading text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:from-blue-500 hover:to-blue-400 active:scale-[0.99] disabled:opacity-70 sm:order-2 sm:flex-[1.5]"
                  >
                    {isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {strings.landing.searchButton}
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenRegModal}
                    className="group order-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 font-heading text-sm font-bold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 sm:order-1 sm:flex-1"
                  >
                    <Plus className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-600" />
                    {strings.landing.registerButton}
                  </button>
                </div>
              </form>
            )}

            {/* FOUND VIEW */}
            {view === 'found' && foundOffice && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                      {strings.landing.foundOffice}
                    </p>
                    <p className="font-heading text-base font-bold leading-snug text-slate-900">
                      {foundOffice.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-xs font-bold text-slate-500">বাজেট আইডি</span>
                  <span className="font-mono text-sm font-bold text-slate-800">
                    {toBanglaNumber(toEnglishNumber(budgetId.trim()))}
                  </span>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="office_password" className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                      <Lock className="h-4 w-4 text-slate-400" />
                      {strings.login.password}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs font-bold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="office_password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="পাসওয়ার্ড লিখুন"
                      autoComplete="current-password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-4 pr-12 font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {loginError && (
                    <p className="mt-2 text-xs font-semibold text-rose-600">{loginError}</p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="order-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 font-heading text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:from-blue-500 hover:to-blue-400 active:scale-[0.99] disabled:opacity-70 sm:order-2 sm:flex-[1.5]"
                  >
                    {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                    {strings.landing.loginButton}
                  </button>
                  <button
                    onClick={handleReset}
                    className="order-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 font-heading text-sm font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 sm:order-1 sm:flex-1"
                  >
                    <X className="h-4 w-4" />
                    {strings.landing.searchAnother}
                  </button>
                </div>
              </div>
            )}

            {/* NOT FOUND VIEW */}
            {view === 'notFound' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm ring-1 ring-amber-100">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-slate-900">
                      {strings.landing.notFound}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-600">
                      {strings.landing.registerPrompt}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleOpenRegModal}
                    className="order-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 font-heading text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:from-blue-500 hover:to-blue-400 active:scale-[0.99] sm:order-2 sm:flex-[1.5]"
                  >
                    <Plus className="h-5 w-5" />
                    {strings.landing.registerThis}
                  </button>
                  <button
                    onClick={handleReset}
                    className="order-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 font-heading text-sm font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 sm:order-1 sm:flex-1"
                  >
                    {strings.landing.searchAgain}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-medium text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            পাসওয়ার্ড জানা না থাকলে সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।
          </p>
        </section>

        {/* ---------- Branding panel (second on mobile, left on desktop) ---------- */}
        <section className="order-2 space-y-8 lg:order-1">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {strings.landing.subtitle}
            </span>
            <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              {strings.landing.title}
            </h1>
            <p className="max-w-xl text-base font-medium leading-relaxed text-slate-600">
              সরকারি অফিসের বার্ষিক বাজেট প্রস্তুত, দাখিল ও পর্যালোচনার কেন্দ্রীয় অনলাইন ব্যবস্থা।
            </p>
          </div>

          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4 backdrop-blur-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-heading text-sm font-bold text-white">
                  {toBanglaNumber(index + 1)}
                </span>
                <div>
                  <p className="font-heading text-sm font-bold text-slate-800">{step.title}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 backdrop-blur-sm"
              >
                <feature.icon className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-heading text-sm font-bold text-slate-800">{feature.title}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{feature.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ================ FOOTER ================ */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs font-medium text-slate-500 sm:flex-row sm:px-6 sm:text-left">
          <p>
            © {toBanglaNumber(new Date().getFullYear())} {strings.landing.subtitle}
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="font-bold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
            >
              পাসওয়ার্ড ভুলে গেছেন?
            </button>
            <span className="h-3 w-px bg-slate-300" />
            <Link href="/admin/login" className="font-bold text-slate-600 transition-colors hover:text-blue-700">
              {strings.landing.adminLogin}
            </Link>
          </div>
        </div>
      </footer>

      {/* ================ REGISTRATION MODAL ================ */}
      {showRegModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
            <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading text-lg font-bold text-slate-900">
                      {strings.registration.title}
                    </h2>
                    <p className="truncate text-xs font-medium text-slate-500">
                      {strings.landing.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  aria-label="বন্ধ করুন"
                  className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-6">
                {regError && (
                  <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {regError}
                  </div>
                )}

                <div className="space-y-7">
                  {/* Section 1 — classification */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-slate-800">
                      <span className="h-4 w-1 rounded-full bg-blue-600" />
                      অফিসের শ্রেণিবিন্যাস
                    </h3>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Ministry */}
                      <div>
                        <label htmlFor="reg_ministry" className="mb-2 block text-sm font-bold text-slate-700">
                          মন্ত্রণালয় / বিভাগ <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="reg_ministry"
                          value={selectedMinistry}
                          onChange={(e) => handleMinistryChange(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
                          required
                        >
                          <option value="" disabled>মন্ত্রণালয়/বিভাগ নির্বাচন করুন</option>
                          {ministries.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Department */}
                      <div>
                        <label htmlFor="department" className="mb-2 block text-sm font-bold text-slate-700">
                          {strings.registration.department} <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="department"
                          value={selectedDept}
                          onChange={(e) => handleDeptChange(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
                          required
                        >
                          <option value="" disabled>{strings.registration.departmentPlaceholder}</option>
                          {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>

                      {/* Office Type */}
                      <div>
                        <label htmlFor="office_type" className="mb-2 block text-sm font-bold text-slate-700">
                          {strings.registration.officeType} <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="office_type"
                          value={selectedType}
                          onChange={(e) => handleTypeChange(e.target.value)}
                          disabled={!selectedDept}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:opacity-50"
                          required
                        >
                          <option value="" disabled>{strings.registration.officeTypePlaceholder}</option>
                          {officeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>

                      {/* Office Level */}
                      <div>
                        <label htmlFor="office_level" className="mb-2 block text-sm font-bold text-slate-700">
                          মাঠ পর্যায়ের অফিসের স্তর <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="office_level"
                          value={selectedLevel}
                          onChange={(e) => setSelectedLevel(e.target.value)}
                          disabled={!selectedType}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:opacity-50"
                          required
                        >
                          <option value="" disabled>স্তর নির্বাচন করুন</option>
                          {officeLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>

                      {/* Head Office (Parent Office) */}
                      <div className="sm:col-span-2">
                        <label htmlFor="parent_office" className="mb-2 block text-sm font-bold text-slate-700">
                          হেড অফিসের নাম <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="parent_office"
                          value={selectedParent}
                          onChange={(e) => setSelectedParent(e.target.value)}
                          disabled={!selectedDept}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:opacity-50"
                          required
                        >
                          <option value="" disabled>হেড অফিস নির্বাচন করুন</option>
                          {parentOffices.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Section 2 — identity */}
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-slate-800">
                      <span className="h-4 w-1 rounded-full bg-blue-600" />
                      অফিসের পরিচিতি
                    </h3>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="reg_name" className="mb-2 block text-sm font-bold text-slate-700">
                          মাঠ পর্যায়ের অফিসের নাম <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="reg_name"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="যেমন: সার্কেল-১ (কোতোয়ালী)"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="reg_budget_id" className="mb-2 block text-sm font-bold text-slate-700">
                          অফিসের বাজেট আইডি <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="reg_budget_id"
                          value={regBudgetId}
                          onChange={(e) => setRegBudgetId(e.target.value)}
                          placeholder={strings.registration.budgetIdPlaceholder}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-bold transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
                          required
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-5 sm:flex-row">
                <button
                  onClick={handlePreview}
                  className="order-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 font-heading text-base font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-[0.99] sm:order-2 sm:flex-[1.5]"
                >
                  {strings.registration.previewTitle}
                </button>
                <button
                  onClick={() => setShowRegModal(false)}
                  className="order-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-heading text-sm font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 sm:order-1 sm:flex-1"
                >
                  {strings.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================ PREVIEW MODAL ================ */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
            <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Check className="h-5 w-5" />
                  </div>
                  <h2 className="font-heading text-lg font-bold text-slate-900">
                    {strings.registration.previewTitle}
                  </h2>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  aria-label="বন্ধ করুন"
                  className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-6">
                <p className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-700">
                  {strings.registration.previewPrompt}
                </p>

                <dl className="overflow-hidden rounded-2xl border border-slate-200">
                  <PreviewItem label="মন্ত্রণালয় / বিভাগ" value={getMinistryName()} />
                  <PreviewItem label={strings.registration.department} value={getDeptName()} />
                  <PreviewItem label={strings.registration.officeType} value={getTypeName()} />
                  <PreviewItem label="হেড অফিস" value={getParentName()} />
                  <PreviewItem label="মাঠ পর্যায়ের অফিসের নাম" value={regName} />
                  <PreviewItem label="অফিসের বাজেট আইডি" value={toBanglaNumber(toEnglishNumber(regBudgetId.trim()))} />
                </dl>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-5 sm:flex-row">
                <button
                  onClick={handleRegSubmit}
                  disabled={isPending}
                  className="order-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 font-heading text-base font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-[0.99] disabled:opacity-70 sm:order-2 sm:flex-[1.5]"
                >
                  {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
                  {strings.confirm}
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="order-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-heading text-sm font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 sm:order-1 sm:flex-1"
                >
                  {strings.registration.editButton}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================ FORGOT PASSWORD MODAL ================ */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-slate-900">পাসওয়ার্ড পুনরুদ্ধার</h3>
              <p className="mt-2 text-sm font-medium text-slate-600">
                সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-heading text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0 odd:bg-slate-50/60">
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-bold text-slate-800">{value}</dd>
    </div>
  )
}
