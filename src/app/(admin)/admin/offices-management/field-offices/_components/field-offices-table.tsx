'use client'

import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Building2, Plus, Edit2, Copy, Trash2, ArrowRight, Search, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { FieldOfficeItem, HeadOfficeItem } from '@/app/actions/admin-offices-management'
import { OfficeTypeHierarchyItem } from '@/app/actions/admin-offices-config'

interface FieldOfficesTableProps {
  fieldOffices: FieldOfficeItem[]
  filteredOffices: FieldOfficeItem[]
  headOffices: HeadOfficeItem[]
  officeTypes: OfficeTypeHierarchyItem[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  onOpenAdd: () => void
  onOpenEdit: (item: FieldOfficeItem) => void
  onOpenDuplicate: (item: FieldOfficeItem) => void
  onConfirmDelete: (item: FieldOfficeItem) => void
}

export function FieldOfficesTable({
  fieldOffices,
  filteredOffices,
  headOffices,
  officeTypes,
  searchQuery,
  setSearchQuery,
  onOpenAdd,
  onOpenEdit,
  onOpenDuplicate,
  onConfirmDelete,
}: FieldOfficesTableProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              মাঠ পর্যায়ের অফিসের তালিকা
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              অফিস তৈরির সাথে সাথেই বাজেট আইডি হিসেবে স্বয়ংক্রিয় ইউজার ও ডিফল্ট পাসওয়ার্ড (১২৩৪৫) যুক্ত হয়
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {fieldOffices.length > 0 && (
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="অফিস বা বাজেট আইডি খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 rounded-xl border-slate-200 bg-slate-50/50"
              />
            </div>
          )}

          {headOffices.length > 0 && officeTypes.length > 0 && (
            <Button
              onClick={onOpenAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="h-4 w-4" />
              নতুন মাঠ পর্যায়ের অফিস যোগ করুন
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {headOffices.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">
              পূর্বে কোনো হেড অফিস তৈরি করা হয়নি
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              মাঠ পর্যায়ের অফিস যুক্ত করার পূর্বে সংশ্লিষ্ট হেড অফিস যোগ করুন।
            </p>
            <div className="mt-4">
              <Link href="/admin/offices-management/head-offices">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  হেড অফিসসমূহে যান
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ) : fieldOffices.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">
              কোনো মাঠ পর্যায়ের অফিস পাওয়া যায়নি
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              নতুন অফিস যুক্ত করতে &quot;নতুন মাঠ পর্যায়ের অফিস যোগ করুন&quot; বাটনে চাপুন।
            </p>
            <div className="mt-4">
              <Button
                size="sm"
                onClick={onOpenAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                নতুন মাঠ পর্যায়ের অফিস যোগ করুন
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16">ক্র.নং</th>
                  <th className="py-3 px-4">বাজেট আইডি (Login)</th>
                  <th className="py-3 px-4">মাঠ পর্যায়ের অফিসের নাম</th>
                  <th className="py-3 px-4">হেড অফিস</th>
                  <th className="py-3 px-4">অফিসের ধরণ</th>
                  <th className="py-3 px-4 text-center">লগইন পাসওয়ার্ড</th>
                  <th className="py-3 px-4 text-center w-36">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOffices.map((f, idx) => (
                  <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                      {toBanglaNumber(idx + 1)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700 text-sm">
                      {f.budget_id}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {f.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {f.head_office_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg font-bold">
                        {f.office_type_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-mono font-bold text-[11px] border border-emerald-200">
                        <KeyRound className="h-3 w-3 text-emerald-600" />
                        12345
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenEdit(f)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                          title="সম্পাদনা"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenDuplicate(f)}
                          className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
                          title="অনুলিপি তৈরি করুন (Duplicate)"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onConfirmDelete(f)}
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
  )
}
