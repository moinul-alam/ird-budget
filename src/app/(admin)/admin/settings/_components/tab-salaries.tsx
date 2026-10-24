'use client'

import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
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
import {
  Calendar,
  HeartHandshake,
  Bus,
  GraduationCap,
  Home,
  Smartphone,
  PhoneCall,
  Coffee,
  Sparkles,
  Gift,
  Building,
  Mail,
  Sliders,
  Edit2,
  Plus,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import { SalaryTileItem, SalarySlabItem } from '@/app/actions/admin-settings'
import {
  SalaryNumberModalState,
  SalaryGradeModalState,
  SalarySlabModalState,
} from '../_types/settings'
import { NumberField } from './number-field'

interface TabSalariesProps {
  tiles: SalaryTileItem[]
  slabs: SalarySlabItem[]
  grades: number[]
  numModal: SalaryNumberModalState
  setNumModal: React.Dispatch<React.SetStateAction<SalaryNumberModalState>>
  gradeModal: SalaryGradeModalState
  setGradeModal: React.Dispatch<React.SetStateAction<SalaryGradeModalState>>
  slabModal: SalarySlabModalState
  setSlabModal: React.Dispatch<React.SetStateAction<SalarySlabModalState>>
  onSaveNumberField: () => Promise<void>
  onSaveGradeField: () => Promise<void>
  onSaveSlabs: () => Promise<void>
  saving: boolean
}

// Purely presentational: the stored tile carries its label, unit and editors,
// but not an icon or accent, so the icon/accent lookup stays in the component.
const TILE_UI: Record<string, { icon: LucideIcon; bar: string; tint: string }> = {
  salary_months: { icon: Calendar, bar: 'bg-emerald-500', tint: 'bg-emerald-50 text-emerald-600' },
  duty_allowance: { icon: HeartHandshake, bar: 'bg-blue-500', tint: 'bg-blue-50 text-blue-600' },
  transport_allowance: { icon: Bus, bar: 'bg-indigo-500', tint: 'bg-indigo-50 text-indigo-600' },
  education_allowance: { icon: GraduationCap, bar: 'bg-purple-500', tint: 'bg-purple-50 text-purple-600' },
  house_rent: { icon: Home, bar: 'bg-teal-500', tint: 'bg-teal-50 text-teal-600' },
  medical_allowance: { icon: HeartHandshake, bar: 'bg-rose-500', tint: 'bg-rose-50 text-rose-600' },
  mobile_allowance: { icon: Smartphone, bar: 'bg-amber-500', tint: 'bg-amber-50 text-amber-600' },
  telephone_allowance: { icon: PhoneCall, bar: 'bg-cyan-500', tint: 'bg-cyan-50 text-cyan-600' },
  tiffin_allowance: { icon: Coffee, bar: 'bg-orange-500', tint: 'bg-orange-50 text-orange-600' },
  wash_allowance: { icon: Sparkles, bar: 'bg-sky-500', tint: 'bg-sky-50 text-sky-600' },
  entertainment_allowance: { icon: Coffee, bar: 'bg-lime-500', tint: 'bg-lime-50 text-lime-600' },
  special_benefit: { icon: Gift, bar: 'bg-violet-500', tint: 'bg-violet-50 text-violet-600' },
  noboborsho_percent: { icon: Sparkles, bar: 'bg-red-500', tint: 'bg-red-50 text-red-600' },
  festival_bonus_multiplier: { icon: Gift, bar: 'bg-emerald-500', tint: 'bg-emerald-50 text-emerald-600' },
  office_rent_vat_percent: { icon: Building, bar: 'bg-slate-700', tint: 'bg-slate-100 text-slate-700' },
  postal_rate: { icon: Mail, bar: 'bg-fuchsia-500', tint: 'bg-fuchsia-50 text-fuchsia-600' },
}

const FALLBACK_UI = { icon: Sliders, bar: 'bg-slate-400', tint: 'bg-slate-100 text-slate-600' }

function formatValue(value: number, format: SalaryTileItem['value_format']) {
  if (format === 'percent') return `${toBanglaNumber(value)}%`
  if (format === 'amount') return toBanglaAmount(value)
  return toBanglaNumber(value)
}

export function TabSalaries({
  tiles,
  slabs,
  grades,
  numModal,
  setNumModal,
  gradeModal,
  setGradeModal,
  slabModal,
  setSlabModal,
  onSaveNumberField,
  onSaveGradeField,
  onSaveSlabs,
  saving,
}: TabSalariesProps) {
  const bandValues = (key: string) => slabs.filter((s) => s.config_key === key)
  const lowGrade = grades.length > 0 ? grades[0] : 1
  const highGrade = grades.length > 0 ? grades[grades.length - 1] : 20

  const openTile = (tile: SalaryTileItem) => {
    if (tile.input_type === 'slab') {
      setSlabModal({
        open: true,
        configKey: tile.key,
        title: tile.label_bn,
        valueFormat: tile.value_format,
        slabs: bandValues(tile.key).map((s) => ({
          from_grade: s.from_grade,
          to_grade: s.to_grade,
          value: s.value,
        })),
      })
      return
    }
    if (tile.input_type === 'grade') {
      setGradeModal({
        open: true,
        tileId: tile.id,
        title: tile.label_bn,
        value: tile.value,
        fromGrade: tile.from_grade ?? lowGrade,
        toGrade: tile.to_grade ?? highGrade,
      })
      return
    }
    setNumModal({
      open: true,
      tileId: tile.id,
      title: tile.label_bn,
      unit: tile.unit_bn,
      value: tile.value,
      secondaryLabel: tile.secondary_label_bn,
      secondaryUnit: tile.secondary_unit_bn,
      secondaryValue: tile.secondary_value,
    })
  }

  const slabUnitLabel = slabModal.valueFormat === 'percent' ? 'হার (% মূলবেতন)' : 'ভাতা (টাকা/মাস)'
  const slabInputClass =
    slabModal.valueFormat === 'percent'
      ? 'text-violet-700'
      : 'text-amber-700'

  return (
    <>
      <div className="space-y-6">
        {/* Sixteen tiles: four per row from lg upwards so the grid fills evenly. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiles.map((tile) => {
            const ui = TILE_UI[tile.key] ?? FALLBACK_UI
            const Icon = ui.icon
            const bands = bandValues(tile.key)
            return (
              <Card
                key={tile.id}
                className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className={`h-1.5 w-full ${ui.bar}`} />
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-800">{tile.label_bn}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      {tile.description_bn || tile.unit_bn}
                    </CardDescription>
                  </div>
                  <div className={`p-2.5 rounded-xl ${ui.tint}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {tile.input_type === 'slab' ? (
                    <div className="space-y-1.5 mt-2 min-h-[3.25rem]">
                      {bands.length === 0 ? (
                        <span className="text-sm text-slate-400">কোনো স্ল্যাব নেই</span>
                      ) : (
                        bands.map((band) => (
                          <div
                            key={band.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-500">
                              গ্রেড {toBanglaNumber(band.from_grade)}–{toBanglaNumber(band.to_grade)}
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              {formatValue(band.value, tile.value_format)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : tile.secondary_label_bn ? (
                    // A rate × quantity card (ডাক) shows both values, since the formula
                    // multiplies them and the pair is what the reader needs to check.
                    <div className="mt-2 min-h-[3.25rem] space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-extrabold text-slate-800 font-mono">
                          {formatValue(tile.value, tile.value_format)}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">{tile.unit_bn}</span>
                      </div>
                      <div className="flex items-baseline justify-between border-t border-dashed border-slate-200 pt-1">
                        <span className="text-xs font-semibold text-slate-500">
                          {tile.secondary_label_bn}
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-700">
                          {toBanglaNumber(tile.secondary_value)}
                          {tile.secondary_unit_bn ? ` ${tile.secondary_unit_bn}` : ''}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between mt-2 min-h-[3.25rem]">
                      <span className="text-3xl font-extrabold text-slate-800 font-mono">
                        {formatValue(tile.value, tile.value_format)}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">{tile.unit_bn}</span>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTile(tile)}
                    className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                  >
                    {tile.input_type === 'slab' ? (
                      <>
                        <Sliders className="h-3.5 w-3.5" />
                        স্ল্যাব সম্পাদনা করুন
                      </>
                    ) : (
                      <>
                        <Edit2 className="h-3.5 w-3.5" />
                        পরিবর্তন করুন
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Number Value Modal */}
      {numModal.open && (
        <Dialog open={numModal.open} onOpenChange={(open) => !open && setNumModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {numModal.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              {numModal.secondaryLabel ? (
                // Paired card: both fields are joined by the formula, so they are edited
                // together. The labels come from the row, not from this component.
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">
                      {numModal.title} ({numModal.unit})
                    </Label>
                    <NumberField
                      value={numModal.value}
                      onValueChange={(value) => setNumModal(prev => ({ ...prev, value }))}
                      className="rounded-xl border-slate-200 font-mono text-lg font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">
                      {numModal.secondaryLabel}
                      {numModal.secondaryUnit ? ` (${numModal.secondaryUnit})` : ''}
                    </Label>
                    <NumberField
                      value={numModal.secondaryValue}
                      onValueChange={(secondaryValue) =>
                        setNumModal(prev => ({ ...prev, secondaryValue }))
                      }
                      className="rounded-xl border-slate-200 font-mono text-lg font-bold"
                    />
                  </div>
                </>
              ) : (
                <>
                  <Label className="text-sm font-bold text-slate-700">
                    মান লিখুন ({numModal.unit})
                  </Label>
                  <NumberField
                    value={numModal.value}
                    onValueChange={(value) => setNumModal(prev => ({ ...prev, value }))}
                    className="rounded-xl border-slate-200 font-mono text-lg font-bold"
                  />
                </>
              )}
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setNumModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveNumberField} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Grade-Range Allowance Modal */}
      {gradeModal.open && (
        <Dialog open={gradeModal.open} onOpenChange={(open) => !open && setGradeModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {gradeModal.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">ভাতার হার (টাকা/মাস)</Label>
                <NumberField
                  value={gradeModal.value}
                  onValueChange={(value) => setGradeModal(prev => ({ ...prev, value }))}
                  className="rounded-xl border-slate-200 font-mono text-base font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">প্রযোজ্য গ্রেড পরিসীমা</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">হতে গ্রেড:</span>
                    <Select
                      value={String(gradeModal.fromGrade)}
                      onValueChange={(v) => setGradeModal(prev => ({ ...prev, fromGrade: parseInt(v || String(lowGrade)) }))}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="গ্রেড নির্বাচন করুন">
                          {gradeModal.fromGrade ? `গ্রেড ${toBanglaNumber(gradeModal.fromGrade)}` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map(g => (
                          <SelectItem key={g} value={String(g)}>
                            গ্রেড {toBanglaNumber(g)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">পর্যন্ত গ্রেড:</span>
                    <Select
                      value={String(gradeModal.toGrade)}
                      onValueChange={(v) => setGradeModal(prev => ({ ...prev, toGrade: parseInt(v || String(highGrade)) }))}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="গ্রেড নির্বাচন করুন">
                          {gradeModal.toGrade ? `গ্রেড ${toBanglaNumber(gradeModal.toGrade)}` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map(g => (
                          <SelectItem key={g} value={String(g)}>
                            গ্রেড {toBanglaNumber(g)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setGradeModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveGradeField} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Grade-Banded Slabs Modal (house rent, mobile allowance, special benefit) */}
      {slabModal.open && (
        <Dialog open={slabModal.open} onOpenChange={(open) => !open && setSlabModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-xl rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {slabModal.title} স্ল্যাবসমূহ
              </DialogTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSlabModal(prev => ({
                  ...prev,
                  slabs: [
                    ...prev.slabs,
                    { from_grade: lowGrade, to_grade: highGrade, value: 0 },
                  ],
                }))}
                className="rounded-xl text-xs font-bold border-slate-200"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                স্ল্যাব যোগ করুন
              </Button>
            </DialogHeader>
            <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
              {slabModal.slabs.length === 0 && (
                <div className="text-center py-6 text-sm text-slate-400">
                  কোনো স্ল্যাব নেই। &apos;স্ল্যাব যোগ করুন&apos; বাটনে ক্লিক করে নতুন স্ল্যাব তৈরি করুন।
                </div>
              )}
              {slabModal.slabs.map((slab, i) => (
                <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>স্ল্যাব #{toBanglaNumber(i + 1)}</span>
                    <button
                      type="button"
                      onClick={() => setSlabModal(prev => ({
                        ...prev,
                        slabs: prev.slabs.filter((_, idx) => idx !== i),
                      }))}
                      className="text-rose-600 hover:text-rose-800 font-semibold text-xs"
                    >
                      মুছুন
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">হতে গ্রেড</span>
                      <Select
                        value={String(slab.from_grade)}
                        onValueChange={(v) => {
                          const val = parseInt(v || String(lowGrade))
                          setSlabModal(prev => ({
                            ...prev,
                            slabs: prev.slabs.map((s, idx) => idx === i ? { ...s, from_grade: val } : s),
                          }))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.from_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {grades.map(g => (
                            <SelectItem key={g} value={String(g)}>
                              গ্রেড {toBanglaNumber(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">পর্যন্ত গ্রেড</span>
                      <Select
                        value={String(slab.to_grade)}
                        onValueChange={(v) => {
                          const val = parseInt(v || String(highGrade))
                          setSlabModal(prev => ({
                            ...prev,
                            slabs: prev.slabs.map((s, idx) => idx === i ? { ...s, to_grade: val } : s),
                          }))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.to_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {grades.map(g => (
                            <SelectItem key={g} value={String(g)}>
                              গ্রেড {toBanglaNumber(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">{slabUnitLabel}</span>
                      <NumberField
                        min={0}
                        step="any"
                        value={slab.value}
                        onValueChange={(val) => {
                          setSlabModal(prev => ({
                            ...prev,
                            slabs: prev.slabs.map((s, idx) => idx === i ? { ...s, value: val } : s),
                          }))
                        }}
                        className={`rounded-xl border-slate-200 bg-white font-mono text-sm font-bold h-9 ${slabInputClass}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setSlabModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={onSaveSlabs} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
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
