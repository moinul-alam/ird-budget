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
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { VehicleTypeItem } from '@/app/actions/admin-settings'
import { VehicleTypeModalState } from '../_types/settings'

interface TabVehiclesProps {
  vehicleTypes: VehicleTypeItem[]
  carModal: VehicleTypeModalState
  setCarModal: React.Dispatch<React.SetStateAction<VehicleTypeModalState>>
  onSaveVehicleType: () => Promise<void>
  onDeleteVehicleType: (id: number) => Promise<void>
  saving: boolean
}

export function TabVehicles({
  vehicleTypes,
  carModal,
  setCarModal,
  onSaveVehicleType,
  onDeleteVehicleType,
  saving,
}: TabVehiclesProps) {
  return (
    <>
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">যানবাহনের তালিকা</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              অফিসের জন্য প্রযোজ্য যানবাহনের ধরন ও তাদের প্রদর্শন ক্রম নির্ধারণ করুন
            </CardDescription>
          </div>
          <Button
            onClick={() => setCarModal({ open: true, name: '', order: vehicleTypes.length + 1 })}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            নতুন যানবাহন যোগ করুন
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-24">ক্রম</th>
                  <th className="px-6 py-4">যানবাহনের নাম</th>
                  <th className="px-6 py-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicleTypes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-10 text-slate-400">
                      কোনো যানবাহন নেই। &quot;নতুন যানবাহন যোগ করুন&quot; বাটনে ক্লিক করে যোগ করুন।
                    </td>
                  </tr>
                ) : (
                  vehicleTypes.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {v.name}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCarModal({ open: true, id: v.id, name: v.name, order: idx + 1 })}
                          className="rounded-xl border-slate-200 text-xs font-semibold"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-600 mr-1" />
                          সম্পাদনা
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteVehicleType(v.id)}
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

      {/* Vehicle Type Modal */}
      {carModal.open && (
        <Dialog open={carModal.open} onOpenChange={(open) => !open && setCarModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {carModal.id ? 'যানবাহনের তথ্য সম্পাদনা' : 'নতুন যানবাহন যোগ করুন'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">যানবাহনের নাম</Label>
                <Input
                  type="text"
                  placeholder="যেমন: জিপ, মাইক্রোবাস, সেডান কার"
                  value={carModal.name}
                  onChange={(e) => setCarModal(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border-slate-200 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">ক্রম (সাজানোর জন্য ক্রমিক নং)</Label>
                <Input
                  type="number"
                  value={carModal.order}
                  onChange={(e) => setCarModal(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                  className="rounded-xl border-slate-200 font-mono"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setCarModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveVehicleType} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
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
