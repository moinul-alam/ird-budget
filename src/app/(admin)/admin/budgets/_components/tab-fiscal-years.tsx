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
import { Calendar, Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { FiscalYearItem } from '@/app/actions/admin-budgets'
import { FiscalYearModalState } from '../_types/budgets'

interface TabFiscalYearsProps {
  fiscalYears: FiscalYearItem[]
  fyModal: FiscalYearModalState
  setFyModal: React.Dispatch<React.SetStateAction<FiscalYearModalState>>
  onSaveFiscalYear: () => void
  onConfirmDeleteFiscalYear: (f: FiscalYearItem) => void
  isPending: boolean
}

export function TabFiscalYears({
  fiscalYears,
  fyModal,
  setFyModal,
  onSaveFiscalYear,
  onConfirmDeleteFiscalYear,
  isPending,
}: TabFiscalYearsProps) {
  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">
              অর্থবছর তালিকা
            </CardTitle>
          </div>
          <Button
            onClick={() => setFyModal({ open: true, year: '' })}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            নতুন অর্থবছর তৈরি
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {fiscalYears.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                কোনো অর্থবছর পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                বাজেট কার্যক্রম শুরুর পূর্বে &quot;নতুন অর্থবছর&quot; বাটনে ক্লিক করে অর্থবছর যোগ করুন (যেমন: ২০২৬-২৭)।
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() => setFyModal({ open: true, year: '' })}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  নতুন অর্থবছর যোগ করুন
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-20">ক্রম</th>
                    <th className="py-3 px-4">অর্থবছর</th>
                    <th className="py-3 px-4 text-center w-28">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fiscalYears.map((f, idx) => (
                    <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">
                        {f.year}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFyModal({ open: true, id: f.id, year: f.year })}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onConfirmDeleteFiscalYear(f)}
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

      {/* MODAL 2: FISCAL YEAR */}
      <Dialog
        open={fyModal.open}
        onOpenChange={(open) => !open && setFyModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {fyModal.id ? 'অর্থবছর সম্পাদনা' : 'নতুন অর্থবছর যুক্ত করুন'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">অর্থবছর (যেমন: ২০২৬-২৭)</Label>
              <Input
                type="text"
                value={fyModal.year}
                onChange={(e) => setFyModal((prev) => ({ ...prev, year: e.target.value }))}
                placeholder="অর্থবছর লিখুন..."
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFyModal((prev) => ({ ...prev, open: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={onSaveFiscalYear}
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
