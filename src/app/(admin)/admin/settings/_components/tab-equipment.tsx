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
import { SalaryCodeConfig } from '@/app/actions/admin-settings'
import { EquipmentModalState } from '../_types/settings'

interface TabEquipmentProps {
  salaryConfig: SalaryCodeConfig
  equipModal: EquipmentModalState
  setEquipModal: React.Dispatch<React.SetStateAction<EquipmentModalState>>
  onSaveEquipment: () => Promise<void>
  saving: boolean
}

export function TabEquipment({
  salaryConfig,
  equipModal,
  setEquipModal,
  onSaveEquipment,
  saving,
}: TabEquipmentProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Computer Card */}
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="h-1.5 w-full bg-blue-500" />
          <CardHeader className="pb-3 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base font-extrabold text-slate-800">কম্পিউটার</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">প্রতি ইউনিটের প্রাক্কলিত মূল্য</CardDescription>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Monitor className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-800 font-mono">
                {toBanglaAmount(salaryConfig.computer_price)}
              </span>
              <span className="text-xs font-semibold text-slate-400">টাকা/একক</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEquipModal({
                open: true,
                field: 'computer_price',
                title: 'প্রতি কম্পিউটারের মূল্য',
                price: salaryConfig.computer_price,
              })}
              className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              মূল্য পরিবর্তন
            </Button>
          </CardContent>
        </Card>

        {/* 2. Printer Card */}
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="h-1.5 w-full bg-emerald-500" />
          <CardHeader className="pb-3 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base font-extrabold text-slate-800">প্রিন্টার</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">প্রতি ইউনিটের প্রাক্কলিত মূল্য</CardDescription>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Printer className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-800 font-mono">
                {toBanglaAmount(salaryConfig.printer_price)}
              </span>
              <span className="text-xs font-semibold text-slate-400">টাকা/একক</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEquipModal({
                open: true,
                field: 'printer_price',
                title: 'প্রতি প্রিন্টারের মূল্য',
                price: salaryConfig.printer_price,
              })}
              className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              মূল্য পরিবর্তন
            </Button>
          </CardContent>
        </Card>

        {/* 3. Scanner Card */}
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="h-1.5 w-full bg-amber-500" />
          <CardHeader className="pb-3 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base font-extrabold text-slate-800">স্ক্যানার</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">প্রতি ইউনিটের প্রাক্কলিত মূল্য</CardDescription>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Scan className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-800 font-mono">
                {toBanglaAmount(salaryConfig.scanner_price)}
              </span>
              <span className="text-xs font-semibold text-slate-400">টাকা/একক</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEquipModal({
                open: true,
                field: 'scanner_price',
                title: 'প্রতি স্ক্যানারের মূল্য',
                price: salaryConfig.scanner_price,
              })}
              className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              মূল্য পরিবর্তন
            </Button>
          </CardContent>
        </Card>

        {/* 4. Photocopier Card */}
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="h-1.5 w-full bg-purple-500" />
          <CardHeader className="pb-3 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base font-extrabold text-slate-800">ফটোকপিয়ার</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">প্রতি ইউনিটের প্রাক্কলিত মূল্য</CardDescription>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <Copy className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-800 font-mono">
                {toBanglaAmount(salaryConfig.photocopier_price)}
              </span>
              <span className="text-xs font-semibold text-slate-400">টাকা/একক</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEquipModal({
                open: true,
                field: 'photocopier_price',
                title: 'প্রতি ফটোকপিয়ারের মূল্য',
                price: salaryConfig.photocopier_price,
              })}
              className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              মূল্য পরিবর্তন
            </Button>
          </CardContent>
        </Card>
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
