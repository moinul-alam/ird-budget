'use client'

import { useState } from 'react'
import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, CheckCircle2 } from 'lucide-react'
import { BudgetCategoryItem, ExpenseCodeFullItem } from '@/app/actions/admin-codes'
import { CodeScopeType, OfficeTypeItem } from '../_types/codes'
import { DepartmentItem, MinistryItem, OfficeLevelItem } from '@/app/actions/admin-offices-config'
import { ConfirmToggleAllDialog } from './code-modals'

const SCOPE_LABELS: Record<CodeScopeType, string> = {
  office_type: 'অফিসের ধরণ',
  ministry: 'মন্ত্রণালয় / বিভাগ',
  department: 'দপ্তর / সংস্থা',
}

/** The card each selector sits in, so the row wraps cleanly however many boxes are shown. */
const BOX_CLASS = 'flex-1 min-w-[200px] bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs'

interface TabEnableCodesProps {
  scopeOwnerType: CodeScopeType
  setScopeOwnerType: (val: CodeScopeType) => void

  ministries: MinistryItem[]
  selectedMinistryId: string
  setSelectedMinistryId: (id: string) => void

  departments: DepartmentItem[]
  selectedDepartmentId?: string
  setSelectedDepartmentId: (id: string) => void

  officeTypes: OfficeTypeItem[]
  selectedOfficeTypeId: string
  setSelectedOfficeTypeId: (id: string) => void
  selectedOfficeType?: OfficeTypeItem

  /** Levels owned by whichever organisation is in scope — the grants apply to these. */
  scopedLevels: OfficeLevelItem[]
  selectedLevelId: string
  setSelectedLevelId: (lvlId: string) => void
  selectedOfficeLevel?: OfficeLevelItem

  enabledCount: number
  totalCodesCount: number
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedCatFilter: string
  setSelectedCatFilter: (cat: string) => void
  categories: BudgetCategoryItem[]
  filteredCodes: ExpenseCodeFullItem[]
  handleToggleBulk: (codeIds: number[], enable: boolean) => void
  handleToggleCode: (code: ExpenseCodeFullItem) => void
  isPending: boolean
}

export function TabEnableCodes({
  scopeOwnerType,
  setScopeOwnerType,
  ministries,
  selectedMinistryId,
  setSelectedMinistryId,
  departments,
  selectedDepartmentId,
  setSelectedDepartmentId,
  officeTypes,
  selectedOfficeTypeId,
  setSelectedOfficeTypeId,
  selectedOfficeType,
  scopedLevels,
  selectedLevelId,
  setSelectedLevelId,
  selectedOfficeLevel,
  enabledCount,
  totalCodesCount,
  searchQuery,
  setSearchQuery,
  selectedCatFilter,
  setSelectedCatFilter,
  categories,
  filteredCodes,
  handleToggleBulk,
  handleToggleCode,
  isPending,
}: TabEnableCodesProps) {
  // The office type list is only narrowed by a department in office-type scope.
  const filteredOfficeTypes = selectedDepartmentId
    ? officeTypes.filter((ot) => ot.department_id === selectedDepartmentId)
    : officeTypes

  // Track selected checkboxes (code IDs)
  const [selectedCodeIds, setSelectedCodeIds] = useState<number[]>([])

  const isAllSelected =
    filteredCodes.length > 0 &&
    filteredCodes.every((c) => selectedCodeIds.includes(c.id))

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      // Unselect all current filtered codes
      const filteredSet = new Set(filteredCodes.map((c) => c.id))
      setSelectedCodeIds((prev) => prev.filter((id) => !filteredSet.has(id)))
    } else {
      // Select all current filtered codes
      const nextSet = new Set(selectedCodeIds)
      filteredCodes.forEach((c) => nextSet.add(c.id))
      setSelectedCodeIds(Array.from(nextSet))
    }
  }

  const handleSelectOne = (id: number) => {
    setSelectedCodeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const [confirmToggleModal, setConfirmToggleModal] = useState<{
    open: boolean
    enableAll: boolean
    title: string
    description: string
  }>({
    open: false,
    enableAll: true,
    title: '',
    description: '',
  })

  const requestToggleBulk = (enable: boolean) => {
    if (selectedCodeIds.length === 0) return
    const levelText = selectedOfficeLevel
      ? `"${selectedOfficeLevel.level_name}"`
      : `"${selectedOfficeType?.name}"`
    const countText = toBanglaNumber(selectedCodeIds.length)

    setConfirmToggleModal({
      open: true,
      enableAll: enable,
      title: enable ? 'নির্বাচিত কোড চালু করার নিশ্চিতকরণ' : 'নির্বাচিত কোড বন্ধ করার নিশ্চিতকরণ',
      description: enable
        ? `আপনি কি নিশ্চিতভাবে ${levelText} স্তরের আওতাধীন নির্বাচিত ${countText} টি বাজেট কোড চালু (Enable) করতে চান?`
        : `আপনি কি নিশ্চিতভাবে ${levelText} স্তরের আওতাধীন নির্বাচিত ${countText} টি বাজেট কোড বন্ধ (Disable) করতে চান?`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p>
          কোড উন্মুক্তকরণের পূর্বে{' '}
          <a
            href="/admin/offices-config"
            className="font-bold text-blue-700 underline underline-offset-2 hover:text-blue-900 transition-colors"
          >
            অর্গানোগ্রাম
          </a>{' '}
          মেনু থেকে মন্ত্রণালয়/বিভাগ, দপ্তর/সংস্থা ও অফিসের ধরণের স্তর নির্ধারণ করুন।
        </p>
      </div>

      {/* Selection Control Card */}
      <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-stretch">
            {/* Box 1: স্তরের মালিকের ধরন */}
            <div className={BOX_CLASS}>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                স্তরের মালিকের ধরন
              </label>
              <Select
                value={scopeOwnerType}
                onValueChange={(val) => {
                  if (val) setScopeOwnerType(val as CodeScopeType)
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-300 font-bold text-xs bg-slate-50/50 hover:bg-white transition-colors">
                  <SelectValue placeholder="স্তরের ধরন নির্বাচন করুন">
                    {SCOPE_LABELS[scopeOwnerType]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="office_type">{SCOPE_LABELS.office_type}</SelectItem>
                  <SelectItem value="ministry">{SCOPE_LABELS.ministry}</SelectItem>
                  <SelectItem value="department">{SCOPE_LABELS.department}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Box 2a: মন্ত্রণালয় / বিভাগ (ministry scope) */}
            {scopeOwnerType === 'ministry' && (
              <div className={BOX_CLASS}>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  মন্ত্রণালয় / বিভাগ
                </label>
                <Select
                  value={selectedMinistryId ? String(selectedMinistryId) : ''}
                  onValueChange={(val) => {
                    if (val) setSelectedMinistryId(val)
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl border-slate-300 font-bold text-xs bg-slate-50/50 hover:bg-white transition-colors">
                    <span className="truncate text-slate-900 font-bold">
                      {ministries.find((m) => m.id === selectedMinistryId)?.name || 'মন্ত্রণালয়/বিভাগ নির্বাচন করুন'}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    {ministries.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Box 2b: দপ্তর / সংস্থা (office-type filter and department scope) */}
            {(scopeOwnerType === 'office_type' || scopeOwnerType === 'department') && (
              <div className={BOX_CLASS}>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  দপ্তর / সংস্থা
                </label>
                <Select
                  value={selectedDepartmentId ? String(selectedDepartmentId) : ''}
                  onValueChange={(val) => {
                    if (val) setSelectedDepartmentId(val)
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl border-slate-300 font-bold text-xs bg-slate-50/50 hover:bg-white transition-colors">
                    <span className="truncate text-slate-900 font-bold">
                      {departments.find((d) => d.id === selectedDepartmentId)?.name || 'দপ্তর/সংস্থা নির্বাচন করুন'}
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
            )}

            {/* Box 3: অফিসের ধরণ (office-type scope only) */}
            {scopeOwnerType === 'office_type' && (
              <div className={BOX_CLASS}>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  অফিসের ধরণ
                </label>
                <Select
                  value={String(selectedOfficeTypeId)}
                  onValueChange={(val) => {
                    if (val) setSelectedOfficeTypeId(val)
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl border-slate-300 font-bold text-xs bg-slate-50/50 hover:bg-white transition-colors">
                    <span className="truncate text-slate-900 font-bold">
                      {selectedOfficeType?.name || 'অফিসের ধরণ নির্বাচন করুন'}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    {filteredOfficeTypes.map((ot) => (
                      <SelectItem key={ot.id} value={String(ot.id)}>
                        {ot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Box 4: স্তর */}
            <div className={BOX_CLASS}>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                স্তর
              </label>
              <Select
                value={selectedLevelId || (scopedLevels[0]?.id || '')}
                onValueChange={(val) => {
                  if (val) setSelectedLevelId(val)
                }}
                disabled={scopedLevels.length === 0}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-300 font-bold text-xs bg-slate-50/50 hover:bg-white transition-colors">
                  <span className="truncate text-slate-900 font-bold">
                    {scopedLevels.length === 0
                      ? 'স্তর নির্ধারিত নেই'
                      : (selectedOfficeLevel?.level_name || scopedLevels[0]?.level_name || 'স্তর নির্বাচন করুন')}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {scopedLevels.map((lvl) => (
                    <SelectItem key={lvl.id} value={lvl.id}>
                      {lvl.level_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Box 5: সক্রিয় কোডের সংখ্যা */}
            <div className={`${BOX_CLASS} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                    সক্রিয় কোডের সংখ্যা
                  </span>
                  <span className="text-base font-black text-blue-700 font-mono">
                    {toBanglaNumber(enabledCount)}{' '}
                    <span className="text-xs text-slate-400 font-medium">/ {toBanglaNumber(totalCodesCount)} টি</span>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[11px] font-bold border-0">
                  {selectedOfficeLevel?.level_name || selectedOfficeType?.name}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Table with required columns */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="কোড নম্বর, ক্যাটাগরি অথবা নাম দিয়ে সার্চ করুন..."
                className="pl-9 rounded-xl border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={selectedCatFilter}
                onValueChange={(val) => {
                  if (val) setSelectedCatFilter(val)
                }}
              >
                <SelectTrigger className="w-[180px] rounded-xl border-slate-200 text-xs font-semibold bg-white">
                  <span className="truncate">
                    {selectedCatFilter === 'all'
                      ? 'সব ক্যাটাগরি'
                      : categories.find((c) => c.code === selectedCatFilter)
                        ? `${selectedCatFilter} - ${categories.find((c) => c.code === selectedCatFilter)?.title}`
                        : 'সব ক্যাটাগরি'}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="all">সব</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.code}>
                      {cat.code} - {cat.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => requestToggleBulk(true)}
                disabled={isPending || selectedCodeIds.length === 0}
                className="rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 border-emerald-200"
              >
                কোড চালু {selectedCodeIds.length > 0 && `(${toBanglaNumber(selectedCodeIds.length)})`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => requestToggleBulk(false)}
                disabled={isPending || selectedCodeIds.length === 0}
                className="rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                কোড বন্ধ {selectedCodeIds.length > 0 && `(${toBanglaNumber(selectedCodeIds.length)})`}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAllToggle}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="সকল কোড নির্বাচন করুন"
                    />
                  </th>
                  <th className="py-3 px-4 w-16">ক্রম.</th>
                  <th className="py-3 px-4 w-28 font-mono">ক্যাটাগরি কোড</th>
                  <th className="py-3 px-4 w-44">বাজেট ক্যাটাগরি</th>
                  <th className="py-3 px-4 w-32 font-mono">বাজেট কোড</th>
                  <th className="py-3 px-4">কোডের বিবরণ</th>
                  <th className="py-3 px-4 text-center w-36">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      কোনো বাজেট কোড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredCodes.map((c, idx) => (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/60 transition-colors ${selectedCodeIds.includes(c.id)
                        ? 'bg-blue-50/40'
                        : c.enabled
                          ? 'bg-white'
                          : 'bg-slate-50/40 opacity-75'
                        }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCodeIds.includes(c.id)}
                          onChange={() => handleSelectOne(c.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {c.parent_code || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {c.parent_title || 'সাধারণ'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sm text-indigo-700">
                        {c.code}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {c.name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCode(c)}
                            disabled={isPending}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${c.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                              }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${c.enabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                          </button>
                          <span
                            className={`text-[11px] font-bold ${c.enabled ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                          >
                            {c.enabled ? 'চালু' : 'বন্ধ'}
                          </span>
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

      {/* Confirmation Dialog for Bulk Toggle */}
      <ConfirmToggleAllDialog
        modal={confirmToggleModal}
        setModal={setConfirmToggleModal}
        onConfirm={() => {
          handleToggleBulk(selectedCodeIds, confirmToggleModal.enableAll)
          setSelectedCodeIds([])
        }}
        isPending={isPending}
      />
    </div>
  )
}
