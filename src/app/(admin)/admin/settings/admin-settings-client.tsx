'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  SalaryTileItem,
  SalarySlabItem,
  VehicleTypeItem,
  FuelTypeItem,
  VehicleConfigItem,
  VehicleRentConfigItem,
  UtilityTypeItem,
  ItEquipmentTypeItem,
  saveSalaryTile,
  saveSalarySlabs,
  saveVehicleType,
  deleteVehicleType,
  saveFuelType,
  deleteFuelType,
  saveVehicleConfigForType,
  deleteVehicleConfigForType,
  saveVehicleRentConfig,
  deleteVehicleRentConfig,
  saveUtilityType,
  deleteUtilityType,
  saveItEquipmentType,
} from '@/app/actions/admin-settings'
import {
  AdminSettingsClientProps,
  SETTINGS_TAB_KEYS,
  SettingsTabKey,
  SalaryNumberModalState,
  SalaryGradeModalState,
  SalarySlabModalState,
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
  initialSalarySlabs,
  initialVehicleTypes,
  initialFuelTypes,
  fuelCategories,
  initialFuelConfigs,
  initialRentConfigs,
  initialUtilityTypes,
  initialItItems,
  economicCodeOptions,
  grades,
}: AdminSettingsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // The active tab lives in the URL so that the revalidation every save
  // triggers does not throw the administrator back to the first tab.
  const tabParam = searchParams.get('tab') as SettingsTabKey | null
  const activeTab: SettingsTabKey =
    tabParam && SETTINGS_TAB_KEYS.includes(tabParam) ? tabParam : 'salaries'

  const setActiveTab = (tab: SettingsTabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'salaries') params.delete('tab')
    else params.set('tab', tab)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3500)
  }

  // Every list below is rendered straight from its server-provided props, so a
  // successful save only has to revalidate the route for the UI to catch up.

  // Modals
  const [numModal, setNumModal] = useState<SalaryNumberModalState>({
    open: false,
    tileId: null,
    title: '',
    unit: '',
    value: 0,
    secondaryLabel: null,
    secondaryUnit: '',
    secondaryValue: 0,
  })

  const [gradeModal, setGradeModal] = useState<SalaryGradeModalState>({
    open: false,
    tileId: null,
    title: '',
    value: 0,
    fromGrade: 1,
    toGrade: 20,
  })

  const [slabModal, setSlabModal] = useState<SalarySlabModalState>({
    open: false,
    configKey: null,
    title: '',
    valueFormat: 'amount',
    slabs: [],
  })

  const [carModal, setCarModal] = useState<VehicleTypeModalState>({
    open: false,
    name: '',
  })

  const [fuelModal, setFuelModal] = useState<FuelTypeModalState>({
    open: false,
    name: '',
    unit_price: 0,
    category_id: 0,
  })

  const [vfcModal, setVfcModal] = useState<VehicleFuelConfigModalState>({
    open: false,
    vehicleTypeId: '',
    annualLube: 0,
    annualMaint: 0,
    sections: [],
  })

  const [vrcModal, setVrcModal] = useState<VehicleRentConfigModalState>({
    open: false,
    carTypeId: '',
    monthlyRent: 0,
  })

  const [equipModal, setEquipModal] = useState<EquipmentModalState>({
    open: false,
    itemId: null,
    title: '',
    name: '',
    unit_price: 0,
    has_toner: false,
  })

  const [utilityModal, setUtilityModal] = useState<UtilityModalState>({
    open: false,
    name: '',
    economic_code_id: null,
  })

  // ----------------------------------------------------
  // Tab 1: salary & allowance configuration
  // ----------------------------------------------------
  const handleSaveNumberField = async () => {
    if (!numModal.tileId) return
    setSaving(true)
    setErrorMsg(null)
    const res = await saveSalaryTile({
      id: numModal.tileId,
      value: numModal.value,
      // Only a paired card has a second field; sending it always would let a
      // single-value card overwrite one it does not own.
      ...(numModal.secondaryLabel ? { secondary_value: numModal.secondaryValue } : {}),
    })
    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
      return
    }
    setNumModal({
      open: false,
      tileId: null,
      title: '',
      unit: '',
      value: 0,
      secondaryLabel: null,
      secondaryUnit: '',
      secondaryValue: 0,
    })
    showSuccess('মান সফলভাবে সংরক্ষিত হয়েছে।')
  }

  const handleSaveGradeField = async () => {
    if (!gradeModal.tileId) return
    setSaving(true)
    setErrorMsg(null)
    const res = await saveSalaryTile({
      id: gradeModal.tileId,
      value: gradeModal.value,
      from_grade: gradeModal.fromGrade,
      to_grade: gradeModal.toGrade,
    })
    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
      return
    }
    setGradeModal({ open: false, tileId: null, title: '', value: 0, fromGrade: 1, toGrade: 20 })
    showSuccess('ভাতা ও প্রযোজ্য গ্রেড সংরক্ষিত হয়েছে।')
  }

  const handleSaveSlabs = async () => {
    if (!slabModal.configKey) return
    setSaving(true)
    setErrorMsg(null)
    const res = await saveSalarySlabs({
      config_key: slabModal.configKey,
      slabs: slabModal.slabs,
    })
    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
      return
    }
    setSlabModal({ open: false, configKey: null, title: '', valueFormat: 'amount', slabs: [] })
    showSuccess('স্ল্যাব কনফিগারেশন সংরক্ষিত হয়েছে।')
  }

  // ----------------------------------------------------
  // Tab 2: vehicle types
  // ----------------------------------------------------
  const handleSaveVehicleType = async () => {
    if (!carModal.name.trim()) return
    setSaving(true)
    setErrorMsg(null)
    const res = await saveVehicleType({ id: carModal.id, name: carModal.name.trim() })
    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
      return
    }
    setCarModal({ open: false, name: '' })
    showSuccess('যানবাহনের ধরন সংরক্ষিত হয়েছে।')
  }

  const handleDeleteVehicleType = async (id: number) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই যানবাহনের ধরনটি মুছে ফেলতে চান?')) return
    const res = await deleteVehicleType(id)
    if (res.error) {
      alert(res.error)
      return
    }
    showSuccess('যানবাহনের ধরন মুছে ফেলা হয়েছে।')
  }

  // ----------------------------------------------------
  // Tab 3: fuel prices
  // ----------------------------------------------------
  const handleSaveFuelType = async () => {
    if (!fuelModal.name.trim()) return
    setSaving(true)
    setErrorMsg(null)
    const res = await saveFuelType({
      id: fuelModal.id,
      name: fuelModal.name.trim(),
      unit_price: fuelModal.unit_price,
      category_id: fuelModal.category_id,
    })
    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
      return
    }
    setFuelModal({ open: false, name: '', unit_price: 0, category_id: fuelCategories[0]?.id ?? 0 })
    showSuccess('জ্বালানির দর সংরক্ষিত হয়েছে।')
  }

  const handleDeleteFuelType = async (id: number) => {
    if (!confirm('আপনি কি এই জ্বালানির ধরনটি মুছে ফেলতে চান?')) return
    const res = await deleteFuelType(id)
    if (res.error) {
      alert(res.error)
      return
    }
    showSuccess('জ্বালানির ধরন মুছে ফেলা হয়েছে।')
  }

  // ----------------------------------------------------
  // Tab 4: vehicle fuel allowance
  // ----------------------------------------------------
  const handleSaveVfc = async () => {
    const carId = parseInt(vfcModal.vehicleTypeId)
    if (!carId) {
      setErrorMsg('অনুগ্রহ করে যানবাহনের ধরন নির্বাচন করুন।')
      return
    }
    setSaving(true)
    setErrorMsg(null)
    const res = await saveVehicleConfigForType({
      vehicle_type_id: carId,
      annual_lube_allowance: vfcModal.annualLube,
      annual_maintenance_allowance: vfcModal.annualMaint,
      fuel_quotas: vfcModal.sections.map((section) => ({
        fuel_category_id: section.categoryId,
        monthly_fuel_quota_liter: section.monthlyFuel,
      })),
    })
    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
      return
    }
    setVfcModal({ open: false, vehicleTypeId: '', annualLube: 0, annualMaint: 0, sections: [] })
    showSuccess('যানবাহন ও জ্বালানি বরাদ্দ সংরক্ষিত হয়েছে।')
  }

  const handleDeleteVfc = async (vehicleTypeId: number) => {
    if (!confirm('আপনি কি এই বরাদ্দ কনফিগারেশন মুছে ফেলতে চান?')) return
    const res = await deleteVehicleConfigForType(vehicleTypeId)
    if (res.error) {
      alert(res.error)
      return
    }
    showSuccess('কনফিগারেশন মুছে ফেলা হয়েছে।')
  }

  // ----------------------------------------------------
  // Tab 5: vehicle rent ceiling
  // ----------------------------------------------------
  const handleSaveVrc = async () => {
    const carId = parseInt(vrcModal.carTypeId)
    if (!carId) {
      setErrorMsg('অনুগ্রহ করে গাড়ি নির্বাচন করুন।')
      return
    }
    setSaving(true)
    setErrorMsg(null)
    const res = await saveVehicleRentConfig({
      id: vrcModal.id,
      vehicle_type_id: carId,
      monthly_rent_rate: vrcModal.monthlyRent,
    })
    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
      return
    }
    setVrcModal({ open: false, carTypeId: '', monthlyRent: 0 })
    showSuccess('গাড়ি ভাড়া বরাদ্দ সংরক্ষিত হয়েছে।')
  }

  const handleDeleteVrc = async (id: number) => {
    if (!confirm('আপনি কি এই গাড়ি ভাড়া কনফিগারেশন মুছে ফেলতে চান?')) return
    const res = await deleteVehicleRentConfig(id)
    if (res.error) {
      alert(res.error)
      return
    }
    showSuccess('কনফিগারেশন মুছে ফেলা হয়েছে।')
  }

  // ----------------------------------------------------
  // Tab 6: IT equipment unit prices
  // ----------------------------------------------------
  const handleSaveEquipment = async () => {
    if (!equipModal.itemId) return
    const item = initialItItems.find((i) => i.id === equipModal.itemId)
    if (!item) return
    setSaving(true)
    setErrorMsg(null)
    const res = await saveItEquipmentType({
      id: item.id,
      name: item.name,
      unit_price: equipModal.unit_price,
      has_toner: equipModal.has_toner,
      is_lumpsum: item.is_lumpsum,
    })
    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
      return
    }
    setEquipModal({ open: false, itemId: null, title: '', name: '', unit_price: 0, has_toner: false })
    showSuccess('সরঞ্জামের দর সংরক্ষিত হয়েছে।')
  }

  // ----------------------------------------------------
  // Tab 7: utility types
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
      economic_code_id: utilityModal.economic_code_id,
    })
    setSaving(false)
    if (res.error) {
      setErrorMsg(res.error)
      return
    }
    setUtilityModal({ open: false, name: '', economic_code_id: null })
    showSuccess('ইউটিলিটির ধরন সংরক্ষিত হয়েছে।')
  }

  const handleDeleteUtility = async (id: number) => {
    if (!confirm('আপনি কি এই ইউটিলিটির ধরন মুছে ফেলতে চান?')) return
    const res = await deleteUtilityType(id)
    if (res.error) {
      alert(res.error)
      return
    }
    showSuccess('ইউটিলিটির ধরন মুছে ফেলা হয়েছে।')
  }

  const tabButtonClass = (tab: SettingsTabKey) =>
    `flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer truncate ${activeTab === tab
      ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
    }`

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
          <Sliders className="h-7 w-7 text-emerald-600" />
          {strings.admin.settings.title}
        </h1>
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
          <button onClick={() => setActiveTab('salaries')} className={tabButtonClass('salaries')} title={strings.admin.settings.tabs.salaries}>
            <Banknote className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="truncate">{strings.admin.settings.tabs.salaries}</span>
          </button>

          <button onClick={() => setActiveTab('vehicles')} className={tabButtonClass('vehicles')} title={strings.admin.settings.tabs.vehicles}>
            <Car className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="truncate">{strings.admin.settings.tabs.vehicles}</span>
          </button>

          <button onClick={() => setActiveTab('fuels')} className={tabButtonClass('fuels')} title={strings.admin.settings.tabs.fuels}>
            <Fuel className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="truncate">{strings.admin.settings.tabs.fuels}</span>
          </button>

          <button onClick={() => setActiveTab('vehicleFuel')} className={tabButtonClass('vehicleFuel')} title={strings.admin.settings.tabs.vehicleFuel}>
            <Sliders className="h-4 w-4 shrink-0 text-purple-600" />
            <span className="truncate">{strings.admin.settings.tabs.vehicleFuel}</span>
          </button>

          <button onClick={() => setActiveTab('vehicleRent')} className={tabButtonClass('vehicleRent')} title={strings.admin.settings.tabs.vehicleRent}>
            <DollarSign className="h-4 w-4 shrink-0 text-teal-600" />
            <span className="truncate">{strings.admin.settings.tabs.vehicleRent}</span>
          </button>

          <button onClick={() => setActiveTab('equipment')} className={tabButtonClass('equipment')} title={strings.admin.settings.tabs.equipment}>
            <Monitor className="h-4 w-4 shrink-0 text-indigo-600" />
            <span className="truncate">{strings.admin.settings.tabs.equipment}</span>
          </button>

          <button onClick={() => setActiveTab('utility')} className={tabButtonClass('utility')} title={strings.admin.settings.tabs.utility}>
            <Zap className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="truncate">{strings.admin.settings.tabs.utility}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Salaries */}
      {activeTab === 'salaries' && (
        <TabSalaries
          tiles={initialSalaryConfig}
          slabs={initialSalarySlabs}
          grades={grades}
          numModal={numModal}
          setNumModal={setNumModal}
          gradeModal={gradeModal}
          setGradeModal={setGradeModal}
          slabModal={slabModal}
          setSlabModal={setSlabModal}
          onSaveNumberField={handleSaveNumberField}
          onSaveGradeField={handleSaveGradeField}
          onSaveSlabs={handleSaveSlabs}
          saving={saving}
        />
      )}

      {/* Tab 2: Vehicles */}
      {activeTab === 'vehicles' && (
        <TabVehicles
          vehicleTypes={initialVehicleTypes}
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
          fuelTypes={initialFuelTypes}
          fuelCategories={fuelCategories}
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
          fuelConfigs={initialFuelConfigs}
          vehicleTypes={initialVehicleTypes}
          fuelCategories={fuelCategories}
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
          rentConfigs={initialRentConfigs}
          vehicleTypes={initialVehicleTypes}
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
          itItems={initialItItems}
          equipModal={equipModal}
          setEquipModal={setEquipModal}
          onSaveEquipment={handleSaveEquipment}
          saving={saving}
        />
      )}

      {/* Tab 7: Utility */}
      {activeTab === 'utility' && (
        <TabUtility
          utilityTypes={initialUtilityTypes}
          economicCodeOptions={economicCodeOptions}
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
