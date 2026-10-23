'use client'

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
import { GitBranch, Plus, Edit2, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import { OfficeTypeHierarchyItem, OfficeLevelItem } from '@/app/actions/admin-offices-config'
import { HierarchyModalState, ConfigTabType } from '../_types/offices-config'
import { getLevelOrderBadge } from '../_lib/helpers'

interface TabOfficeLevelsProps {
  officeLevels: OfficeLevelItem[]
  filteredOfficeLevels: OfficeLevelItem[]
  officeTypes: OfficeTypeHierarchyItem[]
  officeTypesWithHierarchy: OfficeTypeHierarchyItem[]
  filterTypeForHierarchy: string
  setFilterTypeForHierarchy: (val: string) => void
  hierarchyModal: HierarchyModalState
  setHierarchyModal: React.Dispatch<React.SetStateAction<HierarchyModalState>>
  onSaveOfficeLevel: () => void
  onDeleteOfficeLevel: (lvl: OfficeLevelItem) => void
  setActiveTab: (tab: ConfigTabType) => void
  isPending: boolean
}

export function TabOfficeLevels({
  officeLevels,
  filteredOfficeLevels,
  officeTypes,
  officeTypesWithHierarchy,
  filterTypeForHierarchy,
  setFilterTypeForHierarchy,
  hierarchyModal,
  setHierarchyModal,
  onSaveOfficeLevel,
  onDeleteOfficeLevel,
  setActiveTab,
  isPending,
}: TabOfficeLevelsProps) {
  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              মাঠ অফিসের স্তর
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {officeTypesWithHierarchy.length > 0 && (
              <div className="w-64 sm:w-72">
                <Select value={filterTypeForHierarchy} onValueChange={(val) => setFilterTypeForHierarchy(val || 'all')}>
                  <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 text-xs">
                    <SelectValue placeholder="সব অফিসের ধরণ">
                      {filterTypeForHierarchy === 'all'
                        ? 'সব অফিসের ধরণ'
                        : officeTypesWithHierarchy.find((ot) => String(ot.id) === filterTypeForHierarchy)?.name || 'সব অফিসের ধরণ'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="all">সব অফিসের ধরণ</SelectItem>
                    {officeTypesWithHierarchy.map((ot) => (
                      <SelectItem key={ot.id} value={String(ot.id)}>
                        {ot.name} {ot.department_name ? `(${ot.department_name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {officeTypes.length > 0 && (
              <Button
                onClick={() => {
                  const defaultOtId = filterTypeForHierarchy !== 'all'
                    ? filterTypeForHierarchy
                    : (officeTypes[0]?.id?.toString() || '')
                  setHierarchyModal({
                    open: true,
                    id: undefined,
                    office_type_id: defaultOtId,
                    level_name: '',
                    level_order: 1,
                  })
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                নতুন স্তর নির্ধারণ করুন
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {officeTypes.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো অফিসের ধরণ বিদ্যমান নেই
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                স্তর নির্ধারণ করতে প্রথমে ৩ নম্বর ট্যাবে অফিসের ধরণ যুক্ত করুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('office_types')}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  ৩. অফিসের ধরণের ট্যাবে যান
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : filteredOfficeLevels.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                এখনো কোনো অফিসের স্তর নির্ধারণ করা হয়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                মাঠ অফিসের স্তর নির্ধারণ করতে &quot;নতুন স্তর নির্ধারণ করুন&quot; বাটনে চাপুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => {
                    const defaultOt = officeTypes[0]
                    setHierarchyModal({
                      open: true,
                      id: undefined,
                      office_type_id: defaultOt?.id?.toString() || '',
                      level_name: '',
                      level_order: 1,
                    })
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন স্তর নির্ধারণ করুন
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">স্তরের ক্রম</th>
                    <th className="py-3 px-4">স্তরের নাম</th>
                    <th className="py-3 px-4">অফিসের ধরণ</th>
                    <th className="py-3 px-4">দপ্তর / সংস্থা</th>
                    <th className="py-3 px-4 text-center w-36">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOfficeLevels.map((lvl) => {
                    const badge = getLevelOrderBadge(lvl.level_order)
                    return (
                      <tr key={lvl.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-md font-bold text-xs border transition-colors ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                          {lvl.level_name}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {lvl.office_type_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg font-bold">
                            {lvl.department_name || 'সাধারণ'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setHierarchyModal({
                                  open: true,
                                  id: lvl.id,
                                  office_type_id: lvl.office_type_id,
                                  level_name: lvl.level_name,
                                  level_order: lvl.level_order,
                                })
                              }
                              className="rounded-lg text-xs font-semibold h-8 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                              title="সম্পাদনা"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              সম্পাদনা
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteOfficeLevel(lvl)}
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="স্তর মুছে ফেলুন"
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

      {/* MODAL 4: HIERARCHY LEVEL */}
      <Dialog open={hierarchyModal.open} onOpenChange={(open) => !open && setHierarchyModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {hierarchyModal.id ? 'মাঠ অফিসের স্তর সম্পাদনা' : 'মাঠ অফিসের স্তর নির্ধারণ'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* ১. অফিসের ধরণ dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ</Label>
              <Select
                value={String(hierarchyModal.office_type_id || '')}
                onValueChange={(val) => {
                  if (val) {
                    setHierarchyModal((prev) => ({
                      ...prev,
                      office_type_id: val,
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="অফিসের ধরণ নির্বাচন করুন">
                    {officeTypes.find((ot) => ot.id === hierarchyModal.office_type_id)?.name || 'অফিসের ধরণ নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-60">
                  {officeTypes.map((ot) => (
                    <SelectItem key={ot.id} value={String(ot.id)}>
                      {ot.name} {ot.department_name ? `(${ot.department_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ২. স্তরের নাম (type field) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">স্তরের নাম</Label>
              <Input
                type="text"
                placeholder="যেমন: কর অঞ্চল, কর আপীল অঞ্চল, কর রেঞ্জসমূহ ইত্যাদি"
                value={hierarchyModal.level_name}
                onChange={(e) => setHierarchyModal((prev) => ({ ...prev, level_name: e.target.value }))}
                className="rounded-xl border-slate-200 text-xs"
              />
            </div>

            {/* ৩. স্তরের ক্রম type field, number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">স্তরের ক্রম</Label>
              <Input
                type="number"
                min={1}
                value={hierarchyModal.level_order}
                onChange={(e) => setHierarchyModal((prev) => ({ ...prev, level_order: parseInt(e.target.value, 10) || 1 }))}
                className="rounded-xl border-slate-200 font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setHierarchyModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={onSaveOfficeLevel}
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
