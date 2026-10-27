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
import { Briefcase, Building2, Plus, Edit2, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import { DepartmentItem, OfficeTypeHierarchyItem } from '@/lib/actions/admin-offices-config'
import { OfficeTypeModalState, ConfigTabType } from '../_types/offices-config'

interface TabOfficeTypesProps {
  officeTypes: OfficeTypeHierarchyItem[]
  filteredOfficeTypes: OfficeTypeHierarchyItem[]
  departments: DepartmentItem[]
  filterDeptForTypes: string
  setFilterDeptForTypes: (val: string) => void
  officeTypeModal: OfficeTypeModalState
  setOfficeTypeModal: React.Dispatch<React.SetStateAction<OfficeTypeModalState>>
  onSaveOfficeType: () => void
  onConfirmDeleteOfficeType: (ot: OfficeTypeHierarchyItem) => void
  setActiveTab: (tab: ConfigTabType) => void
  isPending: boolean
}

export function TabOfficeTypes({
  filteredOfficeTypes,
  departments,
  filterDeptForTypes,
  setFilterDeptForTypes,
  officeTypeModal,
  setOfficeTypeModal,
  onSaveOfficeType,
  onConfirmDeleteOfficeType,
  setActiveTab,
  isPending,
}: TabOfficeTypesProps) {
  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              অফিসের ধরণের তালিকা
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {departments.length > 0 && (
              <div className="w-64 sm:w-72">
                <Select value={filterDeptForTypes} onValueChange={(val) => setFilterDeptForTypes(val || 'all')}>
                  <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 text-xs">
                    <SelectValue placeholder="সব">
                      {filterDeptForTypes === 'all'
                        ? 'সব'
                        : departments.find((d) => String(d.id) === filterDeptForTypes)?.name || 'সব'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="all">সব</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {departments.length > 0 && (
              <Button
                onClick={() =>
                  setOfficeTypeModal({
                    open: true,
                    name: '',
                    department_id: departments[0]?.id?.toString() || '',
                  })
                }
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                নতুন অফিসের ধরণ যোগ করুন
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {departments.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                পূর্বে কোনো দপ্তর বা সংস্থা যুক্ত করা হয়নি
              </h3>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('departments')}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  ২. দপ্তর / সংস্থায় যান
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : filteredOfficeTypes.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো অফিসের ধরণ পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                নতুন অফিসের ধরণ যোগ করতে &quot;নতুন অফিসের ধরণ যোগ করুন&quot; বাটনে চাপুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() =>
                    setOfficeTypeModal({
                      open: true,
                      name: '',
                      department_id: departments[0]?.id?.toString() || '',
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন অফিসের ধরণ যোগ করুন
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-20">ক্রম</th>
                    <th className="py-3 px-4">অফিসের ধরণের নাম</th>
                    <th className="py-3 px-4">দপ্তর / সংস্থা</th>
                    <th className="py-3 px-4 text-center w-28">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOfficeTypes.map((ot, idx) => (
                    <tr key={ot.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        <span>{ot.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
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
                              setOfficeTypeModal({
                                open: true,
                                id: ot.id,
                                name: ot.name,
                                department_id: ot.department_id || '',
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
                            onClick={() => onConfirmDeleteOfficeType(ot)}
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

      {/* MODAL 3: OFFICE TYPE OF SUBORDINATE OFFICE */}
      <Dialog open={officeTypeModal.open} onOpenChange={(open) => !open && setOfficeTypeModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {officeTypeModal.id ? 'অফিসের ধরণ সম্পাদনা' : 'নতুন অফিসের ধরণ যোগ করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অধীনস্থ দপ্তর / সংস্থা নির্বাচন করুন</Label>
              <Select
                value={String(officeTypeModal.department_id || '')}
                onValueChange={(val) => {
                  if (val) setOfficeTypeModal((prev) => ({ ...prev, department_id: val }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="দপ্তর/সংস্থা নির্বাচন করুন">
                    {departments.find((d) => d.id === officeTypeModal.department_id)?.name || 'দপ্তর/সংস্থা নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name} {d.ministry_name ? `(${d.ministry_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ (যেমনঃ আয়কর অফিস, কাস্টম্স ও ভ্যাট অফিস)</Label>
              <Input
                type="text"
                value={officeTypeModal.name}
                onChange={(e) => setOfficeTypeModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="অফিসের ধরণ লিখুন..."
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOfficeTypeModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={onSaveOfficeType}
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
