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
import {
  Building,
  Plus,
  Edit2,
  Copy,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
} from 'lucide-react'
import {
  HeadOfficeItem,
  saveHeadOffice,
  deleteHeadOffice,
} from '@/app/actions/admin-offices-management'
import { MinistryItem, DepartmentItem, OfficeTypeHierarchyItem, OfficeLevelItem } from '@/app/actions/admin-offices-config'
import Link from 'next/link'

interface HeadOfficesClientProps {
  initialHeadOffices: HeadOfficeItem[]
  ministries: MinistryItem[]
  departments: DepartmentItem[]
  officeTypes: OfficeTypeHierarchyItem[]
  officeLevels: OfficeLevelItem[]
}

export function HeadOfficesClient({
  initialHeadOffices,
  ministries,
  departments,
  officeTypes,
  officeLevels,
}: HeadOfficesClientProps) {
  const [headOffices, setHeadOffices] = useState<HeadOfficeItem[]>(initialHeadOffices)
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Head Office Modal
  const [modal, setModal] = useState<{
    open: boolean
    id?: string
    name: string
    budget_id?: string
    ministry_id: string
    department_id: string
    office_type_id: string
    office_level_id: string
  }>({
    open: false,
    name: '',
    budget_id: '',
    ministry_id: '',
    department_id: '',
    office_type_id: '',
    office_level_id: '',
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
    setTimeout(() => setStatusMessage(null), 3000)
  }

  // Derived filtered departments for selected ministry in modal
  const modalDepartments = useMemo(() => {
    if (!modal.ministry_id) return departments
    return departments.filter((d) => d.ministry_id === modal.ministry_id)
  }, [departments, modal.ministry_id])

  // Derived filtered office types for selected department in modal
  const modalOfficeTypes = useMemo(() => {
    if (!modal.department_id) return officeTypes
    return officeTypes.filter((ot) => ot.department_id === modal.department_id)
  }, [officeTypes, modal.department_id])

  // Selected office type object
  const selectedTypeObj = useMemo(() => {
    return officeTypes.find((ot) => ot.id === modal.office_type_id)
  }, [officeTypes, modal.office_type_id])

  // Automatically computed office level from hierarchy (top level default: order 1 or top)
  const computedOfficeLevel = useMemo(() => {
    if (selectedTypeObj) {
      return selectedTypeObj.hierarchy_order || 1
    }
    // If no type selected yet, find top level from available types
    if (modalOfficeTypes.length > 0) {
      return modalOfficeTypes[0].hierarchy_order || 1
    }
    return 1
  }, [selectedTypeObj, modalOfficeTypes])

  // Open Add modal with smart defaults
  const handleOpenAdd = () => {
    const defaultMin = ministries[0]?.id || ''
    const defaultDepts = defaultMin ? departments.filter((d) => d.ministry_id === defaultMin) : departments
    const defaultDeptId = defaultDepts[0]?.id?.toString() || departments[0]?.id?.toString() || ''
    const defaultTypes = defaultDeptId ? officeTypes.filter((ot) => ot.department_id === defaultDeptId) : officeTypes
    const defaultTypeId = defaultTypes[0]?.id?.toString() || officeTypes[0]?.id?.toString() || ''

    setModal({
      open: true,
      name: '',
      budget_id: '',
      ministry_id: defaultMin,
      department_id: defaultDeptId,
      office_type_id: defaultTypeId,
      office_level_id: '',
    })
  }

  // Open Edit modal
  const handleOpenEdit = (item: HeadOfficeItem) => {
    setModal({
      open: true,
      id: item.id,
      name: item.name,
      budget_id: item.budget_id || '',
      ministry_id: item.ministry_id || ministries[0]?.id || '',
      department_id: item.department_id,
      office_type_id: item.office_type_id,
      office_level_id: item.office_level_id || '',
    })
  }

  // Open Duplicate modal: copies ministry, department, office type, level, keeping name EMPTY
  const handleOpenDuplicate = (item: HeadOfficeItem) => {
    setModal({
      open: true,
      id: undefined, // Create new record
      name: '', // User has to type the name
      budget_id: '',
      ministry_id: item.ministry_id || ministries[0]?.id || '',
      department_id: item.department_id,
      office_type_id: item.office_type_id,
      office_level_id: item.office_level_id || '',
    })
    showStatus(`"${item.name}" থেকে অনুলিপি করা হচ্ছে। অনুগ্রহ করে নতুন হেড অফিসের নাম ও বাজেট আইডি লিখুন।`, 'success')
  }

  // Handle Save
  const handleSave = () => {
    if (!modal.name.trim()) {
      showStatus('হেড অফিসের নাম আবশ্যক', 'error')
      return
    }
    if (!modal.department_id) {
      showStatus('দপ্তর/সংস্থা নির্বাচন আবশ্যক', 'error')
      return
    }
    if (!modal.office_type_id) {
      showStatus('অফিসের ধরণ নির্বাচন আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveHeadOffice({
        id: modal.id,
        name: modal.name,
        budget_id: modal.budget_id?.trim() || undefined,
        department_id: modal.department_id,
        office_type_id: modal.office_type_id,
        office_level_id: modal.office_level_id || undefined,
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus(modal.id ? 'হেড অফিস সফলভাবে আপডেট হয়েছে' : 'নতুন হেড অফিস সফলভাবে সংরক্ষিত হয়েছে')
        const trimmedBudget = modal.budget_id?.trim() || undefined
        setModal((prev) => ({ ...prev, open: false, budget_id: '' }))

        const dept = departments.find((d) => d.id === modal.department_id)
        const typeObj = officeTypes.find((ot) => ot.id === modal.office_type_id)
        const minObj = ministries.find((m) => m.id === modal.ministry_id)

        if (modal.id) {
          setHeadOffices((prev) =>
            prev.map((h) =>
              h.id === modal.id
                ? {
                    ...h,
                    name: modal.name.trim(),
                    budget_id: trimmedBudget,
                    department_id: modal.department_id,
                    department_name: dept?.name || '',
                    ministry_id: modal.ministry_id,
                    ministry_name: minObj?.name || '',
                    office_type_id: modal.office_type_id,
                    office_type_name: typeObj?.name || '',
                  }
                : h
            )
          )
        } else {
          setHeadOffices((prev) => [
            {
              id: String(Date.now()),
              name: modal.name.trim(),
              budget_id: trimmedBudget,
              department_id: modal.department_id,
              department_name: dept?.name || '',
              ministry_id: modal.ministry_id,
              ministry_name: minObj?.name || '',
              office_type_id: modal.office_type_id,
              office_type_name: typeObj?.name || '',
              created_at: new Date().toISOString(),
            },
            ...prev,
          ])
        }
      }
    })
  }

  // Handle Delete
  const confirmDelete = (item: HeadOfficeItem) => {
    setConfirmModal({
      open: true,
      title: 'হেড অফিস মুছে ফেলা',
      description: `আপনি কি নিশ্চিতভাবে "${item.name}" হেড অফিসটি মুছে ফেলতে চান?`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteHeadOffice(item.id)
          setConfirmModal((prev) => ({ ...prev, open: false }))
          if (res.error) {
            showStatus(res.error, 'error')
          } else {
            showStatus('হেড অফিস সফলভাবে মুছে ফেলা হয়েছে')
            setHeadOffices((prev) => prev.filter((h) => h.id !== item.id))
          }
        })
      },
    })
  }

  const filteredHeadOffices = headOffices.filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.department_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.office_type_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-title">
            হেড অফিসসমূহ (Head Offices)
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            অধীনস্থ দপ্তর/সংস্থা এবং অফিসের ধরণের অধীনে মূল আঞ্চলিক বা প্রধান কার্যালয় তৈরি ও ব্যবস্থাপনা
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
            <Building className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                সকল হেড অফিসের তালিকা
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                মাঠ পর্যায়ের সকল অফিসসমূহ এই হেড অফিসসমূহের অধীনে যুক্ত হবে
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {headOffices.length > 0 && (
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="হেড অফিস খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 rounded-xl border-slate-200 bg-slate-50/50"
                />
              </div>
            )}

            {departments.length > 0 && officeTypes.length > 0 && (
              <Button
                onClick={handleOpenAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs shrink-0"
              >
                <Plus className="h-4 w-4" />
                নতুন হেড অফিস যোগ করুন
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {departments.length === 0 || officeTypes.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Building className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                অফিস কনফিগারেশন সম্পন্ন করা হয়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                হেড অফিস তৈরি করার পূর্বে অফিস কনফিগারেশন থেকে দপ্তর/সংস্থা এবং অফিসের ধরণ নির্ধারণ করুন।
              </p>
              <div className="mt-4">
                <Link href="/admin/offices-config">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    অফিস কনফিগারেশনে যান
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : headOffices.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Building className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো হেড অফিস পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                নতুন হেড অফিস যুক্ত করতে &quot;নতুন হেড অফিস যোগ করুন&quot; বাটনে চাপুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={handleOpenAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন হেড অফিস যোগ করুন
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-16">ক্র. নং</th>
                    <th className="py-3 px-4">হেড অফিসের নাম</th>
                    <th className="py-3 px-4">বাজেট আইডি</th>
                    <th className="py-3 px-4">দপ্তর / সংস্থা</th>
                    <th className="py-3 px-4 text-center w-36">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHeadOffices.map((h, idx) => (
                    <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {h.name}
                      </td>
                      <td className="py-3.5 px-4">
                        {h.budget_id ? (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-lg text-xs">
                            {h.budget_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">নির্ধারিত নেই</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {h.department_name || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(h)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDuplicate(h)}
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                            title="অনুলিপি (Duplicate)"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDelete(h)}
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
              {modal.id ? 'হেড অফিস সম্পাদনা' : 'নতুন হেড অফিস যোগ করুন'}
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
                    const firstDeptId = depts[0]?.id?.toString() || departments[0]?.id?.toString() || ''
                    const types = officeTypes.filter((ot) => ot.department_id === firstDeptId)
                    setModal((prev) => ({
                      ...prev,
                      ministry_id: val,
                      department_id: firstDeptId,
                      office_type_id: types[0]?.id?.toString() || '',
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
                    const types = officeTypes.filter((ot) => ot.department_id === val)
                    setModal((prev) => ({
                      ...prev,
                      department_id: val,
                      office_type_id: types[0]?.id?.toString() || '',
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

            {/* ৩. অফিসের ধরণ (Dropdown) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ</Label>
              <Select
                value={String(modal.office_type_id || '')}
                onValueChange={(val) => {
                  if (val) {
                    setModal((prev) => ({ ...prev, office_type_id: val }))
                  }
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
                      {ot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ৪. মাঠ পর্যায়ের অফিসের স্তর */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">মাঠ পর্যায়ের অফিসের স্তর</Label>
              <Select
                value={String(modal.office_level_id || '')}
                onValueChange={(val) => {
                  if (val) setModal((prev) => ({ ...prev, office_level_id: val }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="স্তর নির্বাচন করুন">
                    {officeLevels.find((ol) => String(ol.id) === String(modal.office_level_id))?.level_name || 'স্তর নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {officeLevels
                    .filter((ol) => ol.office_type_id === modal.office_type_id)
                    .map((ol) => (
                      <SelectItem key={ol.id} value={String(ol.id)}>
                        {ol.level_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* ৫. হেড অফিসের নাম (Typed field) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">হেড অফিসের নাম</Label>
              <Input
                type="text"
                value={modal.name}
                onChange={(e) => setModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="যেমন: কর অঞ্চল-১ ঢাকা, কাস্টমস হাউস চট্টগ্রাম..."
                className="rounded-xl border-slate-200 text-xs h-10"
              />
            </div>

            {/* ৬. বাজেট আইডি (Typed field) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">বাজেট আইডি (Login ID)</Label>
                <span className="text-[11px] text-blue-600 font-medium">লগইন করার জন্য ব্যবহৃত হবে</span>
              </div>
              <Input
                type="text"
                value={modal.budget_id || ''}
                onChange={(e) => setModal((prev) => ({ ...prev, budget_id: e.target.value }))}
                placeholder="যেমন: 11201, 11202..."
                className="rounded-xl border-slate-200 text-xs h-10 font-mono font-semibold"
              />
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
