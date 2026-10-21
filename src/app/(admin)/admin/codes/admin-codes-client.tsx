'use client'

import { useState, useTransition, useMemo } from 'react'
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
  FileCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Layers,
  SlidersHorizontal,
  FolderTree
} from 'lucide-react'
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

interface OfficeTypeItem {
  id: number
  name: string
  department_name: string
  department_id: number
}

interface AdminCodesClientProps {
  officeTypes: OfficeTypeItem[]
  initialCodes: ExpenseCodeFullItem[]
  initialCategories: BudgetCategoryItem[]
  initialOfficeTypeId: number
}

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
  const [catModal, setCatModal] = useState<{
    open: boolean
    id?: string
    code: string
    title: string
    hierarchy_order: number
  }>({
    open: false,
    code: '',
    title: '',
    hierarchy_order: categories.length + 1,
  })

  // Tab 1 Right: Economic Code Modal
  const [codeModal, setCodeModal] = useState<{
    open: boolean
    id?: number
    code: string
    name: string
    parent_code: string
    parent_title: string
    hierarchy_order: number
  }>({
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

      {/* ============================================================ */}
      {/* TAB 1: কোড তৈরি (Two Vertical Sections: Category Left, Codes Right) */}
      {/* ============================================================ */}
      {activeTab === 'create_codes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Section: বাজেট ক্যাটাগরি (4 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-slate-200 shadow-sm h-full flex flex-col">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    বাজেট ক্যাটাগরি
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    শীর্ষ ৪ ডিজিট কোড (যেমন: ৩১১১)
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    setCatModal({
                      open: true,
                      code: '',
                      title: '',
                      hierarchy_order: categories.length + 1,
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন ক্যাটাগরি
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-14">ক্রম</th>
                      <th className="py-2.5 px-3 w-20">কোড</th>
                      <th className="py-2.5 px-3">ক্যাটাগরি নাম</th>
                      <th className="py-2.5 px-3 text-center w-20">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-500">
                          {toBanglaNumber(c.hierarchy_order)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          {c.code}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {c.title}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setCatModal({
                                  open: true,
                                  id: c.id,
                                  code: c.code,
                                  title: c.title,
                                  hierarchy_order: c.hierarchy_order,
                                })
                              }
                              className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(c)}
                              className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Right Section: অর্থনৈতিক কোডসমূহ (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-slate-200 shadow-sm h-full flex flex-col">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    অর্থনৈতিক কোডসমূহ (Economic Codes)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    ক্যাটাগরির অধীন ৭ ডিজিট বিস্তারিত কোড ({toBanglaNumber(codes.length)} টি)
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    setCodeModal({
                      open: true,
                      code: '',
                      name: '',
                      parent_code: categories[0]?.code || '3111',
                      parent_title: categories[0]?.title || 'নগদ মজুরি ও বেতন',
                      hierarchy_order: codes.length + 1,
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন কোড যোগ
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-14">ক্রম</th>
                      <th className="py-2.5 px-3 w-24">বাজেট কোড</th>
                      <th className="py-2.5 px-3">কোডের বিবরণ</th>
                      <th className="py-2.5 px-3 w-28">ক্যাটাগরি</th>
                      <th className="py-2.5 px-3 text-center w-20">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {codes.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-500">
                          {toBanglaNumber(c.hierarchy_order)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700 text-sm">
                          {c.code}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {c.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="font-mono text-xs font-bold text-slate-500">{c.parent_code}</span>
                          <span className="block text-[11px] truncate text-slate-400">{c.parent_title}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setCodeModal({
                                  open: true,
                                  id: c.id,
                                  code: c.code,
                                  name: c.name,
                                  parent_code: c.parent_code || categories[0]?.code || '3111',
                                  parent_title: c.parent_title || categories[0]?.title || '',
                                  hierarchy_order: c.hierarchy_order,
                                })
                              }
                              className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEconomicCode(c)}
                              className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: কোড উন্মুক্তকরণ (Enable / Disable per Office Type) */}
      {/* ============================================================ */}
      {activeTab === 'enable_codes' && (
        <div className="space-y-6">
          {/* Office Type Selector Bar */}
          <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      অফিসের ধরণ নির্বাচন করুন
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Select
                        value={String(selectedOfficeTypeId)}
                        onValueChange={(val) => {
                          if (val) {
                            const newId = parseInt(val, 10)
                            setSelectedOfficeTypeId(newId)
                            window.location.href = `/admin/codes?office_type_id=${newId}`
                          }
                        }}
                      >
                        <SelectTrigger className="w-[280px] sm:w-[380px] rounded-xl border-slate-300 font-bold text-xs bg-white">
                          <span className="truncate text-slate-900 font-bold">
                            {selectedOfficeType?.department_name ? `${selectedOfficeType.department_name} → ` : ''}
                            {selectedOfficeType?.name}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl text-xs">
                          {officeTypes.map((ot) => (
                            <SelectItem key={ot.id} value={String(ot.id)}>
                              {ot.department_name ? `${ot.department_name} → ` : ''}
                              {ot.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">সক্রিয় কোডের সংখ্যা</span>
                    <span className="text-lg font-black text-blue-700 font-mono">
                      {toBanglaNumber(enabledCount)}{' '}
                      <span className="text-xs text-slate-400 font-normal">/ {toBanglaNumber(codes.length)} টি</span>
                    </span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs font-bold border-0">
                    {selectedOfficeType?.name}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code Table with required columns:
              ক্র. নং. | ক্যাটাগরি কোড | বাজেট ক্যাটাগরি | বাজেট কোড | কোডের বিবরণ | স্ট্যাটাস (enable disable toggle)
          */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কোড নম্বর, ক্যাটাগরি অথবা নাম দিয়ে সার্চ করুন..."
                    className="pl-9 rounded-xl border-slate-200 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={selectedCatFilter}
                    onValueChange={(val) => {
                      if (val) setSelectedCatFilter(val)
                    }}
                  >
                    <SelectTrigger className="w-[180px] rounded-xl border-slate-200 text-xs font-semibold bg-white">
                      <SelectValue placeholder="ক্যাটাগরি ফিল্টার" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-xs">
                      <SelectItem value="all">সকল ক্যাটাগরি</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.code}>
                          {cat.code} - {cat.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAll(true)}
                    disabled={isPending}
                    className="rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                  >
                    সকল চালু
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAll(false)}
                    disabled={isPending}
                    className="rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border-rose-200"
                  >
                    সকল বন্ধ
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-16">ক্র. নং.</th>
                      <th className="py-3 px-4 w-28 font-mono">ক্যাটাগরি কোড</th>
                      <th className="py-3 px-4 w-44">বাজেট ক্যাটাগরি</th>
                      <th className="py-3 px-4 w-32 font-mono">বাজেট কোড</th>
                      <th className="py-3 px-4">কোডের বিবরণ</th>
                      <th className="py-3 px-4 text-center w-36">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCodes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          কোনো বাজেট কোড পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredCodes.map((c, idx) => (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            c.enabled ? 'bg-white' : 'bg-slate-50/40 opacity-75'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-semibold text-slate-500">
                            {toBanglaNumber(idx + 1)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">
                            {c.parent_code || '—'}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {c.parent_title || 'সাধারণ'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-sm text-indigo-700">
                            {c.code}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {c.name}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleCode(c)}
                                disabled={isPending}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                  c.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    c.enabled ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                              <span
                                className={`text-[11px] font-bold ${
                                  c.enabled ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                {c.enabled ? 'চালু' : 'বন্ধ'}
                              </span>
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
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* MODAL 1: বাজেট ক্যাটাগরি তৈরি / সম্পাদনা */}
      {/* ------------------------------------------------------------ */}
      <Dialog open={catModal.open} onOpenChange={(open) => !open && setCatModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {catModal.id ? 'বাজেট ক্যাটাগরি সম্পাদনা' : 'নতুন বাজেট ক্যাটাগরি তৈরি'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">বাজেট ক্যাটাগরি নাম (যেমন: নগদ মজুরি ও বেতন)</Label>
              <Input
                type="text"
                value={catModal.title}
                onChange={(e) => setCatModal((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="ক্যাটাগরির শিরোনাম লিখুন..."
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">ক্যাটাগরি কোড (শুধুমাত্র সংখ্যা, যেমন: ৩১১১)</Label>
              <Input
                type="text"
                value={catModal.code}
                onChange={(e) => setCatModal((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, '') }))}
                placeholder="যেমন: 3111"
                className="rounded-xl border-slate-200 font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Hierarchy (ক্রম)</Label>
              <Input
                type="number"
                min={1}
                value={catModal.hierarchy_order}
                onChange={(e) => setCatModal((prev) => ({ ...prev, hierarchy_order: parseInt(e.target.value, 10) || 1 }))}
                className="rounded-xl border-slate-200 font-mono"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCatModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={handleSaveCategory}
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
      {/* MODAL 2: অর্থনৈতিক কোড তৈরি / সম্পাদনা */}
      {/* ------------------------------------------------------------ */}
      <Dialog
        open={codeModal.open}
        onOpenChange={(open) => !open && setCodeModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {codeModal.id ? 'অর্থনৈতিক কোড সম্পাদনা' : 'নতুন অর্থনৈতিক কোড যুক্ত করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Code Category (ক্যাটাগরি নির্বাচন করুন)</Label>
              <Select
                value={codeModal.parent_code}
                onValueChange={(val) => {
                  if (val) {
                    const cat = categories.find((c) => c.code === val)
                    setCodeModal((prev) => ({
                      ...prev,
                      parent_code: val,
                      parent_title: cat?.title || '',
                    }))
                  }
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.code}>
                      {c.code} - {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Economic Code (বাজেট কোড)</Label>
              <Input
                type="text"
                value={codeModal.code}
                onChange={(e) => setCodeModal((prev) => ({ ...prev, code: e.target.value.trim() }))}
                placeholder="যেমন: 3111101"
                className="rounded-xl border-slate-200 font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Code Description (কোডের বিবরণ)</Label>
              <Input
                type="text"
                value={codeModal.name}
                onChange={(e) => setCodeModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="যেমন: মূল বেতন (অফিসার)"
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">ক্রম (Hierarchy Order)</Label>
              <Input
                type="number"
                min={1}
                value={codeModal.hierarchy_order}
                onChange={(e) =>
                  setCodeModal((prev) => ({ ...prev, hierarchy_order: parseInt(e.target.value, 10) || 1 }))
                }
                className="rounded-xl border-slate-200 font-mono"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCodeModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={handleSaveEconomicCode}
              disabled={isPending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
