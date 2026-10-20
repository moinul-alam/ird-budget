import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSettingsClient } from './admin-settings-client'

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  const [ratesRes, carsRes, fuelsRes, fuelConfigsRes, rentConfigsRes, equipmentTypesRes] =
    await Promise.all([
      supabase.from('rates').select('*'),
      supabase.from('car_types').select('*').order('id'),
      supabase.from('fuel_types').select('*').order('id'),
      supabase
        .from('vehicle_fuel_config')
        .select('*, car_type:car_type_id(name), fuel_type:fuel_type_id(name)')
        .order('id'),
      supabase
        .from('vehicle_rent_config')
        .select('*, car_type:car_type_id(name)')
        .order('id'),
      supabase.from('equipment_types').select('*').order('id'),
    ])

  const rates: Record<string, number> = {}
  if (ratesRes.data) {
    ratesRes.data.forEach((r) => {
      rates[r.key] = Number(r.value)
    })
  }

  return (
    <AdminSettingsClient
      initialRates={rates}
      carTypes={carsRes.data || []}
      fuelTypes={fuelsRes.data || []}
      fuelConfigs={fuelConfigsRes.data || []}
      rentConfigs={rentConfigsRes.data || []}
      equipmentTypes={equipmentTypesRes.data || []}
    />
  )
}
