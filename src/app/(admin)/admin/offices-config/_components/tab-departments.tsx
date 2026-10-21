'use client'

import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Building2, Landmark, Plus, Edit2, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import { MinistryItem, DepartmentItem, OfficeTypeHierarchyItem } from '@/app/actions/admin-offices-config'
import { DepartmentModalState, ConfigTabType } from '../_types/offices-config'

interface TabDepartmentsProps {
  departments: DepartmentItem[]
  ministries: MinistryItem[]
  officeTypes: OfficeTypeHierarchyItem[]
  depModal: DepartmentModalState
  setDepModal: React.Dispatch<React.SetStateAction<DepartmentModalState>>
  onSaveDepartment: () => void
  onConfirmDeleteDepartment: (d: DepartmentItem) => void
  setActiveTab: (tab: ConfigTabType) => void
  isPending: boolean
}

export function TabDepartments({
  departments,
  ministries,
  officeTypes,
  depModal,
  setDepModal,
  onSaveDepartment,
  onConfirmDeleteDepartment,
  setActiveTab,
  isPending,
}: TabDepartmentsProps) {
  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              দপ্তর / সংস্থার তালিকা
            </CardTitle>
          </div>
          {ministries.length > 0 && (
            <Button
              onClick={() =>
                setDepModal({
                  open: true,
                  name: '',
                  ministry_id: ministries[0]?.id || '',
                })
              }
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              নতুন দপ্তর/সংস্থা যোগ করুন
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {ministries.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Landmark className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                পূর্বে কোনো মন্ত্রণালয়/বিভাগ যুক্ত করা হয়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                দপ্তর বা সংস্থা নির্ধারণ করতে প্রথমে ১ নম্বর ট্যাবে গিয়ে মন্ত্রণালয়/বিভাগ যোগ করুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('ministries')}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  ১. মন্ত্রণালয় / বিভাগে যান
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : departments.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো দপ্তর বা সংস্থা পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                মাঠ পর্যায়ের অফিসের ধরণ কনফিগার করার পূর্বে &quot;নতুন দপ্তর/সংস্থা যোগ করুন&quot; বাটনে চাপুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() =>
                    setDepModal({
                      open: true,
                      name: '',
                      ministry_id: ministries[0]?.id || '',
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন দপ্তর/সংস্থা যোগ করুন
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-20">ক্র.নং</th>
                    <th className="py-3 px-4">দপ্তর / সংস্থার নাম</th>
                    <th className="py-3 px-4">বাজেট আইডি (Login ID)</th>
                    <th className="py-3 px-4">মূল মন্ত্রণালয় / বিভাগ</th>
                    <th className="py-3 px-4">অফিসের ধরণ সংখ্যা</th>
                    <th className="py-3 px-4 text-center w-28">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((d, idx) => {
                    const typeCount = officeTypes.filter((ot) => ot.department_id === d.id).length
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                          {toBanglaNumber(idx + 1)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {d.name}
                        </td>
                        <td className="py-3.5 px-4">
                          {d.budget_id ? (
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-lg text-xs">
                              {d.budget_id}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">নির্ধারিত নেই</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {d.ministry_name ? (
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-200/60">
                              {d.ministry_name}
                            </span>
                          ) : (
                            <span className="text-slate-400">সাধারণ</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {toBanglaNumber(typeCount)} টি ধরণ
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDepModal({
                                  open: true,
                                  id: d.id,
                                  name: d.name,
                                  budget_id: d.budget_id || '',
                                  ministry_id: d.ministry_id || ministries[0]?.id || '',
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
                              onClick={() => onConfirmDeleteDepartment(d)}
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 2: SUBORDINATE OFFICE / DEPARTMENT */}
      <Dialog open={depModal.open} onOpenChange={(open) => !open && setDepModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {depModal.id ? 'দপ্তর/সংস্থা সম্পাদনা' : 'নতুন দপ্তর/সংস্থা যোগ করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">মূল মন্ত্রণালয় / বিভাগ নির্বাচন করুন</Label>
              <Select
                value={depModal.ministry_id}
                onValueChange={(val) => {
                  if (val) setDepModal((prev) => ({ ...prev, ministry_id: val }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="মন্ত্রণালয়/বিভাগ নির্বাচন করুন">
                    {ministries.find((m) => m.id === depModal.ministry_id)?.name || 'মন্ত্রণালয়/বিভাগ নির্বাচন করুন'}
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

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">দপ্তর / সংস্থার নাম</Label>
              <Input
                type="text"
                value={depModal.name}
                onChange={(e) => setDepModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="যেমন: জাতীয় রাজস্ব বোর্ড, কাস্টম্স বিভাগ..."
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">বাজেট আইডি (Login ID)</Label>
                <span className="text-[11px] text-blue-600 font-medium">লগইন করার জন্য ব্যবহৃত হবে</span>
              </div>
              <Input
                type="text"
                value={depModal.budget_id || ''}
                onChange={(e) => setDepModal((prev) => ({ ...prev, budget_id: e.target.value }))}
                placeholder="যেমন: 11001, 11002..."
                className="rounded-xl border-slate-200 font-mono font-semibold"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDepModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={onSaveDepartment}
              disabled={isPending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
