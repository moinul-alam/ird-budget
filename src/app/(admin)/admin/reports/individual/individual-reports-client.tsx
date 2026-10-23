'use client'

import { useState, useMemo } from 'react'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Search,
  FileSpreadsheet,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Filter
} from 'lucide-react'

interface OfficeReportItem {
  id: number
  budget_id: string
  name: string
  department_name: string
  office_type_name: string
  is_group_budget: boolean
  status: 'submitted' | 'draft' | 'not_started'
  submitted_at?: string | null
  total_budget: number
  submission_id?: number | null
}

export function IndividualReportsClient({
  offices,
  fiscalYear,
  cycleName,
}: {
  offices: OfficeReportItem[]
  fiscalYear: string
  cycleName: string
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<'all' | 'tax' | 'vat'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'draft' | 'not_started'>('all')

  const filteredOffices = useMemo(() => {
    return offices.filter((off) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        off.name.toLowerCase().includes(q) ||
        off.budget_id.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (departmentFilter === 'tax' && !off.department_name.includes('আয়কর')) return false
      if (departmentFilter === 'vat' && off.department_name.includes('আয়কর')) return false

      if (statusFilter !== 'all' && off.status !== statusFilter) return false

      return true
    })
  }, [offices, searchQuery, departmentFilter, statusFilter])

  const submittedCount = useMemo(() => offices.filter((o) => o.status === 'submitted').length, [offices])
  const totalAmount = useMemo(
    () => filteredOffices.reduce((sum, o) => sum + (o.total_budget || 0), 0),
    [filteredOffices]
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
              {cycleName} • {fiscalYear}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            অফিসভিত্তিক প্রতিবেদন (Individual Office Reports)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            সকল অফিসের বাজেট দাখিল তথ্য ও বিস্তারিত বাজেট শিট অনুসন্ধান ও পর্যালোচনা
          </p>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase block">মোট বাজেট (ফিল্টারকৃত)</span>
            <span className="text-xl font-black text-blue-700 font-mono">
              ৳ {toBanglaAmount(totalAmount)}
            </span>
          </div>
        </div>
      </div>

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
                placeholder="বাজেট আইডি অথবা অফিসের নাম দিয়ে খুঁজুন (যেমন: 101, কর অঞ্চল-১১)..."
                className="pl-9 rounded-xl border-slate-200 text-xs h-10"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setDepartmentFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${departmentFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
              >
                সকল বিভাগ
              </button>
              <button
                type="button"
                onClick={() => setDepartmentFilter('tax')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${departmentFilter === 'tax' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500'
                  }`}
              >
                আয়কর বিভাগ
              </button>
              <button
                type="button"
                onClick={() => setDepartmentFilter('vat')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${departmentFilter === 'vat' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500'
                  }`}
              >
                কাস্টম্‌স ও ভ্যাট
              </button>
            </div>

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
                খসড়া
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offices List Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            অফিসের তালিকা ({toBanglaNumber(filteredOffices.length)} টি)
          </CardTitle>
          <span className="text-xs font-bold text-slate-500">
            মোট দাখিল: {toBanglaNumber(submittedCount)} টি অফিস
          </span>
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
                  <th className="py-3 px-4">সর্বমোট বাজেট</th>
                  <th className="py-3 px-4 text-center">দাখিল স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOffices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      কোনো অফিস পাওয়া যায়নি। অনুসন্ধানের শব্দ পরিবর্তন করে চেষ্টা করুন।
                    </td>
                  </tr>
                ) : (
                  filteredOffices.map((off, idx) => (
                    <tr key={off.id} className="hover:bg-slate-50/70 transition-colors">
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
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                        {off.total_budget > 0 ? `৳ ${toBanglaAmount(off.total_budget)}` : '—'}
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
                              <span>খসড়া</span>
                            </>
                          ) : (
                            <span>শুরু করেনি</span>
                          )}
                        </Badge>
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
