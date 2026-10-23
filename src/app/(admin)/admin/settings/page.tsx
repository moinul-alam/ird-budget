import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import {
  getSalaryCodeConfig,
  getVehicleTypes,
  getFuelTypes,
  getVehicleConfigs,
  getVehicleRentConfigs,
  getUtilityTypes,
  getItEquipmentTypes,
} from '@/app/actions/admin-settings'
import { AdminSettingsClient } from './admin-settings-client'

export const metadata = {
  title: 'কোড কনফিগারেশন | আইআরডি বাজেট সিস্টেম',
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
    fuelConfigs,
    rentConfigs,
    utilityTypes,
    itItems,
  ] = await Promise.all([
    getSalaryCodeConfig(),
    getVehicleTypes(),
    getFuelTypes(),
    getVehicleConfigs(),
    getVehicleRentConfigs(),
    getUtilityTypes(),
    getItEquipmentTypes(),
  ])

  return (
    <div className="space-y-6">
      <AdminSettingsClient
        initialSalaryConfig={salaryConfig}
        initialVehicleTypes={vehicleTypes}
        initialFuelTypes={fuelTypes}
        initialFuelConfigs={fuelConfigs}
        initialRentConfigs={rentConfigs}
        initialUtilityTypes={utilityTypes}
        initialItItems={itItems}
      />
    </div>
  )
}
