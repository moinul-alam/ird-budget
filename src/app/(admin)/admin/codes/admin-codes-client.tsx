'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  BudgetCategoryItem,
  ExpenseCodeFullItem,
  saveBudgetCategory,
  deleteBudgetCategory,
  saveEconomicCode,
  deleteEconomicCode,
  toggleCodeForOfficeType,
  toggleAllCodesForOfficeType
} from '@/app/actions/admin-codes'
import { CheckCircle2, AlertTriangle, FolderTree, SlidersHorizontal } from 'lucide-react'
import {
  AdminCodesClientProps,
  CategoryModalState,
  CodeModalState,
} from './_types/codes'
import { CategoryModal, CodeModal } from './_components/code-modals'
import { TabCreateCodes } from './_components/tab-create-codes'
import { TabEnableCodes } from './_components/tab-enable-codes'

export function AdminCodesClient({
  officeTypes,
  initialCodes,
  initialCategories,
  initialOfficeTypeId,
}: AdminCodesClientProps) {
  // Tabs: 'create_codes' | 'enable_codes'
  const [activeTab, setActiveTab] = useState<'create_codes' | 'enable_codes'>('create_codes')

  const [selectedOfficeTypeId, setSelectedOfficeTypeId] = useState<number>(initialOfficeTypeId)
  const [categories, setCategories] = useState<BudgetCategoryItem[]>(initialCategories)
  const [codes, setCodes] = useState<ExpenseCodeFullItem[]>(initialCodes)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all')

  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
    parent_code: categories[0]?.code || '3111',
    parent_title: categories[0]?.title || 'নগদ মজুরি ও বেতন',
    hierarchy_order: codes.length + 1,
  })

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  const selectedOfficeType =
    officeTypes.find((ot) => ot.id === selectedOfficeTypeId) || officeTypes[0]

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

        const trimmedCode = catModal.code.trim()
        const trimmedTitle = catModal.title.trim()
        if (catModal.id) {
          setCategories((prev) =>
            prev.map((c) =>
              c.id === catModal.id
                ? { ...c, code: trimmedCode, title: trimmedTitle, hierarchy_order: catModal.hierarchy_order }
                : c
            ).sort((a, b) => a.hierarchy_order - b.hierarchy_order)
          )
        } else {
          setCategories((prev) => [
            ...prev,
            {
              id: `cat-${trimmedCode}`,
              code: trimmedCode,
              title: trimmedTitle,
              hierarchy_order: catModal.hierarchy_order,
            },
          ].sort((a, b) => a.hierarchy_order - b.hierarchy_order))
        }
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
      const cat = categories.find((c) => c.code === codeModal.parent_code)
      const res = await saveEconomicCode({
        id: codeModal.id,
        code: codeModal.code,
        name: codeModal.name,
        parent_code: codeModal.parent_code,
        parent_title: cat?.title || codeModal.parent_title,
        hierarchy_order: codeModal.hierarchy_order,
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('বাজেট কোড সফলভাবে সংরক্ষিত হয়েছে')
        setCodeModal({
          open: false,
          code: '',
          name: '',
          parent_code: categories[0]?.code || '3111',
          parent_title: categories[0]?.title || 'নগদ মজুরি ও বেতন',
          hierarchy_order: codes.length + 1,
        })

        const trimmedCode = codeModal.code.trim()
        const trimmedName = codeModal.name.trim()
        if (codeModal.id) {
          setCodes((prev) =>
            prev.map((c) =>
              c.id === codeModal.id
                ? {
                    ...c,
                    code: trimmedCode,
                    name: trimmedName,
                    parent_code: codeModal.parent_code,
                    parent_title: cat?.title || codeModal.parent_title,
                    hierarchy_order: codeModal.hierarchy_order,
                  }
                : c
            ).sort((a, b) => a.hierarchy_order - b.hierarchy_order)
          )
        } else {
          setCodes((prev) => [
            ...prev,
            {
              id: Date.now(),
              code: trimmedCode,
              name: trimmedName,
              parent_code: codeModal.parent_code,
              parent_title: cat?.title || codeModal.parent_title,
              hierarchy_order: codeModal.hierarchy_order,
              enabled: false,
            },
          ].sort((a, b) => a.hierarchy_order - b.hierarchy_order))
        }
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
      const res = await toggleCodeForOfficeType(selectedOfficeTypeId, code.id, nextVal)
      if (res.error) {
        showStatus(res.error, 'error')
        // revert
        setCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, enabled: !nextVal } : c)))
      } else {
        showStatus(`কোড ${code.code} ${nextVal ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`)
      }
    })
  }

  // Toggle All Codes
  const handleToggleAll = (enableAll: boolean) => {
    setCodes((prev) => prev.map((c) => ({ ...c, enabled: enableAll })))

    startTransition(async () => {
      const res = await toggleAllCodesForOfficeType(selectedOfficeTypeId, enableAll)
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus(`সকল কোড সফলভাবে ${enableAll ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`)
      }
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            কোড কনফিগারেশন (Code Configuration)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            নতুন বাজেট কোড তৈরি, ক্যাটাগরি বিন্যাস এবং অফিসের ধরণ অনুযায়ী প্রদর্শন নিয়ন্ত্রণ
          </p>
        </div>

        {statusMessage && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
              statusMessage.type === 'success'
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
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'create_codes'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <FolderTree className="h-4 w-4" />
            <span>ট্যাব ১: কোড তৈরি ও ক্যাটাগরি (Code Creation)</span>
          </button>

          <button
            onClick={() => setActiveTab('enable_codes')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'enable_codes'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>ট্যাব ২: কোড উন্মুক্তকরণ (Enable / Disable)</span>
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
          officeTypes={officeTypes}
          selectedOfficeTypeId={selectedOfficeTypeId}
          setSelectedOfficeTypeId={setSelectedOfficeTypeId}
          selectedOfficeType={selectedOfficeType}
          enabledCount={enabledCount}
          totalCodesCount={codes.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCatFilter={selectedCatFilter}
          setSelectedCatFilter={setSelectedCatFilter}
          categories={categories}
          filteredCodes={filteredCodes}
          handleToggleAll={handleToggleAll}
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
        onSave={handleSaveEconomicCode}
        isPending={isPending}
      />
    </div>
  )
}
