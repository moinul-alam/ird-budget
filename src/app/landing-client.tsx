'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { strings } from '@/lib/strings'
import { toEnglishNumber } from '@/lib/bangla'
import { searchOffice, getDepartments, getParentOffices, getOfficeTypes, getMinistriesList, getOfficeLevelsForType } from '@/app/actions/office'
import { loginOffice, registerOffice } from '@/app/actions/auth'
import { Search, Plus, Check, X, ArrowRight, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

type ViewState = 'search' | 'found' | 'notFound'

interface FoundOffice {
  id: string
  name: string
}

interface SelectOption {
  id: string
  name: string
}

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

  return (
    <div className="flex-grow flex flex-col items-center justify-center relative overflow-hidden px-4 py-8 min-h-screen bg-slate-50">
      {/* Decorative Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '-4s' }} />
      <div className="absolute top-[20%] right-[15%] w-[25rem] h-[25rem] bg-purple-400/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Admin Login Button (top-right, subtle) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <Link
          href="/admin/login"
          title={strings.landing.adminLogin}
          className="group flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 hover:bg-white/40 hover:scale-110 transition-all duration-300 shadow-lg"
        >
          <Lock className="h-6 w-6 text-slate-500 group-hover:text-blue-600 transition-colors" />
        </Link>
      </div>

      {/* Main Card */}
      <div className="relative w-full max-w-3xl bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] rounded-[2.5rem] p-6 sm:p-8 overflow-hidden z-10 transition-all duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/20 pointer-events-none" />

        {/* Header */}
        <div className="relative text-center mb-8">
          <div className="w-16 h-16 mx-auto flex items-center justify-center mb-4 transform hover:scale-110 transition-transform duration-500">
            <img
              src="/images/bdgovlogo.png"
              alt="Government Logo"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 mb-3 py-2 drop-shadow-sm leading-normal">
            {strings.landing.title}
          </h1>
          <p className="text-slate-500 font-medium text-base max-w-xl mx-auto">
            {strings.landing.subtitle}
          </p>
        </div>

        {/* Content Area */}
        <div className="relative flex flex-col items-center justify-center transition-all duration-500">

          {/* SEARCH VIEW */}
          {view === 'search' && (
            <div className="w-full max-w-md transition-all duration-500 z-10">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} className="space-y-6">
                <div className="group">
                  <label htmlFor="budget_id" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                    {strings.landing.enterBudgetId}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="budget_id"
                      value={budgetId}
                      onChange={(e) => setBudgetId(e.target.value)}
                      placeholder={strings.landing.budgetIdPlaceholder}
                      className="w-full px-6 py-4 bg-white/80 backdrop-blur-md border-2 border-slate-100 rounded-2xl text-lg font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-300 shadow-sm hover:border-blue-300"
                      required
                    />
                    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-blue-500/50 group-hover:text-blue-500 transition-colors duration-300">
                      <Search className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleOpenRegModal}
                    className="flex-[0.4] bg-white/80 border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50/80 text-slate-600 hover:text-blue-700 font-bold py-4 px-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow flex items-center justify-center gap-2 group backdrop-blur-md"
                  >
                    <Plus className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <span className="text-base whitespace-nowrap">{strings.landing.registerButton}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-[0.6] relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-[0_8px_20px_rgb(79,70,229,0.3)] hover:shadow-[0_8px_25px_rgb(79,70,229,0.45)] transition-all duration-300 active:scale-[0.98] flex justify-center items-center gap-2 group"
                  >
                    {isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <span>{strings.landing.searchButton}</span>
                        <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FOUND VIEW */}
          {view === 'found' && foundOffice && (
            <div className="w-full max-w-md transition-all duration-500 animate-in slide-in-from-right-4">
              <div className="text-center bg-white/80 backdrop-blur-md border border-emerald-100 rounded-3xl p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />

                <div className="flex flex-row items-center justify-center gap-4 mb-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                  <div className="w-12 h-12 shrink-0 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-sm border border-blue-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 line-clamp-2 text-left">
                    {foundOffice.name}
                  </h3>
                </div>

                <p className="text-slate-600 font-semibold mb-4 text-base">
                  {strings.landing.foundOffice}
                </p>

                {/* Password field with forgot modal trigger */}
                <div className="mb-6 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="office_password" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <Lock className="h-4 w-4 text-slate-400" />
                      {strings.login.password}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-semibold cursor-pointer"
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
                      className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  {loginError && (
                    <p className="text-xs text-rose-600 font-semibold mt-2">
                      {loginError}
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-md shadow-red-500/30 hover:shadow-red-500/40 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <X className="h-5 w-5" />
                    {strings.no}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-md shadow-emerald-500/30 hover:shadow-emerald-500/40 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    {strings.yes}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOT FOUND VIEW */}
          {view === 'notFound' && (
            <div className="w-full max-w-md transition-all duration-500 animate-in slide-in-from-right-4">
              <div className="text-center bg-white/80 backdrop-blur-md border border-amber-100 rounded-3xl p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
                <div className="w-14 h-14 mx-auto bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4 border border-amber-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-slate-800 text-xl font-bold mb-2">
                  {strings.landing.notFound}
                </p>
                <p className="text-slate-500 font-medium mb-6">
                  {strings.landing.registerPrompt}
                </p>
                <div className="flex flex-row gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-bold py-4 px-4 rounded-2xl transition-all cursor-pointer"
                  >
                    {strings.landing.searchAgain}
                  </button>
                  <button
                    onClick={handleOpenRegModal}
                    className="flex-[1.2] bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
                  >
                    {strings.landing.registerThis}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================ REGISTRATION MODAL ================ */}
      {showRegModal && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
            onClick={() => setShowRegModal(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/50">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-8 py-6 text-white flex justify-between items-center shrink-0 relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-2xl font-extrabold tracking-tight">{strings.registration.title}</h2>
                  <p className="text-blue-100 text-sm font-medium mt-1 opacity-80">{strings.landing.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors relative z-10"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {/* Body */}
              <div className="p-8 overflow-y-auto">
                {regError && (
                  <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 font-medium text-sm">
                    {regError}
                  </div>
                )}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Ministry */}
                    <div>
                      <label htmlFor="reg_ministry" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        মন্ত্রণালয় / বিভাগ <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="reg_ministry"
                        value={selectedMinistry}
                        onChange={(e) => handleMinistryChange(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
                        required
                      >
                        <option value="" disabled>মন্ত্রণালয়/বিভাগ নির্বাচন করুন</option>
                        {ministries.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Department */}
                    <div>
                      <label htmlFor="department" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        {strings.registration.department} <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="department"
                        value={selectedDept}
                        onChange={(e) => handleDeptChange(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
                        required
                      >
                        <option value="" disabled>{strings.registration.departmentPlaceholder}</option>
                        {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>

                    {/* 3. Office Type */}
                    <div>
                      <label htmlFor="office_type" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        {strings.registration.officeType} <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="office_type"
                        value={selectedType}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        disabled={!selectedDept}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50 text-sm"
                        required
                      >
                        <option value="" disabled>{strings.registration.officeTypePlaceholder}</option>
                        {officeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>

                    {/* 3.5 Office Level */}
                    <div>
                      <label htmlFor="office_level" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        মাঠ পর্যায়ের অফিসের স্তর <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="office_level"
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        disabled={!selectedType}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50 text-sm"
                        required
                      >
                        <option value="" disabled>স্তর নির্বাচন করুন</option>
                        {officeLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>

                    {/* 4. Head Office (Parent Office) */}
                    <div>
                      <label htmlFor="parent_office" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        হেড অফিসের নাম <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="parent_office"
                        value={selectedParent}
                        onChange={(e) => setSelectedParent(e.target.value)}
                        disabled={!selectedDept}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50 text-sm"
                        required
                      >
                        <option value="" disabled>হেড অফিস নির্বাচন করুন</option>
                        {parentOffices.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    {/* 5. Field Office Name & 6. Budget ID (In the same row) */}
                    <div>
                      <label htmlFor="reg_name" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        মাঠ পর্যায়ের অফিসের নাম <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="reg_name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="যেমন: সার্কেল-১ (কোতোয়ালী), সার্কেল-২ (মতিঝিল)..."
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="reg_budget_id" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        অফিসের বাজেট আইডি <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="reg_budget_id"
                        value={regBudgetId}
                        onChange={(e) => setRegBudgetId(e.target.value)}
                        placeholder={strings.registration.budgetIdPlaceholder}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50 mt-auto">
                <button
                  onClick={() => setShowRegModal(false)}
                  className="flex-[0.4] bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-4 px-4 rounded-2xl transition-colors shadow-sm"
                >
                  {strings.cancel}
                </button>
                <button
                  onClick={handlePreview}
                  className="flex-[0.6] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98]"
                >
                  {strings.registration.previewTitle}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================ PREVIEW MODAL ================ */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setShowPreviewModal(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/50">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-8 py-6 text-white flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-extrabold tracking-tight">{strings.registration.previewTitle}</h2>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
              {/* Body */}
              <div className="p-8 overflow-y-auto">
                <p className="text-sm font-medium text-slate-500 mb-8 bg-blue-50 text-blue-700 p-4 rounded-xl border border-blue-100">
                  {strings.registration.previewPrompt}
                </p>
                <div className="space-y-6">
                  <PreviewItem label="মন্ত্রণালয় / বিভাগ" value={getMinistryName()} />
                  <PreviewItem label={strings.registration.department} value={getDeptName()} />
                  <PreviewItem label={strings.registration.officeType} value={getTypeName()} />
                  <PreviewItem label="হেড অফিস" value={getParentName()} />
                  <PreviewItem label="মাঠ পর্যায়ের অফিসের নাম" value={regName} />
                  <PreviewItem label="অফিসের বাজেট আইডি" value={regBudgetId} />
                </div>
              </div>
              {/* Footer */}
              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50 mt-auto">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="flex-[0.4] bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-4 px-4 rounded-2xl transition-colors shadow-sm"
                >
                  {strings.registration.editButton}
                </button>
                <button
                  onClick={handleRegSubmit}
                  disabled={isPending}
                  className="flex-[0.6] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {strings.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-title">
                পাসওয়ার্ড পুনরুদ্ধার
              </h3>
              <p className="text-sm font-medium text-slate-600 mt-2">
                সিস্টেম এডমিনের সাথে যোগাযোগ করুন
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      <span className="text-xl font-bold text-slate-800">{value}</span>
    </div>
  )
}
