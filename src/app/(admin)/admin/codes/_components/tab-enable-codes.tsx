'use client'

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
import { Search, Building2 } from 'lucide-react'
import { BudgetCategoryItem, ExpenseCodeFullItem } from '@/app/actions/admin-codes'
import { OfficeTypeItem } from '../_types/codes'

interface TabEnableCodesProps {
  officeTypes: OfficeTypeItem[]
  selectedOfficeTypeId: number
  setSelectedOfficeTypeId: (id: number) => void
  selectedOfficeType?: OfficeTypeItem
  enabledCount: number
  totalCodesCount: number
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedCatFilter: string
  setSelectedCatFilter: (cat: string) => void
  categories: BudgetCategoryItem[]
  filteredCodes: ExpenseCodeFullItem[]
  handleToggleAll: (enableAll: boolean) => void
  handleToggleCode: (code: ExpenseCodeFullItem) => void
  isPending: boolean
}

export function TabEnableCodes({
  officeTypes,
  selectedOfficeTypeId,
  setSelectedOfficeTypeId,
  selectedOfficeType,
  enabledCount,
  totalCodesCount,
  searchQuery,
  setSearchQuery,
  selectedCatFilter,
  setSelectedCatFilter,
  categories,
  filteredCodes,
  handleToggleAll,
  handleToggleCode,
  isPending,
}: TabEnableCodesProps) {
  return (
    <div className="space-y-6">
      {/* Office Type Selector Bar */}
      <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  অফিসের ধরণ নির্বাচন করুন
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Select
                    value={String(selectedOfficeTypeId)}
                    onValueChange={(val) => {
                      if (val) {
                        const newId = parseInt(val, 10)
                        setSelectedOfficeTypeId(newId)
                        window.location.href = `/admin/codes?office_type_id=${newId}`
                      }
                    }}
                  >
                    <SelectTrigger className="w-[280px] sm:w-[380px] rounded-xl border-slate-300 font-bold text-xs bg-white">
                      <span className="truncate text-slate-900 font-bold">
                        {selectedOfficeType?.department_name ? `${selectedOfficeType.department_name} → ` : ''}
                        {selectedOfficeType?.name}
                      </span>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-xs">
                      {officeTypes.map((ot) => (
                        <SelectItem key={ot.id} value={String(ot.id)}>
                          {ot.department_name ? `${ot.department_name} → ` : ''}
                          {ot.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">সক্রিয় কোডের সংখ্যা</span>
                <span className="text-lg font-black text-blue-700 font-mono">
                  {toBanglaNumber(enabledCount)}{' '}
                  <span className="text-xs text-slate-400 font-normal">/ {toBanglaNumber(totalCodesCount)} টি</span>
                </span>
              </div>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs font-bold border-0">
                {selectedOfficeType?.name}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Table with required columns:
          ক্র. নং. | ক্যাটাগরি কোড | বাজেট ক্যাটাগরি | বাজেট কোড | কোডের বিবরণ | স্ট্যাটাস (enable disable toggle)
      */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="কোড নম্বর, ক্যাটাগরি অথবা নাম দিয়ে সার্চ করুন..."
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
                  <SelectValue placeholder="ক্যাটাগরি ফিল্টার" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="all">সকল ক্যাটাগরি</SelectItem>
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
                onClick={() => handleToggleAll(true)}
                disabled={isPending}
                className="rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 border-emerald-200"
              >
                সকল চালু
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleAll(false)}
                disabled={isPending}
                className="rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                সকল বন্ধ
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">ক্র. নং.</th>
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
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      কোনো বাজেট কোড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredCodes.map((c, idx) => (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        c.enabled ? 'bg-white' : 'bg-slate-50/40 opacity-75'
                      }`}
                    >
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
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              c.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                c.enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[11px] font-bold ${
                              c.enabled ? 'text-emerald-700' : 'text-slate-400'
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
    </div>
  )
}
