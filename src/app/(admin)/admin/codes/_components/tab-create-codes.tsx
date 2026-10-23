'use client'

import { useState, useMemo } from 'react'
import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Edit2, Trash2, Search, AlertTriangle } from 'lucide-react'
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
  const [catSearch, setCatSearch] = useState('')
  const [codeSearch, setCodeSearch] = useState('')

  // Confirmation dialogs
  const [codeToDelete, setCodeToDelete] = useState<ExpenseCodeFullItem | null>(null)
  const [catToDelete, setCatToDelete] = useState<BudgetCategoryItem | null>(null)

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    )
  }, [categories, catSearch])

  // Filtered codes
  const filteredCodes = useMemo(() => {
    const q = codeSearch.trim().toLowerCase()
    if (!q) return codes
    return codes.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.parent_code && c.parent_code.toLowerCase().includes(q)) ||
        (c.parent_title && c.parent_title.toLowerCase().includes(q))
    )
  }, [codes, codeSearch])

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
                শীর্ষ ৪ ডিজিট কোড ({toBanglaNumber(categories.length)} টি)
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

          {/* Search bar for categories */}
          <div className="px-3.5 py-2.5 bg-slate-50/60 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="ক্যাটাগরি কোড বা নাম দিয়ে খুঁজুন..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-lg focus-visible:ring-1"
              />
            </div>
          </div>

          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[550px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-2.5 px-3 w-14">ক্রম</th>
                  <th className="py-2.5 px-3 w-20">কোড</th>
                  <th className="py-2.5 px-3">ক্যাটাগরি নাম</th>
                  <th className="py-2.5 px-3 text-center w-20">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      কোনো ক্যাটাগরি পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((c) => (
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
                            onClick={() => setCatToDelete(c)}
                            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
                  parent_code: categories[0]?.code || '',
                  parent_title: categories[0]?.title || '',
                  hierarchy_order: codes.length + 1,
                })
              }
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              নতুন কোড যোগ
            </Button>
          </CardHeader>
          {/* Search bar for economic codes */}
          <div className="px-3.5 py-2.5 bg-slate-50/60 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="কোড নম্বর বা বিবরণ দিয়ে দ্রুত খুঁজুন..."
                value={codeSearch}
                onChange={(e) => setCodeSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-lg focus-visible:ring-1"
              />
            </div>
          </div>

          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[550px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-2.5 px-3 w-14">ক্রম</th>
                  <th className="py-2.5 px-3 w-24">বাজেট কোড</th>
                  <th className="py-2.5 px-3">কোডের বিবরণ</th>
                  <th className="py-2.5 px-3 w-28">ক্যাটাগরি</th>
                  <th className="py-2.5 px-3 text-center w-20">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      কোনো অর্থনৈতিক কোড পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filteredCodes.map((c) => (
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
                                parent_code: c.parent_code || categories[0]?.code || '',
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
                            onClick={() => setCodeToDelete(c)}
                            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog for Category Delete */}
      <Dialog open={catToDelete !== null} onOpenChange={(open) => !open && setCatToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              ক্যাটাগরি মুছে ফেলা নিশ্চিতকরণ
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-slate-600">
            আপনি কি নিশ্চিতভাবে ক্যাটাগরি <strong>{catToDelete?.code} ({catToDelete?.title})</strong> মুছে ফেলতে চান?
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCatToDelete(null)}>
              বাতিল
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (catToDelete) {
                  handleDeleteCategory(catToDelete)
                  setCatToDelete(null)
                }
              }}
            >
              মুছে ফেলুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Economic Code Delete */}
      <Dialog open={codeToDelete !== null} onOpenChange={(open) => !open && setCodeToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              অর্থনৈতিক কোড মুছে ফেলা নিশ্চিতকরণ
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-slate-600 space-y-2">
            <p>
              আপনি কি নিশ্চিতভাবে কোড <strong className="font-mono text-slate-900">{codeToDelete?.code}</strong> ({codeToDelete?.name}) মুছে ফেলতে চান?
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              সতর্কতা: যদি কোনো অফিস এই কোডে ইতোমধ্যে বাজেট ডেটা ইনপুট দিয়ে থাকে, তবে ডাটার অখণ্ডতা রক্ষার জন্য এটি ডিলিট হতে দেওয়া হবে না।
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCodeToDelete(null)}>
              বাতিল
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (codeToDelete) {
                  handleDeleteEconomicCode(codeToDelete)
                  setCodeToDelete(null)
                }
              }}
            >
              মুছে ফেলুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
