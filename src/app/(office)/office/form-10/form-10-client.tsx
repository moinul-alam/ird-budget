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
import { saveFormITEquipmentRow, deleteFormITEquipmentRow } from '@/lib/actions/forms/it-equipment'
import type { FormItEquipmentInitial } from '@/lib/office/load-form-data'
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
  Banknote,
  Cpu,
  type LucideIcon,
} from 'lucide-react'
import { useState, useTransition, useMemo } from 'react'

export interface Form10ClientProps {
  submissionId: number | null
  itConfigs: Array<{
    /** The per-office-type admin_it_config row; null until the office saves one. */
    id: number | null
    equipment_type_id: number
    equipment_type_name: string
    /** Optional per-office-type override of the equipment's price. */
    unit_budget: number
    unit_price: number
  }>
  initialData: FormItEquipmentInitial
  /** বেতন-ভাতা মাস — the multiplier the budget engine applies to monthly figures. */
  salaryMonths: number
}

interface EquipmentCardData {
  existing_count: number
  damaged_count: number
  toner_cost: number // প্রতি টোনারের দাম
  required_qty: number // নতুন প্রয়োজন
  /** একক মূল্য — the administrator's price for one unit. */
  unit_price: number
}

// 4 cards in one line as specified
type EquipmentKey = 'computer' | 'printer' | 'scanner' | 'photocopier'

interface CardConfig {
  key: EquipmentKey
  title: string
  icon: LucideIcon
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
  salaryMonths,
}: Form10ClientProps) {
  // Bind each fixed design slot to its equipment type so the slot is priced at
  // whatever the administrator set on /admin/settings?tab=equipment — the global
  // price, or the office type's override when one exists. Never a constant.
  const cardConfigs = CARD_CONFIGS.map((c) => {
    const cfg = itConfigs.find((item) =>
      c.aliases.some((alias) =>
        item.equipment_type_name.trim().toLowerCase().includes(alias.toLowerCase())
      )
    )
    return {
      ...c,
      equipmentTypeId: cfg ? cfg.equipment_type_id : null,
      unitPrice: cfg ? cfg.unit_budget || cfg.unit_price : 0,
    }
  })

  // Initialize data keyed by EquipmentKey
  const [dataMap, setDataMap] = useState<Record<EquipmentKey, EquipmentCardData>>(() => {
    const initialMap: Record<EquipmentKey, EquipmentCardData> = {
      computer: { existing_count: 0, damaged_count: 0, toner_cost: 0, required_qty: 0, unit_price: 0 },
      printer: { existing_count: 0, damaged_count: 0, toner_cost: 0, required_qty: 0, unit_price: 0 },
      scanner: { existing_count: 0, damaged_count: 0, toner_cost: 0, required_qty: 0, unit_price: 0 },
      photocopier: { existing_count: 0, damaged_count: 0, toner_cost: 0, required_qty: 0, unit_price: 0 },
    }

    if (initialData && initialData.length > 0) {
      cardConfigs.forEach((config) => {
        // Rows are matched by equipment type, the identity the save action keys on.
        const row = initialData.find((item) =>
          config.equipmentTypeId ? item.equipment_type_id === config.equipmentTypeId : false
        )
        if (row) {
          initialMap[config.key] = {
            existing_count: Number(row.existing_count || 0),
            damaged_count: Number(row.damaged_count || 0),
            toner_cost: Number(row.toner_cost || 0),
            required_qty: Number(row.required_qty || 0),
            unit_price: Number(row.unit_budget || row.unit_price || config.unitPrice),
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
  }, [activeModalKey, cardConfigs])

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
      unit_price: activeConfig.unitPrice,
    }

    setDataMap((prev) => ({
      ...prev,
      [activeModalKey]: updatedData,
    }))

    if (submissionId && activeConfig.equipmentTypeId) {
      startTransition(async () => {
        await saveFormITEquipmentRow(submissionId, activeConfig.equipmentTypeId!, {
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
        // Clearing the row does not change the administrator's price.
        unit_price: config.unitPrice,
      },
    }))

    if (submissionId && config.equipmentTypeId) {
      startTransition(async () => {
        await deleteFormITEquipmentRow(submissionId, config.equipmentTypeId!)
      })
    }

    setKeyToDelete(null)
  }

  // সারসংক্ষেপ কার্ড ১ — কম্পিউটার সামগ্রী: প্রতি টোনারের দাম × প্রিন্টারের সংখ্যা
  // × বেতন-ভাতা মাস. The same inputs and the same multiplier the engine's 3255101
  // uses, so the card can never disagree with the budget sheet.
  const computerSuppliesTotal = useMemo(() => {
    const printerData = dataMap.printer
    return printerData.existing_count * printerData.toner_cost * salaryMonths
  }, [dataMap, salaryMonths])

  // সারসংক্ষেপ কার্ড ২ — কম্পিউটার ও আনুষঙ্গিক: প্রতিটি চাহিদা অ্যাডমিনের নিজের
  // নির্ধারিত একক মূল্যে গুণ করা হয়, যাতে মোটটি কীভাবে হলো তা দেখা যায়।
  const accessoriesRows = useMemo(
    () =>
      cardConfigs
        .map((config) => {
          const data = dataMap[config.key]
          const qty = data.required_qty || 0
          return {
            key: config.key,
            title: config.title,
            qty,
            unitPrice: config.unitPrice,
            total: qty * config.unitPrice,
          }
        })
        .filter((row) => row.qty > 0),
    [dataMap, cardConfigs]
  )

  const computerAccessoriesTotal = useMemo(
    () => accessoriesRows.reduce((sum, row) => sum + row.total, 0),
    [accessoriesRows]
  )

  const handleSaveAll = async () => {
    if (!submissionId) return
    for (const config of cardConfigs) {
      if (!config.equipmentTypeId) continue
      const data = dataMap[config.key]
      const res = await saveFormITEquipmentRow(submissionId, config.equipmentTypeId, {
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
            <span className="text-xs text-slate-400">{strings.form10.summarySubtitle}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ১. কম্পিউটার ও আনুষঙ্গিক — চাহিদাকৃত সংখ্যা × নির্ধারিত একক মূল্য */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <Cpu className="w-3.5 h-3.5" />
                    </span>
                    {strings.form10.computerAndAccessories}
                  </span>
                  <span className="text-[10px] font-semibold text-purple-600 bg-white/70 border border-purple-100 rounded-full px-2 py-0.5 shrink-0">
                    নতুন ক্রয়ের প্রাক্কলন
                  </span>
                </div>
                <p className="text-[11px] text-purple-700/80 mt-1.5">
                  {strings.form10.accessoriesCalculationNote}
                </p>

                <div className="mt-3 space-y-1">
                  {accessoriesRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-2 text-[11px] bg-white/70 border border-purple-100/70 rounded-lg px-2.5 py-1.5"
                    >
                      <span className="font-medium text-purple-900 truncate">{row.title}</span>
                      <span className="text-purple-700/80 whitespace-nowrap">
                        {toBanglaNumber(row.qty)} {strings.form10.unitPiece} ×{' '}
                        {toBanglaAmount(row.unitPrice)}
                      </span>
                      <span className="font-mono font-bold text-purple-900 whitespace-nowrap">
                        {toBanglaAmount(row.total)}
                      </span>
                    </div>
                  ))}
                  {accessoriesRows.length === 0 && (
                    <p className="text-[11px] text-purple-500/80 bg-white/60 border border-dashed border-purple-200 rounded-lg px-2.5 py-2 text-center">
                      {strings.form10.noNewRequirement}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-purple-200/70 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-purple-800">
                  {strings.form10.purchaseAllocationTotal}
                </span>
                <span className="text-lg font-extrabold font-mono text-purple-900">
                  {toBanglaAmount(computerAccessoriesTotal)}
                </span>
              </div>
            </div>

            {/* ২. কম্পিউটার সামগ্রী — প্রতি টোনারের দাম × প্রিন্টারের সংখ্যা × মাস */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Printer className="w-3.5 h-3.5" />
                    </span>
                    {strings.form10.computerSupplies}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-white/70 border border-emerald-100 rounded-full px-2 py-0.5 shrink-0">
                    {strings.form10.tonerBasedCost}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700/80 mt-1.5">
                  {strings.form10.tonerFormula} · {toBanglaNumber(salaryMonths)}{' '}
                  {strings.form10.monthUnit}
                </p>

                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px] bg-white/70 border border-emerald-100/70 rounded-lg px-2.5 py-1.5">
                    <span className="font-medium text-emerald-900">
                      {strings.form10.cards.printer}
                    </span>
                    <span className="font-mono font-bold text-emerald-900 whitespace-nowrap">
                      {toBanglaNumber(dataMap.printer.existing_count)}{' '}
                      {strings.form10.unitPiece}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] bg-white/70 border border-emerald-100/70 rounded-lg px-2.5 py-1.5">
                    <span className="font-medium text-emerald-900">
                      {strings.form10.tonerPricePerUnit}
                    </span>
                    <span className="font-mono font-bold text-emerald-900 whitespace-nowrap">
                      {toBanglaAmount(dataMap.printer.toner_cost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] bg-white/70 border border-emerald-100/70 rounded-lg px-2.5 py-1.5">
                    <span className="font-medium text-emerald-900">
                      {strings.form10.budgetMonthsLabel}
                    </span>
                    <span className="font-mono font-bold text-emerald-900 whitespace-nowrap">
                      {toBanglaNumber(salaryMonths)} {strings.form10.monthUnit}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-emerald-200/70 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-emerald-800">
                  {strings.form10.annualAllocation}
                </span>
                <span className="text-lg font-extrabold font-mono text-emerald-700">
                  {toBanglaAmount(computerSuppliesTotal)}
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

            {/* অ্যাডমিনের নির্ধারিত একক মূল্যে চাহিদার প্রাক্কলন */}
            {activeConfig && (
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between gap-3">
                <div className="text-[11px] text-purple-800">
                  {strings.form10.unitPriceLabel}:{' '}
                  <span className="font-mono font-bold text-purple-900">
                    {toBanglaAmount(activeConfig.unitPrice)}
                  </span>
                </div>
                <div className="text-[11px] text-purple-800">
                  {strings.form10.estimatedValueLabel}:{' '}
                  <span className="font-mono font-bold text-purple-900">
                    {toBanglaAmount((parseInt(requiredInput, 10) || 0) * activeConfig.unitPrice)}
                  </span>
                </div>
              </div>
            )}
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
