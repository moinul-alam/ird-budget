'use client'

import { toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
  Plus,
  Edit2,
  Trash2,
  Archive,
  Loader2,
  SlidersHorizontal,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react'
import { BudgetTypeItem, FiscalYearItem, CycleItem } from '@/app/actions/admin-budgets'
import { CycleModalState, BudgetTabType } from '../_types/budgets'

interface TabCyclesProps {
  cycles: CycleItem[]
  budgetTypes: BudgetTypeItem[]
  fiscalYears: FiscalYearItem[]
  canCreateCycle: boolean
  cycleModal: CycleModalState
  setCycleModal: React.Dispatch<React.SetStateAction<CycleModalState>>
  onSaveCycle: () => void
  onToggleStatus: (cycle: CycleItem) => void
  onDeleteCycle: (cycle: CycleItem) => void
  setActiveTab: (tab: BudgetTabType) => void
  showStatus: (text: string, type?: 'success' | 'error') => void
  isPending: boolean
}

export function TabCycles({
  cycles,
  budgetTypes,
  fiscalYears,
  canCreateCycle,
  cycleModal,
  setCycleModal,
  onSaveCycle,
  onToggleStatus,
  onDeleteCycle,
  setActiveTab,
  showStatus,
  isPending,
}: TabCyclesProps) {
  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              বাজেট সাইকেলসমূহ
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              অর্থবছর ও বাজেটের ধরণ অনুযায়ী বাজেট দাখিল কার্যক্রম উন্মুক্ত বা বন্ধ করুন
            </CardDescription>
          </div>
          <Button
            disabled={!canCreateCycle}
            onClick={() => {
              if (!canCreateCycle) {
                showStatus('ট্যাব ১ (বাজেটের ধরণ) এবং ট্যাব ২ (অর্থবছর) পূরণ ব্যতীত নতুন সাইকেল যোগ করা সম্ভব নয়', 'error')
                return
              }
              setCycleModal({
                open: true,
                fiscal_year: fiscalYears[0]?.year || '',
                budget_type_name: budgetTypes[0]?.name || '',
                status: 'open',
              })
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            নতুন বাজেট সাইকেল নির্ধারণ
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {!canCreateCycle ? (
            <div className="py-12 px-6 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">
                ট্যাব ১ এবং ট্যাব ২ এর তথ্য প্রয়োজন
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                বাজেট সাইকেল নির্ধারণ করার পূর্বে অনুগ্রহ করে ট্যাব ১-এ বাজেটের ধরণ এবং ট্যাব ২-এ অর্থবছর এন্ট্রি করুন।
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('budget_types')}
                  className="text-xs font-bold"
                >
                  ট্যাব ১-এ যান
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('fiscal_years')}
                  className="text-xs font-bold"
                >
                  ট্যাব ২-এ যান
                </Button>
              </div>
            </div>
          ) : cycles.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <SlidersHorizontal className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো বাজেট সাইকেল পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                নতুন সাইকেল নির্ধারণ করতে &quot;নতুন বাজেট সাইকেল নির্ধারণ&quot; বাটনে ক্লিক করুন।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() =>
                    setCycleModal({
                      open: true,
                      fiscal_year: fiscalYears[0]?.year || '',
                      budget_type_name: budgetTypes[0]?.name || '',
                      status: 'open',
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন বাজেট সাইকেল নির্ধারণ করুন
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">ক্র.নং</th>
                    <th className="py-3 px-4">অর্থবছর</th>
                    <th className="py-3 px-4">বাজেটের ধরণ</th>
                    <th className="py-3 px-4">দাখিলকৃত অফিসের সংখ্যা</th>
                    <th className="py-3 px-4">স্ট্যাটাস</th>
                    <th className="py-3 px-4 text-center">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cycles.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {toBanglaNumber(c.fiscal_year)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200/60">
                          {c.budget_type_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {c.has_data ? (
                          <span className="font-bold text-slate-800">
                            {toBanglaNumber(c.submission_count || 0)} টি অফিস
                          </span>
                        ) : (
                          <span className="text-slate-400">০ (কোনো ডাটা নেই)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(c)}
                          className="cursor-pointer group flex items-center gap-1.5"
                          title="স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন"
                        >
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold gap-1 rounded-full px-2.5 py-0.5 transition-all ${
                              c.status === 'open'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 group-hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-300 group-hover:bg-slate-200'
                            }`}
                          >
                            {c.status === 'open' ? (
                              <>
                                <Unlock className="h-3 w-3 text-emerald-600" />
                                <span>উন্মুক্ত (Open)</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3 text-slate-500" />
                                <span>বন্ধ (Closed)</span>
                              </>
                            )}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCycleModal({
                                open: true,
                                id: c.id,
                                fiscal_year: c.fiscal_year,
                                budget_type_name: c.budget_type_name,
                                status: c.status,
                              })
                            }
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                            title="সম্পাদনা করুন"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          {c.has_data ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteCycle(c)}
                              className="h-8 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-bold gap-1"
                              title="ডাটা থাকায় মুছে ফেলার পরিবর্তে আর্কাইভ করা হবে"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              <span>আর্কাইভ</span>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteCycle(c)}
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

      {/* MODAL 3: CYCLE */}
      <Dialog
        open={cycleModal.open}
        onOpenChange={(open) => !open && setCycleModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {cycleModal.id ? 'বাজেট সাইকেল সম্পাদনা' : 'নতুন বাজেট নির্ধারণ'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">বাজেটের ধরণ</Label>
              <Select
                value={cycleModal.budget_type_name}
                onValueChange={(val) => {
                  if (val) {
                    setCycleModal((prev) => ({ ...prev, budget_type_name: val }))
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="বাজেটের ধরণ নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {budgetTypes.map((b) => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অর্থবছর</Label>
              <Select
                value={cycleModal.fiscal_year}
                onValueChange={(val) => {
                  if (val) {
                    setCycleModal((prev) => ({ ...prev, fiscal_year: val }))
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-slate-200 text-xs h-10">
                  <SelectValue placeholder="অর্থবছর নির্বাচন করুন">
                    {toBanglaNumber(cycleModal.fiscal_year)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {fiscalYears.map((f) => (
                    <SelectItem key={f.id} value={f.year}>
                      {toBanglaNumber(f.year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold text-slate-700">স্ট্যাটাস</Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCycleModal((prev) => ({ ...prev, status: 'open' }))}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    cycleModal.status === 'open'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>ওপেন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCycleModal((prev) => ({ ...prev, status: 'closed' }))}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    cycleModal.status === 'closed'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>ক্লোজ্ড</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {cycleModal.status === 'open'
                  ? '• ওপেন থাকা অবস্থায় ইউজাররা বাজেট তৈরি ও দাখিল করতে পারবে।'
                  : '• ক্লোজ্ড অবস্থায় কোনো অফিস বাজেট ডাটা এন্ট্রি বা পরিবর্তন করতে পারবে না।'}
              </p>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCycleModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={onSaveCycle}
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
