'use client'

import Link from 'next/link'
import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import { Layers, Plus, Edit2, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import {
  OfficeTypeHierarchyItem,
  OfficeLevelItem,
  GroupBudgetSettingItem,
} from '@/app/actions/admin-offices-config'
import { GroupModalState } from '../../offices-config/_types/offices-config'
import { getLevelOrderBadge } from '../../offices-config/_lib/helpers'

interface GroupBudgetTableProps {
  filteredGroupItems: GroupBudgetSettingItem[]
  officeTypes: OfficeTypeHierarchyItem[]
  officeTypesWithGroupBudget: OfficeTypeHierarchyItem[]
  officeLevels: OfficeLevelItem[]
  filterTypeForGroups: string
  setFilterTypeForGroups: (val: string) => void
  groupModal: GroupModalState
  setGroupModal: React.Dispatch<React.SetStateAction<GroupModalState>>
  onSaveGroupSetting: () => void
  onDeleteGroupSetting: (gs: GroupBudgetSettingItem) => void
  isPending: boolean
}

export function GroupBudgetTable({
  filteredGroupItems,
  officeTypes,
  officeTypesWithGroupBudget,
  officeLevels,
  filterTypeForGroups,
  setFilterTypeForGroups,
  groupModal,
  setGroupModal,
  onSaveGroupSetting,
  onDeleteGroupSetting,
  isPending,
}: GroupBudgetTableProps) {
  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              গ্রুপ বাজেট নির্ধারণ
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {officeTypesWithGroupBudget.length > 0 && (
              <div className="w-64 sm:w-72">
                <Select value={filterTypeForGroups} onValueChange={(val) => setFilterTypeForGroups(val || 'all')}>
                  <SelectTrigger className="h-9 w-full rounded-xl border-slate-200 text-xs">
                    <SelectValue placeholder="সব">
                      {filterTypeForGroups === 'all'
                        ? 'সব অফিসের ধরণ'
                        : officeTypesWithGroupBudget.find((ot) => String(ot.id) === filterTypeForGroups)?.name || 'সব'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="all">সব অফিসের ধরণ</SelectItem>
                    {officeTypesWithGroupBudget.map((ot) => (
                      <SelectItem key={ot.id} value={String(ot.id)}>
                        {ot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {officeTypes.length > 0 && (
              <Button
                onClick={() => {
                  const firstOt = officeTypesWithGroupBudget[0] || officeTypes[0]
                  const firstLevel = officeLevels.filter((lvl) => lvl.office_type_id === firstOt?.id).sort((a, b) => a.level_order - b.level_order)[0]
                  setGroupModal({
                    open: true,
                    office_type_id: firstOt?.id?.toString() || '',
                    office_level_id: firstLevel?.id || '',
                    is_group_budget: true,
                  })
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                নতুন গ্রুপ সেটিং যুক্ত করুন
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {officeTypes.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো অফিসের ধরণ বিদ্যমান নেই
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                গ্রুপ বাজেট চিহ্নিত করতে প্রথমে অরগানোগ্রামে অফিসের ধরণ যুক্ত করুন।
              </p>
              <div className="mt-4">
                <Link
                  href="/admin/offices-config"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-bold"
                >
                  অরগানোগ্রামে যান
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : filteredGroupItems.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো গ্রুপ সেটিং তৈরি করা হয়নি
              </h3>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => {
                    const firstOt = officeTypes[0]
                    const firstLevel = officeLevels.filter((lvl) => lvl.office_type_id === firstOt?.id).sort((a, b) => a.level_order - b.level_order)[0]
                    setGroupModal({
                      open: true,
                      id: undefined,
                      office_type_id: firstOt?.id?.toString() || '',
                      office_level_id: firstLevel?.id || '',
                      is_group_budget: true,
                    })
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন গ্রুপ সেটিং যুক্ত করুন
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-20">ক্রম.</th>
                    <th className="py-3 px-4">দপ্তর / সংস্থা</th>
                    <th className="py-3 px-4">অফিসের ধরণ</th>
                    <th className="py-3 px-4">অফিসের স্তর</th>
                    <th className="py-3 px-4 text-center">বাজেট মোড</th>
                    <th className="py-3 px-4 text-center w-32">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGroupItems.map((g, idx) => (
                    <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {officeTypes.find((ot) => ot.id === g.office_type_id)?.department_name || 'সাধারণ'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {g.office_type_name || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                        {g.office_level_name ? (
                          (() => {
                            const badge = getLevelOrderBadge(g.office_level_order)
                            return (
                              <span className={`px-2.5 py-1 rounded-md font-bold text-xs border ${badge.className}`}>
                                {g.office_level_name}
                              </span>
                            )
                          })()
                        ) : (
                          <span className="text-slate-400 font-normal">সকল স্তর</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant="outline"
                          className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border-purple-300"
                        >
                          গ্রুপ বাজেট
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
                                id: g.id,
                                office_type_id: g.office_type_id,
                                office_level_id: g.office_level_id || '',
                                is_group_budget: g.is_group_budget,
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
                            onClick={() => onDeleteGroupSetting(g)}
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="অপসারণ করুন"
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

      {/* MODAL: GROUP BUDGET SETTING */}
      <Dialog open={groupModal.open} onOpenChange={(open) => !open && setGroupModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              গ্রুপ বাজেট নির্ধারণ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* ১. অফিসের ধরণ dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের ধরণ</Label>
              <Select
                value={String(groupModal.office_type_id || '')}
                onValueChange={(val) => {
                  if (val) {
                    const matchingLevels = officeLevels
                      .filter((lvl) => lvl.office_type_id === val)
                      .sort((a, b) => a.level_order - b.level_order)
                    setGroupModal((prev) => ({
                      ...prev,
                      office_type_id: val,
                      office_level_id: matchingLevels[0]?.id || '',
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="অফিসের ধরণ নির্বাচন করুন">
                    {officeTypes.find((ot) => ot.id === groupModal.office_type_id)?.name || 'অফিসের ধরণ নির্বাচন করুন'}
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

            {/* ২. অফিসের স্তর dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অফিসের স্তর</Label>
              {(() => {
                const availableLevels = (
                  groupModal.office_type_id
                    ? officeLevels.filter((lvl) => lvl.office_type_id === groupModal.office_type_id)
                    : officeLevels
                ).slice().sort((a, b) => a.level_order - b.level_order)

                const currentLevel = officeLevels.find((lvl) => lvl.id === groupModal.office_level_id)

                return (
                  <Select
                    value={groupModal.office_level_id || ''}
                    onValueChange={(val) => {
                      if (val) {
                        const selectedLevel = officeLevels.find((lvl) => lvl.id === val)
                        setGroupModal((prev) => ({
                          ...prev,
                          office_level_id: val,
                          office_type_id: selectedLevel?.office_type_id || prev.office_type_id,
                        }))
                      }
                    }}
                  >
                    <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                      <SelectValue placeholder="অফিসের স্তর নির্বাচন করুন">
                        {currentLevel?.level_name || (availableLevels.length > 0 ? 'অফিসের স্তর নির্বাচন করুন' : 'কোনো স্তর নির্ধারিত নেই')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-xs max-h-60">
                      {availableLevels.map((lvl) => (
                        <SelectItem key={lvl.id} value={lvl.id}>
                          {lvl.level_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              })()}
            </div>

            {/* ৩. গ্রুপ বাজেটে অন্তর্ভূক্ত কি না (option) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">গ্রুপ বাজেটে অন্তর্ভূক্ত কি না</Label>
              <Select
                value={groupModal.is_group_budget ? 'yes' : 'no'}
                onValueChange={(val) => setGroupModal((prev) => ({ ...prev, is_group_budget: val === 'yes' }))}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="নির্বাচন করুন">
                    {groupModal.is_group_budget ? 'হ্যাঁ (গ্রুপ বাজেটে অন্তর্ভূক্ত)' : 'না (একক বাজেট)'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="yes">হ্যাঁ (গ্রুপ বাজেটে অন্তর্ভূক্ত)</SelectItem>
                  <SelectItem value="no">না (একক বাজেট)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGroupModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={onSaveGroupSetting}
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
