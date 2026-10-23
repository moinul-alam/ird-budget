'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { saveFormITEquipmentRow, deleteFormITEquipmentRow } from '@/app/actions/forms'
import {
  Plus,
  Trash2,
  Edit2,
  Monitor,
  Printer,
  Scan,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Banknote,
  Cpu,
} from 'lucide-react'
import { useState, useTransition, useMemo } from 'react'

export interface Form10ClientProps {
  submissionId: number | null
  itConfigs: Array<{
    id: number
    equipment_type_id: number
    equipment_type_name: string
    unit_budget: number
  }>
  initialData: any[]
}

interface EquipmentCardData {
  existing_count: number
  damaged_count: number
  toner_cost: number // প্রতি টোনারের দাম
  required_qty: number // নতুন প্রয়োজন
  unit_budget: number
}

// 4 cards in one line as specified
type EquipmentKey = 'computer' | 'printer' | 'scanner' | 'photocopier'

interface CardConfig {
  key: EquipmentKey
  title: string
  icon: any
  iconColor: string
  bgIconColor: string
  // The card slots are fixed by the form design; these aliases bind each slot
  // to the matching admin_it_config row for the office type.
  aliases: string[]
  isPrinter?: boolean
}

const CARD_CONFIGS: CardConfig[] = [
  {
    key: 'computer',
    title: strings.form10.cards.computer,
    icon: Monitor,
    iconColor: 'text-blue-600',
    bgIconColor: 'bg-blue-50',
    aliases: ['কম্পিউটার', 'কম্পিউটার/ডেস্কটপ', 'ডেস্কটপ', 'computer', 'desktop'],
  },
  {
    key: 'printer',
    title: strings.form10.cards.printer,
    icon: Printer,
    iconColor: 'text-emerald-600',
    bgIconColor: 'bg-emerald-50',
    aliases: ['প্রিন্টার', 'printer'],
    isPrinter: true,
  },
  {
    key: 'scanner',
    title: strings.form10.cards.scanner,
    icon: Scan,
    iconColor: 'text-amber-600',
    bgIconColor: 'bg-amber-50',
    aliases: ['স্ক্যানার', 'scanner'],
  },
  {
    key: 'photocopier',
    title: strings.form10.cards.photocopier,
    icon: Copy,
    iconColor: 'text-purple-600',
    bgIconColor: 'bg-purple-50',
    aliases: ['ফটোকপিয়ার', 'ফটোকপি মেশিন', 'ফটোকপি', 'photocopier'],
  },
]

export function Form10Client({
  submissionId,
  itConfigs,
  initialData,
}: Form10ClientProps) {
  // Bind each fixed design slot to its admin_it_config row for this office
  // type. The unit price is whatever the admin configured, never a constant.
  const cardConfigs = CARD_CONFIGS.map((c) => {
    const cfg = itConfigs.find((item) =>
      c.aliases.some((alias) =>
        item.equipment_type_name.trim().toLowerCase().includes(alias.toLowerCase())
      )
    )
    return {
      ...c,
      itConfigId: cfg ? cfg.id : null,
      unitPrice: cfg ? cfg.unit_budget : 0,
    }
  })

  // Initialize data keyed by EquipmentKey
  const [dataMap, setDataMap] = useState<Record<EquipmentKey, EquipmentCardData>>(() => {
    const initialMap: Record<EquipmentKey, EquipmentCardData> = {
      computer: { existing_count: 0, damaged_count: 0, toner_cost: 0, required_qty: 0, unit_budget: 0 },
      printer: { existing_count: 0, damaged_count: 0, toner_cost: 0, required_qty: 0, unit_budget: 0 },
      scanner: { existing_count: 0, damaged_count: 0, toner_cost: 0, required_qty: 0, unit_budget: 0 },
      photocopier: { existing_count: 0, damaged_count: 0, toner_cost: 0, required_qty: 0, unit_budget: 0 },
    }

    if (initialData && initialData.length > 0) {
      cardConfigs.forEach((config) => {
        const row = initialData.find((item) =>
          config.itConfigId ? item.it_config_id === config.itConfigId : false
        )
        if (row) {
          initialMap[config.key] = {
            existing_count: Number(row.existing_count || 0),
            damaged_count: Number(row.damaged_count || 0),
            toner_cost: Number(row.toner_cost || 0),
            required_qty: Number(row.required_qty || 0),
            unit_budget: Number(row.unit_budget || config.unitPrice),
          }
        }
      })
    }

    return initialMap
  })

  const [isPending, startTransition] = useTransition()

  // Modal State
  const [activeModalKey, setActiveModalKey] = useState<EquipmentKey | null>(null)
  const [existingInput, setExistingInput] = useState('')
  const [damagedInput, setDamagedInput] = useState('')
  const [tonerPriceInput, setTonerPriceInput] = useState('')
  const [requiredInput, setRequiredInput] = useState('')

  // Delete State
  const [keyToDelete, setKeyToDelete] = useState<EquipmentKey | null>(null)

  const activeConfig = useMemo(() => {
    if (!activeModalKey) return null
    return cardConfigs.find((c) => c.key === activeModalKey) || null
  }, [activeModalKey])

  const hasData = (key: EquipmentKey) => {
    const d = dataMap[key]
    if (!d) return false
    return d.existing_count > 0 || d.damaged_count > 0 || d.toner_cost > 0 || d.required_qty > 0
  }

  // Open modal
  const openModal = (key: EquipmentKey) => {
    const curr = dataMap[key]
    setActiveModalKey(key)
    setExistingInput(curr.existing_count ? curr.existing_count.toString() : '')
    setDamagedInput(curr.damaged_count ? curr.damaged_count.toString() : '')
    setTonerPriceInput(curr.toner_cost ? curr.toner_cost.toString() : '')
    setRequiredInput(curr.required_qty ? curr.required_qty.toString() : '')
  }

  // Save modal handler
  const handleSaveModal = () => {
    if (!activeModalKey || !activeConfig) return

    const existingCount = parseInt(existingInput, 10) || 0
    const damagedCount = parseInt(damagedInput, 10) || 0
    const tonerPrice = activeConfig.isPrinter ? parseInt(tonerPriceInput, 10) || 0 : 0
    const requiredQty = parseInt(requiredInput, 10) || 0

    const updatedData: EquipmentCardData = {
      existing_count: existingCount,
      damaged_count: damagedCount,
      toner_cost: tonerPrice,
      required_qty: requiredQty,
      unit_budget: activeConfig.unitPrice,
    }

    setDataMap((prev) => ({
      ...prev,
      [activeModalKey]: updatedData,
    }))

    if (submissionId && activeConfig.itConfigId) {
      startTransition(async () => {
        await saveFormITEquipmentRow(submissionId, activeConfig.itConfigId!, {
          existing_count: existingCount,
          damaged_count: damagedCount,
          toner_cost: tonerPrice,
          required_qty: requiredQty,
        })
      })
    }

    setActiveModalKey(null)
  }

  // Delete card handler
  const handleConfirmDelete = () => {
    if (!keyToDelete) return
    const config = cardConfigs.find((c) => c.key === keyToDelete)
    if (!config) return

    setDataMap((prev) => ({
      ...prev,
      [keyToDelete]: {
        existing_count: 0,
        damaged_count: 0,
        toner_cost: 0,
        required_qty: 0,
        unit_budget: 0,
      },
    }))

    if (submissionId && config.itConfigId) {
      startTransition(async () => {
        await deleteFormITEquipmentRow(submissionId, config.itConfigId!)
      })
    }

    setKeyToDelete(null)
  }

  // Calculations for summary:
  // 1. কম্পিউটার সামগ্রী : based on entered toner price (e.g. printer toner price * active printers or annual projection)
  const computerSuppliesTotal = useMemo(() => {
    const printerData = dataMap.printer
    const activePrinterCount = Math.max(0, printerData.existing_count - printerData.damaged_count)
    // If toner cost is per cartridge/unit, budget projection = toner_price * (active printers or direct annual estimate)
    // We calculate based on entered toner price: if printers exist, toner_cost * active printers, else direct entered toner price
    if (activePrinterCount > 0) {
      return printerData.toner_cost * activePrinterCount
    }
    return printerData.toner_cost
  }, [dataMap])

  // 2. কম্পিউটার ও আনুষঙ্গিক: (new computer x predefined price + new printer x predefined price + scanner x predefined price + photocopier x predefined price)
  const computerAccessoriesTotal = useMemo(() => {
    return cardConfigs.reduce((sum, config) => {
      const data = dataMap[config.key]
      const qty = data.required_qty || 0
      return sum + qty * config.unitPrice
    }, 0)
  }, [dataMap])

  const handleSaveAll = async () => {
    if (!submissionId) return
    for (const config of cardConfigs) {
      if (!config.itConfigId) continue
      const data = dataMap[config.key]
      const res = await saveFormITEquipmentRow(submissionId, config.itConfigId, {
        existing_count: data.existing_count,
        damaged_count: data.damaged_count,
        toner_cost: data.toner_cost,
        required_qty: data.required_qty,
      })
      if (res && 'error' in res && res.error) return res
    }
  }

  return (
    <FormShell
      title={strings.forms.form10.title}
      formNumber={10}
      prevHref="/office/form-9"
      nextHref="/office/form-11"
      onSave={submissionId ? handleSaveAll : undefined}
    >
      <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-600" />
            {strings.form10.title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {strings.form10.subtitle}
          </p>
        </div>

        {/* 4 Cards in one line (responsive 1 col on mobile, 2 on md, 4 on lg) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cardConfigs.map((config) => {
            const data = dataMap[config.key]
            const filled = hasData(config.key)
            const Icon = config.icon

            return (
              <Card
                key={config.key}
                className={`flex flex-col justify-between transition-all duration-200 border rounded-2xl shadow-xs overflow-hidden ${
                  filled
                    ? 'border-blue-200 bg-white ring-1 ring-blue-100'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/80 px-4 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${config.bgIconColor} ${config.iconColor} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span>{config.title}</span>
                    </CardTitle>
                    {filled && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  {filled ? (
                    <div className="space-y-2 text-xs">
                      {/* বিদ্যমান সংখ্যা */}
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{strings.form10.existingCount}:</span>
                        <span className="font-bold text-slate-800">
                          {toBanglaNumber(data.existing_count)} {strings.form10.unitPiece}
                        </span>
                      </div>

                      {/* অকেজো সংখ্যা */}
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{strings.form10.damagedCount}:</span>
                        <span className={`font-bold ${data.damaged_count > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {toBanglaNumber(data.damaged_count)} {strings.form10.unitPiece}
                        </span>
                      </div>

                      {/* প্রতি টোনারের দাম (only for printer) */}
                      {config.isPrinter && (
                        <div className="flex justify-between py-1 border-b border-slate-100 bg-emerald-50/40 px-1.5 rounded">
                          <span className="text-emerald-800 font-medium">{strings.form10.tonerPricePerUnit}:</span>
                          <span className="font-bold text-emerald-700">
                            {data.toner_cost > 0 ? toBanglaAmount(data.toner_cost) : '—'}
                          </span>
                        </div>
                      )}

                      {/* নতুন প্রয়োজন */}
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">{strings.form10.newRequiredQty}:</span>
                        <span className={`font-bold ${data.required_qty > 0 ? 'text-purple-700' : 'text-slate-600'}`}>
                          {toBanglaNumber(data.required_qty)} {strings.form10.unitPiece}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-xs text-slate-400">{strings.form10.notAdded}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2">
                    {filled ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openModal(config.key)}
                          className="flex-1 text-blue-700 border-blue-200 hover:bg-blue-50 text-xs h-8 gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          {strings.form10.editInfo}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setKeyToDelete(config.key)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                          title={strings.form10.deleteInfo}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openModal(config.key)}
                        className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 text-xs h-8 gap-1.5 font-semibold"
                      >
                        <Plus className="h-3 w-3" />
                        {strings.form10.addInfo}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* SUMMARY SECTION BELOW */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              {strings.form10.summaryTitle}
            </h3>
            <span className="text-xs text-slate-400">প্রাক্কলিত হিসাব বিবরণী</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. কম্পিউটার সামগ্রী */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-emerald-600" />
                    {strings.form10.computerSupplies}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {strings.form10.tonerBasedCost}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  প্রিন্টারের প্রতি টোনারের দামের ভিত্তিতে সামগ্রিক বরাদ্দ
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
                <span className="text-xs text-slate-500">প্রাক্কলিত বরাদ্দ:</span>
                <span className="text-lg font-bold text-emerald-700">
                  {toBanglaAmount(computerSuppliesTotal)}
                </span>
              </div>
            </div>

            {/* 2. কম্পিউটার ও আনুষঙ্গিক */}
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-950 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-600" />
                    {strings.form10.computerAndAccessories}
                  </span>
                  <span className="text-[11px] text-purple-500">
                    নতুন ক্রয়ের প্রাক্কলন
                  </span>
                </div>
                <p className="text-xs text-purple-700/80 mt-1">
                  {strings.form10.accessoriesCalculationNote}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-purple-200/60 flex items-baseline justify-between">
                <span className="text-xs text-purple-800">সর্বমোট ক্রয় বরাদ্দ:</span>
                <span className="text-lg font-bold text-purple-900">
                  {toBanglaAmount(computerAccessoriesTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <Dialog open={activeModalKey !== null} onOpenChange={(open) => !open && setActiveModalKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              {activeConfig && (
                <>
                  <activeConfig.icon className={`w-5 h-5 ${activeConfig.iconColor}`} />
                  <span>{activeConfig.title} - {strings.form10.modalTitle}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* বিদ্যমান সংখ্যা */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form10.existingCount} ({strings.form10.unitPiece})
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ৫"
                value={existingInput}
                onChange={(e) => setExistingInput(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* অকেজো সংখ্যা */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form10.damagedCount} ({strings.form10.unitPiece})
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ১"
                value={damagedInput}
                onChange={(e) => setDamagedInput(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* প্রতি টোনারের দাম (only for printer) */}
            {activeConfig?.isPrinter && (
              <div className="space-y-1.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <Label className="text-xs font-semibold text-emerald-900">
                  {strings.form10.tonerPricePerUnit}
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="যেমন: ২৫০০"
                  value={tonerPriceInput}
                  onChange={(e) => setTonerPriceInput(e.target.value)}
                  className="bg-white"
                />
              </div>
            )}

            {/* নতুন প্রয়োজন */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form10.newRequiredQty} ({strings.form10.unitPiece})
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ২"
                value={requiredInput}
                onChange={(e) => setRequiredInput(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveModalKey(null)}
              disabled={isPending}
            >
              {strings.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSaveModal}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? strings.saving : strings.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={keyToDelete !== null}
        onOpenChange={(open) => !open && setKeyToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              {strings.form10.confirmDeleteTitle}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            {strings.form10.confirmDeleteDesc}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setKeyToDelete(null)}
              disabled={isPending}
            >
              {strings.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              {isPending ? strings.saving : strings.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormShell>
  )
}
