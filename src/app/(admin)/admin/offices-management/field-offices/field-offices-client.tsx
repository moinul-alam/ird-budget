'use client'

import { useState, useTransition, useMemo } from 'react'
import { toBanglaNumber, toEnglishNumber } from '@/lib/bangla'
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
import {
  Building2,
  Plus,
  Edit2,
  Copy,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  KeyRound,
  ShieldAlert,
} from 'lucide-react'
import {
  FieldOfficeItem,
  HeadOfficeItem,
  saveFieldOffice,
  deleteFieldOffice,
} from '@/app/actions/admin-offices-management'
import { MinistryItem, DepartmentItem, OfficeTypeHierarchyItem } from '@/app/actions/admin-offices-config'
import Link from 'next/link'

interface FieldOfficesClientProps {
  initialFieldOffices: FieldOfficeItem[]
  headOffices: HeadOfficeItem[]
  ministries: MinistryItem[]
  departments: DepartmentItem[]
  officeTypes: OfficeTypeHierarchyItem[]
}

export function FieldOfficesClient({
  initialFieldOffices,
  headOffices,
  ministries,
  departments,
  officeTypes,
}: FieldOfficesClientProps) {
  const [fieldOffices, setFieldOffices] = useState<FieldOfficeItem[]>(initialFieldOffices)
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Field Office Modal
  const [modal, setModal] = useState<{
    open: boolean
    id?: number
    name: string
    budget_id: string
    ministry_id: string
    department_id: number
    head_office_id: number
    office_type_id: number
  }>({
    open: false,
    name: '',
    budget_id: '',
    ministry_id: '',
    department_id: 0,
    head_office_id: 0,
    office_type_id: 0,
  })

  // Delete confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 3500)
  }

  // Filtered departments for selected ministry
  const modalDepartments = useMemo(() => {
    if (!modal.ministry_id) return departments
    return departments.filter((d) => d.ministry_id === modal.ministry_id)
  }, [departments, modal.ministry_id])

  // Filtered head offices for selected department
  const modalHeadOffices = useMemo(() => {
    if (!modal.department_id) return headOffices
    return headOffices.filter((h) => h.department_id === modal.department_id)
  }, [headOffices, modal.department_id])

  // Filtered office types for selected department
  const modalOfficeTypes = useMemo(() => {
    if (!modal.department_id) return officeTypes
    return officeTypes.filter((ot) => ot.department_id === modal.department_id)
  }, [officeTypes, modal.department_id])

  // Selected office type
  const selectedTypeObj = useMemo(() => {
    return officeTypes.find((ot) => ot.id === modal.office_type_id)
  }, [officeTypes, modal.office_type_id])

  // Computed level
  const computedOfficeLevel = useMemo(() => {
    if (selectedTypeObj) return selectedTypeObj.hierarchy_order || 1
    if (modalOfficeTypes.length > 0) return modalOfficeTypes[0].hierarchy_order || 1
    return 1
  }, [selectedTypeObj, modalOfficeTypes])

  // Open Add modal
  const handleOpenAdd = () => {
    const defaultMin = ministries[0]?.id || ''
    const defaultDepts = defaultMin ? departments.filter((d) => d.ministry_id === defaultMin) : departments
    const defaultDeptId = defaultDepts[0]?.id || departments[0]?.id || 0
    const defaultHeads = defaultDeptId ? headOffices.filter((h) => h.department_id === defaultDeptId) : headOffices
    const defaultHeadId = defaultHeads[0]?.id || headOffices[0]?.id || 0
    const defaultTypes = defaultDeptId ? officeTypes.filter((ot) => ot.department_id === defaultDeptId) : officeTypes
    const defaultTypeId = defaultTypes[0]?.id || officeTypes[0]?.id || 0

    setModal({
      open: true,
      name: '',
      budget_id: '',
      ministry_id: defaultMin,
      department_id: defaultDeptId,
      head_office_id: defaultHeadId,
      office_type_id: defaultTypeId,
    })
  }

  // Open Edit modal
  const handleOpenEdit = (item: FieldOfficeItem) => {
    setModal({
      open: true,
      id: item.id,
      name: item.name,
      budget_id: item.budget_id,
      ministry_id: item.ministry_id || ministries[0]?.id || '',
      department_id: item.department_id,
      head_office_id: item.head_office_id,
      office_type_id: item.office_type_id,
    })
  }

  // Open Duplicate modal: keeps ministry, department, head office, type, level, clears name and budget_id
  const handleOpenDuplicate = (item: FieldOfficeItem) => {
    setModal({
      open: true,
      id: undefined,
      name: '', // Empty: admin has to type
      budget_id: '', // Empty: admin has to type
      ministry_id: item.ministry_id || ministries[0]?.id || '',
      department_id: item.department_id,
      head_office_id: item.head_office_id,
      office_type_id: item.office_type_id,
    })
    showStatus(`"${item.name}" থেকে অনুলিপি করা হচ্ছে। নতুন অফিসের নাম ও বাজেট আইডি লিখুন।`, 'success')
  }

  // Handle Save
  const handleSave = () => {
    if (!modal.name.trim()) {
      showStatus('মাঠ পর্যায়ের অফিসের নাম আবশ্যক', 'error')
      return
    }
    if (!modal.budget_id.trim()) {
      showStatus('বাজেট আইডি আবশ্যক', 'error')
      return
    }
    if (!modal.head_office_id) {
      showStatus('হেড অফিস নির্বাচন আবশ্যক', 'error')
      return
    }
    if (!modal.office_type_id) {
      showStatus('অফিসের ধরণ নির্বাচন আবশ্যক', 'error')
      return
    }

    const englishBudgetId = toEnglishNumber(modal.budget_id.trim())

    startTransition(async () => {
      const res = await saveFieldOffice({
        id: modal.id,
        name: modal.name,
        budget_id: englishBudgetId,
        head_office_id: modal.head_office_id,
        office_type_id: modal.office_type_id,
        password: '12345', // Default 12345 for login
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        const msg = modal.id
          ? 'মাঠ পর্যায়ের অফিস সফলভাবে আপডেট হয়েছে'
          : `নতুন অফিস তৈরি হয়েছে! ইউজার আইডি: ${englishBudgetId}, পাসওয়ার্ড: 12345`
        showStatus(msg)
        setModal((prev) => ({ ...prev, open: false }))

        const dept = departments.find((d) => d.id === modal.department_id)
        const typeObj = officeTypes.find((ot) => ot.id === modal.office_type_id)
        const headObj = headOffices.find((h) => h.id === modal.head_office_id)
        const minObj = ministries.find((m) => m.id === modal.ministry_id)

        if (modal.id) {
          setFieldOffices((prev) =>
            prev.map((f) =>
              f.id === modal.id
                ? {
                    ...f,
                    name: modal.name.trim(),
                    budget_id: englishBudgetId,
                    department_id: modal.department_id,
                    department_name: dept?.name || '',
                    ministry_id: modal.ministry_id,
                    ministry_name: minObj?.name || '',
                    head_office_id: modal.head_office_id,
                    head_office_name: headObj?.name || '',
                    office_type_id: modal.office_type_id,
                    office_type_name: typeObj?.name || '',
                    office_level: computedOfficeLevel,
                  }
                : f
            )
          )
        } else {
          setFieldOffices((prev) => [
            {
              id: Date.now(),
              name: modal.name.trim(),
              budget_id: englishBudgetId,
              department_id: modal.department_id,
              department_name: dept?.name || '',
              ministry_id: modal.ministry_id,
              ministry_name: minObj?.name || '',
              head_office_id: modal.head_office_id,
              head_office_name: headObj?.name || '',
              office_type_id: modal.office_type_id,
              office_type_name: typeObj?.name || '',
              office_level: computedOfficeLevel,
              password_hint: '12345',
              created_at: new Date().toISOString(),
            },
            ...prev,
          ])
        }
      }
    })
  }

  // Handle Delete
  const confirmDelete = (item: FieldOfficeItem) => {
    setConfirmModal({
      open: true,
      title: 'মাঠ পর্যায়ের অফিস মুছে ফেলা',
      description: `আপনি কি নিশ্চিতভাবে "${item.name}" (বাজেট আইডি: ${item.budget_id}) অফিসটি মুছে ফেলতে চান? সংশ্লিষ্ট অফিস ইউজারও অপসারিত হবে।`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteFieldOffice(item.id)
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) {
            showStatus(res.error, 'error')
          } else {
            showStatus('অফিস এবং ইউজার সফলভাবে মুছে ফেলা হয়েছে')
            setFieldOffices((prev) => prev.filter((f) => f.id !== item.id))
          }
        })
      },
    })
  }

  const filteredOffices = fieldOffices.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.budget_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.head_office_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.office_type_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-title">
            মাঠ পর্যায়ের সকল অফিস (Field Offices)
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            হেড অফিসের অধীনে সার্কেল ও মাঠ পর্যায়ের অফিসসমূহ পরিচালনা ও স্বয়ংক্রিয় ইউজার আইডি তৈরি
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

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                মাঠ পর্যায়ের অফিসের তালিকা
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                অফিস তৈরির সাথে সাথেই বাজেট আইডি হিসেবে স্বয়ংক্রিয় ইউজার ও ডিফল্ট পাসওয়ার্ড (১২৩৪৫) যুক্ত হয়
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {fieldOffices.length > 0 && (
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="অফিস বা বাজেট আইডি খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 rounded-xl border-slate-200 bg-slate-50/50"
                />
              </div>
            )}

            {headOffices.length > 0 && officeTypes.length > 0 && (
              <Button
                onClick={handleOpenAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs shrink-0"
              >
                <Plus className="h-4 w-4" />
                নতুন মাঠ পর্যায়ের অফিস যোগ করুন
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {headOffices.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                পূর্বে কোনো হেড অফিস তৈরি করা হয়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                মাঠ পর্যায়ের অফিস যুক্ত করার পূর্বে সংশ্লিষ্ট হেড অফিস যোগ করুন।
              </p>
              <div className="mt-4">
                <Link href="/admin/offices-management/head-offices">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    হেড অফিসসমূহে যান
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : fieldOffices.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো মাঠ পর্যায়ের অফিস পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                নতুন অফিস যুক্ত করতে &quot;নতুন মাঠ পর্যায়ের অফিস যোগ করুন&quot; বাটনে চাপুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={handleOpenAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন মাঠ পর্যায়ের অফিস যোগ করুন
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-16">ক্র.নং</th>
                    <th className="py-3 px-4">বাজেট আইডি (Login)</th>
                    <th className="py-3 px-4">মাঠ পর্যায়ের অফিসের নাম</th>
                    <th className="py-3 px-4">হেড অফিস</th>
                    <th className="py-3 px-4">অফিসের ধরণ</th>
                    <th className="py-3 px-4 text-center">লগইন পাসওয়ার্ড</th>
                    <th className="py-3 px-4 text-center w-36">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOffices.map((f, idx) => (
                    <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 text-sm">
                        {f.budget_id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {f.name}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {f.head_office_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg font-bold">
                          {f.office_type_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md font-mono font-bold text-xs border border-amber-200">
                          {f.password_hint}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(f)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDuplicate(f)}
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                            title="অনুলিপি (Duplicate)"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDelete(f)}
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
          )}
        </CardContent>
      </Card>

      {/* MODAL: ADD / EDIT / DUPLICATE */}
      <Dialog open={modal.open} onOpenChange={(open) => !open && setModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {modal.id ? 'মাঠ পর্যায়ের অফিস সম্পাদনা' : 'নতুন মাঠ পর্যায়ের অফিস যোগ করুন'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ১. মন্ত্রণালয়/বিভাগ (Dropdown) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">মন্ত্রণালয় / বিভাগ</Label>
              <Select
                value={modal.ministry_id}
                onValueChange={(val) => {
                  if (val) {
                    const depts = departments.filter((d) => d.ministry_id === val)
                    const firstDeptId = depts[0]?.id || departments[0]?.id || 0
                    const heads = headOffices.filter((h) => h.department_id === firstDeptId)
                    const types = officeTypes.filter((ot) => ot.department_id === firstDeptId)
                    setModal((prev) => ({
                      ...prev,
                      ministry_id: val,
                      department_id: firstDeptId,
                      head_office_id: heads[0]?.id || 0,
                      office_type_id: types[0]?.id || 0,
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="মন্ত্রণালয়/বিভাগ নির্বাচন করুন">
                    {ministries.find((m) => m.id === modal.ministry_id)?.name || 'মন্ত্রণালয়/বিভাগ নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {ministries.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ২. দপ্তর/সংস্থা (Dropdown) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">দপ্তর / সংস্থা</Label>
              <Select
                value={String(modal.department_id || '')}
                onValueChange={(val) => {
                  if (val) {
                    const deptId = parseInt(val, 10)
                    const heads = headOffices.filter((h) => h.department_id === deptId)
                    const types = officeTypes.filter((ot) => ot.department_id === deptId)
                    setModal((prev) => ({
                      ...prev,
                      department_id: deptId,
                      head_office_id: heads[0]?.id || 0,
                      office_type_id: types[0]?.id || 0,
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="দপ্তর/সংস্থা নির্বাচন করুন">
                    {departments.find((d) => d.id === modal.department_id)?.name || 'দপ্তর/সংস্থা নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {modalDepartments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ৩. হেড অফিস (Dropdown of offices created in হেড অফিসসমূহ) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">হেড অফিসের নাম</Label>
              <Select
                value={String(modal.head_office_id || '')}
                onValueChange={(val) => {
                  if (val) setModal((prev) => ({ ...prev, head_office_id: parseInt(val, 10) }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="হেড অফিস নির্বাচন করুন">
                    {headOffices.find((h) => h.id === modal.head_office_id)?.name || 'হেড অফিস নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {modalHeadOffices.map((h) => (
                    <SelectItem key={h.id} value={String(h.id)}>
                      {h.name} ({h.department_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ৪. অফিসের ধরণ (Dropdown) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ</Label>
              <Select
                value={String(modal.office_type_id || '')}
                onValueChange={(val) => {
                  if (val) setModal((prev) => ({ ...prev, office_type_id: parseInt(val, 10) }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="অফিসের ধরণ নির্বাচন করুন">
                    {officeTypes.find((ot) => ot.id === modal.office_type_id)?.name || 'অফিসের ধরণ নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {modalOfficeTypes.map((ot) => (
                    <SelectItem key={ot.id} value={String(ot.id)}>
                      {ot.name} (লেভেল {toBanglaNumber(ot.hierarchy_order)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ৫. মাঠ পর্যায়ের অফিসের নাম [typed] */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">মাঠ পর্যায়ের অফিসের নাম</Label>
              <Input
                type="text"
                value={modal.name}
                onChange={(e) => setModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="যেমন: সার্কেল-১ (কোতোয়ালী), সার্কেল-২ (মতিঝিল)..."
                className="rounded-xl border-slate-200 text-xs h-10"
              />
            </div>

            {/* ৬. অফিসের বাজেট আইডি [typed] */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের বাজেট আইডি (ইউজার লগইন আইডি)</Label>
              <Input
                type="text"
                value={modal.budget_id}
                onChange={(e) => setModal((prev) => ({ ...prev, budget_id: e.target.value }))}
                placeholder="যেমন: ১০১, ১০২, ১০৩০১..."
                className="rounded-xl border-slate-200 text-xs h-10 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                এই আইডিটি সংশ্লিষ্ট মাঠ পর্যায়ের অফিসের লগইন আইডি হিসেবে কাজ করবে এবং প্রাথমিক পাসওয়ার্ড হবে <span className="font-bold text-slate-800">12345</span>
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION MODAL */}
      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) => !open && setConfirmModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
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
              className="rounded-xl text-white font-bold text-xs bg-rose-600 hover:bg-rose-700"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              মুছে ফেলা নিশ্চিত করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
