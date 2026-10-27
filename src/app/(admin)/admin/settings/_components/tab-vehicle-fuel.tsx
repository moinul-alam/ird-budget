'use client'

import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { NumberField } from './number-field'
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
  FuelCategoryItem,
  VehicleConfigItem,
} from '@/lib/actions/admin-settings'
import { VehicleFuelConfigModalState } from '../_types/settings'

interface TabVehicleFuelProps {
  fuelConfigs: VehicleConfigItem[]
  vehicleTypes: VehicleTypeItem[]
  /** ref_fuel_categories rows — তেল / গ্যাস। */
  fuelCategories: FuelCategoryItem[]
  vfcModal: VehicleFuelConfigModalState
  setVfcModal: React.Dispatch<React.SetStateAction<VehicleFuelConfigModalState>>
  onSaveVfc: () => Promise<void>
  onDeleteVfc: (vehicleTypeId: number) => Promise<void>
  saving: boolean
}

export function TabVehicleFuel({
  fuelConfigs,
  vehicleTypes,
  fuelCategories,
  vfcModal,
  setVfcModal,
  onSaveVfc,
  onDeleteVfc,
  saving,
}: TabVehicleFuelProps) {
  // The form mirrors whatever categories the table supplies, so a new category needs no
  // change here. The type's existing figures pre-fill it, making a re-save non-destructive.
  const buildModalFor = (vehicleTypeId: string): VehicleFuelConfigModalState => {
    const config = fuelConfigs.find((c) => String(c.vehicle_type_id) === vehicleTypeId)
    return {
      open: true,
      vehicleTypeId,
      annualLube: config?.annual_lube_allowance ?? 0,
      annualMaint: config?.annual_maintenance_allowance ?? 0,
      sections: fuelCategories.map((category) => ({
        categoryId: category.id,
        monthlyFuel:
          config?.fuel_quotas.find((q) => q.fuel_category_id === category.id)
            ?.monthly_fuel_quota_liter ?? 0,
      })),
    }
  }

  const updateSection = (categoryId: number, monthlyFuel: number) =>
    setVfcModal((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.categoryId === categoryId ? { ...section, monthlyFuel } : section
      ),
    }))

  return (
    <>
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">যানবাহন ও জ্বালানি বরাদ্দ কনফিগারেশন</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              যানবাহন অনুযায়ী বাৎসরিক লুব্রিকেন্ট ও রক্ষণাবেক্ষণ, এবং জ্বালানির ধরনভেদে মাসিক বরাদ্দ
            </CardDescription>
          </div>
          <Button
            onClick={() => setVfcModal(buildModalFor(''))}
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
                  <th className="px-5 py-4 w-16">ক্রম</th>
                  <th className="px-5 py-4">যানবাহনের নাম</th>
                  <th className="px-5 py-4">লুব্রিকেন্ট (বার্ষিক)</th>
                  <th className="px-5 py-4">রক্ষণাবেক্ষণ (বার্ষিক)</th>
                  {fuelCategories.map((category) => (
                    <th key={category.id} className="px-5 py-4 border-l border-slate-200">
                      {category.name_bn} (মাসিক লি.)
                    </th>
                  ))}
                  <th className="px-5 py-4 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fuelConfigs.length === 0 ? (
                  <tr>
                    <td colSpan={5 + fuelCategories.length} className="text-center py-10 text-slate-400">
                      কোনো বরাদ্দ কনফিগারেশন নেই। &quot;নতুন বরাদ্দ যোগ করুন&quot; বাটনে ক্লিক করুন।
                    </td>
                  </tr>
                ) : (
                  fuelConfigs.map((config, idx) => (
                    <tr key={config.vehicle_type_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {config.vehicle_type_name}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-800">
                        {toBanglaAmount(config.annual_lube_allowance)} টাকা
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-800">
                        {toBanglaAmount(config.annual_maintenance_allowance)} টাকা
                      </td>
                      {fuelCategories.map((category) => {
                        const quota = config.fuel_quotas.find(
                          (q) => q.fuel_category_id === category.id
                        )
                        return (
                          <td
                            key={category.id}
                            className="px-5 py-4 font-mono font-bold text-emerald-700 border-l border-slate-100"
                          >
                            {quota ? `${toBanglaNumber(quota.monthly_fuel_quota_liter)} লি.` : '—'}
                          </td>
                        )
                      })}
                      <td className="px-5 py-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVfcModal(buildModalFor(String(config.vehicle_type_id)))}
                          className="rounded-xl border-slate-200 text-xs font-semibold"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-600 mr-1" />
                          সম্পাদনা
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteVfc(config.vehicle_type_id)}
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

      {/* Vehicle Fuel Config Modal — one form per vehicle type: the type's allowances, then a
          litre quota for each fuel category. */}
      {vfcModal.open && (
        <Dialog open={vfcModal.open} onOpenChange={(open) => !open && setVfcModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {vfcModal.vehicleTypeId ? 'বরাদ্দ কনফিগারেশন সম্পাদনা' : 'নতুন বরাদ্দ কনফিগারেশন'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">যানবাহনের ধরন</Label>
                <Select
                  value={vfcModal.vehicleTypeId}
                  onValueChange={(v) => setVfcModal(buildModalFor(v ?? ''))}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="যানবাহন নির্বাচন করুন">
                      {vfcModal.vehicleTypeId
                        ? vehicleTypes.find(v => String(v.id) === vfcModal.vehicleTypeId)?.name
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700">লুব্রিকেন্ট (বার্ষিক)</Label>
                  <NumberField
                    value={vfcModal.annualLube}
                    onValueChange={(annualLube) => setVfcModal(prev => ({ ...prev, annualLube }))}
                    className="rounded-xl border-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700">রক্ষণাবেক্ষণ (বার্ষিক)</Label>
                  <NumberField
                    value={vfcModal.annualMaint}
                    onValueChange={(annualMaint) => setVfcModal(prev => ({ ...prev, annualMaint }))}
                    className="rounded-xl border-slate-200 font-mono"
                  />
                </div>
              </div>

              {vfcModal.sections.map((section) => {
                const category = fuelCategories.find(c => c.id === section.categoryId)
                return (
                  <div key={section.categoryId} className="rounded-2xl border border-slate-200 p-4 space-y-2">
                    <Label className="text-sm font-bold text-slate-700">
                      {category?.name_bn} — মাসিক জ্বালানি বরাদ্দ (লিটার)
                    </Label>
                    <NumberField
                      value={section.monthlyFuel}
                      onValueChange={(monthlyFuel) => updateSection(section.categoryId, monthlyFuel)}
                      className="rounded-xl border-slate-200 font-mono"
                    />
                  </div>
                )
              })}
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
