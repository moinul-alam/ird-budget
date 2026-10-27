import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import {
  getSalaryConfig,
  getVehicleTypes,
  getFuelTypes,
  getFuelCategories,
  getVehicleConfigs,
  getVehicleRentConfigs,
  getUtilityTypes,
  getItEquipmentTypes,
  getEconomicCodeOptions,
} from '@/lib/actions/admin-settings'
import { loadGrades } from '@/lib/office/load-form-data'
import { AdminSettingsClient } from './admin-settings-client'

export const metadata = {
  title: 'বাজেট সেটিংস',
  description: 'বাজেট কোডসমূহ, বেতন-ভাতা, যানবাহন ও সরঞ্জামের পূর্বনির্ধারিত মান ব্যবস্থাপনা',
}

export default async function AdminSettingsPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const [
    salaryConfig,
    vehicleTypes,
    fuelTypes,
    fuelCategories,
    fuelConfigs,
    rentConfigs,
    utilityTypes,
    itItems,
    economicCodeOptions,
    grades,
  ] = await Promise.all([
    getSalaryConfig(),
    getVehicleTypes(),
    getFuelTypes(),
    getFuelCategories(),
    getVehicleConfigs(),
    getVehicleRentConfigs(),
    getUtilityTypes(),
    getItEquipmentTypes(),
    getEconomicCodeOptions(),
    loadGrades(),
  ])

  return (
    <div className="space-y-6">
      <AdminSettingsClient
        initialSalaryConfig={salaryConfig.tiles}
        initialSalarySlabs={salaryConfig.slabs}
        initialVehicleTypes={vehicleTypes}
        initialFuelTypes={fuelTypes}
        fuelCategories={fuelCategories}
        initialFuelConfigs={fuelConfigs}
        initialRentConfigs={rentConfigs}
        initialUtilityTypes={utilityTypes}
        initialItItems={itItems}
        economicCodeOptions={economicCodeOptions}
        grades={grades.map((g) => g.grade_no)}
      />
    </div>
  )
}
