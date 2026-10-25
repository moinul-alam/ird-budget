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
import {
  DepartmentItem,
  LevelOwnerType,
  MinistryItem,
  OfficeLevelItem,
  OfficeTypeHierarchyItem,
} from '@/app/actions/admin-offices-config'
import { HierarchyModalState, ConfigTabType } from '../_types/offices-config'
import { getLevelOrderBadge } from '../_lib/helpers'

const OWNER_TYPE_LABELS: Record<LevelOwnerType, string> = {
  ministry: 'মন্ত্রণালয় / বিভাগ',
  department: 'দপ্তর / সংস্থা',
  office_type: 'অফিসের ধরণ',
}

/** Which kind of owner a level belongs to. A level links to exactly one owner. */
function ownerKindOf(lvl: OfficeLevelItem): LevelOwnerType {
  return lvl.ministry_id ? 'ministry' : lvl.office_type_id ? 'office_type' : 'department'
}

interface TabOfficeLevelsProps {
  filteredOfficeLevels: OfficeLevelItem[]
  ministries: MinistryItem[]
  departments: DepartmentItem[]
  officeTypes: OfficeTypeHierarchyItem[]
  levelOwnerFilter: string
  setLevelOwnerFilter: (val: string) => void
  hierarchyModal: HierarchyModalState
  setHierarchyModal: React.Dispatch<React.SetStateAction<HierarchyModalState>>
  onSaveOfficeLevel: () => void
  onDeleteOfficeLevel: (lvl: OfficeLevelItem) => void
  setActiveTab: (tab: ConfigTabType) => void
  isPending: boolean
}

export function TabOfficeLevels({
  filteredOfficeLevels,
  ministries,
  departments,
  officeTypes,
  levelOwnerFilter,
  setLevelOwnerFilter,
  hierarchyModal,
  setHierarchyModal,
  onSaveOfficeLevel,
  onDeleteOfficeLevel,
  setActiveTab,
  isPending,
}: TabOfficeLevelsProps) {
  // A level can belong to a ministry, a department, or an office type — whichever the admin
  // grants economic codes against.
  const ownerOptions: { id: string; name: string }[] =
    hierarchyModal.owner_type === 'ministry'
      ? ministries.map((m) => ({ id: m.id, name: m.name }))
      : hierarchyModal.owner_type === 'department'
        ? departments.map((d) => ({ id: d.id, name: d.name }))
        : officeTypes.map((ot) => ({ id: ot.id, name: ot.name }))

  const hasAnyOwner = ministries.length + departments.length + officeTypes.length > 0

  const defaultOwnerType = (): LevelOwnerType =>
    officeTypes.length > 0 ? 'office_type' : ministries.length > 0 ? 'ministry' : 'department'

  const firstOwnerIdFor = (ownerType: LevelOwnerType): string => {
    if (ownerType === 'ministry') return ministries[0]?.id?.toString() || ''
    if (ownerType === 'department') return departments[0]?.id?.toString() || ''
    return officeTypes[0]?.id?.toString() || ''
  }

  const openNewLevelModal = () => {
    const ownerType = defaultOwnerType()
    setHierarchyModal({
      open: true,
      owner_type: ownerType,
      owner_id: firstOwnerIdFor(ownerType),
      level_name: '',
      level_order: 1,
    })
  }

  const ownerNameOf = (lvl: OfficeLevelItem): string => {
    const kind = ownerKindOf(lvl)
    if (kind === 'ministry') return lvl.ministry_name || '—'
    if (kind === 'department') return lvl.department_name || '—'
    // Office types are shown with their department, the same way the dropdown lists them.
    const type = officeTypes.find((ot) => String(ot.id) === lvl.office_type_id)
    return type ? `${type.name}${type.department_name ? ` (${type.department_name})` : ''}` : (lvl.office_type_name || '—')
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              স্তর নির্ধারণ
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-64 sm:w-72">
              <Select value={levelOwnerFilter} onValueChange={(val) => setLevelOwnerFilter(val || 'all')}>
                <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="সব স্তর">
                    {levelOwnerFilter === 'all' ? 'সব স্তর' : `${OWNER_TYPE_LABELS[levelOwnerFilter as LevelOwnerType]}র স্তরসমূহ`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="all">সব স্তর</SelectItem>
                  <SelectItem value="ministry">মন্ত্রণালয় / বিভাগের স্তরসমূহ</SelectItem>
                  <SelectItem value="department">দপ্তর / সংস্থার স্তরসমূহ</SelectItem>
                  <SelectItem value="office_type">অফিসের ধরণের স্তরসমূহ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasAnyOwner && (
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
          {!hasAnyOwner ? (
            <div className="py-12 px-6 text-center">
              <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                স্তর নির্ধারণের জন্য কোনো মালিক বিদ্যমান নেই
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                স্তর নির্ধারণ করতে প্রথমে মন্ত্রণালয়/বিভাগ, দপ্তর/সংস্থা অথবা অফিসের ধরণ যুক্ত করুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('ministries')}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  ১. মন্ত্রণালয় / বিভাগের ট্যাবে যান
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : filteredOfficeLevels.length === 0 ? (
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
                    <th className="py-3 px-4">মালিকের ধরন</th>
                    <th className="py-3 px-4">মালিক</th>
                    <th className="py-3 px-4 text-center w-36">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOfficeLevels.map((lvl) => {
                    const badge = getLevelOrderBadge(lvl.level_order)
                    const kind = ownerKindOf(lvl)
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
                            {OWNER_TYPE_LABELS[kind]}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {ownerNameOf(lvl)}
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
                                  owner_type: kind,
                                  owner_id: lvl.ministry_id || lvl.office_type_id || lvl.department_id || '',
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

      {/* MODAL 4: LEVEL */}
      <Dialog open={hierarchyModal.open} onOpenChange={(open) => !open && setHierarchyModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {hierarchyModal.id ? 'স্তর সম্পাদনা' : 'স্তর নির্ধারণ'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* ১. মালিকের ধরন */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">স্তরের মালিক</Label>
              <Select
                value={hierarchyModal.owner_type}
                onValueChange={(val) => {
                  if (!val) return
                  const ownerType = val as LevelOwnerType
                  setHierarchyModal((prev) => ({
                    ...prev,
                    owner_type: ownerType,
                    owner_id: firstOwnerIdFor(ownerType),
                  }))
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="স্তরের মালিক নির্বাচন করুন">
                    {OWNER_TYPE_LABELS[hierarchyModal.owner_type]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="ministry">{OWNER_TYPE_LABELS.ministry}</SelectItem>
                  <SelectItem value="department">{OWNER_TYPE_LABELS.department}</SelectItem>
                  <SelectItem value="office_type">{OWNER_TYPE_LABELS.office_type}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ২. নির্দিষ্ট মালিক */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                {OWNER_TYPE_LABELS[hierarchyModal.owner_type]} নির্বাচন করুন
              </Label>
              <Select
                value={String(hierarchyModal.owner_id || '')}
                onValueChange={(val) => {
                  if (val) {
                    setHierarchyModal((prev) => ({
                      ...prev,
                      owner_id: val,
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="নির্বাচন করুন">
                    {ownerOptions.find((o) => o.id === hierarchyModal.owner_id)?.name || 'নির্বাচন করুন'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-h-60">
                  {ownerOptions.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ৩. স্তরের নাম (type field) */}
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

            {/* ৪. স্তরের ক্রম type field, number */}
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
