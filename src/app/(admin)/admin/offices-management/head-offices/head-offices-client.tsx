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
import { MinistryItem, DepartmentItem, OfficeTypeHierarchyItem } from '@/app/actions/admin-offices-config'
import Link from 'next/link'

interface HeadOfficesClientProps {
  initialHeadOffices: HeadOfficeItem[]
  ministries: MinistryItem[]
  departments: DepartmentItem[]
  officeTypes: OfficeTypeHierarchyItem[]
}

export function HeadOfficesClient({
  initialHeadOffices,
  ministries,
  departments,
  officeTypes,
}: HeadOfficesClientProps) {
  const [headOffices, setHeadOffices] = useState<HeadOfficeItem[]>(initialHeadOffices)
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOfficeTypeId, setFilterOfficeTypeId] = useState('all')

  // Head Office Modal — a head office is the top level of one অফিসের ধরণ, and the type already
  // pins down its দপ্তর/সংস্থা and মন্ত্রণালয়/বিভাগ, so the type is the only thing to pick.
  const [modal, setModal] = useState<{
    open: boolean
    id?: string
    name: string
    budget_id?: string
    office_type_id: string
  }>({
    open: false,
    name: '',
    budget_id: '',
    office_type_id: '',
  })

  // Delete confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    /** Set when deletion is refused (e.g. the office holds budget data): the dialog then only
     *  explains why instead of offering a confirm button. */
    blocked?: boolean
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => { },
  })

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  // The মন্ত্রণালয়/বিভাগ → দপ্তর/সংস্থা picked implicitly by the chosen office type.
  const selectedOfficeType = officeTypes.find((ot) => ot.id === modal.office_type_id)
  const selectedDepartment = departments.find(
    (d) => String(d.id) === String(selectedOfficeType?.department_id),
  )
  const selectedMinistry = ministries.find((m) => m.id === selectedDepartment?.ministry_id)

  // Open Add modal with smart defaults
  const handleOpenAdd = () => {
    setModal({
      open: true,
      name: '',
      budget_id: '',
      office_type_id: officeTypes[0]?.id?.toString() || '',
    })
  }

  // Open Edit modal
  const handleOpenEdit = (item: HeadOfficeItem) => {
    setModal({
      open: true,
      id: item.id,
      name: item.name,
      budget_id: item.budget_id || '',
      office_type_id: item.office_type_id,
    })
  }

  // Open Duplicate modal: copies the office type, keeping name EMPTY
  const handleOpenDuplicate = (item: HeadOfficeItem) => {
    setModal({
      open: true,
      id: undefined, // Create new record
      name: '', // User has to type the name
      budget_id: '',
      office_type_id: item.office_type_id,
    })
    showStatus(`"${item.name}" থেকে অনুলিপি করা হচ্ছে। অনুগ্রহ করে নতুন হেড অফিসের নাম ও বাজেট আইডি লিখুন।`, 'success')
  }

  // Handle Save
  const handleSave = () => {
    if (!modal.name.trim()) {
      showStatus('হেড অফিসের নাম আবশ্যক', 'error')
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
        office_type_id: modal.office_type_id,
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus(modal.id ? 'হেড অফিস সফলভাবে আপডেট হয়েছে' : 'নতুন হেড অফিস সফলভাবে সংরক্ষিত হয়েছে')
        const trimmedBudget = modal.budget_id?.trim() || undefined
        setModal((prev) => ({ ...prev, open: false, budget_id: '' }))

        const typeObj = officeTypes.find((ot) => ot.id === modal.office_type_id)
        const dept = departments.find((d) => String(d.id) === String(typeObj?.department_id))
        const minObj = ministries.find((m) => m.id === dept?.ministry_id)

        if (modal.id) {
          setHeadOffices((prev) =>
            prev.map((h) =>
              h.id === modal.id
                ? {
                  ...h,
                  name: modal.name.trim(),
                  budget_id: trimmedBudget,
                  department_id: String(typeObj?.department_id || ''),
                  department_name: dept?.name || '',
                  ministry_id: dept?.ministry_id || '',
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
              department_id: String(typeObj?.department_id || ''),
              department_name: dept?.name || '',
              ministry_id: dept?.ministry_id || '',
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
          if (res.error) {
            // The server refused (budget data attached, or field offices still under it): show
            // the reason in the dialog rather than a transient banner.
            setConfirmModal({
              open: true,
              title: 'হেড অফিস মোছা সম্ভব নয়',
              description: res.error,
              onConfirm: () => setConfirmModal((prev) => ({ ...prev, open: false })),
              blocked: true,
            })
          } else {
            setConfirmModal((prev) => ({ ...prev, open: false }))
            showStatus('হেড অফিস সফলভাবে মুছে ফেলা হয়েছে')
            setHeadOffices((prev) => prev.filter((h) => h.id !== item.id))
          }
        })
      },
    })
  }

  // Office types that actually have head offices, used by the toolbar filter.
  const headOfficeTypeOptions = Array.from(
    new Map(
      headOffices
        .filter((h) => h.office_type_id)
        .map((h) => [h.office_type_id, h.office_type_name] as const),
    ).entries(),
  ).map(([id, name]) => ({ id, name }))

  const filteredHeadOffices = headOffices.filter((h) => {
    if (filterOfficeTypeId !== 'all' && h.office_type_id !== filterOfficeTypeId) return false
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    // The admin may type either a head office name or a budget ID.
    return h.name.toLowerCase().includes(q) || (h.budget_id || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-title">
            হেড অফিসসমূহ (Head Offices)
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
                  placeholder="নাম বা বাজেট আইডি খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 rounded-xl border-slate-200 bg-slate-50/50"
                />
              </div>
            )}

            {headOfficeTypeOptions.length > 1 && (
              <Select
                value={filterOfficeTypeId}
                onValueChange={(val) => {
                  if (val) setFilterOfficeTypeId(val)
                }}
              >
                <SelectTrigger className="w-40 sm:w-44 text-xs h-9 rounded-xl border-slate-200 bg-slate-50/50 shrink-0">
                  <SelectValue placeholder="সব অফিসের ধরণ">
                    {filterOfficeTypeId === 'all'
                      ? 'সব অফিসের ধরণ'
                      : headOfficeTypeOptions.find((ot) => ot.id === filterOfficeTypeId)?.name ||
                        'সব অফিসের ধরণ'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-60">
                  <SelectItem value="all">সব অফিসের ধরণ</SelectItem>
                  {headOfficeTypeOptions.map((ot) => (
                    <SelectItem key={ot.id} value={ot.id}>
                      {ot.name || '—'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                অফিস অরগানোগ্রাম সম্পন্ন করা হয়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                হেড অফিস তৈরি করার পূর্বে অরগানোগ্রাম থেকে দপ্তর/সংস্থা এবং অফিসের ধরণ নির্ধারণ করুন।
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
                    <th className="py-3 px-4 w-16">ক্রম</th>
                    <th className="py-3 px-4">হেড অফিসের নাম</th>
                    <th className="py-3 px-4">বাজেট আইডি</th>
                    <th className="py-3 px-4 w-44">অফিসের ধরণ</th>
                    <th className="py-3 px-4">দপ্তর / সংস্থা</th>
                    <th className="py-3 px-3 text-center w-32">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHeadOffices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 px-4 text-center text-xs text-slate-500">
                        অনুসন্ধান বা ফিল্টার অনুযায়ী কোনো হেড অফিস পাওয়া যায়নি।
                      </td>
                    </tr>
                  )}
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
                      <td className="py-3.5 px-4">
                        <span className="inline-block whitespace-nowrap px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg font-bold">
                          {h.office_type_name || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {h.department_name || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center">
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
            {/* ১. অফিসের ধরণ (Dropdown) — determines মন্ত্রণালয়/বিভাগ and দপ্তর/সংস্থা */}
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
                    {selectedOfficeType?.name || 'অফিসের ধরণ নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-60">
                  {officeTypes.map((ot) => (
                    <SelectItem key={ot.id} value={String(ot.id)}>
                      {ot.department_name ? `${ot.name} — ${ot.department_name}` : ot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                {selectedMinistry?.name || '—'} → {selectedDepartment?.name || '—'}
              </p>
            </div>

            {/* ২. হেড অফিসের নাম (Typed field) */}
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

            {/* ৩. বাজেট আইডি (Typed field) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">বাজেট আইডি</Label>
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
              {confirmModal.blocked ? 'ঠিক আছে' : 'বাতিল'}
            </Button>
            {!confirmModal.blocked && (
              <Button
                type="button"
                onClick={confirmModal.onConfirm}
                disabled={isPending}
                className="rounded-xl text-white font-bold text-xs bg-rose-600 hover:bg-rose-700"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                মুছে ফেলা নিশ্চিত করুন
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
