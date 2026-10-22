'use client'

import { toBanglaAmount } from '@/lib/bangla'
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
import { Monitor, Printer, Scan, Copy, Edit2, Loader2 } from 'lucide-react'
import { ItItem } from '@/app/actions/admin-settings'

interface EquipmentModalState {
  open: boolean
  itemId: number | null
  title: string
  price: number
}

interface TabEquipmentProps {
  itItems: ItItem[]
  equipModal: EquipmentModalState
  setEquipModal: React.Dispatch<React.SetStateAction<EquipmentModalState>>
  onSaveEquipment: () => Promise<void>
  saving: boolean
}

const EQUIP_UI = [
  { keyword: 'computer', label: 'কম্পিউটার', modalTitle: 'প্রতি কম্পিউটারের মূল্য', icon: Monitor, color: 'blue' },
  { keyword: 'printer', label: 'প্রিন্টার', modalTitle: 'প্রতি প্রিন্টারের মূল্য', icon: Printer, color: 'emerald' },
  { keyword: 'scanner', label: 'স্ক্যানার', modalTitle: 'প্রতি স্ক্যানারের মূল্য', icon: Scan, color: 'amber' },
  { keyword: 'accessor', label: 'ফটোকপিয়ার / আনুষঙ্গিক', modalTitle: 'প্রতি ফটোকপিয়ারের মূল্য', icon: Copy, color: 'purple' },
]

export function TabEquipment({
  itItems,
  equipModal,
  setEquipModal,
  onSaveEquipment,
  saving,
}: TabEquipmentProps) {
  const findItem = (keyword: string) => itItems.find(i => i.name?.toLowerCase().includes(keyword))

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {EQUIP_UI.map((ui) => {
          const item = findItem(ui.keyword)
          const price = item?.allotted_budget || 0
          const Icon = ui.icon
          return (
            <Card key={ui.keyword} className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className={`h-1.5 w-full bg-${ui.color}-500`} />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">{ui.label}</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">প্রতি ইউনিটের প্রাক্কলিত মূল্য</CardDescription>
                </div>
                <div className={`p-2.5 bg-${ui.color}-50 text-${ui.color}-600 rounded-xl`}>
                  <Icon className="h-6 w-6" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(price)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/একক</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEquipModal({
                    open: true,
                    itemId: item?.id || null,
                    title: ui.modalTitle,
                    price: price,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  মূল্য পরিবর্তন
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Equipment Price Modal */}
      {equipModal.open && (
        <Dialog open={equipModal.open} onOpenChange={(open) => !open && setEquipModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {equipModal.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <Input
                type="number"
                placeholder="দর লিখুন"
                value={equipModal.price}
                onChange={(e) => setEquipModal(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="rounded-xl border-slate-200 font-mono text-lg font-bold"
              />
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setEquipModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveEquipment} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
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
