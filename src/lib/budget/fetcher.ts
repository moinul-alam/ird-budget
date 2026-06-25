import { createClient } from '@/lib/supabase/server'
import type { BudgetContext } from './calculate'

/**
 * Fetches all form data for a given submission and shapes it into
 * the BudgetContext expected by the calculation engine.
 */
export async function getBudgetContext(submissionId: number): Promise<BudgetContext> {
  const supabase = await createClient()

  // Run all queries in parallel
  const [
    { data: staff },
    { data: leave },
    { data: utility },
    { data: houseRent },
    { data: vehicles },
    { data: vehicleRent },
    { data: returnInfo },
  ] = await Promise.all([
    supabase.from('form_staff').select('*').eq('submission_id', submissionId),
    supabase.from('form_leave').select('*').eq('submission_id', submissionId).maybeSingle(),
    supabase.from('form_utility').select('*, utility_type:utility_type_id(name)').eq('submission_id', submissionId),
    supabase.from('form_house_rent').select('*').eq('submission_id', submissionId).maybeSingle(),
    supabase.from('form_vehicles').select('*, fuel_config:vehicle_fuel_config_id(rate_key)').eq('submission_id', submissionId),
    supabase.from('form_vehicle_rent').select('*, rent_config:vehicle_rent_config_id(monthly_allowance)').eq('submission_id', submissionId),
    supabase.from('form_return_info').select('*').eq('submission_id', submissionId).maybeSingle(),
  ])

  // Get rates (in a real app, this might be filtered by cycle_id or just all active rates)
  const { data: ratesData } = await supabase.from('rates').select('key, value')
  const rates: Record<string, number> = {}
  if (ratesData) {
    for (const r of ratesData) {
      rates[r.key] = Number(r.value)
    }
  }

  // Format Staff
  const formattedStaff = (staff || []).map((s) => ({
    category: s.grade_id <= 9 ? 'officer' as const : 'staff' as const,
    total_basic: Number(s.total_basic),
    count: Number(s.count),
  }))

  // Format Utilities
  const formattedUtilities = (utility || []).map((u) => ({
    type_name: u.utility_type?.name || '',
    annual_cost: Number(u.annual_cost),
  }))

  // Format Vehicles
  const formattedVehicles = (vehicles || []).map((v) => ({
    rate_key: v.fuel_config?.rate_key || null,
    count: Number(v.count),
    monthly_fuel_allowance: Number(v.monthly_fuel_allowance || 0),
    annual_lube_allowance: Number(v.annual_lube_allowance || 0),
    annual_maintenance_allowance: Number(v.annual_maintenance_allowance || 0),
    maintenance_cost: Number(v.maintenance_cost || 0),
  }))

  // Format Vehicle Rent
  const formattedVehicleRent = (vehicleRent || []).map((v) => ({
    count: Number(v.count),
    monthly_rent_allowance: Number(v.rent_config?.monthly_allowance || 0),
  }))

  return {
    staff: formattedStaff,
    leave: leave ? {
      leave_encashment_officer_basic: Number(leave.leave_encashment_officer_basic),
      leave_encashment_staff_basic: Number(leave.leave_encashment_staff_basic),
      rest_recreation_amount: Number(leave.rest_recreation_amount),
    } : null,
    utilities: formattedUtilities,
    houseRent: houseRent ? {
      monthly_bill: Number(houseRent.monthly_bill),
      due: Number(houseRent.due),
    } : null,
    vehicles: formattedVehicles,
    vehicleRent: formattedVehicleRent,
    returnInfo: returnInfo ? {
      return_submitted_count: Number(returnInfo.return_submitted_count),
    } : null,
    rates,
  }
}
