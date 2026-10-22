'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export interface SalaryCodeConfig {
  salary_months: number // default 12
  duty_allowance: number // default 1500
  education_allowance: number // default 500
  medical_allowance: number // default 1500
  mobile_allowance?: number // legacy fallback
  mobile_allowance_slabs: Array<{
    id: string
    from_grade: number
    to_grade: number
    amount: number
  }>
  noboborsho_percent: number // default 20%
  festival_bonus_multiplier: number // default 2
  office_rent_vat_percent: number // default 15%
  
  // Grade-range based allowances: rate + from_grade + to_grade
  transport_allowance: { rate: number; from_grade: number; to_grade: number }
  telephone_allowance: { rate: number; from_grade: number; to_grade: number }
  tiffin_allowance: { rate: number; from_grade: number; to_grade: number }
  wash_allowance: { rate: number; from_grade: number; to_grade: number }
  entertainment_allowance: { rate: number; from_grade: number; to_grade: number }
  special_benefit_allowance?: { rate: number; from_grade: number; to_grade: number }

  // Slabs for Special Benefit (percentage of basic salary)
  special_benefit_slabs: Array<{
    id: string
    from_grade: number
    to_grade: number
    percentage: number
  }>

  // Slabs for House Rent
  house_rent_slabs: Array<{
    id: string
    from_grade: number
    to_grade: number
    percentage: number
  }>

  // Equipment prices
  computer_price: number
  laptop_price: number
  printer_price: number
  scanner_price: number
  photocopier_price: number
}

const DEFAULT_SALARY_CONFIG: SalaryCodeConfig = {
  salary_months: 12,
  duty_allowance: 1500,
  education_allowance: 500,
  medical_allowance: 1500,
  mobile_allowance: 1000,
  mobile_allowance_slabs: [
    { id: 'mob-1', from_grade: 1, to_grade: 9, amount: 1500 },
    { id: 'mob-2', from_grade: 10, to_grade: 20, amount: 1000 },
  ],
  noboborsho_percent: 20,
  festival_bonus_multiplier: 2,
  office_rent_vat_percent: 15,

  transport_allowance: { rate: 300, from_grade: 15, to_grade: 20 },
  telephone_allowance: { rate: 600, from_grade: 1, to_grade: 9 },
  tiffin_allowance: { rate: 200, from_grade: 11, to_grade: 20 },
  wash_allowance: { rate: 100, from_grade: 16, to_grade: 20 },
  entertainment_allowance: { rate: 500, from_grade: 1, to_grade: 5 },
  special_benefit_allowance: { rate: 1000, from_grade: 1, to_grade: 20 },

  special_benefit_slabs: [
    { id: 'sb-slab-1', from_grade: 1, to_grade: 20, percentage: 5 },
  ],

  house_rent_slabs: [
    { id: 'slab-1', from_grade: 1, to_grade: 10, percentage: 50 },
    { id: 'slab-2', from_grade: 11, to_grade: 16, percentage: 55 },
    { id: 'slab-3', from_grade: 17, to_grade: 20, percentage: 60 },
  ],

  computer_price: 65000,
  laptop_price: 85000,
  printer_price: 25000,
  scanner_price: 15000,
  photocopier_price: 150000,
}

// ----------------------------------------------------
// Tab 1 & Tab 5: Salary & Equipment Config Persistence
// ----------------------------------------------------

export async function getSalaryCodeConfig(): Promise<SalaryCodeConfig> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('admin_rates')
    .select('value, name')
    .eq('key', 'salary_config')
    .maybeSingle()

  if (error || !data) {
    return DEFAULT_SALARY_CONFIG
  }

  try {
    const parsed = JSON.parse(data.name)
    return { ...DEFAULT_SALARY_CONFIG, ...parsed }
  } catch {
    return DEFAULT_SALARY_CONFIG
  }
}

export async function saveSalaryCodeConfig(config: Partial<SalaryCodeConfig>) {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'অননুমোদিত প্রবেশাধিকার' }
  }

  const supabase = createOfficeClient()
  const currentConfig = await getSalaryCodeConfig()
  const merged = { ...currentConfig, ...config }
  const configJson = JSON.stringify(merged)

  // Upsert into admin_rates with key='salary_config'
  const { error } = await supabase
    .from('admin_rates')
    .upsert(
      {
        key: 'salary_config',
        name: configJson,
        value: 0,
        unit: 'json',
      },
      { onConflict: 'key' }
    )

  if (error) {
    return { error: 'সংরক্ষণ ব্যর্থ হয়েছে: ' + error.message }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

// ----------------------------------------------------
// Tab 2: Vehicle Types (car_types)
// ----------------------------------------------------

export interface VehicleTypeItem {
  id: number
  name: string
  order: number
}

export async function getVehicleTypes(): Promise<VehicleTypeItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase.from('car_types').select('*').order('sort_order', { ascending: true })
  if (error || !data) return []

  return data.map((c: any) => ({
    id: c.id,
    name: c.name || '',
    order: c.sort_order || c.id,
  }))
}

export async function saveVehicleType(data: { id?: number; name: string; order?: number }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const cleanName = data.name.trim()
  const orderNum = data.order || 1

  if (data.id) {
    const { error } = await supabase
      .from('car_types')
      .update({ name: cleanName, sort_order: orderNum })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('car_types')
      .insert({ name: cleanName, sort_order: orderNum })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function deleteVehicleType(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  // Clean related configs first if any
  await supabase.from('vehicle_fuel_config').delete().eq('car_type_id', id)
  await supabase.from('vehicle_rent_config').delete().eq('car_type_id', id)
  
  const { error } = await supabase.from('car_types').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}

// ----------------------------------------------------
// Tab 3: Fuel Types (fuel_types)
// ----------------------------------------------------

export interface FuelTypeItem {
  id: number
  name: string
  price: number
  order: number
}

export async function getFuelTypes(): Promise<FuelTypeItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase.from('fuel_types').select('*').order('sort_order', { ascending: true })
  if (error || !data) return []

  return data.map((f: any) => ({
    id: f.id,
    name: f.name || '',
    price: f.price || 0,
    order: f.sort_order || f.id,
  }))
}

export async function saveFuelType(data: { id?: number; name: string; price: number; order?: number }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const cleanName = data.name.trim()
  const priceVal = data.price || 0
  const orderNum = data.order || 1

  if (data.id) {
    const { error } = await supabase
      .from('fuel_types')
      .update({ name: cleanName, price: priceVal, sort_order: orderNum })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('fuel_types')
      .insert({ name: cleanName, price: priceVal, sort_order: orderNum })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function deleteFuelType(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  await supabase.from('vehicle_fuel_config').delete().eq('fuel_type_id', id)
  const { error } = await supabase.from('fuel_types').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}

// ----------------------------------------------------
// Tab 4: Vehicle & Fuel Config (vehicle_fuel_config)
// ----------------------------------------------------

export interface VehicleFuelConfigItem {
  id: number
  car_type_id: number
  car_name: string
  fuel_type_id: number
  fuel_name: string
  monthly_fuel_allowance: number
  annual_lube_allowance: number
  annual_maintenance_allowance: number
}

export async function getVehicleFuelConfigs(): Promise<VehicleFuelConfigItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('vehicle_fuel_config')
    .select(`
      id,
      car_type_id,
      fuel_type_id,
      monthly_fuel_allowance,
      annual_lube_allowance,
      annual_maintenance_allowance,
      car_type:car_type_id(name),
      fuel_type:fuel_type_id(name)
    `)
    .order('id')

  if (error || !data) return []

  return data.map((d: any) => {
    let carName = d.car_type?.name || 'গাড়ি'
    if (carName.includes(':::')) carName = carName.split(':::')[0]
    
    let fuelName = d.fuel_type?.name || 'জ্বালানি'
    if (fuelName.includes(':::')) fuelName = fuelName.split(':::')[0]

    return {
      id: d.id,
      car_type_id: d.car_type_id,
      car_name: carName,
      fuel_type_id: d.fuel_type_id,
      fuel_name: fuelName,
      monthly_fuel_allowance: d.monthly_fuel_allowance || 0,
      annual_lube_allowance: d.annual_lube_allowance || 0,
      annual_maintenance_allowance: d.annual_maintenance_allowance || 0,
    }
  })
}

export async function saveVehicleFuelConfigItem(data: {
  id?: number
  car_type_id: number
  fuel_type_id: number
  monthly_fuel_allowance: number
  annual_lube_allowance: number
  annual_maintenance_allowance: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  const payload = {
    car_type_id: data.car_type_id,
    fuel_type_id: data.fuel_type_id,
    monthly_fuel_allowance: data.monthly_fuel_allowance,
    annual_lube_allowance: data.annual_lube_allowance,
    annual_maintenance_allowance: data.annual_maintenance_allowance,
    rate_key: 'custom_fuel',
  }

  if (data.id) {
    const { error } = await supabase
      .from('vehicle_fuel_config')
      .update(payload)
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('vehicle_fuel_config')
      .insert(payload)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function deleteVehicleFuelConfigItem(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase.from('vehicle_fuel_config').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}

// ----------------------------------------------------
// Tab 5 (Part 2): Vehicle Rent Config (vehicle_rent_config)
// ----------------------------------------------------

export interface VehicleRentConfigItem {
  id: number
  car_type_id: number
  car_name: string
  monthly_rent_allowance: number
}

export async function getVehicleRentConfigs(): Promise<VehicleRentConfigItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('vehicle_rent_config')
    .select('id, car_type_id, monthly_rent_allowance, car_type:car_type_id(name)')
    .order('id')

  if (error || !data) return []

  return data.map((d: any) => {
    let carName = d.car_type?.name || 'গাড়ি'
    if (carName.includes(':::')) carName = carName.split(':::')[0]

    return {
      id: d.id,
      car_type_id: d.car_type_id,
      car_name: carName,
      monthly_rent_allowance: d.monthly_rent_allowance || 0,
    }
  })
}

export async function saveVehicleRentConfigItem(data: {
  id?: number
  car_type_id: number
  monthly_rent_allowance: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  if (data.id) {
    const { error } = await supabase
      .from('vehicle_rent_config')
      .update({
        car_type_id: data.car_type_id,
        monthly_rent_allowance: data.monthly_rent_allowance,
      })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('vehicle_rent_config')
      .insert({
        car_type_id: data.car_type_id,
        monthly_rent_allowance: data.monthly_rent_allowance,
      })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function deleteVehicleRentConfigItem(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase.from('vehicle_rent_config').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}

// ----------------------------------------------------
// Tab 7: Utility Types (utility_types)
// ----------------------------------------------------

export interface UtilityTypeItem {
  id: number
  name: string
  order: number
}

export async function getUtilityTypes(): Promise<UtilityTypeItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase.from('utility_types').select('*').order('id')
  if (error || !data) return []

  return data.map((u: any) => {
    let name = u.name || ''
    let order = u.id
    if (name.includes(':::order=')) {
      const parts = name.split(':::order=')
      name = parts[0]
      order = parseInt(parts[1], 10) || u.id
    }
    return { id: u.id, name, order }
  }).sort((a: any, b: any) => a.order - b.order)
}

export async function saveUtilityType(data: { id?: number; name: string; order?: number }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const cleanName = data.name.trim()
  const orderNum = data.order || 1
  const encodedName = `${cleanName}:::order=${orderNum}`

  if (data.id) {
    const { error } = await supabase
      .from('utility_types')
      .update({ name: encodedName })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('utility_types')
      .insert({ name: encodedName })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function deleteUtilityType(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase.from('utility_types').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}

// ----------------------------------------------------
// IT Items (it_items) — Single source of truth for equipment prices
// ----------------------------------------------------

export interface ItItem {
  id: number
  name: string
  allotted_budget: number
  has_toner: boolean
  is_lumpsum: boolean
}

export async function getItItems(): Promise<ItItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase.from('it_items').select('*').order('id')
  if (error || !data) return []
  return data.map((d: any) => ({
    id: d.id,
    name: d.name || '',
    allotted_budget: d.allotted_budget || 0,
    has_toner: d.has_toner || false,
    is_lumpsum: d.is_lumpsum || false,
  }))
}

export async function saveItItemPrice(id: number, price: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase
    .from('it_items')
    .update({ allotted_budget: price })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}
