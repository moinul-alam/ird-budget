'use client'

import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
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
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { FuelTypeItem } from '@/app/actions/admin-settings'
import { FuelTypeModalState } from '../_types/settings'

interface TabFuelsProps {
  fuelTypes: FuelTypeItem[]
  fuelModal: FuelTypeModalState
  setFuelModal: React.Dispatch<React.SetStateAction<FuelTypeModalState>>
  onSaveFuelType: () => Promise<void>
  onDeleteFuelType: (id: number) => Promise<void>
  saving: boolean
}

export function TabFuels({
  fuelTypes,
  fuelModal,
  setFuelModal,
  onSaveFuelType,
  onDeleteFuelType,
  saving,
}: TabFuelsProps) {
  return (
    <>
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">জ্বালানির দর</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              জ্বালানির নাম, একক প্রতি বর্তমান মূল্য ও প্রদর্শন ক্রম
            </CardDescription>
          </div>
          <Button
            onClick={() => setFuelModal({ open: true, name: '', price: 0, order: fuelTypes.length + 1 })}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            নতুন জ্বালানি যোগ করুন
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-24">ক্রম</th>
                  <th className="px-6 py-4">জ্বালানীর নাম</th>
                  <th className="px-6 py-4">দর (প্রতি একক)</th>
                  <th className="px-6 py-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fuelTypes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400">
                      কোনো জ্বালানির ধরন নেই।
                    </td>
                  </tr>
                ) : (
                  fuelTypes.map((f, idx) => (
                    <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {f.name}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                        {toBanglaAmount(f.price || 0)} টাকা
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFuelModal({ open: true, id: f.id, name: f.name, price: f.price || 0, order: idx + 1 })}
                          className="rounded-xl border-slate-200 text-xs font-semibold"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-600 mr-1" />
                          সম্পাদনা
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteFuelType(f.id)}
                          className="rounded-xl border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          মুছে ফেলুন
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Fuel Type Modal */}
      {fuelModal.open && (
        <Dialog open={fuelModal.open} onOpenChange={(open) => !open && setFuelModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {fuelModal.id ? 'জ্বালানির দর সম্পাদনা' : 'নতুন জ্বালানির ধরন যোগ করুন'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">জ্বালানির নাম</Label>
                <Input
                  type="text"
                  placeholder="যেমন: অকটেন, ডিজেল, সিএনজি"
                  value={fuelModal.name}
                  onChange={(e) => setFuelModal(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border-slate-200 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">বর্তমান দর (প্রতি লিটার / ঘনমিটার)</Label>
                <Input
                  type="number"
                  value={fuelModal.price}
                  onChange={(e) => setFuelModal(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl border-slate-200 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">ক্রম</Label>
                <Input
                  type="number"
                  value={fuelModal.order}
                  onChange={(e) => setFuelModal(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                  className="rounded-xl border-slate-200 font-mono"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setFuelModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveFuelType} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
