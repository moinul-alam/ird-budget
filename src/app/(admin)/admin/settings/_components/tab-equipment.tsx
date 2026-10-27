'use client'

import { toBanglaAmount } from '@/lib/bangla'
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
import { Monitor, Printer, Scan, Copy, Package, Edit2, Loader2, type LucideIcon } from 'lucide-react'
import { ItEquipmentTypeItem } from '@/lib/actions/admin-settings'
import { EquipmentModalState } from '../_types/settings'

interface TabEquipmentProps {
  itItems: ItEquipmentTypeItem[]
  equipModal: EquipmentModalState
  setEquipModal: React.Dispatch<React.SetStateAction<EquipmentModalState>>
  onSaveEquipment: () => Promise<void>
  saving: boolean
}

// Purely presentational: the equipment row holds no icon, so the icon/accent is
// chosen by name here; anything unrecognised falls back to a generic style.
const EQUIP_UI: Array<{ keyword: string; icon: LucideIcon; bar: string; tint: string }> = [
  { keyword: 'কম্পিউটার', icon: Monitor, bar: 'bg-blue-500', tint: 'bg-blue-50 text-blue-600' },
  { keyword: 'প্রিন্টার', icon: Printer, bar: 'bg-emerald-500', tint: 'bg-emerald-50 text-emerald-600' },
  { keyword: 'স্ক্যানার', icon: Scan, bar: 'bg-amber-500', tint: 'bg-amber-50 text-amber-600' },
  { keyword: 'ফটোকপিয়ার', icon: Copy, bar: 'bg-purple-500', tint: 'bg-purple-50 text-purple-600' },
]

const FALLBACK_UI = { icon: Package, bar: 'bg-slate-400', tint: 'bg-slate-100 text-slate-600' }

function equipmentUi(name: string) {
  return EQUIP_UI.find(ui => name.includes(ui.keyword)) ?? FALLBACK_UI
}

export function TabEquipment({
  itItems,
  equipModal,
  setEquipModal,
  onSaveEquipment,
  saving,
}: TabEquipmentProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {itItems.map((item) => {
          const ui = equipmentUi(item.name)
          const Icon = ui.icon
          return (
            <Card key={item.id} className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className={`h-1.5 w-full ${ui.bar}`} />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">{item.name}</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">প্রতি ইউনিটের প্রাক্কলিত মূল্য</CardDescription>
                </div>
                <div className={`p-2.5 rounded-xl ${ui.tint}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(item.unit_price)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/একক</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEquipModal({
                    open: true,
                    itemId: item.id,
                    title: item.name,
                    name: item.name,
                    unit_price: item.unit_price,
                    has_toner: item.has_toner,
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
              <Label className="text-sm font-bold text-slate-700">প্রতি ইউনিটের মূল্য (টাকা)</Label>
              <NumberField
                value={equipModal.unit_price}
                onValueChange={(unit_price) => setEquipModal(prev => ({ ...prev, unit_price }))}
                className="rounded-xl border-slate-200 font-mono text-lg font-bold"
              />
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={equipModal.has_toner}
                  onChange={(e) => setEquipModal(prev => ({ ...prev, has_toner: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800">টোনার-চালিত যন্ত্র</span>
                  <span className="block text-slate-500">
                    এই যন্ত্রের সংখ্যা টোনার খরচে (৩২১১১২৫) যোগ হবে। প্রিন্টার ও ফটোকপিয়ারের জন্য চালু রাখুন।
                  </span>
                </span>
              </label>
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
