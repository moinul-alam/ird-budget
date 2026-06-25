'use server'

import { createClient } from '@/lib/supabase/server'
import { formBasicSchema } from '@/lib/schemas/forms'

export async function saveFormBasic(submissionId: number, formData: FormData) {
  const supabase = await createClient()

  const parsed = formBasicSchema.safeParse({
    head_of_office: formData.get('head_of_office'),
    designation: formData.get('designation'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    address: formData.get('address'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const payload = {
    submission_id: submissionId,
    ...parsed.data,
  }

  // Check if record exists
  const { data: existing } = await supabase
    .from('form_basic')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('form_basic')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('form_basic')
      .insert(payload)
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function saveFormStaffRow(
  submissionId: number,
  gradeId: number,
  data: {
    count: number
    total_basic: number
    due_salary: number
    suspended_count: number
    suspended_total_basic: number
    suspended_due_salary: number
  }
) {
  const supabase = await createClient()

  const payload = {
    submission_id: submissionId,
    grade_id: gradeId,
    ...data,
  }

  const { data: existing } = await supabase
    .from('form_staff')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('grade_id', gradeId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('form_staff')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('form_staff')
      .insert(payload)
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function saveFormLeave(
  submissionId: number,
  data: {
    leave_encashment_officer_basic: number
    leave_encashment_officer_due: number
    leave_encashment_staff_basic: number
    leave_encashment_staff_due: number
    rest_recreation_amount: number
    rest_recreation_due: number
  }
) {
  const supabase = await createClient()

  const payload = {
    submission_id: submissionId,
    ...data,
  }

  const { data: existing } = await supabase
    .from('form_leave')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('form_leave')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('form_leave')
      .insert(payload)
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function saveFormAllowanceRow(
  submissionId: number,
  allowanceTypeId: number,
  data: { count: number; total_basic: number; amount: number; due: number }
) {
  const supabase = await createClient()

  const isZero = data.count === 0 && data.total_basic === 0 && data.amount === 0 && data.due === 0

  if (isZero) {
    await supabase
      .from('form_allowances')
      .delete()
      .eq('submission_id', submissionId)
      .eq('allowance_type_id', allowanceTypeId)
    return { success: true }
  }

  const payload = {
    submission_id: submissionId,
    allowance_type_id: allowanceTypeId,
    ...data,
  }

  const { data: existing } = await supabase
    .from('form_allowances')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('allowance_type_id', allowanceTypeId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('form_allowances')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('form_allowances')
      .insert(payload)
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function saveFormUtilityRow(
  submissionId: number,
  utilityTypeId: number,
  data: { annual_cost: number; due: number }
) {
  const supabase = await createClient()

  const payload = {
    submission_id: submissionId,
    utility_type_id: utilityTypeId,
    ...data,
  }

  const { data: existing } = await supabase
    .from('form_utility')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('utility_type_id', utilityTypeId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('form_utility')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('form_utility')
      .insert(payload)
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function saveFormHouseRent(
  submissionId: number,
  data: {
    monthly_bill: number
    due: number
    contract_start_date: string | null
    contract_end_date: string | null
  }
) {
  const supabase = await createClient()

  const payload = {
    submission_id: submissionId,
    ...data,
  }

  const { data: existing } = await supabase
    .from('form_house_rent')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('form_house_rent')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('form_house_rent')
      .insert(payload)
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function saveFormReturnInfo(
  submissionId: number,
  data: { tin_count: number; return_submitted_count: number }
) {
  const supabase = await createClient()

  const payload = {
    submission_id: submissionId,
    ...data,
  }

  const { data: existing } = await supabase
    .from('form_return_info')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('form_return_info')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('form_return_info')
      .insert(payload)
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function saveFormVehicleRow(
  submissionId: number,
  data: {
    id?: number
    vehicle_type: string
    fuel_type: string
    count: number
    fuel_allowance: number
    fuel_rate: number
    maintenance_cost: number
    additional_expense: number
  }
) {
  const supabase = await createClient()

  const payload = {
    submission_id: submissionId,
    vehicle_type: data.vehicle_type,
    fuel_type: data.fuel_type,
    count: data.count,
    fuel_allowance: data.fuel_allowance,
    fuel_rate: data.fuel_rate,
    maintenance_cost: data.maintenance_cost,
    additional_expense: data.additional_expense,
  }

  if (data.id) {
    const { error } = await supabase
      .from('form_vehicles')
      .update(payload)
      .eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } else {
    const { data: inserted, error } = await supabase
      .from('form_vehicles')
      .insert(payload)
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { success: true, id: inserted.id }
  }
}

export async function deleteFormVehicleRow(rowId: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('form_vehicles').delete().eq('id', rowId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function saveFormVehicleRentRow(
  submissionId: number,
  data: {
    id?: number
    vehicle_type: string
    count: number
    monthly_allowance: number
  }
) {
  const supabase = await createClient()

  const payload = {
    submission_id: submissionId,
    vehicle_type: data.vehicle_type,
    count: data.count,
    monthly_allowance: data.monthly_allowance,
  }

  if (data.id) {
    const { error } = await supabase
      .from('form_vehicle_rent')
      .update(payload)
      .eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } else {
    const { data: inserted, error } = await supabase
      .from('form_vehicle_rent')
      .insert(payload)
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { success: true, id: inserted.id }
  }
}

export async function deleteFormVehicleRentRow(rowId: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('form_vehicle_rent').delete().eq('id', rowId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function saveFormITEquipmentRow(
  submissionId: number,
  equipmentTypeId: number,
  data: {
    existing_count: number
    damaged_count: number
    toner_cost: number
    required_qty: number
    unit_budget: number
  }
) {
  const supabase = await createClient()

  const payload = {
    submission_id: submissionId,
    equipment_type_id: equipmentTypeId,
    ...data,
  }

  const { data: existing } = await supabase
    .from('form_it_equipment')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('equipment_type_id', equipmentTypeId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('form_it_equipment')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('form_it_equipment')
      .insert(payload)
    if (error) return { error: error.message }
  }

  return { success: true }
}
