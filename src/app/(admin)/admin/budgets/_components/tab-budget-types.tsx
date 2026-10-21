'use client'

import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Layers, Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { BudgetTypeItem } from '@/app/actions/admin-budgets'
import { BudgetTypeModalState } from '../_types/budgets'

interface TabBudgetTypesProps {
  budgetTypes: BudgetTypeItem[]
  typeModal: BudgetTypeModalState
  setTypeModal: React.Dispatch<React.SetStateAction<BudgetTypeModalState>>
  onSaveBudgetType: () => void
  onConfirmDeleteBudgetType: (b: BudgetTypeItem) => void
  isPending: boolean
}

export function TabBudgetTypes({
  budgetTypes,
  typeModal,
  setTypeModal,
  onSaveBudgetType,
  onConfirmDeleteBudgetType,
  isPending,
}: TabBudgetTypesProps) {
  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              বাজেটের ধরণ তালিকা
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              যেমন: প্রাক্কলিত বাজেট, সংশোধিত বাজেট
            </CardDescription>
          </div>
          <Button
            onClick={() => setTypeModal({ open: true, name: '' })}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            নতুন বাজেটের ধরণ
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {budgetTypes.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো বাজেটের ধরণ পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                বাজেট কার্যক্রম শুরুর পূর্বে &quot;নতুন বাজেটের ধরণ&quot; বাটনে ক্লিক করে ধরণ যোগ করুন (যেমন: প্রাক্কলিত, সংশোধিত)।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => setTypeModal({ open: true, name: '' })}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন বাজেটের ধরণ যোগ করুন
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-20">ক্র.নং</th>
                    <th className="py-3 px-4">বাজেটের ধরণ</th>
                    <th className="py-3 px-4 text-center w-28">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgetTypes.map((b, idx) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                        {b.name}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTypeModal({ open: true, id: b.id, name: b.name })}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onConfirmDeleteBudgetType(b)}
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

      {/* MODAL 1: BUDGET TYPE */}
      <Dialog
        open={typeModal.open}
        onOpenChange={(open) => !open && setTypeModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {typeModal.id ? 'বাজেটের ধরণ সম্পাদনা' : 'নতুন বাজেটের ধরণ যুক্ত করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">বাজেটের ধরণ (যেমন: প্রাক্কলিত, সংশোধিত)</Label>
              <Input
                type="text"
                value={typeModal.name}
                onChange={(e) => setTypeModal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="বাজেটের ধরণ লিখুন..."
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTypeModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={onSaveBudgetType}
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
