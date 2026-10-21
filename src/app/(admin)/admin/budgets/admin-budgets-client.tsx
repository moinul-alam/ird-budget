'use client'

import { useState, useTransition } from 'react'
import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Archive,
  Loader2,
  SlidersHorizontal,
  FolderLock,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react'
import {
  BudgetTypeItem,
  FiscalYearItem,
  CycleItem,
  saveBudgetType,
  deleteBudgetType,
  saveFiscalYear,
  deleteFiscalYear,
  saveCycle,
  toggleCycleStatus,
  deleteOrArchiveCycle
} from '@/app/actions/admin-budgets'

interface AdminBudgetsClientProps {
  initialBudgetTypes: BudgetTypeItem[]
  initialFiscalYears: FiscalYearItem[]
  initialCycles: CycleItem[]
}

export function AdminBudgetsClient({
  initialBudgetTypes,
  initialFiscalYears,
  initialCycles,
}: AdminBudgetsClientProps) {
  const [activeTab, setActiveTab] = useState<'budget_types' | 'fiscal_years' | 'cycles'>('cycles')
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Local state
  const [budgetTypes, setBudgetTypes] = useState<BudgetTypeItem[]>(initialBudgetTypes)
  const [fiscalYears, setFiscalYears] = useState<FiscalYearItem[]>(initialFiscalYears)
  const [cycles, setCycles] = useState<CycleItem[]>(initialCycles)

  // Tab 1: Budget Type Modal
  const [typeModal, setTypeModal] = useState<{ open: boolean; id?: string; name: string }>({
    open: false,
    name: '',
  })

  // Tab 2: Fiscal Year Modal
  const [fyModal, setFyModal] = useState<{ open: boolean; id?: string; year: string }>({
    open: false,
    year: '',
  })

  // Tab 3: Cycle Modal
  const [cycleModal, setCycleModal] = useState<{
    open: boolean
    id?: number
    fiscal_year: string
    budget_type_name: string
    status: 'open' | 'closed'
  }>({
    open: false,
    fiscal_year: fiscalYears[0]?.year || '২০২৬-২৭',
    budget_type_name: budgetTypes[0]?.name || 'প্রাক্কলিত',
    status: 'open',
  })

  // Delete / Archive Confirmation Dialog
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    description: string
    isArchive: boolean
    onConfirm: () => void
  }>({
    open: false,
    title: '',
    description: '',
    isArchive: false,
    onConfirm: () => {},
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
        showStatus('বাজেটের ধরণ সফলভাবে সংরক্ষিত হয়েছে')
        setTypeModal({ open: false, name: '' })
        // Local update
        const trimmed = typeModal.name.trim()
        const isRevised = trimmed.includes('সংশোধিত')
        if (typeModal.id) {
          setBudgetTypes((prev) =>
            prev.map((b) => (b.id === typeModal.id ? { ...b, name: trimmed, code: isRevised ? 'revised' : 'new' } : b))
          )
        } else {
          setBudgetTypes((prev) => [
            ...prev,
            { id: `bt-${Date.now()}`, name: trimmed, code: isRevised ? 'revised' : 'new' },
          ])
        }
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
        showStatus('অর্থবছর সফলভাবে সংরক্ষিত হয়েছে')
        setFyModal({ open: false, year: '' })
        const trimmed = fyModal.year.trim()
        if (fyModal.id) {
          setFiscalYears((prev) =>
            prev.map((f) => (f.id === fyModal.id ? { ...f, year: trimmed } : f))
          )
        } else {
          setFiscalYears((prev) => [...prev, { id: `fy-${Date.now()}`, year: trimmed }])
        }
      }
    })
  }

  // Handle Tab 3 Save Cycle
  const handleSaveCycle = () => {
    if (!cycleModal.fiscal_year || !cycleModal.budget_type_name) {
      showStatus('সকল তথ্য পূরণ করুন', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveCycle({
        id: cycleModal.id,
        fiscal_year: cycleModal.fiscal_year,
        budget_type_name: cycleModal.budget_type_name,
        status: cycleModal.status,
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('বাজেট সাইকেল সফলভাবে সংরক্ষিত হয়েছে')
        setCycleModal({
          open: false,
          fiscal_year: fiscalYears[0]?.year || '২০২৬-২৭',
          budget_type_name: budgetTypes[0]?.name || 'প্রাক্কলিত',
          status: 'open',
        })
        // Update local cycles list
        const isRevised = cycleModal.budget_type_name.includes('সংশোধিত')
        const updatedItem: CycleItem = {
          id: cycleModal.id || Date.now(),
          fiscal_year: cycleModal.fiscal_year,
          budget_type: isRevised ? 'revised' : 'new',
          budget_type_name: cycleModal.budget_type_name,
          status: cycleModal.status,
          has_data: false,
          submission_count: 0,
        }

        if (cycleModal.status === 'open') {
          // close other cycles locally
          setCycles((prev) =>
            prev.map((c) => ({ ...c, status: c.id === cycleModal.id ? 'open' : 'closed' }))
          )
        }

        if (cycleModal.id) {
          setCycles((prev) =>
            prev.map((c) => (c.id === cycleModal.id ? { ...c, ...updatedItem } : c))
          )
        } else {
          setCycles((prev) => [updatedItem, ...prev])
        }
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
      // Archive flow
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
      // Direct delete flow
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            বাজেট কনফিগারেশন
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            বাজেটের ধরণ, অর্থবছর এবং সার্বিক বাজেট সাইকেল নির্ধারণ ও নিয়ন্ত্রণ
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

      {/* 3 Tabs Container */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('cycles')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'cycles'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>ট্যাব ৩: বাজেট নির্ধারণ (সাইকেল)</span>
          </button>

          <button
            onClick={() => setActiveTab('budget_types')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'budget_types'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>ট্যাব ১: বাজেটের ধরণ</span>
          </button>

          <button
            onClick={() => setActiveTab('fiscal_years')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'fiscal_years'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>ট্যাব ২: অর্থবছর</span>
          </button>
        </nav>
      </div>

      {/* ============================================================ */}
      {/* TAB 3: বাজেট নির্ধারণ (সাইকেল ও ওপেন/ক্লোজ নিয়ন্ত্রণ) */}
      {/* ============================================================ */}
      {activeTab === 'cycles' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                বাজেট সাইকেলসমূহ
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                অর্থবছর ও বাজেটের ধরণ অনুযায়ী বাজেট দাখিল কার্যক্রম উন্মুক্ত বা বন্ধ করুন
              </CardDescription>
            </div>
            <Button
              onClick={() =>
                setCycleModal({
                  open: true,
                  fiscal_year: fiscalYears[0]?.year || '২০২৬-২৭',
                  budget_type_name: budgetTypes[0]?.name || 'প্রাক্কলিত',
                  status: 'open',
                })
              }
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              নতুন বাজেট সাইকেল নির্ধারণ
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">ক্র.নং</th>
                    <th className="py-3 px-4">অর্থবছর</th>
                    <th className="py-3 px-4">বাজেটের ধরণ</th>
                    <th className="py-3 px-4">দাখিলকৃত অফিসের সংখ্যা</th>
                    <th className="py-3 px-4">স্ট্যাটাস</th>
                    <th className="py-3 px-4 text-center">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cycles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        কোনো বাজেট সাইকেল পাওয়া যায়নি। নতুন সাইকেল যোগ করুন।
                      </td>
                    </tr>
                  ) : (
                    cycles.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                          {toBanglaNumber(idx + 1)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {c.fiscal_year}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200/60">
                            {c.budget_type_name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {c.has_data ? (
                            <span className="font-bold text-slate-800">
                              {toBanglaNumber(c.submission_count || 0)} টি অফিস
                            </span>
                          ) : (
                            <span className="text-slate-400">০ (কোনো ডাটা নেই)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c)}
                            className="cursor-pointer group flex items-center gap-1.5"
                            title="স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন"
                          >
                            <Badge
                              variant="outline"
                              className={`text-xs font-bold gap-1 rounded-full px-2.5 py-0.5 transition-all ${
                                c.status === 'open'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 group-hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 group-hover:bg-slate-200'
                              }`}
                            >
                              {c.status === 'open' ? (
                                <>
                                  <Unlock className="h-3 w-3 text-emerald-600" />
                                  <span>উন্মুক্ত (Open)</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3 text-slate-500" />
                                  <span>বন্ধ (Closed)</span>
                                </>
                              )}
                            </Badge>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setCycleModal({
                                  open: true,
                                  id: c.id,
                                  fiscal_year: c.fiscal_year,
                                  budget_type_name: c.budget_type_name,
                                  status: c.status,
                                })
                              }
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            {c.has_data ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCycle(c)}
                                className="h-8 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-bold gap-1"
                                title="ডাটা থাকায় মুছে ফেলার পরিবর্তে আর্কাইভ করা হবে"
                              >
                                <Archive className="h-3.5 w-3.5" />
                                <span>আর্কাইভ</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCycle(c)}
                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* TAB 1: বাজেটের ধরণ (Budget Types) */}
      {/* ============================================================ */}
      {activeTab === 'budget_types' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                বাজেটের ধরণ তালিকা
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                যেমন: প্রাক্কলিত বাজেট, সংশোধিত বাজেট
              </CardDescription>
            </div>
            <Button
              onClick={() => setTypeModal({ open: true, name: '' })}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              নতুন বাজেটের ধরণ
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-20">ক্র.নং</th>
                    <th className="py-3 px-4">বাজেটের ধরণ</th>
                    <th className="py-3 px-4">কোড ক্যাটাগরি</th>
                    <th className="py-3 px-4 text-center w-28">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgetTypes.map((b, idx) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                        {b.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-xs font-mono">
                          {b.code === 'revised' ? 'সংশোধিত (revised)' : 'প্রাক্কলিত (new)'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTypeModal({ open: true, id: b.id, name: b.name })}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              startTransition(async () => {
                                const res = await deleteBudgetType(b.id)
                                if (res.error) showStatus(res.error, 'error')
                                else {
                                  showStatus('বাজেটের ধরণ মুছে ফেলা হয়েছে')
                                  setBudgetTypes((prev) => prev.filter((item) => item.id !== b.id))
                                }
                              })
                            }}
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* TAB 2: অর্থবছর (Fiscal Years) */}
      {/* ============================================================ */}
      {activeTab === 'fiscal_years' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                অর্থবছর তালিকা
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                যেমন: ২০২৫-২৬, ২০২৬-২৭
              </CardDescription>
            </div>
            <Button
              onClick={() => setFyModal({ open: true, year: '' })}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              নতুন অর্থবছর
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-20">ক্র.নং</th>
                    <th className="py-3 px-4">অর্থবছর</th>
                    <th className="py-3 px-4 text-center w-28">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fiscalYears.map((f, idx) => (
                    <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                        {f.year}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFyModal({ open: true, id: f.id, year: f.year })}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              startTransition(async () => {
                                const res = await deleteFiscalYear(f.id)
                                if (res.error) showStatus(res.error, 'error')
                                else {
                                  showStatus('অর্থবছর মুছে ফেলা হয়েছে')
                                  setFiscalYears((prev) => prev.filter((item) => item.id !== f.id))
                                }
                              })
                            }}
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------ */}
      {/* MODAL 1: বাজেটের ধরণ যুক্ত/সম্পাদনা */}
      {/* ------------------------------------------------------------ */}
      <Dialog
        open={typeModal.open}
        onOpenChange={(open) => !open && setTypeModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {typeModal.id ? 'বাজেটের ধরণ সম্পাদনা' : 'নতুন বাজেটের ধরণ যুক্ত করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">বাজেটের ধরণ (যেমন: প্রাক্কলিত, সংশোধিত)</Label>
              <Input
                type="text"
                value={typeModal.name}
                onChange={(e) => setTypeModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="বাজেটের ধরণ লিখুন..."
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTypeModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={handleSaveBudgetType}
              disabled={isPending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------ */}
      {/* MODAL 2: অর্থবছর যুক্ত/সম্পাদনা */}
      {/* ------------------------------------------------------------ */}
      <Dialog
        open={fyModal.open}
        onOpenChange={(open) => !open && setFyModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {fyModal.id ? 'অর্থবছর সম্পাদনা' : 'নতুন অর্থবছর যুক্ত করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অর্থবছর (যেমন: ২০২৬-২৭)</Label>
              <Input
                type="text"
                value={fyModal.year}
                onChange={(e) => setFyModal((prev) => ({ ...prev, year: e.target.value }))}
                placeholder="অর্থবছর লিখুন..."
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFyModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={handleSaveFiscalYear}
              disabled={isPending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------ */}
      {/* MODAL 3: বাজেট সাইকেল নির্ধারণ */}
      {/* ------------------------------------------------------------ */}
      <Dialog
        open={cycleModal.open}
        onOpenChange={(open) => !open && setCycleModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {cycleModal.id ? 'বাজেট সাইকেল সম্পাদনা' : 'নতুন বাজেট নির্ধারণ'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">বাজেটের ধরণ</Label>
              <Select
                value={cycleModal.budget_type_name}
                onValueChange={(val) => {
                  if (val) {
                    setCycleModal((prev) => ({ ...prev, budget_type_name: val }))
                  }
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="বাজেটের ধরণ নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {budgetTypes.map((b) => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অর্থবছর</Label>
              <Select
                value={cycleModal.fiscal_year}
                onValueChange={(val) => {
                  if (val) {
                    setCycleModal((prev) => ({ ...prev, fiscal_year: val }))
                  }
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="অর্থবছর নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {fiscalYears.map((f) => (
                    <SelectItem key={f.id} value={f.year}>
                      {f.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">স্ট্যাটাস</Label>
              <Select
                value={cycleModal.status}
                onValueChange={(val) => {
                  if (val === 'open' || val === 'closed') {
                    setCycleModal((prev) => ({ ...prev, status: val }))
                  }
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="open">উন্মুক্ত (Open) - ইউজাররা বাজেট এন্ট্রি করতে পারবে</SelectItem>
                  <SelectItem value="closed">বন্ধ (Closed) - বাজেট এন্ট্রি বন্ধ থাকবে</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCycleModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={handleSaveCycle}
              disabled={isPending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------ */}
      {/* CONFIRMATION DIALOG (Delete / Archive) */}
      {/* ------------------------------------------------------------ */}
      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) => !open && setConfirmModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${confirmModal.isArchive ? 'text-amber-600' : 'text-rose-600'}`} />
              <span>{confirmModal.title}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmModal.description}
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={confirmModal.onConfirm}
              disabled={isPending}
              className={`rounded-xl text-white font-bold text-xs ${
                confirmModal.isArchive
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {confirmModal.isArchive ? 'আর্কাইভ নিশ্চিত করুন' : 'মুছে ফেলা নিশ্চিত করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
