'use client'

import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { VehicleTypeItem, VehicleRentConfigItem } from '@/app/actions/admin-settings'
import { VehicleRentConfigModalState } from '../_types/settings'

interface TabVehicleRentProps {
  rentConfigs: VehicleRentConfigItem[]
  vehicleTypes: VehicleTypeItem[]
  vrcModal: VehicleRentConfigModalState
  setVrcModal: React.Dispatch<React.SetStateAction<VehicleRentConfigModalState>>
  onSaveVrc: () => Promise<void>
  onDeleteVrc: (id: number) => Promise<void>
  saving: boolean
}

export function TabVehicleRent({
  rentConfigs,
  vehicleTypes,
  vrcModal,
  setVrcModal,
  onSaveVrc,
  onDeleteVrc,
  saving,
}: TabVehicleRentProps) {
  return (
    <>
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">যানবাহন ভাড়া সিলিং</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              যানবাহনের ধরন অনুযায়ী মাসিক অনুমোদিত সর্বোচ্চ ভাড়া নির্ধারণ
            </CardDescription>
          </div>
          <Button
            disabled
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            নতুন ভাড়া যোগ করুন
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-24">ক্রম</th>
                  <th className="px-6 py-4">যানবাহনের নাম</th>
                  <th className="px-6 py-4">মাসিক অনুমোদিত ভাড়া</th>
                  <th className="px-6 py-4 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rentConfigs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400">
                      কোনো গাড়ি ভাড়া কনফিগারেশন নেই।
                    </td>
                  </tr>
                ) : (
                  rentConfigs.map((rc, idx) => (
                    <tr key={rc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        কনফিগারেশন প্রয়োজন
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                        {toBanglaAmount(rc.monthly_rent_rate)} টাকা
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="rounded-xl border-slate-200 text-xs font-semibold"
                        >
                          সম্পাদনা
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="rounded-xl border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600"
                        >
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

      {/* Vehicle Rent Config Modal */}
      {vrcModal.open && (
        <Dialog open={vrcModal.open} onOpenChange={(open) => !open && setVrcModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                কনফিগারেশন প্রয়োজন
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <p className="text-sm text-slate-600">এই ফিচারটি বর্তমানে উপলব্য নেই। অনুগ্রহ করে পরে কনফিগার করুন।</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setVrcModal(prev => ({ ...prev, open: false }))}>
                বন্ধ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
