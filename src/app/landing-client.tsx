'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { strings } from '@/lib/strings'
import { toEnglishNumber } from '@/lib/bangla'
import { searchOffice, getDepartments, getParentOffices, getOfficeTypes } from '@/app/actions/office'
import { loginOffice, registerOffice } from '@/app/actions/auth'
import { Search, Plus, Check, X, ArrowRight, Lock, Loader2 } from 'lucide-react'
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

  // Registration form
  const [regName, setRegName] = useState('')
  const [regBudgetId, setRegBudgetId] = useState('')
  const [departments, setDepartments] = useState<SelectOption[]>([])
  const [parentOffices, setParentOffices] = useState<SelectOption[]>([])
  const [officeTypes, setOfficeTypes] = useState<SelectOption[]>([])
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedParent, setSelectedParent] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [regError, setRegError] = useState<string | null>(null)

  // Search handler
  const handleSearch = () => {
    if (!budgetId.trim()) return
    const englishId = toEnglishNumber(budgetId.trim())

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
    startTransition(async () => {
      const result = await loginOffice(englishId)
      if (result.success) {
        router.push('/dashboard')
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
    // Load departments
    const deps = await getDepartments()
    setDepartments(deps)
  }

  // Department change → load parent offices + office types
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
  }

  // Preview
  const handlePreview = () => {
    if (!regName.trim() || !regBudgetId.trim() || !selectedType) return
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
      if (selectedParent) formData.set('parent_id', selectedParent)

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
          href="/superadmin/login"
          title={strings.landing.adminLogin}
          className="group flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 hover:bg-white/40 hover:scale-110 transition-all duration-300 shadow-lg"
        >
          <Lock className="h-6 w-6 text-slate-500 group-hover:text-blue-600 transition-colors" />
        </Link>
      </div>

      {/* Main Card */}
      <div className="relative w-full max-w-3xl bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] rounded-[2.5rem] p-8 sm:p-12 overflow-hidden z-10 transition-all duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/20 pointer-events-none" />

        {/* Header */}
        <div className="relative text-center mb-12">
          <div className="w-24 h-24 mx-auto flex items-center justify-center mb-6 transform hover:scale-110 transition-transform duration-500">
            <img
              src="/images/bdgovlogo.png"
              alt="Government Logo"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 mb-4 drop-shadow-sm">
            {strings.landing.title}
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto">
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

                <div className="flex flex-row items-center justify-center gap-4 mb-8 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                  <div className="w-12 h-12 shrink-0 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-sm border border-blue-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 line-clamp-2 text-left">
                    {foundOffice.name}
                  </h3>
                </div>

                <p className="text-slate-500 font-semibold mb-6 text-lg">
                  {strings.landing.foundOffice}
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-md shadow-emerald-500/30 hover:shadow-emerald-500/40 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    {strings.yes}
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-md shadow-red-500/30 hover:shadow-red-500/40 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <X className="h-5 w-5" />
                    {strings.no}
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
                    {/* Office Name */}
                    <div className="md:col-span-2">
                      <label htmlFor="reg_name" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        {strings.registration.officeName} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="reg_name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder={strings.registration.officeNamePlaceholder}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                        required
                      />
                    </div>
                    {/* Budget ID */}
                    <div>
                      <label htmlFor="reg_budget_id" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        {strings.registration.budgetId} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="reg_budget_id"
                        value={regBudgetId}
                        onChange={(e) => setRegBudgetId(e.target.value)}
                        placeholder={strings.registration.budgetIdPlaceholder}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                        required
                      />
                    </div>
                    {/* Department */}
                    <div>
                      <label htmlFor="department" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        {strings.registration.department} <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="department"
                        value={selectedDept}
                        onChange={(e) => handleDeptChange(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                        required
                      >
                        <option value="" disabled>{strings.registration.departmentPlaceholder}</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    {/* Parent Office */}
                    <div>
                      <label htmlFor="parent_office" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        {strings.registration.parentOffice}
                      </label>
                      <select
                        id="parent_office"
                        value={selectedParent}
                        onChange={(e) => setSelectedParent(e.target.value)}
                        disabled={!selectedDept}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50"
                      >
                        <option value="">{strings.registration.parentOfficePlaceholder}</option>
                        {parentOffices.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    {/* Office Type */}
                    <div>
                      <label htmlFor="office_type" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                        {strings.registration.officeType} <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="office_type"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        disabled={!selectedDept}
                        className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50"
                        required
                      >
                        <option value="" disabled>{strings.registration.officeTypePlaceholder}</option>
                        {officeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
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
                  <PreviewItem label={strings.registration.officeName} value={regName} />
                  <PreviewItem label={strings.registration.budgetId} value={regBudgetId} />
                  <PreviewItem label={strings.registration.department} value={getDeptName()} />
                  <PreviewItem label={strings.registration.parentOffice} value={getParentName()} />
                  <PreviewItem label={strings.registration.officeType} value={getTypeName()} />
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
