'use client'

import { toBanglaNumber } from '@/lib/bangla'
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
import { Landmark, Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { MinistryItem, DepartmentItem } from '@/app/actions/admin-offices-config'
import { MinistryModalState } from '../_types/offices-config'

interface TabMinistriesProps {
  ministries: MinistryItem[]
  departments: DepartmentItem[]
  minModal: MinistryModalState
  setMinModal: React.Dispatch<React.SetStateAction<MinistryModalState>>
  onSaveMinistry: () => void
  onConfirmDeleteMinistry: (m: MinistryItem) => void
  isPending: boolean
}

export function TabMinistries({
  ministries,
  departments,
  minModal,
  setMinModal,
  onSaveMinistry,
  onConfirmDeleteMinistry,
  isPending,
}: TabMinistriesProps) {
  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              মন্ত্রণালয় / বিভাগ তালিকা
            </CardTitle>
          </div>
          <Button
            onClick={() => setMinModal({ open: true, name: '' })}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            নতুন মন্ত্রণালয়/বিভাগ যোগ করুন
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {ministries.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Landmark className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো মন্ত্রণালয় বা বিভাগ পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                দপ্তর বা সংস্থা নির্ধারণের পূর্বে &quot;নতুন মন্ত্রণালয়/বিভাগ যোগ করুন&quot; বাটনে চাপুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => setMinModal({ open: true, name: '' })}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন মন্ত্রণালয়/বিভাগ যোগ করুন
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-20">ক্র.নং</th>
                    <th className="py-3 px-4">মন্ত্রণালয় / বিভাগের নাম</th>
                    <th className="py-3 px-4">বাজেট আইডি (Login ID)</th>
                    <th className="py-3 px-4">অধীনস্থ দপ্তর সংখ্যা</th>
                    <th className="py-3 px-4 text-center w-28">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ministries.map((m, idx) => {
                    const deptCount = departments.filter((d) => d.ministry_id === m.id).length
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                          {toBanglaNumber(idx + 1)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {m.name}
                        </td>
                        <td className="py-3.5 px-4">
                          {m.budget_id ? (
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-lg text-xs">
                              {m.budget_id}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">নির্ধারিত নেই</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {toBanglaNumber(deptCount)} টি দপ্তর
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMinModal({ open: true, id: m.id, name: m.name, budget_id: m.budget_id || '' })}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                              title="সম্পাদনা"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onConfirmDeleteMinistry(m)}
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="মুছে ফেলুন"
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

      {/* MODAL 1: MINISTRY */}
      <Dialog open={minModal.open} onOpenChange={(open) => !open && setMinModal((prev) => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {minModal.id ? 'মন্ত্রণালয়/বিভাগ সম্পাদনা' : 'নতুন মন্ত্রণালয়/বিভাগ যোগ করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">মন্ত্রণালয় / বিভাগের নাম</Label>
              <Input
                type="text"
                value={minModal.name}
                onChange={(e) => setMinModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="যেমন: অর্থ মন্ত্রণালয়, অভ্যন্তরীণ সম্পদ বিভাগ..."
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">বাজেট আইডি (Login ID)</Label>
                <span className="text-[11px] text-blue-600 font-medium">লগইন করার জন্য ব্যবহৃত হবে</span>
              </div>
              <Input
                type="text"
                value={minModal.budget_id || ''}
                onChange={(e) => setMinModal((prev) => ({ ...prev, budget_id: e.target.value }))}
                placeholder="যেমন: 10901, 10902..."
                className="rounded-xl border-slate-200 font-mono font-semibold"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMinModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={onSaveMinistry}
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
