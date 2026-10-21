'use client'

import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { BudgetCategoryItem, ExpenseCodeFullItem } from '@/app/actions/admin-codes'
import { CategoryModalState, CodeModalState } from '../_types/codes'

interface TabCreateCodesProps {
  categories: BudgetCategoryItem[]
  codes: ExpenseCodeFullItem[]
  setCatModal: React.Dispatch<React.SetStateAction<CategoryModalState>>
  setCodeModal: React.Dispatch<React.SetStateAction<CodeModalState>>
  handleDeleteCategory: (cat: BudgetCategoryItem) => void
  handleDeleteEconomicCode: (code: ExpenseCodeFullItem) => void
}

export function TabCreateCodes({
  categories,
  codes,
  setCatModal,
  setCodeModal,
  handleDeleteCategory,
  handleDeleteEconomicCode,
}: TabCreateCodesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Section: বাজেট ক্যাটাগরি (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="border-slate-200 shadow-sm h-full flex flex-col">
          <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                বাজেট ক্যাটাগরি
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                শীর্ষ ৪ ডিজিট কোড (যেমন: ৩১১১)
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() =>
                setCatModal({
                  open: true,
                  code: '',
                  title: '',
                  hierarchy_order: categories.length + 1,
                })
              }
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              নতুন ক্যাটাগরি
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-14">ক্রম</th>
                  <th className="py-2.5 px-3 w-20">কোড</th>
                  <th className="py-2.5 px-3">ক্যাটাগরি নাম</th>
                  <th className="py-2.5 px-3 text-center w-20">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-500">
                      {toBanglaNumber(c.hierarchy_order)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                      {c.code}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {c.title}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCatModal({
                              open: true,
                              id: c.id,
                              code: c.code,
                              title: c.title,
                              hierarchy_order: c.hierarchy_order,
                            })
                          }
                          className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(c)}
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Right Section: অর্থনৈতিক কোডসমূহ (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        <Card className="border-slate-200 shadow-sm h-full flex flex-col">
          <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                অর্থনৈতিক কোডসমূহ (Economic Codes)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                ক্যাটাগরির অধীন ৭ ডিজিট বিস্তারিত কোড ({toBanglaNumber(codes.length)} টি)
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() =>
                setCodeModal({
                  open: true,
                  code: '',
                  name: '',
                  parent_code: categories[0]?.code || '3111',
                  parent_title: categories[0]?.title || 'নগদ মজুরি ও বেতন',
                  hierarchy_order: codes.length + 1,
                })
              }
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              নতুন কোড যোগ
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-14">ক্রম</th>
                  <th className="py-2.5 px-3 w-24">বাজেট কোড</th>
                  <th className="py-2.5 px-3">কোডের বিবরণ</th>
                  <th className="py-2.5 px-3 w-28">ক্যাটাগরি</th>
                  <th className="py-2.5 px-3 text-center w-20">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-500">
                      {toBanglaNumber(c.hierarchy_order)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700 text-sm">
                      {c.code}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="font-mono text-xs font-bold text-slate-500">{c.parent_code}</span>
                      <span className="block text-[11px] truncate text-slate-400">{c.parent_title}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCodeModal({
                              open: true,
                              id: c.id,
                              code: c.code,
                              name: c.name,
                              parent_code: c.parent_code || categories[0]?.code || '3111',
                              parent_title: c.parent_title || categories[0]?.title || '',
                              hierarchy_order: c.hierarchy_order,
                            })
                          }
                          className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEconomicCode(c)}
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
