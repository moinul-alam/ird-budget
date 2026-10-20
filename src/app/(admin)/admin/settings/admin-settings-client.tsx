'use client'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  saveAdminRates,
  saveVehicleFuelConfig,
  deleteVehicleFuelConfig,
  saveVehicleRentConfig,
} from '@/app/actions/admin-settings'
import {
  Settings,
  Car,
  Fuel,
  Monitor,
  Percent,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  Save,
  Loader2,
  Sliders,
  DollarSign,
  Fuel as FuelIcon,
  HelpCircle,
  Building2,
  Mail,
  Zap,
} from 'lucide-react'
import { useState, useTransition, useMemo } from 'react'

export interface AdminSettingsClientProps {
  initialRates: Record<string, number>
  carTypes: any[]
  fuelTypes: any[]
  fuelConfigs: any[]
  rentConfigs: any[]
  equipmentTypes: any[]
}

export function AdminSettingsClient({
  initialRates,
  carTypes,
  fuelTypes,
  fuelConfigs,
  rentConfigs,
  equipmentTypes,
}: AdminSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'rates' | 'vehicles' | 'equipment'>('rates')
  const [isPending, startTransition] = useTransition()
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Section 1: Rates Form State
  const [rates, setRates] = useState<Record<string, number>>({
    house_rent_percent: initialRates.house_rent_percent ?? 50,
    medical_allowance_monthly: initialRates.medical_allowance_monthly ?? 1500,
    festival_bonus_multiplier: initialRates.festival_bonus_multiplier ?? 2,
    vat_percentage: initialRates.vat_percentage ?? 15,
    postal_expense_rate: initialRates.postal_expense_rate ?? 50,
    fuel_price_octane: initialRates.fuel_price_octane ?? 125,
    fuel_price_diesel: initialRates.fuel_price_diesel ?? 105,
    fuel_price_cng: initialRates.fuel_price_cng ?? 45,
    // Predefined IT benchmark prices
    benchmark_price_computer: initialRates.benchmark_price_computer ?? 65000,
    benchmark_price_printer: initialRates.benchmark_price_printer ?? 25000,
    benchmark_price_scanner: initialRates.benchmark_price_scanner ?? 18000,
    benchmark_price_photocopier: initialRates.benchmark_price_photocopier ?? 120000,
  })

  // Section 2: Vehicle Fuel Configs State
  const [vConfigs, setVConfigs] = useState<any[]>(fuelConfigs || [])
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false)
  const [editingFuelConfigId, setEditingFuelConfigId] = useState<number | null>(null)
  const [selectedCarId, setSelectedCarId] = useState<string>('')
  const [selectedFuelId, setSelectedFuelId] = useState<string>('')
  const [monthlyFuelQuota, setMonthlyFuelQuota] = useState('')
  const [annualLubeAllowance, setAnnualLubeAllowance] = useState('')
  const [annualMaintAllowance, setAnnualMaintAllowance] = useState('')

  // Section 3: Rent Configs State
  const [rConfigs, setRConfigs] = useState<any[]>(rentConfigs || [])
  const [isRentModalOpen, setIsRentModalOpen] = useState(false)
  const [editingRentConfigId, setEditingRentConfigId] = useState<number | null>(null)
  const [rentCarId, setRentCarId] = useState('')
  const [monthlyRentAllowance, setMonthlyRentAllowance] = useState('')

  // Delete State
  const [deleteFuelConfigId, setDeleteFuelConfigId] = useState<number | null>(null)

  const handleRateChange = (key: string, val: string) => {
    const num = parseFloat(val) || 0
    setRates((prev) => ({ ...prev, [key]: num }))
  }

  const handleSaveRates = () => {
    startTransition(async () => {
      await saveAdminRates(rates)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    })
  }

  // Open Vehicle Fuel Config Add Modal
  const openAddFuelModal = () => {
    setEditingFuelConfigId(null)
    setSelectedCarId(carTypes[0]?.id ? String(carTypes[0].id) : '')
    setSelectedFuelId(fuelTypes[0]?.id ? String(fuelTypes[0].id) : '')
    setMonthlyFuelQuota('')
    setAnnualLubeAllowance('')
    setAnnualMaintAllowance('')
    setIsFuelModalOpen(true)
  }

  // Open Vehicle Fuel Config Edit Modal
  const openEditFuelModal = (cfg: any) => {
    setEditingFuelConfigId(cfg.id)
    setSelectedCarId(String(cfg.car_type_id))
    setSelectedFuelId(String(cfg.fuel_type_id))
    setMonthlyFuelQuota(String(cfg.monthly_fuel_allowance || ''))
    setAnnualLubeAllowance(String(cfg.annual_lube_allowance || ''))
    setAnnualMaintAllowance(String(cfg.annual_maintenance_allowance || ''))
    setIsFuelModalOpen(true)
  }

  // Save Fuel Config Modal
  const handleSaveFuelModal = () => {
    if (!selectedCarId || !selectedFuelId) return
    const carId = parseInt(selectedCarId, 10)
    const fuelId = parseInt(selectedFuelId, 10)
    const fuelQuota = parseFloat(monthlyFuelQuota) || 0
    const lubeQuota = parseFloat(annualLubeAllowance) || 0
    const maintQuota = parseFloat(annualMaintAllowance) || 0

    // Match rate key based on fuel
    const fuelObj = fuelTypes.find((f) => f.id === fuelId)
    const fuelName = fuelObj?.name?.toLowerCase() || ''
    let rateKey = 'fuel_price_octane'
    if (fuelName.includes('ডিজেল') || fuelName.includes('diesel')) rateKey = 'fuel_price_diesel'
    if (fuelName.includes('গ্যাস') || fuelName.includes('সিএনজি') || fuelName.includes('cng')) rateKey = 'fuel_price_cng'

    const payload = {
      id: editingFuelConfigId || undefined,
      car_type_id: carId,
      fuel_type_id: fuelId,
      monthly_fuel_allowance: fuelQuota,
      annual_lube_allowance: lubeQuota,
      annual_maintenance_allowance: maintQuota,
      rate_key: rateKey,
    }

    startTransition(async () => {
      await saveVehicleFuelConfig(payload)
      const carObj = carTypes.find((c) => c.id === carId)
      const updatedItem = {
        ...payload,
        id: editingFuelConfigId || Date.now(),
        car_type: carObj,
        fuel_type: fuelObj,
      }

      setVConfigs((prev) => {
        if (editingFuelConfigId) {
          return prev.map((item) => (item.id === editingFuelConfigId ? updatedItem : item))
        }
        return [...prev, updatedItem]
      })

      setIsFuelModalOpen(false)
    })
  }

  // Confirm delete fuel config
  const handleConfirmDeleteFuelConfig = () => {
    if (!deleteFuelConfigId) return
    startTransition(async () => {
      await deleteVehicleFuelConfig(deleteFuelConfigId)
      setVConfigs((prev) => prev.filter((c) => c.id !== deleteFuelConfigId))
      setDeleteFuelConfigId(null)
    })
  }

  // Rent Config handlers
  const openAddRentModal = () => {
    setEditingRentConfigId(null)
    setRentCarId(carTypes[0]?.id ? String(carTypes[0].id) : '')
    setMonthlyRentAllowance('')
    setIsRentModalOpen(true)
  }

  const openEditRentModal = (cfg: any) => {
    setEditingRentConfigId(cfg.id)
    setRentCarId(String(cfg.car_type_id))
    setMonthlyRentAllowance(String(cfg.monthly_allowance || ''))
    setIsRentModalOpen(true)
  }

  const handleSaveRentModal = () => {
    if (!rentCarId) return
    const carId = parseInt(rentCarId, 10)
    const monthlyAllowance = parseFloat(monthlyRentAllowance) || 0

    const payload = {
      id: editingRentConfigId || undefined,
      car_type_id: carId,
      monthly_allowance: monthlyAllowance,
    }

    startTransition(async () => {
      await saveVehicleRentConfig(payload)
      const carObj = carTypes.find((c) => c.id === carId)
      const updatedItem = {
        ...payload,
        id: editingRentConfigId || Date.now(),
        car_type: carObj,
      }

      setRConfigs((prev) => {
        if (editingRentConfigId) {
          return prev.map((item) => (item.id === editingRentConfigId ? updatedItem : item))
        }
        return [...prev, updatedItem]
      })

      setIsRentModalOpen(false)
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Header Card matching Office AppShell / FormShell */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 lg:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {strings.admin.settings.title}
              </h1>
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                অ্যাডমিন নিয়ন্ত্রণ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {strings.admin.settings.subtitle}
            </p>
          </div>
        </div>

        {/* Global Save Button for active rates tab */}
        {activeTab === 'rates' && (
          <div className="flex items-center gap-3 shrink-0">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                {strings.saved}
              </span>
            )}
            <Button
              type="button"
              onClick={handleSaveRates}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-5 h-10 shadow-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  {strings.saving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  {strings.save}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Modern Navigation Tabs matching Office style */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl max-w-xl">
        <button
          type="button"
          onClick={() => setActiveTab('rates')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'rates'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4" />
          {strings.admin.settings.tabs.rates}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vehicles')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'vehicles'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-4 h-4" />
          {strings.admin.settings.tabs.vehicles}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('equipment')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'equipment'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Monitor className="w-4 h-4" />
          {strings.admin.settings.tabs.equipment}
        </button>
      </div>

      {/* TAB 1: GENERAL RATES */}
      {activeTab === 'rates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* বাড়ি ভাড়া শতকরা */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/70 px-5 pt-4">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
                  <span>{strings.admin.settings.ratesSection.houseRentPercent}</span>
                  <Percent className="w-4 h-4 text-blue-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-slate-500">
                  বেতনের মূল বেসিকের ওপর ভিত্তি করে বাড়ি ভাড়া প্রাক্কলন হার
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rates.house_rent_percent}
                    onChange={(e) => handleRateChange('house_rent_percent', e.target.value)}
                    className="font-mono text-base font-bold bg-white"
                  />
                  <span className="text-sm font-bold text-slate-600">%</span>
                </div>
              </CardContent>
            </Card>

            {/* মাসিক চিকিৎসা ভাতা */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/70 px-5 pt-4">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
                  <span>{strings.admin.settings.ratesSection.medicalAllowanceMonthly}</span>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-slate-500">
                  প্রতি কর্মকর্তা ও কর্মচারীর মাসিক চিকিৎসা ভাতা বরাদ্দ
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rates.medical_allowance_monthly}
                    onChange={(e) => handleRateChange('medical_allowance_monthly', e.target.value)}
                    className="font-mono text-base font-bold bg-white"
                  />
                  <span className="text-sm font-bold text-slate-600">টাকা</span>
                </div>
              </CardContent>
            </Card>

            {/* উৎসব ভাতা গুণক */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/70 px-5 pt-4">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
                  <span>{strings.admin.settings.ratesSection.festivalBonusMultiplier}</span>
                  <DollarSign className="w-4 h-4 text-purple-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-slate-500">
                  বার্ষিক উৎসব ভাতার সংখ্যা (সাধারণত ২টি পূর্ণ মূল বেতন)
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={rates.festival_bonus_multiplier}
                    onChange={(e) => handleRateChange('festival_bonus_multiplier', e.target.value)}
                    className="font-mono text-base font-bold bg-white"
                  />
                  <span className="text-sm font-bold text-slate-600">গুণ</span>
                </div>
              </CardContent>
            </Card>

            {/* অফিস ভবন ভাড়া ভ্যাট হার (%) - Form 9 Impact */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs ring-1 ring-blue-100">
              <CardHeader className="pb-3 border-b border-slate-100 bg-blue-50/60 px-5 pt-4">
                <CardTitle className="text-sm font-bold text-blue-950 flex items-center justify-between">
                  <span>{strings.admin.settings.ratesSection.vatPercentage}</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-slate-500">
                  ফর্ম ৯-এ অফিস ভাড়া হিসাবের সময় এই ভ্যাট হার সরাসরি যুক্ত হবে
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rates.vat_percentage}
                    onChange={(e) => handleRateChange('vat_percentage', e.target.value)}
                    className="font-mono text-base font-bold bg-white"
                  />
                  <span className="text-sm font-bold text-slate-600">%</span>
                </div>
              </CardContent>
            </Card>

            {/* রিটার্ন প্রতি ডাক ব্যয় হার - Form 10 Impact */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs ring-1 ring-rose-100">
              <CardHeader className="pb-3 border-b border-slate-100 bg-rose-50/60 px-5 pt-4">
                <CardTitle className="text-sm font-bold text-rose-950 flex items-center justify-between">
                  <span>{strings.admin.settings.ratesSection.postalExpenseRate}</span>
                  <Mail className="w-4 h-4 text-rose-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-slate-500">
                  ফর্ম ১০-এ দাখিলকৃত রিটার্ন সংখ্যার ওপর ডাক ব্যয় গণনার একক হার
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rates.postal_expense_rate}
                    onChange={(e) => handleRateChange('postal_expense_rate', e.target.value)}
                    className="font-mono text-base font-bold bg-white"
                  />
                  <span className="text-sm font-bold text-slate-600">টাকা</span>
                </div>
              </CardContent>
            </Card>

            {/* জ্বালানি দরসমূহ (অকটেন, ডিজেল, সিএনজি) */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-amber-50/60 px-5 pt-4">
                <CardTitle className="text-sm font-bold text-amber-950 flex items-center justify-between">
                  <span>জ্বালানি বাজার দর (প্রতি একক)</span>
                  <FuelIcon className="w-4 h-4 text-amber-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">অকটেন (প্রতি লিটার):</span>
                  <Input
                    type="number"
                    value={rates.fuel_price_octane}
                    onChange={(e) => handleRateChange('fuel_price_octane', e.target.value)}
                    className="w-24 text-right font-mono font-bold h-8 text-xs bg-white"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">ডিজেল (প্রতি লিটার):</span>
                  <Input
                    type="number"
                    value={rates.fuel_price_diesel}
                    onChange={(e) => handleRateChange('fuel_price_diesel', e.target.value)}
                    className="w-24 text-right font-mono font-bold h-8 text-xs bg-white"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">সিএনজি (প্রতি ঘনমিটার):</span>
                  <Input
                    type="number"
                    value={rates.fuel_price_cng}
                    onChange={(e) => handleRateChange('fuel_price_cng', e.target.value)}
                    className="w-24 text-right font-mono font-bold h-8 text-xs bg-white"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: VEHICLES CONFIGURATION */}
      {activeTab === 'vehicles' && (
        <div className="space-y-8">
          {/* Section A: Government Vehicles Fuel & Maintenance (Form 5) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-600" />
                  {strings.admin.settings.vehiclesSection.title} (ফর্ম ৫)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  গাড়ির ধরন ও জ্বালানির ভিত্তিতে মাসিক বরাদ্দ ও রক্ষণাবেক্ষণ সিলিং
                </p>
              </div>
              <Button
                type="button"
                onClick={openAddFuelModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5 rounded-xl font-medium shrink-0"
              >
                <Plus className="w-4 h-4" />
                {strings.admin.settings.vehiclesSection.addConfig}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">গাড়ির ধরন</TableHead>
                    <TableHead className="font-bold text-slate-700">জ্বালানির ধরন</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">মাসিক জ্বালানি কোটা (লিটার)</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">বার্ষিক লুব্রিকেন্ট বরাদ্দ</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">বার্ষিক রক্ষণাবেক্ষণ প্রাক্কলন</TableHead>
                    <TableHead className="w-24 text-center font-bold text-slate-700">কার্যক্রম</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {vConfigs.map((cfg) => (
                    <TableRow key={cfg.id} className="hover:bg-slate-50/70">
                      <TableCell className="font-semibold text-slate-800">
                        {cfg.car_type?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {cfg.fuel_type?.name || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-slate-700">
                        {toBanglaNumber(cfg.monthly_fuel_allowance || 0)} লিটার
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-slate-700">
                        {toBanglaAmount(cfg.annual_lube_allowance || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-900">
                        {toBanglaAmount(cfg.annual_maintenance_allowance || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditFuelModal(cfg)}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteFuelConfigId(cfg.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Section B: Rent Vehicles (Form 6) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  ভাড়া করা যানবাহনের মাসিক বরাদ্দ সিলিং (ফর্ম ৬)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  যানবাহন ভাড়ার ক্ষেত্রে ধরন অনুযায়ী সরকার অনুমোদিত মাসিক ভাড়া কোটা
                </p>
              </div>
              <Button
                type="button"
                onClick={openAddRentModal}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-1.5 rounded-xl font-medium shrink-0"
              >
                <Plus className="w-4 h-4" />
                ভাড়া সিলিং যোগ করুন +
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">গাড়ির ধরন</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">মাসিক অনুমোদিত ভাড়া কোটা</TableHead>
                    <TableHead className="w-24 text-center font-bold text-slate-700">কার্যক্রম</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {rConfigs.map((cfg) => (
                    <TableRow key={cfg.id} className="hover:bg-slate-50/70">
                      <TableCell className="font-semibold text-slate-800">
                        {cfg.car_type?.name || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-blue-900">
                        {toBanglaAmount(cfg.monthly_allowance || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditRentModal(cfg)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IT & EQUIPMENT PREDEFINED PRICES (Form 7) */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-600" />
              {strings.admin.settings.equipmentSection.title} (ফর্ম ৭)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {strings.admin.settings.equipmentSection.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* কম্পিউটার */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-blue-50/50 px-4 pt-4">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  কম্পিউটার প্রাক্কলিত দর
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-slate-500">প্রতি কম্পিউটার ইউনিট দর</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rates.benchmark_price_computer}
                    onChange={(e) => handleRateChange('benchmark_price_computer', e.target.value)}
                    className="font-mono text-base font-bold bg-white"
                  />
                  <span className="text-xs font-bold text-slate-600">টাকা</span>
                </div>
              </CardContent>
            </Card>

            {/* প্রিন্টার */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-emerald-50/50 px-4 pt-4">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-emerald-600" />
                  প্রিন্টার প্রাক্কলিত দর
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-slate-500">প্রতি প্রিন্টার ইউনিট দর</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rates.benchmark_price_printer}
                    onChange={(e) => handleRateChange('benchmark_price_printer', e.target.value)}
                    className="font-mono text-base font-bold bg-white"
                  />
                  <span className="text-xs font-bold text-slate-600">টাকা</span>
                </div>
              </CardContent>
            </Card>

            {/* স্ক্যানার */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-amber-50/50 px-4 pt-4">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-amber-600" />
                  স্ক্যানার প্রাক্কলিত দর
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-slate-500">প্রতি স্ক্যানার ইউনিট দর</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rates.benchmark_price_scanner}
                    onChange={(e) => handleRateChange('benchmark_price_scanner', e.target.value)}
                    className="font-mono text-base font-bold bg-white"
                  />
                  <span className="text-xs font-bold text-slate-600">টাকা</span>
                </div>
              </CardContent>
            </Card>

            {/* ফটোকপিয়ার */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 bg-purple-50/50 px-4 pt-4">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-purple-600" />
                  ফটোকপিয়ার প্রাক্কলিত দর
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-slate-500">প্রতি ফটোকপিয়ার ইউনিট দর</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rates.benchmark_price_photocopier}
                    onChange={(e) => handleRateChange('benchmark_price_photocopier', e.target.value)}
                    className="font-mono text-base font-bold bg-white"
                  />
                  <span className="text-xs font-bold text-slate-600">টাকা</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="button"
              onClick={handleSaveRates}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-6 h-10 shadow-xs"
            >
              {isPending ? strings.saving : 'আইটি দর সংরক্ষণ করুন'}
            </Button>
          </div>
        </div>
      )}

      {/* FUEL CONFIG ADD / EDIT MODAL */}
      <Dialog open={isFuelModalOpen} onOpenChange={setIsFuelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-600" />
              যানবাহন ও জ্বালানি কনফিগারেশন নির্ধারণ
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">গাড়ির ধরন</Label>
              <Select value={selectedCarId} onValueChange={(val) => setSelectedCarId(val || '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="গাড়ি নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {carTypes.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">জ্বালানির ধরন</Label>
              <Select value={selectedFuelId} onValueChange={(val) => setSelectedFuelId(val || '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="জ্বালানি নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {fuelTypes.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">মাসিক জ্বালানি বরাদ্দ (লিটার)</Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ১৫০"
                value={monthlyFuelQuota}
                onChange={(e) => setMonthlyFuelQuota(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">বার্ষিক লুব্রিকেন্ট বরাদ্দ (টাকা)</Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ১২০০০"
                value={annualLubeAllowance}
                onChange={(e) => setAnnualLubeAllowance(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">বার্ষিক রক্ষণাবেক্ষণ প্রাক্কলন (টাকা)</Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ৫০০০০"
                value={annualMaintAllowance}
                onChange={(e) => setAnnualMaintAllowance(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsFuelModalOpen(false)}>
              {strings.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSaveFuelModal}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? strings.saving : strings.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RENT CONFIG MODAL */}
      <Dialog open={isRentModalOpen} onOpenChange={setIsRentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              ভাড়া করা যানবাহনের মাসিক সিলিং
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">গাড়ির ধরন</Label>
              <Select value={rentCarId} onValueChange={(val) => setRentCarId(val || '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="গাড়ি নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {carTypes.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">মাসিক অনুমোদিত ভাড়া কোটা (টাকা)</Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ৫০০০"
                value={monthlyRentAllowance}
                onChange={(e) => setMonthlyRentAllowance(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsRentModalOpen(false)}>
              {strings.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSaveRentModal}
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
        open={deleteFuelConfigId !== null}
        onOpenChange={(open) => !open && setDeleteFuelConfigId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              কনফিগারেশন মুছে ফেলুন
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            আপনি কি নিশ্চিতভাবে এই যানবাহন কনফিগারেশনটি মুছে ফেলতে চান?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteFuelConfigId(null)}>
              {strings.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteFuelConfig}
              disabled={isPending}
            >
              {isPending ? strings.saving : strings.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
