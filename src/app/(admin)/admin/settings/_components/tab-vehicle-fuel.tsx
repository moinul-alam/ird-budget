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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import {
  VehicleTypeItem,
  FuelTypeItem,
  VehicleFuelConfigItem,
} from '@/app/actions/admin-settings'
import { VehicleFuelConfigModalState } from '../_types/settings'

interface TabVehicleFuelProps {
  fuelConfigs: VehicleFuelConfigItem[]
  vehicleTypes: VehicleTypeItem[]
  fuelTypes: FuelTypeItem[]
  vfcModal: VehicleFuelConfigModalState
  setVfcModal: React.Dispatch<React.SetStateAction<VehicleFuelConfigModalState>>
  onSaveVfc: () => Promise<void>
  onDeleteVfc: (id: number) => Promise<void>
  saving: boolean
}

export function TabVehicleFuel({
  fuelConfigs,
  vehicleTypes,
  fuelTypes,
  vfcModal,
  setVfcModal,
  onSaveVfc,
  onDeleteVfc,
  saving,
}: TabVehicleFuelProps) {
  return (
    <>
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">যানবাহন ও জ্বালানি বরাদ্দ কনফিগারেশন</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              যানবাহন অনুযায়ী মাসিক জ্বালানি, বাৎসরিক লুব্রিকেন্ট ও রক্ষণাবেক্ষণ প্রাক্কলন
            </CardDescription>
          </div>
          <Button
            onClick={() => setVfcModal({
              open: true,
              carTypeId: vehicleTypes[0] ? String(vehicleTypes[0].id) : '',
              fuelTypeId: fuelTypes[0] ? String(fuelTypes[0].id) : '',
              monthlyFuel: 0,
              annualLube: 0,
              annualMaint: 0,
            })}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            নতুন বরাদ্দ যোগ করুন
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4 w-20">ক্রম</th>
                  <th className="px-5 py-4">যানবাহনের নাম</th>
                  <th className="px-5 py-4">জ্বালানির ধরণ</th>
                  <th className="px-5 py-4">মাসিক বরাদ্দ (লি.)</th>
                  <th className="px-5 py-4">লুব্রিকেন্ট (বার্ষিক)</th>
                  <th className="px-5 py-4">রক্ষণাবেক্ষণ (বার্ষিক)</th>
                  <th className="px-5 py-4 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fuelConfigs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      কোনো বরাদ্দ কনফিগারেশন নেই। &quot;নতুন বরাদ্দ যোগ করুন&quot; বাটনে ক্লিক করুন।
                    </td>
                  </tr>
                ) : (
                  fuelConfigs.map((fc, idx) => (
                    <tr key={fc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {fc.car_name}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {fc.fuel_name}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-700">
                        {toBanglaNumber(fc.monthly_fuel_allowance)} লি.
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-800">
                        {toBanglaAmount(fc.annual_lube_allowance)} টাকা
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-800">
                        {toBanglaAmount(fc.annual_maintenance_allowance)} টাকা
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVfcModal({
                            open: true,
                            id: fc.id,
                            carTypeId: String(fc.car_type_id),
                            fuelTypeId: String(fc.fuel_type_id),
                            monthlyFuel: fc.monthly_fuel_allowance,
                            annualLube: fc.annual_lube_allowance,
                            annualMaint: fc.annual_maintenance_allowance,
                          })}
                          className="rounded-xl border-slate-200 text-xs font-semibold"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-600 mr-1" />
                          সম্পাদনা
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteVfc(fc.id)}
                          className="rounded-xl border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          মুছুন
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

      {/* Vehicle Fuel Config Modal */}
      {vfcModal.open && (
        <Dialog open={vfcModal.open} onOpenChange={(open) => !open && setVfcModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {vfcModal.id ? 'বরাদ্দ সম্পাদনা' : 'নতুন বরাদ্দ কনফিগারেশন'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">যানবাহন নির্বাচন করুন</Label>
                <Select
                  value={vfcModal.carTypeId}
                  onValueChange={(v) => setVfcModal(prev => ({ ...prev, carTypeId: v || '' }))}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="যানবাহন নির্বাচন করুন">
                      {vehicleTypes.find(c => String(c.id) === vfcModal.carTypeId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">জ্বালানি নির্বাচন করুন</Label>
                <Select
                  value={vfcModal.fuelTypeId}
                  onValueChange={(v) => setVfcModal(prev => ({ ...prev, fuelTypeId: v || '' }))}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="জ্বালানি নির্বাচন করুন">
                      {(() => {
                        const f = fuelTypes.find(item => String(item.id) === vfcModal.fuelTypeId);
                        return f ? `${f.name} (${toBanglaAmount(f.price)} টাকা/একক)` : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map(f => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name} ({toBanglaAmount(f.price)} টাকা/একক)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">মাসিক জ্বালানি সিলিং (লিটার/ঘনমিটার)</Label>
                <Input
                  type="number"
                  placeholder="যেমন: ১৫০"
                  value={vfcModal.monthlyFuel}
                  onChange={(e) => setVfcModal(prev => ({ ...prev, monthlyFuel: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl border-slate-200 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">বাৎসরিক লুব্রিকেন্ট বরাদ্দ (টাকা)</Label>
                <Input
                  type="number"
                  placeholder="যেমন: ১৫০০০"
                  value={vfcModal.annualLube}
                  onChange={(e) => setVfcModal(prev => ({ ...prev, annualLube: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl border-slate-200 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">বাৎসরিক মেরামত ও রক্ষণাবেক্ষণ (টাকা)</Label>
                <Input
                  type="number"
                  placeholder="যেমন: ৮০০০০"
                  value={vfcModal.annualMaint}
                  onChange={(e) => setVfcModal(prev => ({ ...prev, annualMaint: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl border-slate-200 font-mono"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setVfcModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveVfc} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
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
