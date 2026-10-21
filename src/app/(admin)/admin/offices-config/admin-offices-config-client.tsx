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
  Building2,
  GitBranch,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FolderTree
} from 'lucide-react'
import {
  DepartmentItem,
  OfficeTypeHierarchyItem,
  saveDepartment,
  deleteDepartment,
  saveOfficeTypeHierarchy,
  updateGroupBudgetStatus,
  deleteOfficeType,
} from '@/app/actions/admin-offices-config'

interface AdminOfficesConfigClientProps {
  initialDepartments: DepartmentItem[]
  initialOfficeTypes: OfficeTypeHierarchyItem[]
}

export function AdminOfficesConfigClient({
  initialDepartments,
  initialOfficeTypes,
}: AdminOfficesConfigClientProps) {
  const [activeTab, setActiveTab] = useState<'departments' | 'hierarchy' | 'groups'>('departments')
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [departments, setDepartments] = useState<DepartmentItem[]>(initialDepartments)
  const [officeTypes, setOfficeTypes] = useState<OfficeTypeHierarchyItem[]>(initialOfficeTypes)

  // Tab 1 Modal
  const [depModal, setDepModal] = useState<{ open: boolean; id?: number; name: string }>({
    open: false,
    name: '',
  })

  // Tab 2 Modal (Hierarchy)
  const [typeModal, setTypeModal] = useState<{
    open: boolean
    id?: number
    name: string
    department_id: number
    hierarchy_order: number
  }>({
    open: false,
    name: '',
    department_id: departments[0]?.id || 1,
    hierarchy_order: 1,
  })

  // Tab 3 Modal (Group settings)
  const [groupModal, setGroupModal] = useState<{
    open: boolean
    department_id: number
    office_type_id: number
    is_group_budget: boolean
  }>({
    open: false,
    department_id: departments[0]?.id || 1,
    office_type_id: officeTypes[0]?.id || 1,
    is_group_budget: true,
  })

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  // Handle Tab 1 Save
  const handleSaveDepartment = () => {
    if (!depModal.name.trim()) {
      showStatus('বিভাগের নাম আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveDepartment({ id: depModal.id, name: depModal.name })
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('বিভাগ সফলভাবে সংরক্ষিত হয়েছে')
        setDepModal({ open: false, name: '' })
        const trimmed = depModal.name.trim()
        if (depModal.id) {
          setDepartments((prev) =>
            prev.map((d) => (d.id === depModal.id ? { ...d, name: trimmed } : d))
          )
        } else {
          setDepartments((prev) => [...prev, { id: Date.now(), name: trimmed }])
        }
      }
    })
  }

  // Handle Tab 2 Save (Hierarchy)
  const handleSaveOfficeType = () => {
    if (!typeModal.name.trim()) {
      showStatus('অফিসের ধরণ আবশ্যক', 'error')
      return
    }

    startTransition(async () => {
      const res = await saveOfficeTypeHierarchy({
        id: typeModal.id,
        name: typeModal.name,
        department_id: typeModal.department_id,
        hierarchy_order: typeModal.hierarchy_order,
      })

      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('অফিসের ধরণ ও হায়ারার্কি সফলভাবে সংরক্ষিত হয়েছে')
        setTypeModal({
          open: false,
          name: '',
          department_id: departments[0]?.id || 1,
          hierarchy_order: 1,
        })

        const dep = departments.find((d) => d.id === typeModal.department_id)
        if (typeModal.id) {
          setOfficeTypes((prev) =>
            prev.map((ot) =>
              ot.id === typeModal.id
                ? {
                    ...ot,
                    name: typeModal.name.trim(),
                    department_id: typeModal.department_id,
                    department_name: dep?.name || '',
                    hierarchy_order: typeModal.hierarchy_order,
                  }
                : ot
            ).sort((a, b) => a.hierarchy_order - b.hierarchy_order)
          )
        } else {
          setOfficeTypes((prev) => [
            ...prev,
            {
              id: Date.now(),
              name: typeModal.name.trim(),
              department_id: typeModal.department_id,
              department_name: dep?.name || '',
              hierarchy_order: typeModal.hierarchy_order,
              is_group_budget: false,
            },
          ].sort((a, b) => a.hierarchy_order - b.hierarchy_order))
        }
      }
    })
  }

  // Handle Tab 3 Save (Group setting)
  const handleSaveGroupSetting = () => {
    startTransition(async () => {
      const res = await updateGroupBudgetStatus(groupModal.office_type_id, groupModal.is_group_budget)
      if (res.error) {
        showStatus(res.error, 'error')
      } else {
        showStatus('গ্রুপ বাজেট সেটিংস সফলভাবে আপডেট হয়েছে')
        setGroupModal((prev) => ({ ...prev, open: false }))
        setOfficeTypes((prev) =>
          prev.map((ot) =>
            ot.id === groupModal.office_type_id
              ? { ...ot, is_group_budget: groupModal.is_group_budget }
              : ot
          )
        )
      }
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            অফিস কনফিগারেশন
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            বিভাগ, অফিস পদক্রম (Hierarchy) এবং গ্রুপ বাজেট সেটিংস পরিচালনা
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
            onClick={() => setActiveTab('departments')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'departments'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>ট্যাব ১: বিভাগ (Office Type)</span>
          </button>

          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'hierarchy'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <GitBranch className="h-4 w-4" />
            <span>ট্যাব ২: হায়ারার্কি (Hierarchy)</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'groups'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>ট্যাব ৩: গ্রুপ সেটিংস (Group Settings)</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: বিভাগ */}
      {activeTab === 'departments' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                শীর্ষ বিভাগ তালিকা (Top Level Department)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                যেমন: আয়কর বিভাগ, কাস্টম্স ও ভ্যাট বিভাগ
              </CardDescription>
            </div>
            <Button
              onClick={() => setDepModal({ open: true, name: '' })}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              নতুন বিভাগ যোগ করুন
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-20">ক্র.নং</th>
                    <th className="py-3 px-4">বিভাগের নাম</th>
                    <th className="py-3 px-4 text-center w-28">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((d, idx) => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {d.name}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDepModal({ open: true, id: d.id, name: d.name })}
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
                                const res = await deleteDepartment(d.id)
                                if (res.error) showStatus(res.error, 'error')
                                else {
                                  showStatus('বিভাগ মুছে ফেলা হয়েছে')
                                  setDepartments((prev) => prev.filter((item) => item.id !== d.id))
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

      {/* TAB 2: হায়ারার্কি (Hierarchy) */}
      {activeTab === 'hierarchy' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                অফিসের ধরণ ও হায়ারার্কি ক্রম
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                অফিস রেজিস্ট্রেশন ড্রপডাউনে এই ক্রম অনুযায়ী পদবীসমূহ প্রদর্শিত হবে
              </CardDescription>
            </div>
            <Button
              onClick={() =>
                setTypeModal({
                  open: true,
                  name: '',
                  department_id: departments[0]?.id || 1,
                  hierarchy_order: officeTypes.length + 1,
                })
              }
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              নতুন অফিসের ধরণ যোগ করুন
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">হায়ারার্কি ক্রম</th>
                    <th className="py-3 px-4">অফিসের ধরণ</th>
                    <th className="py-3 px-4">অধীনস্থ বিভাগ</th>
                    <th className="py-3 px-4 text-center w-28">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {officeTypes.map((ot) => (
                    <tr key={ot.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        লেভেল {toBanglaNumber(ot.hierarchy_order)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {ot.name}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg font-bold">
                          {ot.department_name || 'সাধারণ'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setTypeModal({
                                open: true,
                                id: ot.id,
                                name: ot.name,
                                department_id: ot.department_id,
                                hierarchy_order: ot.hierarchy_order,
                              })
                            }
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
                                const res = await deleteOfficeType(ot.id)
                                if (res.error) showStatus(res.error, 'error')
                                else {
                                  showStatus('অফিসের ধরণ মুছে ফেলা হয়েছে')
                                  setOfficeTypes((prev) => prev.filter((item) => item.id !== ot.id))
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

      {/* TAB 3: গ্রুপ সেটিংস (Group Settings) */}
      {activeTab === 'groups' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                গ্রুপ বাজেট সেটিংস
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                গ্রুপ বাজেটে অন্তর্ভূক্ত অফিসের ধরণসমূহ ও কনফিগারেশন
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                const firstDep = departments[0]?.id || 1
                const matchingOt = officeTypes.find((ot) => ot.department_id === firstDep)
                setGroupModal({
                  open: true,
                  department_id: firstDep,
                  office_type_id: matchingOt?.id || officeTypes[0]?.id || 1,
                  is_group_budget: true,
                })
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              নতুন গ্রুপ সেটিং যুক্ত করুন
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-20">ক্র. নং.</th>
                    <th className="py-3 px-4">বিভাগ</th>
                    <th className="py-3 px-4">অফিসের ধরণ</th>
                    <th className="py-3 px-4 text-center">গ্রুপ বাজেটে অন্তর্ভূক্ত</th>
                    <th className="py-3 px-4 text-center w-32">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {officeTypes.filter((ot) => ot.is_group_budget).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        কোনো গ্রুপ সেটিং তৈরি করা হয়নি। নতুন গ্রুপ সেটিং যুক্ত করতে উপরের বাটনে চাপুন।
                      </td>
                    </tr>
                  ) : (
                    officeTypes
                      .filter((ot) => ot.is_group_budget)
                      .map((ot, idx) => (
                        <tr key={ot.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                            {toBanglaNumber(idx + 1)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            {ot.department_name || 'সাধারণ'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                            {ot.name}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              variant="outline"
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border-purple-300"
                            >
                              হ্যাঁ (গ্রুপ বাজেট)
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setGroupModal({
                                    open: true,
                                    department_id: ot.department_id,
                                    office_type_id: ot.id,
                                    is_group_budget: ot.is_group_budget,
                                  })
                                }}
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
                                    await updateGroupBudgetStatus(ot.id, false)
                                    setOfficeTypes((prev) =>
                                      prev.map((item) =>
                                        item.id === ot.id ? { ...item, is_group_budget: false } : item
                                      )
                                    )
                                    showStatus('গ্রুপ সেটিং থেকে অপসারণ করা হয়েছে')
                                  })
                                }}
                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                title="অপসারণ করুন"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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

      {/* MODAL 1: বিভাগ */}
      <Dialog open={depModal.open} onOpenChange={(open) => !open && setDepModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {depModal.id ? 'বিভাগ সম্পাদনা' : 'নতুন শীর্ষ বিভাগ যোগ করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">বিভাগের নাম (যেমন: আয়কর, কাস্টম্স, ভ্যাট)</Label>
              <Input
                type="text"
                value={depModal.name}
                onChange={(e) => setDepModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="বিভাগের নাম লিখুন..."
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setDepModal((prev) => ({ ...prev, open: false }))} className="rounded-xl text-xs font-semibold">
              বাতিল
            </Button>
            <Button type="button" onClick={handleSaveDepartment} disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: হায়ারার্কি */}
      <Dialog open={typeModal.open} onOpenChange={(open) => !open && setTypeModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {typeModal.id ? 'অফিসের ধরণ সম্পাদনা' : 'নতুন অফিসের ধরণ ও হায়ারার্কি নির্ধারণ'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">বিভাগ নির্বাচন করুন</Label>
              <Select
                value={String(typeModal.department_id)}
                onValueChange={(val) => {
                  if (val) setTypeModal((prev) => ({ ...prev, department_id: parseInt(val, 10) }))
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ (যেমন: কর অঞ্চল, কর আপীল অঞ্চল, সার্কেল)</Label>
              <Input
                type="text"
                value={typeModal.name}
                onChange={(e) => setTypeModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="অফিসের ধরণ লিখুন..."
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">হায়ারার্কি ক্রম (Hierarchy Serial: 1, 2, 3...)</Label>
              <Input
                type="number"
                min={1}
                value={typeModal.hierarchy_order}
                onChange={(e) => setTypeModal((prev) => ({ ...prev, hierarchy_order: parseInt(e.target.value, 10) || 1 }))}
                className="rounded-xl border-slate-200 font-mono"
              />
              <p className="text-[11px] text-slate-400">
                শীর্ষ অফিস ১, তার অধীনস্থ ২, ৩ এভাবে ক্রম নির্ধারণ করুন
              </p>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setTypeModal((prev) => ({ ...prev, open: false }))} className="rounded-xl text-xs font-semibold">
              বাতিল
            </Button>
            <Button type="button" onClick={handleSaveOfficeType} disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: গ্রুপ সেটিংস */}
      <Dialog open={groupModal.open} onOpenChange={(open) => !open && setGroupModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              গ্রুপ বাজেট নির্ধারণ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">বিভাগ</Label>
              <Select
                value={String(groupModal.department_id)}
                onValueChange={(val) => {
                  if (val) {
                    const depId = parseInt(val, 10)
                    const matchingOt = officeTypes.find((ot) => ot.department_id === depId)
                    setGroupModal((prev) => ({
                      ...prev,
                      department_id: depId,
                      office_type_id: matchingOt?.id || prev.office_type_id,
                    }))
                  }
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <span className="truncate font-semibold text-slate-900">
                    {departments.find((d) => d.id === groupModal.department_id)?.name || 'বিভাগ নির্বাচন করুন'}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ</Label>
              <Select
                value={String(groupModal.office_type_id)}
                onValueChange={(val) => {
                  if (val) setGroupModal((prev) => ({ ...prev, office_type_id: parseInt(val, 10) }))
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <span className="truncate font-semibold text-slate-900">
                    {officeTypes.find((ot) => ot.id === groupModal.office_type_id)?.name || 'অফিসের ধরণ নির্বাচন করুন'}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {officeTypes
                    .filter((ot) => ot.department_id === groupModal.department_id)
                    .map((ot) => (
                      <SelectItem key={ot.id} value={String(ot.id)}>
                        {ot.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">গ্রুপ বাজেটে অর্ন্তর্ভূক্ত</Label>
              <Select
                value={groupModal.is_group_budget ? 'yes' : 'no'}
                onValueChange={(val) => setGroupModal((prev) => ({ ...prev, is_group_budget: val === 'yes' }))}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <span className="truncate font-semibold text-slate-900">
                    {groupModal.is_group_budget ? 'হ্যাঁ (গ্রুপ বাজেটে অর্ন্তর্ভূক্ত)' : 'না (একক বাজেট)'}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="yes">হ্যাঁ (গ্রুপ বাজেটে অর্ন্তর্ভূক্ত)</SelectItem>
                  <SelectItem value="no">না (একক বাজেট)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setGroupModal((prev) => ({ ...prev, open: false }))} className="rounded-xl text-xs font-semibold">
              বাতিল
            </Button>
            <Button type="button" onClick={handleSaveGroupSetting} disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
