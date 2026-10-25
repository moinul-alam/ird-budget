'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { toBanglaNumber } from '@/lib/bangla'
import {
  BudgetCategoryItem,
  ExpenseCodeFullItem,
  saveBudgetCategory,
  deleteBudgetCategory,
  saveEconomicCode,
  deleteEconomicCode,
  toggleCodeForOfficeType,
  toggleBulkCodesForOfficeType,
  getExpenseCodesWithCategoryAndMapping,
} from '@/app/actions/admin-codes'
import { CheckCircle2, AlertTriangle, FolderTree, SlidersHorizontal } from 'lucide-react'
import {
  AdminCodesClientProps,
  CategoryModalState,
  CodeModalState,
  CodeScopeType,
} from './_types/codes'
import { CategoryModal, CodeModal } from './_components/code-modals'
import { TabCreateCodes } from './_components/tab-create-codes'
import { TabEnableCodes } from './_components/tab-enable-codes'

export function AdminCodesClient({
  officeTypes,
  departments,
  ministries,
  officeLevels,
  initialCodes,
  initialCategories,
  formulaTypes,
  initialOfficeTypeId,
  initialDepartmentId,
  initialOfficeLevelId,
}: AdminCodesClientProps) {
  // Tabs: 'create_codes' | 'enable_codes'
  const [activeTab, setActiveTab] = useState<'create_codes' | 'enable_codes'>('create_codes')

  // Codes are granted to an office level, and a level is owned by an office type, a ministry,
  // or a department. This selects which kind of owner the grants are being scoped to.
  const [scopeOwnerType, setScopeOwnerType] = useState<CodeScopeType>('office_type')

  const [selectedOfficeTypeId, setSelectedOfficeTypeId] = useState<string>(initialOfficeTypeId)
  const initialType = officeTypes.find((ot) => ot.id === initialOfficeTypeId) || officeTypes[0]
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>(
    initialDepartmentId?.toString() || initialType?.department_id?.toString() || departments[0]?.id?.toString()
  )
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>(ministries[0]?.id || '')

  // The levels owned by whichever organisation is in scope — the grants apply to these.
  const scopedLevels = useMemo(
    () =>
      scopeOwnerType === 'ministry'
        ? officeLevels.filter((lvl) => lvl.ministry_id === selectedMinistryId)
        : scopeOwnerType === 'department'
          ? officeLevels.filter((lvl) => lvl.department_id === selectedDepartmentId)
          : officeLevels.filter((lvl) => lvl.office_type_id === String(selectedOfficeTypeId)),
    [officeLevels, scopeOwnerType, selectedMinistryId, selectedDepartmentId, selectedOfficeTypeId]
  )
  const [selectedLevelId, setSelectedLevelId] = useState<string>(
    initialOfficeLevelId || scopedLevels[0]?.id || ''
  )

  // Changing scope or its owner moves the selection to that owner's first level, so the code
  // list never stays pointed at a level belonging to an organisation no longer in scope.
  const handleScopeChange = (next: CodeScopeType) => {
    setScopeOwnerType(next)
    const pool =
      next === 'ministry'
        ? officeLevels.filter((lvl) => lvl.ministry_id === selectedMinistryId)
        : next === 'department'
          ? officeLevels.filter((lvl) => lvl.department_id === selectedDepartmentId)
          : officeLevels.filter((lvl) => lvl.office_type_id === selectedOfficeTypeId)
    setSelectedLevelId(pool[0]?.id || '')
  }

  const handleOfficeTypeChange = (id: string) => {
    setSelectedOfficeTypeId(id)
    setSelectedLevelId(officeLevels.filter((lvl) => lvl.office_type_id === id)[0]?.id || '')
  }

  const handleDepartmentChange = (id: string) => {
    setSelectedDepartmentId(id)
    // In office-type scope the department also narrows the office type list, so follow it to the
    // department's first type; in department scope the department itself owns the level.
    if (scopeOwnerType === 'department') {
      setSelectedLevelId(officeLevels.filter((lvl) => lvl.department_id === id)[0]?.id || '')
    } else {
      const firstType = officeTypes.find((ot) => ot.department_id === id)
      if (firstType) {
        setSelectedOfficeTypeId(firstType.id)
        setSelectedLevelId(officeLevels.filter((lvl) => lvl.office_type_id === firstType.id)[0]?.id || '')
      }
    }
  }

  const handleMinistryChange = (id: string) => {
    setSelectedMinistryId(id)
    setSelectedLevelId(officeLevels.filter((lvl) => lvl.ministry_id === id)[0]?.id || '')
  }

  const [categories, setCategories] = useState<BudgetCategoryItem[]>(initialCategories)
  const [codes, setCodes] = useState<ExpenseCodeFullItem[]>(initialCodes)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all')

  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Whenever selected office type or level changes in Tab 2, fetch corresponding enabled codes
  useEffect(() => {
    let isCancelled = false
    getExpenseCodesWithCategoryAndMapping(selectedOfficeTypeId, selectedLevelId || undefined).then((res) => {
      if (!isCancelled && res.codes) {
        setCodes(res.codes)
      }
    })
    return () => {
      isCancelled = true
    }
  }, [selectedOfficeTypeId, selectedLevelId])

  // Tab 1 Left: Category Modal
  const [catModal, setCatModal] = useState<CategoryModalState>({
    open: false,
    code: '',
    title: '',
    hierarchy_order: categories.length + 1,
  })

  // Tab 1 Right: Economic Code Modal
  const [codeModal, setCodeModal] = useState<CodeModalState>({
    open: false,
    code: '',
    name: '',
    parent_code: categories[0]?.code || '',
    parent_title: categories[0]?.title || '',
    hierarchy_order: codes.length + 1,
    formula_key: null,
    source_forms: [],
  })

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  const selectedOfficeType =
    officeTypes.find((ot) => ot.id === selectedOfficeTypeId) || officeTypes[0]
  const selectedOfficeLevel =
    scopedLevels.find((lvl) => lvl.id === selectedLevelId) || scopedLevels[0]

  const enabledCount = useMemo(() => codes.filter((c) => c.enabled).length, [codes])

  // Filtered codes for Tab 2
  const filteredCodes = useMemo(() => {
    return codes.filter((c) => {
      const q = searchQuery.toLowerCase()
      const match =
        !q ||
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.parent_code.toLowerCase().includes(q) ||
        c.parent_title.toLowerCase().includes(q)

      if (!match) return false
      if (selectedCatFilter !== 'all' && c.parent_code !== selectedCatFilter) return false
      return true
    })
  }, [codes, searchQuery, selectedCatFilter])

  // Save Category
  const handleSaveCategory = () => {
    if (!catModal.code.trim() || !catModal.title.trim()) {
      showStatus('ক্যাটাগরি কোড ও নাম আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveBudgetCategory({
        id: catModal.id,
        code: catModal.code,
        title: catModal.title,
        hierarchy_order: catModal.hierarchy_order,
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('বাজেট ক্যাটাগরি সফলভাবে সংরক্ষিত হয়েছে')
        setCatModal({ open: false, code: '', title: '', hierarchy_order: categories.length + 1 })

        if (!res.category) return
        const saved = res.category
        setCategories((prev) =>
          (catModal.id ? prev.map((c) => (c.id === catModal.id ? saved : c)) : [...prev, saved]).sort(
            (a, b) => a.hierarchy_order - b.hierarchy_order
          )
        )

        // Category titles are rendered on every code row, so re-read them from the server.
        const refreshed = await getExpenseCodesWithCategoryAndMapping(
          selectedOfficeTypeId,
          selectedLevelId || undefined
        )
        if (refreshed.codes) setCodes(refreshed.codes)
      }
    })
  }

  // Delete Category
  const handleDeleteCategory = (cat: BudgetCategoryItem) => {
    startTransition(async () => {
      const res = await deleteBudgetCategory(cat.id)
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('বাজেট ক্যাটাগরি মুছে ফেলা হয়েছে')
        setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      }
    })
  }

  // Save Economic Code
  const handleSaveEconomicCode = () => {
    if (!codeModal.code.trim() || !codeModal.name.trim()) {
      showStatus('কোড ও নাম আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveEconomicCode({
        id: codeModal.id,
        code: codeModal.code,
        name: codeModal.name,
        parent_code: codeModal.parent_code,
        hierarchy_order: codeModal.hierarchy_order,
        formula_key: codeModal.formula_key ?? null,
        source_forms: codeModal.source_forms || [],
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('বাজেট কোড সফলভাবে সংরক্ষিত হয়েছে')
        setCodeModal({
          open: false,
          code: '',
          name: '',
          parent_code: categories[0]?.code || '',
          parent_title: categories[0]?.title || '',
          hierarchy_order: codes.length + 1,
          formula_key: null,
          source_forms: [],
        })

        // Re-read from the server so ids, categories and ordering stay authoritative.
        const refreshed = await getExpenseCodesWithCategoryAndMapping(
          selectedOfficeTypeId,
          selectedLevelId || undefined
        )
        if (refreshed.codes) setCodes(refreshed.codes)
      }
    })
  }

  // Delete Economic Code
  const handleDeleteEconomicCode = (code: ExpenseCodeFullItem) => {
    startTransition(async () => {
      const res = await deleteEconomicCode(code.id)
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('বাজেট কোড মুছে ফেলা হয়েছে')
        setCodes((prev) => prev.filter((c) => c.id !== code.id))
      }
    })
  }

  // Toggle Code Status
  const handleToggleCode = (code: ExpenseCodeFullItem) => {
    const nextVal = !code.enabled
    setCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, enabled: nextVal } : c)))

    startTransition(async () => {
      const res = await toggleCodeForOfficeType(
        selectedOfficeTypeId,
        code.id,
        nextVal,
        selectedLevelId || undefined
      )
      if (res.error) {
        showStatus(res.error, 'error')
        // revert
        setCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, enabled: !nextVal } : c)))
      } else {
        showStatus(`কোড ${code.code} ${nextVal ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`)
      }
    })
  }

  // Toggle Bulk Codes (Enabled / Disabled)
  const handleToggleBulk = (codeIds: number[], enable: boolean) => {
    if (!codeIds || codeIds.length === 0) {
      showStatus('কোনো কোড নির্বাচন করা হয়নি', 'error')
      return
    }

    const idSet = new Set<number>(codeIds)
    setCodes((prev) => prev.map((c) => (idSet.has(c.id) ? { ...c, enabled: enable } : c)))

    startTransition(async () => {
      const res = await toggleBulkCodesForOfficeType(
        selectedOfficeTypeId,
        codeIds,
        enable,
        selectedLevelId || undefined
      )
      if (res.error) {
        showStatus(res.error, 'error')
        // Re-sync on error
        const refresh = await getExpenseCodesWithCategoryAndMapping(selectedOfficeTypeId, selectedLevelId || undefined)
        if (refresh.codes) setCodes(refresh.codes)
      } else {
        showStatus(`${toBanglaNumber(codeIds.length)} টি কোড সফলভাবে ${enable ? 'চালু' : 'বন্ধ'} করা হয়েছে`)
      }
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ইকোনমিক কোড তৈরি ও অফিসভিত্তিক কোড সেটিংস
          </h1>

        </div>

        {statusMessage && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('create_codes')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'create_codes'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <FolderTree className="h-4 w-4" />
            <span>ইকোনমিক কোড তৈরি </span>
          </button>

          <button
            onClick={() => setActiveTab('enable_codes')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'enable_codes'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>ইকোনমিক কোড উন্মুক্তকরণ</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: কোড তৈরি */}
      {activeTab === 'create_codes' && (
        <TabCreateCodes
          categories={categories}
          codes={codes}
          setCatModal={setCatModal}
          setCodeModal={setCodeModal}
          handleDeleteCategory={handleDeleteCategory}
          handleDeleteEconomicCode={handleDeleteEconomicCode}
        />
      )}

      {/* Tab 2: কোড উন্মুক্তকরণ */}
      {activeTab === 'enable_codes' && (
        <TabEnableCodes
          scopeOwnerType={scopeOwnerType}
          setScopeOwnerType={handleScopeChange}
          ministries={ministries}
          selectedMinistryId={selectedMinistryId}
          setSelectedMinistryId={handleMinistryChange}
          departments={departments}
          selectedDepartmentId={selectedDepartmentId}
          setSelectedDepartmentId={handleDepartmentChange}
          officeTypes={officeTypes}
          selectedOfficeTypeId={selectedOfficeTypeId}
          setSelectedOfficeTypeId={handleOfficeTypeChange}
          selectedOfficeType={selectedOfficeType}
          scopedLevels={scopedLevels}
          selectedLevelId={selectedLevelId}
          setSelectedLevelId={setSelectedLevelId}
          selectedOfficeLevel={selectedOfficeLevel}
          enabledCount={enabledCount}
          totalCodesCount={codes.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCatFilter={selectedCatFilter}
          setSelectedCatFilter={setSelectedCatFilter}
          categories={categories}
          filteredCodes={filteredCodes}
          handleToggleBulk={handleToggleBulk}
          handleToggleCode={handleToggleCode}
          isPending={isPending}
        />
      )}

      {/* Modals */}
      <CategoryModal
        modal={catModal}
        setModal={setCatModal}
        onSave={handleSaveCategory}
        isPending={isPending}
      />

      <CodeModal
        modal={codeModal}
        setModal={setCodeModal}
        categories={categories}
        formulaTypes={formulaTypes}
        onSave={handleSaveEconomicCode}
        isPending={isPending}
      />
    </div>
  )
}
