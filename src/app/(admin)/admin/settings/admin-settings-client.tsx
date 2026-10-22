'use client'

import { useState } from 'react'
import { strings } from '@/lib/strings'
import {
  Banknote,
  Car,
  Fuel,
  Sliders,
  DollarSign,
  Monitor,
  CheckCircle2,
  ShieldAlert,
  Zap,
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
import {
  AdminSettingsClientProps,
  SettingsTabKey,
  NumberModalState,
  GradeModalState,
  VehicleTypeModalState,
  FuelTypeModalState,
  VehicleFuelConfigModalState,
  VehicleRentConfigModalState,
  EquipmentModalState,
  UtilityModalState,
} from './_types/settings'
import { TabSalaries } from './_components/tab-salaries'
import { TabVehicles } from './_components/tab-vehicles'
import { TabFuels } from './_components/tab-fuels'
import { TabVehicleFuel } from './_components/tab-vehicle-fuel'
import { TabVehicleRent } from './_components/tab-vehicle-rent'
import { TabEquipment } from './_components/tab-equipment'
import { TabUtility } from './_components/tab-utility'

export function AdminSettingsClient({
  initialSalaryConfig,
  initialVehicleTypes,
  initialFuelTypes,
  initialFuelConfigs,
  initialRentConfigs,
  initialUtilityTypes,
}: AdminSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('salaries')
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

  // Modals state
  const [numModal, setNumModal] = useState<NumberModalState>({
    open: false,
    field: null,
    title: '',
    unit: '',
    value: 0,
  })

  const [gradeModal, setGradeModal] = useState<GradeModalState>({
    open: false,
    field: null,
    title: '',
    rate: 0,
    fromGrade: 1,
    toGrade: 20,
  })

  const [houseRentModal, setHouseRentModal] = useState(false)
  const [slabs, setSlabs] = useState(initialSalaryConfig.house_rent_slabs || [])

  const [specialBenefitModal, setSpecialBenefitModal] = useState(false)
  const [specialBenefitSlabs, setSpecialBenefitSlabs] = useState(
    initialSalaryConfig.special_benefit_slabs || [
      { id: 'sb-slab-1', from_grade: 1, to_grade: 20, percentage: 5 },
    ]
  )

  const [mobileModal, setMobileModal] = useState(false)
  const [mobileSlabs, setMobileSlabs] = useState(
    initialSalaryConfig.mobile_allowance_slabs || [
      { id: 'mob-1', from_grade: 1, to_grade: 9, amount: 1500 },
      { id: 'mob-2', from_grade: 10, to_grade: 20, amount: 1000 },
    ]
  )

  const [carModal, setCarModal] = useState<VehicleTypeModalState>({
    open: false,
    name: '',
    order: 1,
  })

  const [fuelModal, setFuelModal] = useState<FuelTypeModalState>({
    open: false,
    name: '',
    price: 0,
    order: 1,
  })

  const [vfcModal, setVfcModal] = useState<VehicleFuelConfigModalState>({
    open: false,
    carTypeId: '',
    fuelTypeId: '',
    monthlyFuel: 0,
    annualLube: 0,
    annualMaint: 0,
  })

  const [vrcModal, setVrcModal] = useState<VehicleRentConfigModalState>({
    open: false,
    carTypeId: '',
    monthlyRent: 0,
  })

  const [equipModal, setEquipModal] = useState<EquipmentModalState>({
    open: false,
    field: null,
    title: '',
    price: 0,
  })

  const [utilityModal, setUtilityModal] = useState<UtilityModalState>({
    open: false,
    name: '',
    order: 1,
  })

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3500)
  }

  // Tab 1 handlers
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

  const handleSaveSpecialBenefitSlabs = async () => {
    setSaving(true)
    setErrorMsg(null)
    const update = { special_benefit_slabs: specialBenefitSlabs }
    const res = await saveSalaryCodeConfig(update)
    if (res.error) {
      setErrorMsg(res.error)
      setSaving(false)
      return
    }
    setSalaryConfig(prev => ({ ...prev, ...update }))
    setSaving(false)
    setSpecialBenefitModal(false)
    showSuccess('বিশেষ সুবিধা স্ল্যাব কনফিগারেশন সংরক্ষিত হয়েছে।')
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

  // Tab 2 handlers
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

  // Tab 3 handlers
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

  // Tab 4 handlers
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

  // Tab 5 handlers
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

  // Tab 6 handlers
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

  // Tab 7 handlers
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

      {/* Tab 1: Salaries */}
      {activeTab === 'salaries' && (
        <TabSalaries
          salaryConfig={salaryConfig}
          numModal={numModal}
          setNumModal={setNumModal}
          gradeModal={gradeModal}
          setGradeModal={setGradeModal}
          houseRentModal={houseRentModal}
          setHouseRentModal={setHouseRentModal}
          slabs={slabs}
          setSlabs={setSlabs}
          specialBenefitModal={specialBenefitModal}
          setSpecialBenefitModal={setSpecialBenefitModal}
          specialBenefitSlabs={specialBenefitSlabs}
          setSpecialBenefitSlabs={setSpecialBenefitSlabs}
          mobileModal={mobileModal}
          setMobileModal={setMobileModal}
          mobileSlabs={mobileSlabs}
          setMobileSlabs={setMobileSlabs}
          onSaveNumberField={handleSaveNumberField}
          onSaveGradeField={handleSaveGradeField}
          onSaveHouseRentSlabs={handleSaveHouseRentSlabs}
          onSaveSpecialBenefitSlabs={handleSaveSpecialBenefitSlabs}
          onSaveMobileSlabs={handleSaveMobileSlabs}
          saving={saving}
        />
      )}

      {/* Tab 2: Vehicles */}
      {activeTab === 'vehicles' && (
        <TabVehicles
          vehicleTypes={vehicleTypes}
          carModal={carModal}
          setCarModal={setCarModal}
          onSaveVehicleType={handleSaveVehicleType}
          onDeleteVehicleType={handleDeleteVehicleType}
          saving={saving}
        />
      )}

      {/* Tab 3: Fuels */}
      {activeTab === 'fuels' && (
        <TabFuels
          fuelTypes={fuelTypes}
          fuelModal={fuelModal}
          setFuelModal={setFuelModal}
          onSaveFuelType={handleSaveFuelType}
          onDeleteFuelType={handleDeleteFuelType}
          saving={saving}
        />
      )}

      {/* Tab 4: Vehicle Fuel Config */}
      {activeTab === 'vehicleFuel' && (
        <TabVehicleFuel
          fuelConfigs={fuelConfigs}
          vehicleTypes={vehicleTypes}
          fuelTypes={fuelTypes}
          vfcModal={vfcModal}
          setVfcModal={setVfcModal}
          onSaveVfc={handleSaveVfc}
          onDeleteVfc={handleDeleteVfc}
          saving={saving}
        />
      )}

      {/* Tab 5: Vehicle Rent Config */}
      {activeTab === 'vehicleRent' && (
        <TabVehicleRent
          rentConfigs={rentConfigs}
          vehicleTypes={vehicleTypes}
          vrcModal={vrcModal}
          setVrcModal={setVrcModal}
          onSaveVrc={handleSaveVrc}
          onDeleteVrc={handleDeleteVrc}
          saving={saving}
        />
      )}

      {/* Tab 6: Equipment */}
      {activeTab === 'equipment' && (
        <TabEquipment
          salaryConfig={salaryConfig}
          equipModal={equipModal}
          setEquipModal={setEquipModal}
          onSaveEquipment={handleSaveEquipment}
          saving={saving}
        />
      )}

      {/* Tab 7: Utility */}
      {activeTab === 'utility' && (
        <TabUtility
          utilityTypes={utilityTypes}
          utilityModal={utilityModal}
          setUtilityModal={setUtilityModal}
          onSaveUtility={handleSaveUtility}
          onDeleteUtility={handleDeleteUtility}
          saving={saving}
        />
      )}
    </div>
  )
}
