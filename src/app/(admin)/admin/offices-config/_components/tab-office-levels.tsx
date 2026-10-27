'use client'

import { useState } from 'react'
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
import { toBanglaNumber } from '@/lib/bangla'
import {
  DepartmentItem,
  MinistryItem,
  OfficeLevelItem,
  OfficeTypeHierarchyItem,
} from '@/lib/actions/admin-offices-config'
import { HierarchyModalState, ConfigTabType } from '../_types/offices-config'
import { getLevelOrderBadge } from '../_lib/helpers'

interface TabOfficeLevelsProps {
  /** Office-type (field-office) levels — the only kind declared on this tab. */
  officeTypeLevels: OfficeLevelItem[]
  /** Every level, used to work out the next free tier for an office type. */
  officeLevels: OfficeLevelItem[]
  ministries: MinistryItem[]
  departments: DepartmentItem[]
  officeTypes: OfficeTypeHierarchyItem[]
  hierarchyModal: HierarchyModalState
  setHierarchyModal: React.Dispatch<React.SetStateAction<HierarchyModalState>>
  onSaveOfficeLevel: () => void
  onDeleteOfficeLevel: (lvl: OfficeLevelItem) => void
  setActiveTab: (tab: ConfigTabType) => void
  isPending: boolean
}

export function TabOfficeLevels({
  officeTypeLevels,
  officeLevels,
  ministries,
  departments,
  officeTypes,
  hierarchyModal,
  setHierarchyModal,
  onSaveOfficeLevel,
  onDeleteOfficeLevel,
  setActiveTab,
  isPending,
}: TabOfficeLevelsProps) {
  const hasOfficeType = officeTypes.length > 0

  // Filter the level list down to a single office type ('all' shows every type).
  const [filterOfficeTypeId, setFilterOfficeTypeId] = useState<string>('all')
  const filteredOfficeTypeLevels =
    filterOfficeTypeId === 'all'
      ? officeTypeLevels
      : officeTypeLevels.filter((l) => l.office_type_id === filterOfficeTypeId)

  // The chain that leads to a level's owner: ministry → department → office type.
  const departmentOptions = departments.filter(
    (d) => String(d.ministry_id) === hierarchyModal.ministry_id,
  )
  const officeTypeOptions = officeTypes.filter(
    (ot) => String(ot.department_id) === hierarchyModal.department_id,
  )

  const departmentsOfMinistry = (ministryId: string) =>
    departments.filter((d) => String(d.ministry_id) === ministryId)

  const officeTypesOfDepartment = (departmentId: string) =>
    officeTypes.filter((ot) => String(ot.department_id) === departmentId)

  // The next free tier for an office type. Ministry = 1 and department = 2, so an office type's
  // very first level is 3; later levels follow the ones it already has. `excludeId` drops the
  // level currently being edited so it does not count itself.
  const nextTierFor = (officeTypeId: string, excludeId?: string): number => {
    const tiers = officeLevels
      .filter((l) => l.office_type_id === officeTypeId && l.id !== excludeId)
      .map((l) => l.level_order)
    return tiers.length > 0 ? Math.max(...tiers) + 1 : 3
  }

  // Apply a chain change and re-derive everything downstream (department, office type, tier) so
  // the modal never points at an option that no longer belongs to the selection above it.
  const applyChain = (
    prev: HierarchyModalState,
    patch: { ministry_id?: string; department_id?: string; office_type_id?: string },
  ): HierarchyModalState => {
    const ministryId = patch.ministry_id ?? prev.ministry_id
    const deptList = departmentsOfMinistry(ministryId)
    const departmentId =
      patch.department_id ??
      (deptList.some((d) => d.id === prev.department_id) ? prev.department_id : deptList[0]?.id ?? '')
    const otList = officeTypesOfDepartment(departmentId)
    const officeTypeId =
      patch.office_type_id ??
      (otList.some((ot) => ot.id === prev.office_type_id) ? prev.office_type_id : otList[0]?.id ?? '')
    return {
      ...prev,
      ministry_id: ministryId,
      department_id: departmentId,
      office_type_id: officeTypeId,
      level_order: nextTierFor(officeTypeId, prev.id),
    }
  }

  const openNewLevelModal = () => {
    const base: HierarchyModalState = {
      open: true,
      ministry_id: ministries[0]?.id?.toString() || '',
      department_id: '',
      office_type_id: '',
      level_name: '',
      level_order: 3,
    }
    setHierarchyModal(applyChain(base, {}))
  }

  const openEditLevelModal = (lvl: OfficeLevelItem) => {
    const officeType = officeTypes.find((ot) => String(ot.id) === lvl.office_type_id)
    const departmentId = officeType?.department_id ? String(officeType.department_id) : ''
    const ministryId =
      departments.find((d) => String(d.id) === departmentId)?.ministry_id ||
      ministries[0]?.id?.toString() ||
      ''
    setHierarchyModal({
      open: true,
      id: lvl.id,
      ministry_id: ministryId,
      department_id: departmentId,
      office_type_id: lvl.office_type_id,
      level_name: lvl.level_name,
      level_order: lvl.level_order,
    })
  }

  // The office type a level is defined under (field-office levels are scoped to an office type).
  const officeTypeOf = (lvl: OfficeLevelItem) =>
    officeTypes.find((ot) => String(ot.id) === lvl.office_type_id)

  const suggestedTier = nextTierFor(hierarchyModal.office_type_id, hierarchyModal.id)

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              স্তর নির্ধারণ
            </CardTitle>
            <p className="text-xs font-bold text-slate-500 mt-1">
              ১ম স্তর (মন্ত্রণালয়/বিভাগ) এবং ২য় স্তর (দপ্তর/সংস্থা) নির্ধারিত
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasOfficeType && (
              <Select
                value={filterOfficeTypeId}
                onValueChange={(val) => {
                  if (!val) return
                  setFilterOfficeTypeId(val)
                }}
              >
                <SelectTrigger className="w-full sm:w-52 rounded-xl border-slate-200 text-xs h-8">
                  <SelectValue placeholder="সব অফিসের ধরণ">
                    {filterOfficeTypeId === 'all'
                      ? 'সব অফিসের ধরণ'
                      : officeTypes.find((ot) => String(ot.id) === filterOfficeTypeId)?.name ||
                        'সব অফিসের ধরণ'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-60">
                  <SelectItem value="all">সব অফিসের ধরণ</SelectItem>
                  {officeTypes.map((ot) => (
                    <SelectItem key={ot.id} value={String(ot.id)}>
                      {ot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasOfficeType && (
              <Button
                onClick={openNewLevelModal}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                নতুন স্তর নির্ধারণ করুন
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!hasOfficeType ? (
            <div className="py-12 px-6 text-center">
              <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                স্তর নির্ধারণের জন্য কোনো অফিসের ধরণ বিদ্যমান নেই
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                মাঠ অফিসের স্তর নির্ধারণ করতে প্রথমে অফিসের ধরণ যুক্ত করুন।
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
          ) : officeTypeLevels.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                এখনো কোনো স্তর নির্ধারণ করা হয়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                স্তর নির্ধারণ করতে &quot;নতুন স্তর নির্ধারণ করুন&quot; বাটনে চাপুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={openNewLevelModal}
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
                    <th className="py-3 px-4">উর্ধ্বতন অফিস</th>
                    <th className="py-3 px-4 text-center w-36">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOfficeTypeLevels.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 px-4 text-center text-xs text-slate-500">
                        এই অফিসের ধরণের কোনো স্তর নির্ধারণ করা হয়নি।
                      </td>
                    </tr>
                  )}
                  {filteredOfficeTypeLevels.map((lvl) => {
                    const badge = getLevelOrderBadge(lvl.level_order)
                    const officeType = officeTypeOf(lvl)
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
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg font-bold">
                            {officeType?.name || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {officeType?.department_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditLevelModal(lvl)}
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

      {/* MODAL 4: LEVEL */}
      <Dialog open={hierarchyModal.open} onOpenChange={(open) => !open && setHierarchyModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {hierarchyModal.id ? 'স্তর সম্পাদনা' : 'স্তর নির্ধারণ'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* ১. মন্ত্রণালয় */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">মন্ত্রণালয়</Label>
              <Select
                value={String(hierarchyModal.ministry_id || '')}
                onValueChange={(val) => {
                  if (!val) return
                  setHierarchyModal((prev) => applyChain(prev, { ministry_id: val }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="মন্ত্রণালয় নির্বাচন করুন">
                    {ministries.find((m) => m.id === hierarchyModal.ministry_id)?.name || 'মন্ত্রণালয় নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-60">
                  {ministries.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ২. দপ্তর / সংস্থা */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">দপ্তর / সংস্থা</Label>
              <Select
                value={String(hierarchyModal.department_id || '')}
                onValueChange={(val) => {
                  if (!val) return
                  setHierarchyModal((prev) => applyChain(prev, { department_id: val }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="দপ্তর / সংস্থা নির্বাচন করুন">
                    {departmentOptions.find((d) => d.id === hierarchyModal.department_id)?.name || 'দপ্তর / সংস্থা নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-60">
                  {departmentOptions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ৩. অফিসের ধরণ */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ</Label>
              <Select
                value={String(hierarchyModal.office_type_id || '')}
                onValueChange={(val) => {
                  if (!val) return
                  setHierarchyModal((prev) => applyChain(prev, { office_type_id: val }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="অফিসের ধরণ নির্বাচন করুন">
                    {officeTypeOptions.find((ot) => ot.id === hierarchyModal.office_type_id)?.name || 'অফিসের ধরণ নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-60">
                  {officeTypeOptions.map((ot) => (
                    <SelectItem key={ot.id} value={String(ot.id)}>
                      {ot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ৪. স্তরের নাম (type field) */}
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

            {/* ৫. স্তরের ক্রম type field, number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">স্তরের ক্রম</Label>
              <Input
                type="number"
                min={1}
                value={hierarchyModal.level_order}
                onChange={(e) => setHierarchyModal((prev) => ({ ...prev, level_order: parseInt(e.target.value, 10) || 1 }))}
                className="rounded-xl border-slate-200 font-mono text-xs"
              />
              {hierarchyModal.office_type_id && (
                <p className="text-[11px] text-slate-500">
                  এই অফিসের ধরণের জন্য প্রস্তাবিত ক্রম: {toBanglaNumber(suggestedTier)}
                </p>
              )}
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
