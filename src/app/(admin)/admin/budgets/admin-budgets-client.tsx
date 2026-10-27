'use client'

import { useState, useTransition } from 'react'
import { toBanglaNumber } from '@/lib/bangla'
import { SALARY_MONTHS_MAX, SALARY_MONTHS_MIN } from '@/lib/constants'
import {
  Layers,
  Calendar,
  CheckCircle2,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react'
import {
  BudgetTypeItem,
  FiscalYearItem,
  CycleItem,
  getBudgetTypes,
  getFiscalYears,
  getCyclesList,
  saveBudgetType,
  deleteBudgetType,
  saveFiscalYear,
  deleteFiscalYear,
  saveCycle,
  toggleCycleStatus,
  deleteOrArchiveCycle,
} from '@/app/actions/admin-budgets'
import {
  AdminBudgetsClientProps,
  BudgetTabType,
  BudgetTypeModalState,
  FiscalYearModalState,
  CycleModalState,
  ConfirmBudgetModalState,
} from './_types/budgets'
import { TabBudgetTypes } from './_components/tab-budget-types'
import { TabFiscalYears } from './_components/tab-fiscal-years'
import { TabCycles } from './_components/tab-cycles'
import { ConfirmBudgetDialog } from './_components/confirm-budget-dialog'

export function AdminBudgetsClient({
  initialBudgetTypes,
  initialFiscalYears,
  initialCycles,
}: AdminBudgetsClientProps) {
  const [activeTab, setActiveTab] = useState<BudgetTabType>(
    initialBudgetTypes.length > 0 && initialFiscalYears.length > 0 ? 'cycles' : 'budget_types'
  )
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Local state
  const [budgetTypes, setBudgetTypes] = useState<BudgetTypeItem[]>(initialBudgetTypes)
  const [fiscalYears, setFiscalYears] = useState<FiscalYearItem[]>(initialFiscalYears)
  const [cycles, setCycles] = useState<CycleItem[]>(initialCycles)

  // Tab 1: Budget Type Modal
  const [typeModal, setTypeModal] = useState<BudgetTypeModalState>({
    open: false,
    name: '',
  })

  // Tab 2: Fiscal Year Modal
  const [fyModal, setFyModal] = useState<FiscalYearModalState>({
    open: false,
    year: '',
  })

  // Tab 3: Cycle Modal
  const [cycleModal, setCycleModal] = useState<CycleModalState>({
    open: false,
    fiscal_year: fiscalYears[0]?.year || '',
    budget_type_name: budgetTypes[0]?.name || '',
    salary_months: 12,
    status: 'open',
  })

  // Delete / Archive Confirmation Dialog
  const [confirmModal, setConfirmModal] = useState<ConfirmBudgetModalState>({
    open: false,
    title: '',
    description: '',
    isArchive: false,
    onConfirm: () => { },
  })

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  // Handle Tab 1 Save
  const handleSaveBudgetType = () => {
    if (!typeModal.name.trim()) {
      showStatus('বাজেটের ধরণ আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveBudgetType({ id: typeModal.id, name: typeModal.name })
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('বাজেটের ধরণ সফলভাবে সংরক্ষিত হয়েছে')
        setTypeModal({ open: false, name: '' })
        // Re-read from the server so ids and ordering stay authoritative.
        setBudgetTypes(await getBudgetTypes())
      }
    })
  }

  // Handle Tab 2 Save
  const handleSaveFiscalYear = () => {
    if (!fyModal.year.trim()) {
      showStatus('অর্থবছর আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveFiscalYear({ id: fyModal.id, year: fyModal.year })
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('অর্থবছর সফলভাবে সংরক্ষিত হয়েছে')
        setFyModal({ open: false, year: '' })
        // Re-read from the server so ids and ordering stay authoritative.
        setFiscalYears(await getFiscalYears())
      }
    })
  }

  // Handle Tab 3 Save Cycle
  const handleSaveCycle = () => {
    if (!cycleModal.fiscal_year || !cycleModal.budget_type_name) {
      showStatus('সকল তথ্য পূরণ করুন', 'error')
      return
    }
    if (
      !Number.isInteger(cycleModal.salary_months) ||
      cycleModal.salary_months < SALARY_MONTHS_MIN ||
      cycleModal.salary_months > SALARY_MONTHS_MAX
    ) {
      showStatus('বেতন-মাস ১ থেকে ১২ এর মধ্যে একটি পূর্ণসংখ্যা হতে হবে', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveCycle({
        id: cycleModal.id,
        fiscal_year: cycleModal.fiscal_year,
        budget_type_name: cycleModal.budget_type_name,
        salary_months: cycleModal.salary_months,
        status: cycleModal.status,
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('বাজেট সাইকেল সফলভাবে সংরক্ষিত হয়েছে')
        setCycleModal({
          open: false,
          fiscal_year: fiscalYears[0]?.year || '',
          budget_type_name: budgetTypes[0]?.name || '',
          salary_months: 12,
          status: 'open',
        })
        // Re-read from the server: the new cycle's id, its reference labels and
        // any cycles auto-closed above all come back authoritative.
        setCycles(await getCyclesList())
      }
    })
  }

  // Toggle Cycle Status (Open / Close)
  const handleToggleStatus = (cycle: CycleItem) => {
    const nextStatus = cycle.status === 'open' ? 'closed' : 'open'
    startTransition(async () => {
      const res = await toggleCycleStatus(cycle.id, nextStatus)
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus(`বাজেট সাইকেল স্ট্যাটাস পরিবর্তিত হয়েছে (${nextStatus === 'open' ? 'উন্মুক্ত (Open)' : 'বন্ধ (Closed)'})`)
        setCycles((prev) =>
          prev.map((c) => {
            if (nextStatus === 'open') {
              return { ...c, status: c.id === cycle.id ? 'open' : 'closed' }
            }
            return c.id === cycle.id ? { ...c, status: nextStatus } : c
          })
        )
      }
    })
  }

  // Delete or Archive Cycle
  const handleDeleteCycle = (cycle: CycleItem) => {
    if (cycle.has_data) {
      setConfirmModal({
        open: true,
        title: 'বাজেট আর্কাইভ করুন',
        description: `এই বাজেটে (${toBanglaNumber(cycle.submission_count || 0)} টি) দাখিলকৃত তথ্য রয়েছে। এটি ডিলিট করা সম্ভব নয়। আপনি কি এই বাজেট বন্ধ ও আর্কাইভ করতে চান?`,
        isArchive: true,
        onConfirm: () => {
          startTransition(async () => {
            const res = await deleteOrArchiveCycle(cycle.id)
            setConfirmModal((prev) => ({ ...prev, open: false }))
            if (res.error) {
              showStatus(res.error, 'error')
            } else {
              showStatus('বাজেট সফলভাবে আর্কাইভ (বন্ধ) করা হয়েছে')
              setCycles((prev) =>
                prev.map((c) => (c.id === cycle.id ? { ...c, status: 'closed' } : c))
              )
            }
          })
        },
      })
    } else {
      setConfirmModal({
        open: true,
        title: 'বাজেট সাইকেল মুছুন',
        description: 'আপনি কি নিশ্চিতভাবে এই বাজেট সাইকেলটি মুছে ফেলতে চান? এতে কোনো দাখিলকৃত তথ্য নেই।',
        isArchive: false,
        onConfirm: () => {
          startTransition(async () => {
            const res = await deleteOrArchiveCycle(cycle.id)
            setConfirmModal((prev) => ({ ...prev, open: false }))
            if (res.error) {
              showStatus(res.error, 'error')
            } else {
              showStatus('বাজেট সাইকেল সফলভাবে মুছে ফেলা হয়েছে')
              setCycles((prev) => prev.filter((c) => c.id !== cycle.id))
            }
          })
        },
      })
    }
  }

  const canCreateCycle = budgetTypes.length > 0 && fiscalYears.length > 0

  // Delete Budget Type Confirmation
  const confirmDeleteBudgetType = (b: BudgetTypeItem) => {
    setConfirmModal({
      open: true,
      title: 'বাজেটের ধরণ মুছুন',
      description: `আপনি কি নিশ্চিতভাবে "${b.name}" বাজেটের ধরণটি মুছে ফেলতে চান?`,
      isArchive: false,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteBudgetType(b.id)
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) {
            showStatus(res.error, 'error')
          } else {
            showStatus('বাজেটের ধরণ সফলভাবে মুছে ফেলা হয়েছে')
            setBudgetTypes((prev) => prev.filter((item) => item.id !== b.id))
          }
        })
      },
    })
  }

  // Delete Fiscal Year Confirmation
  const confirmDeleteFiscalYear = (f: FiscalYearItem) => {
    setConfirmModal({
      open: true,
      title: 'অর্থবছর মুছুন',
      description: `আপনি কি নিশ্চিতভাবে "${f.year}" অর্থবছরটি মুছে ফেলতে চান?`,
      isArchive: false,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteFiscalYear(f.id)
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) {
            showStatus(res.error, 'error')
          } else {
            showStatus('অর্থবছর সফলভাবে মুছে ফেলা হয়েছে')
            setFiscalYears((prev) => prev.filter((item) => item.id !== f.id))
          }
        })
      },
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-title">
            বাজেট দাখিল উন্মুক্তকরণ
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

      {/* 3 Tabs Container */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('budget_types')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'budget_types'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <Layers className="h-4 w-4" />
            <span>বাজেটের ধরণ</span>
            <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(budgetTypes.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fiscal_years')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'fiscal_years'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <Calendar className="h-4 w-4" />
            <span>অর্থবছর</span>
            <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
              {toBanglaNumber(fiscalYears.length)}
            </span>
          </button>

          <button
            onClick={() => {
              if (!canCreateCycle) {
                showStatus('ট্যাব ৩ ব্যবহারের পূর্বে ট্যাব ১ (বাজেটের ধরণ) এবং ট্যাব ২ (অর্থবছর) পূরণ আবশ্যক', 'error')
                return
              }
              setActiveTab('cycles')
            }}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'cycles'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : !canCreateCycle
                ? 'border-transparent text-slate-400 opacity-60 cursor-not-allowed'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>বাজেট চক্র নির্ধারণ</span>
            {!canCreateCycle && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                লকড
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab 1: Budget Types */}
      {activeTab === 'budget_types' && (
        <TabBudgetTypes
          budgetTypes={budgetTypes}
          typeModal={typeModal}
          setTypeModal={setTypeModal}
          onSaveBudgetType={handleSaveBudgetType}
          onConfirmDeleteBudgetType={confirmDeleteBudgetType}
          isPending={isPending}
        />
      )}

      {/* Tab 2: Fiscal Years */}
      {activeTab === 'fiscal_years' && (
        <TabFiscalYears
          fiscalYears={fiscalYears}
          fyModal={fyModal}
          setFyModal={setFyModal}
          onSaveFiscalYear={handleSaveFiscalYear}
          onConfirmDeleteFiscalYear={confirmDeleteFiscalYear}
          isPending={isPending}
        />
      )}

      {/* Tab 3: Cycles */}
      {activeTab === 'cycles' && (
        <TabCycles
          cycles={cycles}
          budgetTypes={budgetTypes}
          fiscalYears={fiscalYears}
          canCreateCycle={canCreateCycle}
          cycleModal={cycleModal}
          setCycleModal={setCycleModal}
          onSaveCycle={handleSaveCycle}
          onToggleStatus={handleToggleStatus}
          onDeleteCycle={handleDeleteCycle}
          setActiveTab={setActiveTab}
          showStatus={showStatus}
          isPending={isPending}
        />
      )}

      {/* Confirm Delete / Archive Dialog */}
      <ConfirmBudgetDialog
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        isPending={isPending}
      />
    </div>
  )
}
