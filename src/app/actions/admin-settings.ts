'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveAdminRates(rates: Record<string, number>) {
  const supabase = await createClient()

  for (const [key, value] of Object.entries(rates)) {
    const { data: existing } = await supabase
      .from('rates')
      .select('id')
      .eq('key', key)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('rates')
        .update({ value: String(value) })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('rates')
        .insert({ key, value: String(value) })
    }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/office/budget-sheet')
  revalidatePath('/office/form-9')
  return { success: true }
}

export async function saveVehicleFuelConfig(data: {
  id?: number
  car_type_id: number
  fuel_type_id: number
  monthly_fuel_allowance: number
  annual_lube_allowance: number
  annual_maintenance_allowance: number
  rate_key?: string
}) {
  const supabase = await createClient()

  if (data.id) {
    const { error } = await supabase
      .from('vehicle_fuel_config')
      .update(data)
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('vehicle_fuel_config')
      .insert(data)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/office/form-5')
  return { success: true }
}

export async function deleteVehicleFuelConfig(id: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('vehicle_fuel_config')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  revalidatePath('/office/form-5')
  return { success: true }
}

export async function saveVehicleRentConfig(data: {
  id?: number
  car_type_id: number
  monthly_allowance: number
}) {
  const supabase = await createClient()

  if (data.id) {
    const { error } = await supabase
      .from('vehicle_rent_config')
      .update(data)
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('vehicle_rent_config')
      .insert(data)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/office/form-6')
  return { success: true }
}
