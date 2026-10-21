'use client'

import { useState } from 'react'
import { strings } from '@/lib/strings'
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
import {
  Banknote,
  Car,
  Fuel,
  Sliders,
  DollarSign,
  Monitor,
  Printer,
  Scan,
  Copy,
  Laptop,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Loader2,
  PhoneCall,
  Bus,
  Coffee,
  Sparkles,
  HeartHandshake,
  Home,
  GraduationCap,
  Calendar,
  Gift,
  Building,
  Smartphone,
  ShieldAlert,
  Zap
} from 'lucide-react'
import {
  SalaryCodeConfig,
  VehicleTypeItem,
  FuelTypeItem,
  VehicleFuelConfigItem,
  VehicleRentConfigItem,
  UtilityTypeItem,
  saveSalaryCodeConfig,
  saveVehicleType,
  deleteVehicleType,
  saveFuelType,
  deleteFuelType,
  saveVehicleFuelConfigItem,
  deleteVehicleFuelConfigItem,
  saveVehicleRentConfigItem,
  deleteVehicleRentConfigItem,
  saveUtilityType,
  deleteUtilityType,
} from '@/app/actions/admin-settings'

interface AdminSettingsClientProps {
  initialSalaryConfig: SalaryCodeConfig
  initialVehicleTypes: VehicleTypeItem[]
  initialFuelTypes: FuelTypeItem[]
  initialFuelConfigs: VehicleFuelConfigItem[]
  initialRentConfigs: VehicleRentConfigItem[]
  initialUtilityTypes: UtilityTypeItem[]
}

type TabKey = 'salaries' | 'vehicles' | 'fuels' | 'vehicleFuel' | 'vehicleRent' | 'equipment' | 'utility'

export function AdminSettingsClient({
  initialSalaryConfig,
  initialVehicleTypes,
  initialFuelTypes,
  initialFuelConfigs,
  initialRentConfigs,
  initialUtilityTypes,
}: AdminSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('salaries')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Data states
  const [salaryConfig, setSalaryConfig] = useState<SalaryCodeConfig>(initialSalaryConfig)
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeItem[]>(initialVehicleTypes)
  const [fuelTypes, setFuelTypes] = useState<FuelTypeItem[]>(initialFuelTypes)
  const [fuelConfigs, setFuelConfigs] = useState<VehicleFuelConfigItem[]>(initialFuelConfigs)
  const [rentConfigs, setRentConfigs] = useState<VehicleRentConfigItem[]>(initialRentConfigs)
  const [utilityTypes, setUtilityTypes] = useState<UtilityTypeItem[]>(initialUtilityTypes)

  // ----------------------------------------------------
  // Modals State
  // ----------------------------------------------------

  // Tab 1: Single Number Modal (Salary months, duty, education, medical, mobile, noboborsho, festival, vat)
  const [numModal, setNumModal] = useState<{
    open: boolean
    field: keyof SalaryCodeConfig | null
    title: string
    unit: string
    value: number
  }>({ open: false, field: null, title: '', unit: '', value: 0 })

  // Tab 1: Grade-range Allowance Modal
  const [gradeModal, setGradeModal] = useState<{
    open: boolean
    field: 'transport_allowance' | 'telephone_allowance' | 'tiffin_allowance' | 'wash_allowance' | 'entertainment_allowance' | 'special_benefit_allowance' | null
    title: string
    rate: number
    fromGrade: number
    toGrade: number
  }>({ open: false, field: null, title: '', rate: 0, fromGrade: 1, toGrade: 20 })

  // Tab 1: House Rent Slabs Modal
  const [houseRentModal, setHouseRentModal] = useState(false)
  const [slabs, setSlabs] = useState(initialSalaryConfig.house_rent_slabs || [])

  // Tab 1: Mobile Allowance Slabs Modal
  const [mobileModal, setMobileModal] = useState(false)
  const [mobileSlabs, setMobileSlabs] = useState(
    initialSalaryConfig.mobile_allowance_slabs || [
      { id: 'mob-1', from_grade: 1, to_grade: 9, amount: 1500 },
      { id: 'mob-2', from_grade: 10, to_grade: 20, amount: 1000 },
    ]
  )

  // Tab 2: Vehicle Type Modal
  const [carModal, setCarModal] = useState<{ open: boolean; id?: number; name: string; order: number }>({
    open: false,
    name: '',
    order: 1,
  })

  // Tab 3: Fuel Type Modal
  const [fuelModal, setFuelModal] = useState<{ open: boolean; id?: number; name: string; price: number; order: number }>({
    open: false,
    name: '',
    price: 0,
    order: 1,
  })

  // Tab 4: Vehicle & Fuel Config Modal
  const [vfcModal, setVfcModal] = useState<{
    open: boolean
    id?: number
    carTypeId: string
    fuelTypeId: string
    monthlyFuel: number
    annualLube: number
    annualMaint: number
  }>({
    open: false,
    carTypeId: '',
    fuelTypeId: '',
    monthlyFuel: 0,
    annualLube: 0,
    annualMaint: 0,
  })

  // Tab 5: Vehicle Rent Modal
  const [vrcModal, setVrcModal] = useState<{ open: boolean; id?: number; carTypeId: string; monthlyRent: number }>({
    open: false,
    carTypeId: '',
    monthlyRent: 0,
  })

  // Tab 6: Equipment Price Modal
  const [equipModal, setEquipModal] = useState<{
    open: boolean
    field: 'computer_price' | 'laptop_price' | 'printer_price' | 'scanner_price' | 'photocopier_price' | null
    title: string
    price: number
  }>({ open: false, field: null, title: '', price: 0 })

  // Tab 7: Utility Type Modal
  const [utilityModal, setUtilityModal] = useState<{ open: boolean; id?: number; name: string; order: number }>({
    open: false,
    name: '',
    order: 1,
  })

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3500)
  }

  // ----------------------------------------------------
  // Handlers for Tab 1 (Salaries & Allowances)
  // ----------------------------------------------------
  const handleSaveNumberField = async () => {
    if (!numModal.field) return
    setSaving(true)
    setErrorMsg(null)
    const update = { [numModal.field]: numModal.value }
    const res = await saveSalaryCodeConfig(update)
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    setSalaryConfig(prev => ({ ...prev, ...update }))
    setSaving(false)
    setNumModal({ open: false, field: null, title: '', unit: '', value: 0 })
    showSuccess('মান সফলভাবে সংরক্ষিত হয়েছে।')
  }

  const handleSaveGradeField = async () => {
    if (!gradeModal.field) return
    setSaving(true)
    setErrorMsg(null)
    const update = {
      [gradeModal.field]: {
        rate: gradeModal.rate,
        from_grade: gradeModal.fromGrade,
        to_grade: gradeModal.toGrade,
      },
    }
    const res = await saveSalaryCodeConfig(update)
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    setSalaryConfig(prev => ({ ...prev, ...update }))
    setSaving(false)
    setGradeModal({ open: false, field: null, title: '', rate: 0, fromGrade: 1, toGrade: 20 })
    showSuccess('ভাতা ও প্রযোজ্য গ্রেড সংরক্ষিত হয়েছে।')
  }

  const handleSaveHouseRentSlabs = async () => {
    setSaving(true)
    setErrorMsg(null)
    const update = { house_rent_slabs: slabs }
    const res = await saveSalaryCodeConfig(update)
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    setSalaryConfig(prev => ({ ...prev, ...update }))
    setSaving(false)
    setHouseRentModal(false)
    showSuccess('বাড়ি ভাড়া স্ল্যাব কনফিগারেশন সংরক্ষিত হয়েছে।')
  }

  const handleSaveMobileSlabs = async () => {
    setSaving(true)
    setErrorMsg(null)
    const update = { mobile_allowance_slabs: mobileSlabs }
    const res = await saveSalaryCodeConfig(update)
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    setSalaryConfig(prev => ({ ...prev, ...update }))
    setSaving(false)
    setMobileModal(false)
    showSuccess('মোবাইল/সেলফোন ভাতা স্ল্যাব কনফিগারেশন সংরক্ষিত হয়েছে।')
  }

  // ----------------------------------------------------
  // Handlers for Tab 2 (Vehicle Types)
  // ----------------------------------------------------
  const handleSaveVehicleType = async () => {
    if (!carModal.name.trim()) return
    setSaving(true)
    setErrorMsg(null)
    const res = await saveVehicleType({
      id: carModal.id,
      name: carModal.name.trim(),
      order: carModal.order,
    })
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    setVehicleTypes(prev => {
      if (carModal.id) {
        return prev.map(c => c.id === carModal.id ? { ...c, name: carModal.name.trim(), order: carModal.order } : c).sort((a,b) => a.order - b.order)
      }
      return [...prev, { id: Date.now(), name: carModal.name.trim(), order: carModal.order }].sort((a,b) => a.order - b.order)
    })
    setSaving(false)
    setCarModal({ open: false, name: '', order: 1 })
    showSuccess('যানবাহনের ধরন সংরক্ষিত হয়েছে।')
  }

  const handleDeleteVehicleType = async (id: number) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই যানবাহনের ধরনটি মুছে ফেলতে চান?')) return
    const res = await deleteVehicleType(id)
    if (res.error) {
      alert(res.error)
      return
    }
    setVehicleTypes(prev => prev.filter(c => c.id !== id))
    setFuelConfigs(prev => prev.filter(f => f.car_type_id !== id))
    setRentConfigs(prev => prev.filter(r => r.car_type_id !== id))
    showSuccess('যানবাহনের ধরন মুছে ফেলা হয়েছে।')
  }

  // ----------------------------------------------------
  // Handlers for Tab 3 (Fuel Types)
  // ----------------------------------------------------
  const handleSaveFuelType = async () => {
    if (!fuelModal.name.trim()) return
    setSaving(true)
    setErrorMsg(null)
    const res = await saveFuelType({
      id: fuelModal.id,
      name: fuelModal.name.trim(),
      price: fuelModal.price,
      order: fuelModal.order,
    })
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    setFuelTypes(prev => {
      if (fuelModal.id) {
        return prev.map(f => f.id === fuelModal.id ? { ...f, name: fuelModal.name.trim(), price: fuelModal.price, order: fuelModal.order } : f).sort((a,b) => a.order - b.order)
      }
      return [...prev, { id: Date.now(), name: fuelModal.name.trim(), price: fuelModal.price, order: fuelModal.order }].sort((a,b) => a.order - b.order)
    })
    setSaving(false)
    setFuelModal({ open: false, name: '', price: 0, order: 1 })
    showSuccess('জ্বালানির দর সংরক্ষিত হয়েছে।')
  }

  const handleDeleteFuelType = async (id: number) => {
    if (!confirm('আপনি কি এই জ্বালানির ধরনটি মুছে ফেলতে চান?')) return
    const res = await deleteFuelType(id)
    if (res.error) {
      alert(res.error)
      return
    }
    setFuelTypes(prev => prev.filter(f => f.id !== id))
    setFuelConfigs(prev => prev.filter(fc => fc.fuel_type_id !== id))
    showSuccess('জ্বালানির ধরন মুছে ফেলা হয়েছে।')
  }

  // ----------------------------------------------------
  // Handlers for Tab 4 (Vehicle & Fuel Config)
  // ----------------------------------------------------
  const handleSaveVfc = async () => {
    const carId = parseInt(vfcModal.carTypeId)
    const fuelId = parseInt(vfcModal.fuelTypeId)
    if (!carId || !fuelId) {
      setErrorMsg('অনুগ্রহ করে গাড়ি এবং জ্বালানির ধরন নির্বাচন করুন।')
      return
    }
    setSaving(true)
    setErrorMsg(null)
    const res = await saveVehicleFuelConfigItem({
      id: vfcModal.id,
      car_type_id: carId,
      fuel_type_id: fuelId,
      monthly_fuel_allowance: vfcModal.monthlyFuel,
      annual_lube_allowance: vfcModal.annualLube,
      annual_maintenance_allowance: vfcModal.annualMaint,
    })
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    const cName = vehicleTypes.find(c => c.id === carId)?.name || ''
    const fName = fuelTypes.find(f => f.id === fuelId)?.name || ''
    setFuelConfigs(prev => {
      if (vfcModal.id) {
        return prev.map(fc => fc.id === vfcModal.id ? {
          ...fc,
          car_type_id: carId,
          car_name: cName,
          fuel_type_id: fuelId,
          fuel_name: fName,
          monthly_fuel_allowance: vfcModal.monthlyFuel,
          annual_lube_allowance: vfcModal.annualLube,
          annual_maintenance_allowance: vfcModal.annualMaint,
        } : fc)
      }
      return [...prev, {
        id: Date.now(),
        car_type_id: carId,
        car_name: cName,
        fuel_type_id: fuelId,
        fuel_name: fName,
        monthly_fuel_allowance: vfcModal.monthlyFuel,
        annual_lube_allowance: vfcModal.annualLube,
        annual_maintenance_allowance: vfcModal.annualMaint,
      }]
    })
    setSaving(false)
    setVfcModal({ open: false, carTypeId: '', fuelTypeId: '', monthlyFuel: 0, annualLube: 0, annualMaint: 0 })
    showSuccess('যানবাহন ও জ্বালানি বরাদ্দ সংরক্ষিত হয়েছে।')
  }

  const handleDeleteVfc = async (id: number) => {
    if (!confirm('আপনি কি এই বরাদ্দ কনফিগারেশন মুছে ফেলতে চান?')) return
    const res = await deleteVehicleFuelConfigItem(id)
    if (res.error) {
      alert(res.error)
      return
    }
    setFuelConfigs(prev => prev.filter(fc => fc.id !== id))
    showSuccess('কনফিগারেশন মুছে ফেলা হয়েছে।')
  }

  // ----------------------------------------------------
  // Handlers for Tab 5 (Vehicle Rent Config)
  // ----------------------------------------------------
  const handleSaveVrc = async () => {
    const carId = parseInt(vrcModal.carTypeId)
    if (!carId) {
      setErrorMsg('অনুগ্রহ করে গাড়ি নির্বাচন করুন।')
      return
    }
    setSaving(true)
    setErrorMsg(null)
    const res = await saveVehicleRentConfigItem({
      id: vrcModal.id,
      car_type_id: carId,
      monthly_rent_allowance: vrcModal.monthlyRent,
    })
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    const cName = vehicleTypes.find(c => c.id === carId)?.name || ''
    setRentConfigs(prev => {
      if (vrcModal.id) {
        return prev.map(rc => rc.id === vrcModal.id ? {
          ...rc,
          car_type_id: carId,
          car_name: cName,
          monthly_rent_allowance: vrcModal.monthlyRent,
        } : rc)
      }
      return [...prev, {
        id: Date.now(),
        car_type_id: carId,
        car_name: cName,
        monthly_rent_allowance: vrcModal.monthlyRent,
      }]
    })
    setSaving(false)
    setVrcModal({ open: false, carTypeId: '', monthlyRent: 0 })
    showSuccess('গাড়ি ভাড়া বরাদ্দ সংরক্ষিত হয়েছে।')
  }

  const handleDeleteVrc = async (id: number) => {
    if (!confirm('আপনি কি এই গাড়ি ভাড়া কনফিগারেশন মুছে ফেলতে চান?')) return
    const res = await deleteVehicleRentConfigItem(id)
    if (res.error) {
      alert(res.error)
      return
    }
    setRentConfigs(prev => prev.filter(rc => rc.id !== id))
    showSuccess('কনফিগারেশন মুছে ফেলা হয়েছে।')
  }

  // ----------------------------------------------------
  // Handlers for Tab 6 (Equipment Prices)
  // ----------------------------------------------------
  const handleSaveEquipment = async () => {
    if (!equipModal.field) return
    setSaving(true)
    setErrorMsg(null)
    const update = { [equipModal.field]: equipModal.price }
    const res = await saveSalaryCodeConfig(update)
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    setSalaryConfig(prev => ({ ...prev, ...update }))
    setSaving(false)
    setEquipModal({ open: false, field: null, title: '', price: 0 })
    showSuccess('সরঞ্জামের দর সংরক্ষিত হয়েছে।')
  }

  // ----------------------------------------------------
  // Handlers for Tab 7 (Utility Types)
  // ----------------------------------------------------
  const handleSaveUtility = async () => {
    if (!utilityModal.name.trim()) {
      setErrorMsg('ইউটিলিটির নাম আবশ্যক।')
      return
    }
    setSaving(true)
    setErrorMsg(null)
    const res = await saveUtilityType({
      id: utilityModal.id,
      name: utilityModal.name,
      order: utilityModal.order,
    })
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    setUtilityTypes(prev => {
      const clean = utilityModal.name.trim()
      const ord = utilityModal.order || 1
      if (utilityModal.id) {
        return prev.map(u => u.id === utilityModal.id ? { ...u, name: clean, order: ord } : u).sort((a, b) => a.order - b.order)
      }
      return [...prev, { id: Date.now(), name: clean, order: ord }].sort((a, b) => a.order - b.order)
    })
    setSaving(false)
    setUtilityModal({ open: false, name: '', order: 1 })
    showSuccess('ইউটিলিটির ধরন সংরক্ষিত হয়েছে।')
  }

  const handleDeleteUtility = async (id: number) => {
    if (!confirm('আপনি কি এই ইউটিলিটির ধরন মুছে ফেলতে চান?')) return
    const res = await deleteUtilityType(id)
    if (res.error) {
      alert(res.error)
      return
    }
    setUtilityTypes(prev => prev.filter(u => u.id !== id))
    showSuccess('ইউটিলিটির ধরন মুছে ফেলা হয়েছে।')
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
          <Sliders className="h-7 w-7 text-emerald-600" />
          {strings.admin.settings.title}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {strings.admin.settings.subtitle}
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 text-sm font-semibold">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Modern Tabs Navigation - Strictly 1 Row */}
      <div className="w-full overflow-x-auto pb-1">
        <div className="grid grid-cols-7 gap-1.5 p-1.5 bg-slate-200/70 backdrop-blur-md rounded-2xl border border-slate-200 min-w-[760px]">
          <button
            onClick={() => setActiveTab('salaries')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer truncate ${
              activeTab === 'salaries'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title={strings.admin.settings.tabs.salaries}
          >
            <Banknote className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="truncate">{strings.admin.settings.tabs.salaries}</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer truncate ${
              activeTab === 'vehicles'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title={strings.admin.settings.tabs.vehicles}
          >
            <Car className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="truncate">{strings.admin.settings.tabs.vehicles}</span>
          </button>

          <button
            onClick={() => setActiveTab('fuels')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer truncate ${
              activeTab === 'fuels'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title={strings.admin.settings.tabs.fuels}
          >
            <Fuel className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="truncate">{strings.admin.settings.tabs.fuels}</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicleFuel')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer truncate ${
              activeTab === 'vehicleFuel'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title={strings.admin.settings.tabs.vehicleFuel}
          >
            <Sliders className="h-4 w-4 shrink-0 text-purple-600" />
            <span className="truncate">{strings.admin.settings.tabs.vehicleFuel}</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicleRent')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer truncate ${
              activeTab === 'vehicleRent'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title={strings.admin.settings.tabs.vehicleRent}
          >
            <DollarSign className="h-4 w-4 shrink-0 text-teal-600" />
            <span className="truncate">{strings.admin.settings.tabs.vehicleRent}</span>
          </button>

          <button
            onClick={() => setActiveTab('equipment')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer truncate ${
              activeTab === 'equipment'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title={strings.admin.settings.tabs.equipment}
          >
            <Monitor className="h-4 w-4 shrink-0 text-indigo-600" />
            <span className="truncate">{strings.admin.settings.tabs.equipment}</span>
          </button>

          <button
            onClick={() => setActiveTab('utility')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer truncate ${
              activeTab === 'utility'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title={strings.admin.settings.tabs.utility}
          >
            <Zap className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="truncate">{strings.admin.settings.tabs.utility}</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: বেতন-ভাতা ও অন্যান্য (Cards like Form 3) */}
      {/* ==================================================== */}
      {activeTab === 'salaries' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. বেতন-ভাতা মাস */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-emerald-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">বেতন-ভাতা মাস</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">বাজেট গুণক মাস সংখ্যা</CardDescription>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Calendar className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaNumber(salaryConfig.salary_months)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">মাস</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNumModal({
                    open: true,
                    field: 'salary_months',
                    title: 'বেতন-ভাতা মাস সংখ্যা',
                    unit: 'মাস',
                    value: salaryConfig.salary_months,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 2. দায়িত্ব ভাতা */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-blue-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">দায়িত্ব ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">মাসিক হার</CardDescription>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <HeartHandshake className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(salaryConfig.duty_allowance)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNumModal({
                    open: true,
                    field: 'duty_allowance',
                    title: 'দায়িত্ব ভাতা হার',
                    unit: 'টাকা',
                    value: salaryConfig.duty_allowance,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 3. যাতায়াত ভাতা (Range Grade) */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-indigo-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">যাতায়াত ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.transport_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.transport_allowance.to_grade)}
                  </CardDescription>
                </div>
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Bus className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(salaryConfig.transport_allowance.rate)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGradeModal({
                    open: true,
                    field: 'transport_allowance',
                    title: 'যাতায়াত ভাতা ও প্রযোজ্য গ্রেড',
                    rate: salaryConfig.transport_allowance.rate,
                    fromGrade: salaryConfig.transport_allowance.from_grade,
                    toGrade: salaryConfig.transport_allowance.to_grade,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 4. শিক্ষা ভাতা */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-purple-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">শিক্ষা ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">সন্তান প্রতি মাসিক হার</CardDescription>
                </div>
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(salaryConfig.education_allowance)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNumModal({
                    open: true,
                    field: 'education_allowance',
                    title: 'শিক্ষা ভাতা হার',
                    unit: 'টাকা',
                    value: salaryConfig.education_allowance,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 5. বাড়ি ভাড়া ভাতা (Multiple Slabs) */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-teal-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">বাড়ি ভাড়া ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    {salaryConfig.house_rent_slabs.length} টি স্ল্যাব কনফিগার করা
                  </CardDescription>
                </div>
                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                  <Home className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 mt-1">
                  {salaryConfig.house_rent_slabs.map(s => (
                    <div key={s.id} className="flex justify-between text-xs py-0.5 border-b border-slate-100">
                      <span className="text-slate-600">গ্রেড {toBanglaNumber(s.from_grade)} - {toBanglaNumber(s.to_grade)}:</span>
                      <span className="font-bold text-slate-800 font-mono">{toBanglaNumber(s.percentage)}%</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSlabs(salaryConfig.house_rent_slabs)
                    setHouseRentModal(true)
                  }}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  স্ল্যাব সম্পাদনা করুন
                </Button>
              </CardContent>
            </Card>

            {/* 6. চিকিৎসা ভাতা */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-rose-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">চিকিৎসা ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">কর্মকর্তা/কর্মচারী মাসিক হার</CardDescription>
                </div>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <HeartHandshake className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(salaryConfig.medical_allowance)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNumModal({
                    open: true,
                    field: 'medical_allowance',
                    title: 'চিকিৎসা ভাতা হার',
                    unit: 'টাকা',
                    value: salaryConfig.medical_allowance,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 7. মোবাইল/সেলফোন ভাতা (Slab Wise) */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-amber-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">মোবাইল/সেলফোন ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    {(salaryConfig.mobile_allowance_slabs || []).length} টি স্ল্যাব কনফিগার করা
                  </CardDescription>
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Smartphone className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 mt-1">
                  {(salaryConfig.mobile_allowance_slabs || [
                    { id: 'mob-1', from_grade: 1, to_grade: 9, amount: 1500 },
                    { id: 'mob-2', from_grade: 10, to_grade: 20, amount: 1000 },
                  ]).map(s => (
                    <div key={s.id} className="flex justify-between text-xs py-0.5 border-b border-slate-100">
                      <span className="text-slate-600">গ্রেড {toBanglaNumber(s.from_grade)} - {toBanglaNumber(s.to_grade)}:</span>
                      <span className="font-bold text-slate-800 font-mono">{toBanglaAmount(s.amount)} টাকা</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileSlabs(salaryConfig.mobile_allowance_slabs || [
                      { id: 'mob-1', from_grade: 1, to_grade: 9, amount: 1500 },
                      { id: 'mob-2', from_grade: 10, to_grade: 20, amount: 1000 },
                    ])
                    setMobileModal(true)
                  }}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  স্ল্যাব সম্পাদনা করুন
                </Button>
              </CardContent>
            </Card>

            {/* 8. আবাসিক টেলিফোন নগদায়ন ভাতা */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-cyan-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">আবাসিক টেলিফোন নগদায়ন</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.telephone_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.telephone_allowance.to_grade)}
                  </CardDescription>
                </div>
                <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
                  <PhoneCall className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(salaryConfig.telephone_allowance.rate)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGradeModal({
                    open: true,
                    field: 'telephone_allowance',
                    title: 'আবাসিক টেলিফোন নগদায়ন ভাতা',
                    rate: salaryConfig.telephone_allowance.rate,
                    fromGrade: salaryConfig.telephone_allowance.from_grade,
                    toGrade: salaryConfig.telephone_allowance.to_grade,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 9. টিফিন ভাতা */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-orange-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">টিফিন ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.tiffin_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.tiffin_allowance.to_grade)}
                  </CardDescription>
                </div>
                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                  <Coffee className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(salaryConfig.tiffin_allowance.rate)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGradeModal({
                    open: true,
                    field: 'tiffin_allowance',
                    title: 'টিফিন ভাতা ও প্রযোজ্য গ্রেড',
                    rate: salaryConfig.tiffin_allowance.rate,
                    fromGrade: salaryConfig.tiffin_allowance.from_grade,
                    toGrade: salaryConfig.tiffin_allowance.to_grade,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 10. ধোলাই ভাতা */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-sky-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">ধোলাই ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.wash_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.wash_allowance.to_grade)}
                  </CardDescription>
                </div>
                <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(salaryConfig.wash_allowance.rate)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGradeModal({
                    open: true,
                    field: 'wash_allowance',
                    title: 'ধোলাই ভাতা ও প্রযোজ্য গ্রেড',
                    rate: salaryConfig.wash_allowance.rate,
                    fromGrade: salaryConfig.wash_allowance.from_grade,
                    toGrade: salaryConfig.wash_allowance.to_grade,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 11. আপ্যায়ন ভাতা */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-lime-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">আপ্যায়ন ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.entertainment_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.entertainment_allowance.to_grade)}
                  </CardDescription>
                </div>
                <div className="p-2.5 bg-lime-50 text-lime-600 rounded-xl">
                  <Coffee className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(salaryConfig.entertainment_allowance.rate)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGradeModal({
                    open: true,
                    field: 'entertainment_allowance',
                    title: 'আপ্যায়ন ভাতা ও প্রযোজ্য গ্রেড',
                    rate: salaryConfig.entertainment_allowance.rate,
                    fromGrade: salaryConfig.entertainment_allowance.from_grade,
                    toGrade: salaryConfig.entertainment_allowance.to_grade,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 12. বিশেষ সুবিধা */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-violet-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">বিশেষ সুবিধা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    প্রযোজ্য: গ্রেড {toBanglaNumber(salaryConfig.special_benefit_allowance.from_grade)} হতে {toBanglaNumber(salaryConfig.special_benefit_allowance.to_grade)}
                  </CardDescription>
                </div>
                <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
                  <Gift className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaAmount(salaryConfig.special_benefit_allowance.rate)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টাকা/মাস</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGradeModal({
                    open: true,
                    field: 'special_benefit_allowance',
                    title: 'বিশেষ সুবিধা ও প্রযোজ্য গ্রেড',
                    rate: salaryConfig.special_benefit_allowance.rate,
                    fromGrade: salaryConfig.special_benefit_allowance.from_grade,
                    toGrade: salaryConfig.special_benefit_allowance.to_grade,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 13. বাংলা নববর্ষ ভাতা (Percentage) */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-red-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">বাংলা নববর্ষ ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">মূল বেতনের শতকরা হার</CardDescription>
                </div>
                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaNumber(salaryConfig.noboborsho_percent)}%
                  </span>
                  <span className="text-xs font-semibold text-slate-400">বেসিকের</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNumModal({
                    open: true,
                    field: 'noboborsho_percent',
                    title: 'বাংলা নববর্ষ ভাতা হার (%)',
                    unit: '%',
                    value: salaryConfig.noboborsho_percent,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 14. উৎসব ভাতা (Number of bonuses) */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-emerald-500" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">উৎসব ভাতা</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">বাৎসরিক বোনাস সংখ্যা</CardDescription>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Gift className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaNumber(salaryConfig.festival_bonus_multiplier)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">টি বেসিক</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNumModal({
                    open: true,
                    field: 'festival_bonus_multiplier',
                    title: 'উৎসব বোনাস সংখ্যা',
                    unit: 'টি',
                    value: salaryConfig.festival_bonus_multiplier,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>

            {/* 15. অফিস ভবন ভাড়ার ভ্যাট হার */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="h-1.5 w-full bg-slate-700" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-800">অফিস ভাড়ার ভ্যাট হার</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">ভাড়া বাবদ ভ্যাটের শতকরা হার</CardDescription>
                </div>
                <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                  <Building className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-extrabold text-slate-800 font-mono">
                    {toBanglaNumber(salaryConfig.office_rent_vat_percent)}%
                  </span>
                  <span className="text-xs font-semibold text-slate-400">ভাড়ার ওপর</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNumModal({
                    open: true,
                    field: 'office_rent_vat_percent',
                    title: 'অফিস ভবন ভাড়ার ভ্যাট হার (%)',
                    unit: '%',
                    value: salaryConfig.office_rent_vat_percent,
                  })}
                  className="w-full mt-4 rounded-xl font-semibold text-xs border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  পরিবর্তন করুন
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: যানবাহনের তালিকা (car_types) */}
      {/* ==================================================== */}
      {activeTab === 'vehicles' && (
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">যানবাহনের তালিকা</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                অফিসের জন্য প্রযোজ্য যানবাহনের ধরন ও তাদের প্রদর্শন ক্রম নির্ধারণ করুন
              </CardDescription>
            </div>
            <Button
              onClick={() => setCarModal({ open: true, name: '', order: vehicleTypes.length + 1 })}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              নতুন যানবাহন যোগ করুন
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 w-24">ক্রম</th>
                    <th className="px-6 py-4">যানবাহনের নাম</th>
                    <th className="px-6 py-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicleTypes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-slate-400">
                        কোনো যানবাহন নেই। &quot;নতুন যানবাহন যোগ করুন&quot; বাটনে ক্লিক করে যোগ করুন।
                      </td>
                    </tr>
                  ) : (
                    vehicleTypes.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-500">
                          {toBanglaNumber(v.order || idx + 1)}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {v.name}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCarModal({ open: true, id: v.id, name: v.name, order: v.order })}
                            className="rounded-xl border-slate-200 text-xs font-semibold"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-600 mr-1" />
                            সম্পাদনা
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteVehicleType(v.id)}
                            className="rounded-xl border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            মুছে ফেলুন
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
      )}

      {/* ==================================================== */}
      {/* TAB 3: জ্বালানির দর (fuel_types) */}
      {/* ==================================================== */}
      {activeTab === 'fuels' && (
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">জ্বালানির দর</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                জ্বালানির নাম, একক প্রতি বর্তমান মূল্য ও প্রদর্শন ক্রম
              </CardDescription>
            </div>
            <Button
              onClick={() => setFuelModal({ open: true, name: '', price: 0, order: fuelTypes.length + 1 })}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              নতুন জ্বালানি যোগ করুন
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 w-24">ক্রম</th>
                    <th className="px-6 py-4">জ্বালানীর নাম</th>
                    <th className="px-6 py-4">দর (প্রতি একক)</th>
                    <th className="px-6 py-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fuelTypes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400">
                        কোনো জ্বালানির ধরন নেই।
                      </td>
                    </tr>
                  ) : (
                    fuelTypes.map((f, idx) => (
                      <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-500">
                          {toBanglaNumber(f.order || idx + 1)}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {f.name}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                          {toBanglaAmount(f.price)} টাকা
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFuelModal({ open: true, id: f.id, name: f.name, price: f.price, order: f.order })}
                            className="rounded-xl border-slate-200 text-xs font-semibold"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-600 mr-1" />
                            সম্পাদনা
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFuelType(f.id)}
                            className="rounded-xl border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            মুছে ফেলুন
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
      )}

      {/* ==================================================== */}
      {/* TAB 4: যানবাহন ও জ্বালানি (vehicle_fuel_config) */}
      {/* ==================================================== */}
      {activeTab === 'vehicleFuel' && (
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
                            onClick={() => handleDeleteVfc(fc.id)}
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
      )}

      {/* ==================================================== */}
      {/* TAB 5: যানবাহন ভাড়া (vehicle_rent_config) */}
      {/* ==================================================== */}
      {activeTab === 'vehicleRent' && (
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">যানবাহন ভাড়া সিলিং</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                যানবাহনের ধরন অনুযায়ী মাসিক অনুমোদিত সর্বোচ্চ ভাড়া নির্ধারণ
              </CardDescription>
            </div>
            <Button
              onClick={() => setVrcModal({
                open: true,
                carTypeId: vehicleTypes[0] ? String(vehicleTypes[0].id) : '',
                monthlyRent: 0,
              })}
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
                          {rc.car_name}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                          {toBanglaAmount(rc.monthly_rent_allowance)} টাকা
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVrcModal({
                              open: true,
                              id: rc.id,
                              carTypeId: String(rc.car_type_id),
                              monthlyRent: rc.monthly_rent_allowance,
                            })}
                            className="rounded-xl border-slate-200 text-xs font-semibold"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-600 mr-1" />
                            সম্পাদনা
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteVrc(rc.id)}
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
      )}

      {/* ==================================================== */}
      {/* TAB 6: কম্পিউটার ও আনুষঙ্গিক (4 types matching Form 7) */}
      {/* ==================================================== */}
      {activeTab === 'equipment' && (
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
      )}

      {/* ==================================================== */}
      {/* TAB 7: ইউটিলিটির তালিকা (utility_types) */}
      {/* ==================================================== */}
      {activeTab === 'utility' && (
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                ইউটিলিটির তালিকা
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                অফিসসমূহের বাজেট তৈরির জন্য ইউটিলিটি সেবাসমূহ ও তাদের প্রদর্শন ক্রম নির্ধারণ করুন
              </CardDescription>
            </div>
            <Button
              onClick={() => setUtilityModal({ open: true, name: '', order: utilityTypes.length + 1 })}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              নতুন ইউটিলিটি যোগ করুন
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 w-24">ক্রম</th>
                    <th className="px-6 py-4">ইউটিলিটির নাম</th>
                    <th className="px-6 py-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {utilityTypes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-slate-400">
                        কোনো ইউটিলিটি নেই। &quot;নতুন ইউটিলিটি যোগ করুন&quot; বাটনে ক্লিক করে যোগ করুন।
                      </td>
                    </tr>
                  ) : (
                    utilityTypes.map((u, idx) => (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-500">
                          {toBanglaNumber(u.order || idx + 1)}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {u.name}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUtilityModal({ open: true, id: u.id, name: u.name, order: u.order })}
                            className="rounded-xl border-slate-200 text-xs font-semibold"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            সম্পাদনা
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUtility(u.id)}
                            className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
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
      )}

      {/* ==================================================== */}
      {/* MODALS */}
      {/* ==================================================== */}

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
              <Label className="text-sm font-bold text-slate-700">
                মান লিখুন ({numModal.unit})
              </Label>
              <Input
                type="number"
                value={numModal.value}
                onChange={(e) => setNumModal(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                className="rounded-xl border-slate-200 font-mono text-lg font-bold"
              />
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setNumModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={handleSaveNumberField} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
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
                <Input
                  type="number"
                  value={gradeModal.rate}
                  onChange={(e) => setGradeModal(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
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
                      onValueChange={(v) => setGradeModal(prev => ({ ...prev, fromGrade: parseInt(v || '1') }))}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="গ্রেড নির্বাচন করুন">
                          {gradeModal.fromGrade ? `গ্রেড ${toBanglaNumber(gradeModal.fromGrade)}` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(g => (
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
                      onValueChange={(v) => setGradeModal(prev => ({ ...prev, toGrade: parseInt(v || '20') }))}
                    >
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="গ্রেড নির্বাচন করুন">
                          {gradeModal.toGrade ? `গ্রেড ${toBanglaNumber(gradeModal.toGrade)}` : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(g => (
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
              <Button onClick={handleSaveGradeField} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* House Rent Slabs Modal */}
      {houseRentModal && (
        <Dialog open={houseRentModal} onOpenChange={(open) => !open && setHouseRentModal(false)}>
          <DialogContent className="sm:max-w-xl rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                বাড়ি ভাড়া ভাতা স্ল্যাবসমূহ
              </DialogTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSlabs(prev => [
                  ...prev,
                  { id: `slab-${Date.now()}`, from_grade: 1, to_grade: 20, percentage: 50 }
                ])}
                className="rounded-xl text-xs font-bold border-slate-200"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                স্ল্যাব যোগ করুন
              </Button>
            </DialogHeader>
            <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
              {slabs.map((slab, i) => (
                <div key={slab.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>স্ল্যাব #{toBanglaNumber(i + 1)}</span>
                    <button
                      type="button"
                      onClick={() => setSlabs(prev => prev.filter(s => s.id !== slab.id))}
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
                          const val = parseInt(v || '1')
                          setSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, from_grade: val } : s))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.from_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, idx) => idx + 1).map(g => (
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
                          const val = parseInt(v || '20')
                          setSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, to_grade: val } : s))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.to_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, idx) => idx + 1).map(g => (
                            <SelectItem key={g} value={String(g)}>
                              গ্রেড {toBanglaNumber(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">হার (%)</span>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={slab.percentage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, percentage: val } : s))
                        }}
                        className="rounded-xl border-slate-200 bg-white font-mono text-sm font-bold text-emerald-700 h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setHouseRentModal(false)} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={handleSaveHouseRentSlabs} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile Allowance Slabs Modal */}
      {mobileModal && (
        <Dialog open={mobileModal} onOpenChange={(open) => !open && setMobileModal(false)}>
          <DialogContent className="sm:max-w-xl rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                মোবাইল/সেলফোন ভাতা স্ল্যাবসমূহ
              </DialogTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMobileSlabs(prev => [
                  ...prev,
                  { id: `mob-${Date.now()}`, from_grade: 1, to_grade: 20, amount: 1000 }
                ])}
                className="rounded-xl text-xs font-bold border-slate-200"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                স্ল্যাব যোগ করুন
              </Button>
            </DialogHeader>
            <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
              {mobileSlabs.map((slab, i) => (
                <div key={slab.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>স্ল্যাব #{toBanglaNumber(i + 1)}</span>
                    <button
                      type="button"
                      onClick={() => setMobileSlabs(prev => prev.filter(s => s.id !== slab.id))}
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
                          const val = parseInt(v || '1')
                          setMobileSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, from_grade: val } : s))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.from_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, idx) => idx + 1).map(g => (
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
                          const val = parseInt(v || '20')
                          setMobileSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, to_grade: val } : s))
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl bg-white border-slate-200">
                          <SelectValue>
                            গ্রেড {toBanglaNumber(slab.to_grade)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 20 }, (_, idx) => idx + 1).map(g => (
                            <SelectItem key={g} value={String(g)}>
                              গ্রেড {toBanglaNumber(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">ভাতা (টাকা/মাস)</span>
                      <Input
                        type="number"
                        min={0}
                        value={slab.amount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setMobileSlabs(prev => prev.map(s => s.id === slab.id ? { ...s, amount: val } : s))
                        }}
                        className="rounded-xl border-slate-200 bg-white font-mono text-sm font-bold text-amber-700 h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setMobileModal(false)} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={handleSaveMobileSlabs} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Vehicle Type Modal */}
      {carModal.open && (
        <Dialog open={carModal.open} onOpenChange={(open) => !open && setCarModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {carModal.id ? 'যানবাহনের তথ্য সম্পাদনা' : 'নতুন যানবাহন যোগ করুন'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">যানবাহনের নাম</Label>
                <Input
                  type="text"
                  placeholder="যেমন: জিপ, মাইক্রোবাস, সেডান কার"
                  value={carModal.name}
                  onChange={(e) => setCarModal(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border-slate-200 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">ক্রম (সাজানোর জন্য ক্রমিক নং)</Label>
                <Input
                  type="number"
                  value={carModal.order}
                  onChange={(e) => setCarModal(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                  className="rounded-xl border-slate-200 font-mono"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setCarModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={handleSaveVehicleType} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Fuel Type Modal */}
      {fuelModal.open && (
        <Dialog open={fuelModal.open} onOpenChange={(open) => !open && setFuelModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {fuelModal.id ? 'জ্বালানির দর সম্পাদনা' : 'নতুন জ্বালানির ধরন যোগ করুন'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">জ্বালানীর নাম</Label>
                <Input
                  type="text"
                  placeholder="যেমন: অকটেন, ডিজেল, সিএনজি"
                  value={fuelModal.name}
                  onChange={(e) => setFuelModal(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border-slate-200 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">দর (প্রতি একক টাকা)</Label>
                <Input
                  type="number"
                  value={fuelModal.price}
                  onChange={(e) => setFuelModal(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl border-slate-200 font-mono font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">ক্রম</Label>
                <Input
                  type="number"
                  value={fuelModal.order}
                  onChange={(e) => setFuelModal(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                  className="rounded-xl border-slate-200 font-mono"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setFuelModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={handleSaveFuelType} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Vehicle Fuel Config Modal */}
      {vfcModal.open && (
        <Dialog open={vfcModal.open} onOpenChange={(open) => !open && setVfcModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                যানবাহন ও জ্বালানি বরাদ্দ
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">যানবাহনের ধরন নির্বাচন করুন</Label>
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
                <Label className="text-sm font-bold text-slate-700">জ্বালানির ধরন নির্বাচন করুন</Label>
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
                <Label className="text-sm font-bold text-slate-700">মাসিক বরাদ্দ (লিটার)</Label>
                <Input
                  type="number"
                  value={vfcModal.monthlyFuel}
                  onChange={(e) => setVfcModal(prev => ({ ...prev, monthlyFuel: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl border-slate-200 font-mono font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">লুব্রিকেন্ট বাবদ বার্ষিক বরাদ্দ (টাকা)</Label>
                <Input
                  type="number"
                  value={vfcModal.annualLube}
                  onChange={(e) => setVfcModal(prev => ({ ...prev, annualLube: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl border-slate-200 font-mono font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">রক্ষণাবেক্ষণ বাবদ বার্ষিক বরাদ্দ (টাকা)</Label>
                <Input
                  type="number"
                  value={vfcModal.annualMaint}
                  onChange={(e) => setVfcModal(prev => ({ ...prev, annualMaint: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl border-slate-200 font-mono font-bold"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setVfcModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={handleSaveVfc} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Vehicle Rent Config Modal */}
      {vrcModal.open && (
        <Dialog open={vrcModal.open} onOpenChange={(open) => !open && setVrcModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                যানবাহন ভাড়া কনফিগারেশন
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">যানবাহনের ধরন নির্বাচন করুন</Label>
                <Select
                  value={vrcModal.carTypeId}
                  onValueChange={(v) => setVrcModal(prev => ({ ...prev, carTypeId: v || '' }))}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="যানবাহন নির্বাচন করুন">
                      {vehicleTypes.find(c => String(c.id) === vrcModal.carTypeId)?.name}
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
                <Label className="text-sm font-bold text-slate-700">মাসিক অনুমোদিত ভাড়া (টাকা)</Label>
                <Input
                  type="number"
                  value={vrcModal.monthlyRent}
                  onChange={(e) => setVrcModal(prev => ({ ...prev, monthlyRent: parseFloat(e.target.value) || 0 }))}
                  className="rounded-xl border-slate-200 font-mono font-bold"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setVrcModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={handleSaveVrc} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
              <Label className="text-sm font-bold text-slate-700">
                একক প্রাক্কলিত মূল্য (টাকা)
              </Label>
              <Input
                type="number"
                value={equipModal.price}
                onChange={(e) => setEquipModal(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="rounded-xl border-slate-200 font-mono text-lg font-bold"
              />
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setEquipModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={handleSaveEquipment} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Utility Type Modal */}
      {utilityModal.open && (
        <Dialog open={utilityModal.open} onOpenChange={(open) => !open && setUtilityModal(prev => ({ ...prev, open: false }))}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                {utilityModal.id ? 'ইউটিলিটির ধরন সম্পাদনা' : 'নতুন ইউটিলিটির ধরন যোগ করুন'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">ইউটিলিটির নাম (যেমন: বিদ্যুৎ বিল, ইন্টারনেট)</Label>
                <Input
                  type="text"
                  placeholder="যেমন: বিদ্যুৎ বিল"
                  value={utilityModal.name}
                  onChange={(e) => setUtilityModal(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">ক্রম (Hierarchy)</Label>
                <Input
                  type="number"
                  min={1}
                  value={utilityModal.order}
                  onChange={(e) => setUtilityModal(prev => ({ ...prev, order: parseInt(e.target.value, 10) || 1 }))}
                  className="rounded-xl border-slate-200 font-mono font-bold"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setUtilityModal(prev => ({ ...prev, open: false }))} className="rounded-xl">
                বাতিল
              </Button>
              <Button onClick={handleSaveUtility} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                সংরক্ষণ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
