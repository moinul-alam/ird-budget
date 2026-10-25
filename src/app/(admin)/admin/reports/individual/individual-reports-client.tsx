'use client'

import { useState, useMemo } from 'react'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { groupCodesByCategory } from '@/lib/budget/group-codes'
import { buildCodeWiseSpec, buildOfficeListSpec } from '@/lib/report/specs'
import { strings } from '@/lib/strings'
import { ReportDownloader } from '@/components/report-downloader'
import type { ReportSpec } from '@/lib/report/export'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Search, CheckCircle2, Clock, FileSpreadsheet, X } from 'lucide-react'

export interface OfficeReportItem {
  id: number
  budget_id: string
  name: string
  department_name: string
  office_type_name: string
  is_group_budget: boolean
  status: 'submitted' | 'draft' | 'not_started'
  submitted_at?: string | null
  submission_id: number | null
}

/** One economical code of a single office's budget, ready to render. */
export interface OfficeCodeRow {
  code: string
  name: string
  category_id: number | null
  category_name: string
  category_sort_order: number
  sort_order: number
  amount: number
}

interface DetailProps {
  office: OfficeReportItem
  rows: OfficeCodeRow[]
  total: number
}

/** The drill-down: one office's code-wise budget and its grand total. */
function OfficeDetail({ detail }: { detail: DetailProps }) {
  const groups = groupCodesByCategory(detail.rows)
  let rowNumber = 0

  // Mirrors the table below it, including the office it belongs to in the header.
  const reportSpec = useMemo<ReportSpec>(
    () =>
      buildCodeWiseSpec({
        title: strings.reports.officeReport,
        scopeName: detail.office.name,
        headOfficeName: [detail.office.department_name, detail.office.office_type_name]
          .filter(Boolean)
          .join(' • '),
        fileName: [strings.reports.officeReport, detail.office.name, detail.office.budget_id]
          .filter(Boolean)
          .join('-'),
        codes: detail.rows,
        grandTotal: detail.total,
      }),
    [detail]
  )

  return (
    <Card className="border-blue-200 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-blue-100 bg-blue-50/50 pb-3 flex flex-row items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <FileSpreadsheet className="h-4 w-4 text-blue-700" />
            <CardTitle className="text-base font-bold text-slate-900">
              {detail.office.name}
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[11px] font-bold rounded-full px-2.5 py-0.5 bg-white text-blue-700 border-blue-300 font-mono"
            >
              {detail.office.budget_id}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 ${
                detail.office.status === 'submitted'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : detail.office.status === 'draft'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-slate-100 text-slate-500 border-slate-300'
              }`}
            >
              {detail.office.status === 'submitted'
                ? 'দাখিলকৃত'
                : detail.office.status === 'draft'
                  ? 'খসড়া'
                  : 'শুরু করেনি'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {detail.office.department_name} • {detail.office.office_type_name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ReportDownloader spec={reportSpec} />
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">সর্বমোট</span>
            <span className="text-lg font-black text-blue-800 font-mono">
              ৳ {toBanglaAmount(detail.total)}
            </span>
          </div>
          <Link
            href="/admin/reports/individual"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 border border-transparent hover:border-slate-200"
            title="বন্ধ করুন"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[32rem]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-16">ক্রম</th>
                <th className="py-3 px-4 w-32">কোড</th>
                <th className="py-3 px-4">খরচের বিবরণ</th>
                <th className="py-3 px-4 w-48 text-right">পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    কোনো তথ্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <FragmentRows key={`cat-${group.category_id}`}>
                    <tr className="bg-slate-50/60">
                      <td colSpan={3} className="py-2 px-4 font-bold text-slate-700">
                        {group.category_name || 'অন্যান্য'}
                      </td>
                      <td className="py-2 px-4 font-mono font-bold text-slate-700 text-right">
                        {toBanglaAmount(group.subtotal)}
                      </td>
                    </tr>
                    {group.codes.map((code) => {
                      rowNumber += 1
                      return (
                        <tr key={code.code} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-semibold text-slate-500">
                            {toBanglaNumber(rowNumber)}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-700">
                            {code.code}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-800">{code.name}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 text-right">
                            {code.amount ? toBanglaAmount(code.amount) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </FragmentRows>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50/70 border-t-2 border-blue-200">
                <td colSpan={3} className="py-3 px-4 font-bold text-slate-900 text-sm">
                  সর্বমোট
                </td>
                <td className="py-3 px-4 font-mono font-black text-blue-800 text-sm text-right">
                  {toBanglaAmount(detail.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/** A Fragment wrapper so grouped rows can carry a key without an extra DOM node. */
function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function IndividualReportsClient({
  offices,
  fiscalYear,
  cycleName,
  selectedOffice,
  detail,
}: {
  offices: OfficeReportItem[]
  fiscalYear: string
  cycleName: string
  selectedOffice: OfficeReportItem | null
  detail: DetailProps | null
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [officeTypeFilter, setOfficeTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'draft' | 'not_started'>('all')

  // Office types come from the rows themselves, so the filter never goes stale as types are
  // added and needs no hardcoded Bengali names (which are easy to mistype character by
  // character and then silently match nothing).
  const officeTypeOptions = useMemo(
    () =>
      Array.from(new Set(offices.map((off) => off.office_type_name))).sort((a, b) =>
        a.localeCompare(b, 'bn')
      ),
    [offices]
  )

  const filteredOffices = useMemo(() => {
    return offices.filter((off) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        off.name.toLowerCase().includes(q) ||
        off.budget_id.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (officeTypeFilter !== 'all' && off.office_type_name !== officeTypeFilter) return false

      if (statusFilter !== 'all' && off.status !== statusFilter) return false

      return true
    })
  }, [offices, searchQuery, officeTypeFilter, statusFilter])

  const submittedCount = useMemo(() => offices.filter((o) => o.status === 'submitted').length, [offices])

  // Exports the rows currently on screen — the search and filters are already applied.
  const listSpec = useMemo<ReportSpec>(
    () =>
      buildOfficeListSpec({
        title: strings.reports.officeListReport,
        scopeName: [cycleName, fiscalYear].filter(Boolean).join(' • '),
        fileName: [strings.reports.officeListFile, fiscalYear].filter(Boolean).join('-'),
        offices: filteredOffices,
      }),
    [filteredOffices, cycleName, fiscalYear]
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
              {cycleName || 'কোনো চক্র নেই'} {fiscalYear ? `• ${fiscalYear}` : ''}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            অফিসভিত্তিক প্রতিবেদন (Individual Office Reports)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            যেকোনো অফিস নির্বাচন করে তার কোডভিত্তিক বাজেট ও সর্বমোট দেখুন
          </p>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">
            {detail ? 'নির্বাচিত অফিসের সর্বমোট' : 'মোট অফিস'}
          </span>
          <span className="text-xl font-black text-blue-700 font-mono">
            {detail ? `৳ ${toBanglaAmount(detail.total)}` : toBanglaNumber(offices.length)}
          </span>
        </div>
      </div>

      {/* Drill-down */}
      {detail ? (
        <OfficeDetail detail={detail} />
      ) : selectedOffice ? (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="py-6 text-center text-sm font-semibold text-amber-800">
            “{selectedOffice.name}” এখনো কোনো বাজেট দাখিল করেনি, তাই কোনো তথ্য নেই।
          </CardContent>
        </Card>
      ) : null}

      {/* Search and Filters */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="বাজেট আইডি অথবা অফিসের নাম দিয়ে খুঁজুন (যেমন: 101, কর অঞ্চল-১১)..."
                className="pl-9 rounded-xl border-slate-200 text-xs h-10"
              />
            </div>

            {/* Office Type Filter — a dropdown because the number of types is unbounded */}
            <Select value={officeTypeFilter} onValueChange={(v) => setOfficeTypeFilter(v ?? 'all')}>
              <SelectTrigger className="w-full md:w-64 h-10 rounded-xl border-slate-200 text-xs font-bold">
                <SelectValue placeholder="সব অফিসের ধরণ">
                  {officeTypeFilter === 'all' ? 'সব অফিসের ধরণ' : officeTypeFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs max-h-72">
                <SelectItem value="all">সব অফিসের ধরণ</SelectItem>
                {officeTypeOptions.map((typeName) => (
                  <SelectItem key={typeName} value={typeName}>
                    {typeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
              >
                সকল স্ট্যাটাস
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('submitted')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${statusFilter === 'submitted' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500'
                  }`}
              >
                দাখিলকৃত
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('draft')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${statusFilter === 'draft' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-500'
                  }`}
              >
                খসড়া
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offices List Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-base font-bold text-slate-900">
              অফিসের তালিকা ({toBanglaNumber(filteredOffices.length)} টি)
            </CardTitle>
            <span className="text-xs font-bold text-slate-500">
              মোট দাখিল: {toBanglaNumber(submittedCount)} টি অফিস
            </span>
          </div>
          <ReportDownloader spec={listSpec} />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">ক্রম</th>
                  <th className="py-3 px-4 w-32">বাজেট আইডি</th>
                  <th className="py-3 px-4">অফিসের নাম</th>
                  <th className="py-3 px-4">বিভাগ ও ধরণ</th>
                  <th className="py-3 px-4 text-center">দাখিল স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-center w-28">বিস্তারিত</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOffices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      কোনো অফিস পাওয়া যায়নি। অনুসন্ধানের শব্দ পরিবর্তন করে চেষ্টা করুন।
                    </td>
                  </tr>
                ) : (
                  filteredOffices.map((off, idx) => {
                    const isSelected = selectedOffice?.id === off.id
                    return (
                      <tr
                        key={off.id}
                        className={`transition-colors ${isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/70'}`}
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-500">
                          {toBanglaNumber(idx + 1)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700 text-sm">
                          {off.budget_id}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {off.name}
                          {off.is_group_budget && (
                            <span className="ml-2 px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200">
                              গ্রুপ বাজেট
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="block font-medium text-slate-700">{off.department_name}</span>
                          <span className="text-[11px] text-slate-400">{off.office_type_name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold gap-1 rounded-full px-2.5 py-0.5 ${off.status === 'submitted'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : off.status === 'draft'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-slate-100 text-slate-500 border-slate-300'
                              }`}
                          >
                            {off.status === 'submitted' ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>দাখিলকৃত</span>
                              </>
                            ) : off.status === 'draft' ? (
                              <>
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span>খসড়া</span>
                              </>
                            ) : (
                              <span>শুরু করেনি</span>
                            )}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Link
                            href={`/admin/reports/individual?office=${off.id}`}
                            className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                          >
                            দেখুন
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
