'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { strings } from '@/lib/strings'
import { toEnglishNumber, toBanglaNumber } from '@/lib/bangla'
import { BUDGET_ID_LENGTH } from '@/lib/constants'
import { searchOffice, getDepartments, getParentOffices, getOfficeTypes, getMinistriesList, getOfficeLevelsForType } from '@/lib/actions/office'
import { loginOffice, registerOffice } from '@/lib/actions/auth'
import {
  Plus,
  X,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  FileText,
  Send,
  LogIn,
  ShieldCheck,
  Check,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

type LookupState = 'idle' | 'searching' | 'found' | 'notFound' | 'incomplete'

interface LookupOffice {
  id: string
  name: string
  headOffice: string | null
}

interface SelectOption {
  id: string
  name: string
}

/** Numbered walk-through shown beside the card on wide screens. Mirrors the flow below. */
const STEPS = [
  {
    icon: LogIn,
    title: 'বাজেট আইডি দিয়ে সিস্টেমে লগিন',
    detail: 'বাজেট আইডি ও নির্ধারিত পাসওয়ার্ড দিয়ে লগিন করুন',
  },
  {
    icon: FileText,
    title: 'নির্ধারিত ফরম সঠিক নিয়মে পূরণ',
    detail: 'নির্ধারিত ফরমসমূহ ধাপে ধাপে যথাযথভাবে পূরণ করুন',
  },
  {
    icon: Send,
    title: 'চূড়ান্ত বাজেট পর্যালোচনা ও দাখিল',
    detail: 'পূরণকৃত ফরম অনুযায়ী স্বয়ংক্রিয়ভাবে প্রস্তুত বাজেট দাখিল করুন',
  },
]

/** How long a complete budget id has to sit untouched in the field before it is looked up. */
const LOOKUP_DWELL_MS = 2000

export function LandingClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Login state
  const [budgetId, setBudgetId] = useState('')
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [lookupOffice, setLookupOffice] = useState<LookupOffice | null>(null)
  const [englishOnlyWarning, setEnglishOnlyWarning] = useState(false)
  const lookupSeq = useRef(0)
  const lastLookupId = useRef<string | null>(null)
  // Settles the request that a completed ID earns: it only goes out once typing has stopped.
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLookupTimer = () => {
    if (lookupTimer.current !== null) {
      clearTimeout(lookupTimer.current)
      lookupTimer.current = null
    }
  }

  useEffect(() => () => {
    if (lookupTimer.current !== null) clearTimeout(lookupTimer.current)
  }, [])

  // While the field is focused it spans the full row; on blur it contracts to exactly the width
  // of the typed digits, and the freed space on the right hosts the lookup status / result.
  const [idFocused, setIdFocused] = useState(false)
  const idMirrorRef = useRef<HTMLSpanElement | null>(null)
  // A second twin, holding a full-length ID. It is the floor the contract can never go below, so
  // a 3-digit value and a 13-digit one leave the field exactly the same width and the row does
  // not reflow when a validation message turns into an office result.
  const idFloorRef = useRef<HTMLSpanElement | null>(null)
  const [idWidth, setIdWidth] = useState(0)
  const [idFloorWidth, setIdFloorWidth] = useState(0)

  // Measure the twins continuously rather than once per keystroke. This keeps the contracted
  // width correct even when a web font swaps in after the first paint, which would otherwise
  // leave the box too narrow and push the digits under the status chip.
  useEffect(() => {
    const mirror = idMirrorRef.current
    const floor = idFloorRef.current
    if (!mirror || !floor) return

    const measure = () => {
      setIdWidth(mirror.offsetWidth)
      setIdFloorWidth(floor.offsetWidth)
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(mirror)
    observer.observe(floor)
    return () => observer.disconnect()
  }, [])

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

  // Runs the office lookup. Only ever called with a complete budget id, so no database
  // connection is ever spent on a partial value.
  const runLookup = (englishId: string) => {
    // Same ID, already resolved or still in flight (e.g. the blur caused by clicking লগইন করুন,
    // or the dwell firing just before it) — skip the extra query
    if (
      englishId === lastLookupId.current &&
      (lookupState === 'searching' || lookupState === 'found' || lookupState === 'notFound')
    ) {
      return
    }
    lastLookupId.current = englishId

    const seq = ++lookupSeq.current
    setLookupState('searching')
    startTransition(async () => {
      const result = await searchOffice(englishId)
      if (seq !== lookupSeq.current) return
      if (result.found && result.office) {
        setLookupOffice(result.office)
        setLookupState('found')
      } else {
        setLookupOffice(null)
        setLookupState('notFound')
      }
    })
  }

  // Background lookup — fires on blur / Enter, never steals focus from the password field
  const handleLookup = () => {
    clearLookupTimer()
    const englishId = toEnglishNumber(budgetId.trim())

    if (englishId.length !== BUDGET_ID_LENGTH) {
      // Partial ID: prompt for the missing digits instead of querying, which would only ever miss
      lookupSeq.current += 1
      setLookupOffice(null)
      setLookupState(englishId ? 'incomplete' : 'idle')
      return
    }

    runLookup(englishId)
  }

  // The field accepts English digits only: Bengali numerals (০-৯) and every other
  // character are discarded as they are typed, with a prompt to switch to English.
  const handleBudgetIdChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '')
    setEnglishOnlyWarning(digitsOnly !== value)
    const nextId = digitsOnly.slice(0, BUDGET_ID_LENGTH)
    setBudgetId(nextId)

    // Editing the ID invalidates any previous result, and cancels the request the old value
    // had already earned.
    clearLookupTimer()
    lookupSeq.current += 1
    setLookupOffice(null)
    setLookupState('idle')

    // A complete ID is looked up on its own after a short pause inside the field, so the office
    // never has to click away to see the name; a blur resolves it immediately instead.
    if (nextId.length === BUDGET_ID_LENGTH) {
      lookupTimer.current = setTimeout(() => {
        lookupTimer.current = null
        runLookup(nextId)
      }, LOOKUP_DWELL_MS)
    }
  }

  // Login — single step, no separate confirm screen
  const handleLogin = () => {
    const englishId = toEnglishNumber(budgetId.trim())
    setLoginError(null)

    if (!englishId) {
      setLoginError('বাজেট আইডি লিখুন')
      return
    }
    if (englishId.length !== BUDGET_ID_LENGTH) {
      setLoginError(strings.landing.budgetIdLengthHint)
      return
    }
    if (!password) {
      setLoginError('পাসওয়ার্ড লিখুন')
      return
    }

    startTransition(async () => {
      const result = await loginOffice(englishId, password)
      if (result.success) {
        router.push('/dashboard')
      } else if (result.error) {
        setLoginError(result.error)
        if (result.notFound) {
          setLookupOffice(null)
          setLookupState('notFound')
        }
      }
    })
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

  // Lookup feedback sits inline to the right of the input, which contracts to make room for it.
  // The chip claims that space as soon as there is anything to say — a warning, a settled
  // result — so the office name appears without leaving the field, and it stays for any content
  // once the field has been left behind.
  const hasStatus = englishOnlyWarning || lookupState !== 'idle'
  const shouldContract = hasStatus || (!idFocused && budgetId.length > 0)

  const lookupTitle = lookupOffice
    ? lookupOffice.headOffice
      ? `${lookupOffice.name} · ${lookupOffice.headOffice}`
      : lookupOffice.name
    : ''

  // Mirrors the budget-id input box: same shape, padding, border and fixed height, so the result
  // reads as a sibling field and swapping it in/out never changes the row height (no layout blink).
  const chipBase =
    'flex h-14 w-full min-w-0 items-center gap-3 rounded-2xl border px-4 text-xs font-bold'
  const chipIcon = 'h-3.5 w-3.5 shrink-0'
  // The icon is a spinning (transformed) element in the waiting state, which lets it composite
  // above later siblings. Lifting the label keeps its first character on top in every state.
  const chipText = 'relative z-10 min-w-0 break-words leading-snug'

  const statusPill = englishOnlyWarning ? (
    <span className={`${chipBase} border-amber-200 bg-amber-50 text-amber-700`}>
      <AlertTriangle className={`${chipIcon} text-amber-600`} />
      <span className={chipText}>{strings.landing.englishOnly}</span>
    </span>
  ) : lookupState === 'searching' ? (
    <span className={`${chipBase} border-slate-200 bg-slate-50 text-slate-500`}>
      <Loader2 className={`${chipIcon} animate-spin text-blue-500`} />
      <span className={chipText}>{strings.landing.checking}</span>
    </span>
  ) : lookupState === 'found' && lookupOffice ? (
    <span
      title={lookupTitle}
      className={`${chipBase} border-emerald-200 bg-emerald-50 text-emerald-800`}
    >
      <CheckCircle2 className={`${chipIcon} text-emerald-600`} />
      <span className={`${chipText} flex flex-col`}>
        {/* Field office: name on top, head office on the second line. Head office: name only.
            Each line is capped at a single row, so a long pair ellipsises inside the chip
            instead of wrapping to a third line and overrunning the fixed height. */}
        <span className="truncate">{lookupOffice.name}</span>
        {lookupOffice.headOffice && (
          <span className="truncate font-semibold text-emerald-600/80">{lookupOffice.headOffice}</span>
        )}
      </span>
    </span>
  ) : lookupState === 'incomplete' ? (
    <span className={`${chipBase} border-amber-200 bg-amber-50 text-amber-700`}>
      <AlertTriangle className={`${chipIcon} text-amber-600`} />
      <span className={chipText}>{strings.landing.budgetIdLengthHint}</span>
    </span>
  ) : lookupState === 'notFound' ? (
    <span className={`${chipBase} border-rose-200 bg-rose-50 text-rose-700`}>
      <AlertTriangle className={`${chipIcon} text-rose-600`} />
      <span className={chipText}>{strings.landing.noOffice}</span>
    </span>
  ) : null

  // Helper to get selected option text
  const getMinistryName = () => ministries.find(m => m.id === selectedMinistry)?.name || ''
  const getDeptName = () => departments.find(d => d.id === selectedDept)?.name || ''
  const getParentName = () => parentOffices.find(p => p.id === selectedParent)?.name || strings.na
  const getTypeName = () => officeTypes.find(t => t.id === selectedType)?.name || ''

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
              <p className="font-heading text-sm font-bold leading-tight text-slate-900 sm:text-base pl-0.5">
                {strings.landing.title}
              </p>
              <p className="text-xs font-semibold leading-snug text-slate-500 sm:text-sm pl-0.5">
                {strings.landing.subtitle}
              </p>
            </div>
          </div>

          <Link
            href="/admin/login"
            aria-label={strings.landing.adminLogin}
            className="group flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-600 shadow-sm transition-all duration-300 ease-out hover:border-blue-300 hover:bg-blue-50 hover:px-4 hover:text-blue-700 focus-visible:border-blue-300 focus-visible:bg-blue-50 focus-visible:px-4 focus-visible:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15 sm:text-sm"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-blue-600 group-focus-visible:text-blue-600" />
            <span className="grid grid-cols-[0fr] transition-all duration-300 ease-out group-hover:ml-2 group-hover:grid-cols-[1fr] group-focus-visible:ml-2 group-focus-visible:grid-cols-[1fr]">
              <span className="min-w-0 overflow-hidden whitespace-nowrap">
                <span className="block pl-0.5 pr-0.5">{strings.landing.adminLogin}</span>
              </span>
            </span>
          </Link>
        </div>
      </header>

      {/* ================ MAIN ================ */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,32rem)_minmax(0,24rem)] lg:justify-between lg:gap-14 lg:py-16">
        {/* ---------- Action card (first on mobile, right on desktop) ---------- */}
        <section className="order-1 w-full lg:order-2">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)] sm:rounded-[32px] sm:p-9">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" />
            {/* Header — logo + title on the same row */}
            <div className="mb-6 flex items-center justify-center gap-3 border-b border-slate-100 pb-6 pt-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30">
                <LogIn className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-xl font-bold text-slate-900">
                {strings.landing.officeLogin}
              </h2>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleLogin() }} className="space-y-5">
              <div>
                <label htmlFor="budget_id" className="mb-2.5 block text-sm font-bold text-slate-700">
                  {strings.landing.budgetIdLabel} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  {/* The field keeps the full row while it has nothing to report, then contracts
                      to the width of a complete ID so the status can sit beside it without
                      moving anything, whatever the status happens to be. */}
                  <div
                    className="relative shrink-0 transition-[width] duration-300 ease-out"
                    style={{
                      width: shouldContract
                        ? `${Math.max(idWidth, idFloorWidth, 48)}px`
                        : '100%',
                    }}
                  >
                    <input
                      type="text"
                      id="budget_id"
                      value={budgetId}
                      onChange={(e) => handleBudgetIdChange(e.target.value)}
                      onFocus={() => setIdFocused(true)}
                      onBlur={() => {
                        setIdFocused(false)
                        handleLookup()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      placeholder={strings.landing.budgetIdPlaceholder}
                      inputMode="numeric"
                      maxLength={BUDGET_ID_LENGTH}
                      dir="ltr"
                      autoComplete="off"
                      spellCheck={false}
                      aria-describedby="budget_id_status"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-4 pr-4 text-base font-semibold text-slate-900 transition-colors placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:placeholder:text-transparent"
                    />
                    {/* Invisible twin of the digits — its width is what the field contracts to.
                        `w-max` keeps it at the true text width instead of being clamped by the
                        shrinking wrapper, which would otherwise feed a smaller value back into
                        the width transition and collapse the box. */}
                    <span
                      ref={idMirrorRef}
                      aria-hidden
                      className="invisible absolute left-0 top-0 w-max whitespace-pre rounded-2xl border border-transparent px-4 py-3 text-base font-semibold"
                    >
                      {budgetId || '0'}
                    </span>
                    {/* The floor twin — a full-length ID, so the contract never drops below the
                        width the completed field needs. */}
                    <span
                      ref={idFloorRef}
                      aria-hidden
                      className="invisible absolute left-0 top-0 w-max whitespace-pre rounded-2xl border border-transparent px-4 py-3 text-base font-semibold"
                    >
                      {'0'.repeat(BUDGET_ID_LENGTH)}
                    </span>
                  </div>

                  <div
                    id="budget_id_status"
                    role="status"
                    aria-live="polite"
                    className="min-w-0 flex-1"
                  >
                    {shouldContract ? statusPill : null}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="office_password" className="mb-2.5 block text-sm font-bold text-slate-700">
                  {strings.login.password} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="office_password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন"
                    autoComplete="current-password"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-4 pr-12 font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
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
                  type="button"
                  onClick={handleOpenRegModal}
                  className="group order-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-600 bg-emerald-600 px-4 font-heading text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:border-emerald-500 hover:bg-emerald-500 active:scale-[0.99] sm:order-1 sm:flex-1"
                >
                  <Plus className="h-4 w-4" />
                  {strings.landing.registerButton}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="order-1 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 font-heading text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:from-blue-500 hover:to-blue-400 active:scale-[0.99] disabled:opacity-70 sm:order-2 sm:flex-[1.5]"
                >
                  {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                  {strings.landing.loginButton}
                </button>
              </div>
            </form>
          </div>

          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-medium text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            পাসওয়ার্ড জানা না থাকলে সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন
          </p>
        </section>

        {/* ---------- Branding panel (second on mobile, left on desktop) ---------- */}
        <section className="order-2 space-y-8 lg:order-1">
          <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl pl-0.5">
            {strings.landing.title}
          </h1>

          <ol className="space-y-3">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon
              return (
                <li
                  key={step.title}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4 backdrop-blur-sm transition-all duration-300 hover:border-blue-200 hover:bg-white hover:shadow-[0_16px_40px_-24px_rgba(37,99,235,0.55)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 font-heading text-base font-bold text-white shadow-md shadow-blue-600/25">
                    {toBanglaNumber(index + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="pl-0.5 font-heading text-[15px] font-bold leading-snug text-slate-800">
                        {step.title}
                      </p>
                      <StepIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-500/60 transition-colors group-hover:text-blue-600" />
                    </div>
                    <p className="mt-1 pl-0.5 text-xs font-medium leading-relaxed text-slate-500">
                      {step.detail}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:opacity-50"
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:opacity-50"
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:opacity-50"
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm font-bold transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15"
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
