import { createOfficeClient } from '@/lib/supabase/server'
import type { BudgetContext } from './calculate'

/**
 * Fetches all form data for a given submission and shapes it into
 * the BudgetContext expected by the calculation engine using the redesigned tables.
 */
export async function getBudgetContext(submissionId: number): Promise<BudgetContext> {
  const supabase = createOfficeClient()

  // Run all queries in parallel against normalized tables
  const [
    { data: staffWorking },
    { data: staffNewRecruits },
    { data: leave },
    { data: utilities },
    { data: houseRent },
    { data: vehiclesGovt },
    { data: vehicleRent },
    { data: returnInfo },
    { data: itEquipment },
    { data: submission },
    { data: ratesData },
  ] = await Promise.all([
    supabase.from('office_form_staff_working').select('*').eq('submission_id', submissionId),
    supabase.from('office_form_staff_new_recruits').select('*').eq('submission_id', submissionId),
    supabase.from('office_form_leave_encashment').select('*').eq('submission_id', submissionId).maybeSingle(),
    supabase.from('office_form_utilities').select('*').eq('submission_id', submissionId),
    supabase.from('office_form_house_rent').select('*').eq('submission_id', submissionId).maybeSingle(),
    supabase.from('office_form_vehicles_govt').select('*').eq('submission_id', submissionId),
    supabase.from('office_form_vehicles_rent').select('*').eq('submission_id', submissionId),
    supabase.from('office_form_return_info').select('*').eq('submission_id', submissionId).maybeSingle(),
    supabase.from('office_form_it_equipment').select('*').eq('submission_id', submissionId),
    supabase.from('office_submissions').select('office_id, core_offices(office_type_id, core_office_types(name))').eq('id', submissionId).maybeSingle(),
    supabase.from('admin_rates').select('key, value'),
  ])

  // Get rates
  const defaultRates: Record<string, number> = {
    medical_allowance_monthly: 1500,
    house_rent_percent: 50,
    festival_bonus_multiplier: 2,
    provident_fund_percent: 10,
    fuel_price_octane: 130,
    fuel_price_diesel: 110,
    fuel_price_cng: 45,
    vat_percentage: 15,
    postal_expense_rate: 50,
    education_allowance: 500,
  }
  const rates: Record<string, number> = { ...defaultRates }
  if (ratesData && ratesData.length > 0) {
    for (const r of ratesData) {
      rates[r.key] = Number(r.value)
    }
  }

  // Office type name
  const officeTypeName: string = (submission as any)?.core_offices?.core_office_types?.name || ''

  // Format Staff Working
  const formattedStaff = (staffWorking || []).map((s: any) => ({
    category: s.grade_id <= 9 ? ('officer' as const) : ('staff' as const),
    total_basic: Number(s.monthly_basic || 0),
    count: Number(s.staff_count || 0),
  }))

  // Format New Recruits directly from office_form_staff_new_recruits
  const formattedNewStaff = (staffNewRecruits || []).map((p: any) => ({
    category: p.grade_id <= 9 ? ('officer' as const) : ('staff' as const),
    total_salary: Number(p.total_salary || 0),
  }))

  // Format Utilities
  const formattedUtilities = (utilities || []).map((u: any) => ({
    type_name: u.utility_name || '',
    annual_cost: Number(u.annual_bill || 0),
  }))

  // Format Vehicles
  const formattedVehicles = (vehiclesGovt || []).map((v: any) => {
    const fType = (v.fuel_type || '').toLowerCase()
    let rateKey = 'fuel_price_octane'
    if (fType.includes('diesel') || fType.includes('ডিজেল')) rateKey = 'fuel_price_diesel'
    if (fType.includes('cng') || fType.includes('gas') || fType.includes('গ্যাস') || fType.includes('সিএনজি')) rateKey = 'fuel_price_cng'

    return {
      rate_key: rateKey,
      fuel_name: v.fuel_type || '',
      count: Number(v.vehicle_count || 1),
      monthly_fuel_allowance: Number(v.monthly_fuel_quota_liter || 0),
      annual_lube_allowance: Number(v.annual_lube_allowance || 0),
      annual_maintenance_allowance: Number(v.annual_maintenance_allowance || 0),
      maintenance_cost: Number(v.maintenance_due || 0),
    }
  })

  // Format Vehicle Rent
  const formattedVehicleRent = (vehicleRent || []).map((v: any) => ({
    count: Number(v.vehicle_count || 1),
    monthly_rent_allowance: Number(v.monthly_rent_rate || 0),
  }))

  // Format IT Equipment
  const formattedITEquipment = (itEquipment || []).map((eq: any) => ({
    equipment_name: eq.equipment_type || '',
    existing_count: Number(eq.existing_count || 0),
    toner_cost: Number(eq.toner_cost_monthly || 0),
  }))

  return {
    officeTypeName,
    staff: formattedStaff,
    newStaff: formattedNewStaff,
    leave: leave ? {
      leave_encashment_officer_basic: Number(leave.leave_encashment_officer_basic || 0),
      leave_encashment_staff_basic: Number(leave.leave_encashment_staff_basic || 0),
      rest_recreation_amount: Number(leave.rest_recreation_amount || 0),
    } : null,
    utilities: formattedUtilities,
    houseRent: houseRent ? {
      monthly_bill: Number(houseRent.monthly_rent || 0),
      due: Number(houseRent.arrears_due || 0),
    } : null,
    vehicles: formattedVehicles,
    vehicleRent: formattedVehicleRent,
    returnInfo: returnInfo ? {
      return_submitted_count: Number(returnInfo.return_submitted_count || 0),
    } : null,
    itEquipment: formattedITEquipment,
    rates,
  }
}
