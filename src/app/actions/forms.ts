'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { formBasicSchema } from '@/lib/schemas/forms'

export async function saveFormBasic(submissionId: number, formData: FormData) {
  const supabase = createOfficeClient()

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

export async function saveFormStaffActiveRows(
  submissionId: number,
  rows: Array<{
    grade_id: number
    count: number
    total_basic: number
    due_salary: number
  }>
) {
  const supabase = createOfficeClient()

  for (const row of rows) {
    const { data: existing } = await supabase
      .from('form_staff')
      .select('id, suspended_count, suspended_total_basic, suspended_due_salary')
      .eq('submission_id', submissionId)
      .eq('grade_id', row.grade_id)
      .maybeSingle()

    const payload = {
      submission_id: submissionId,
      grade_id: row.grade_id,
      count: row.count,
      total_basic: row.total_basic,
      due_salary: row.due_salary,
      suspended_count: existing?.suspended_count ?? 0,
      suspended_total_basic: existing?.suspended_total_basic ?? 0,
      suspended_due_salary: existing?.suspended_due_salary ?? 0,
    }

    if (existing) {
      await supabase.from('form_staff').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('form_staff').insert(payload)
    }
  }

  return { success: true }
}

export async function saveFormStaffSuspendedRows(
  submissionId: number,
  rows: Array<{
    grade_id: number
    suspended_count: number
    suspended_total_basic: number
    suspended_due_salary: number
  }>
) {
  const supabase = createOfficeClient()

  for (const row of rows) {
    const { data: existing } = await supabase
      .from('form_staff')
      .select('id, count, total_basic, due_salary')
      .eq('submission_id', submissionId)
      .eq('grade_id', row.grade_id)
      .maybeSingle()

    const payload = {
      submission_id: submissionId,
      grade_id: row.grade_id,
      count: existing?.count ?? 0,
      total_basic: existing?.total_basic ?? 0,
      due_salary: existing?.due_salary ?? 0,
      suspended_count: row.suspended_count,
      suspended_total_basic: row.suspended_total_basic,
      suspended_due_salary: row.suspended_due_salary,
    }

    if (existing) {
      await supabase.from('form_staff').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('form_staff').insert(payload)
    }
  }

  return { success: true }
}

export async function deleteFormStaffActiveRow(submissionId: number, gradeId: number) {
  const supabase = createOfficeClient()
  const { data: existing } = await supabase
    .from('form_staff')
    .select('id, suspended_count, suspended_total_basic, suspended_due_salary')
    .eq('submission_id', submissionId)
    .eq('grade_id', gradeId)
    .maybeSingle()

  if (existing) {
    if ((existing.suspended_count ?? 0) > 0 || (existing.suspended_total_basic ?? 0) > 0) {
      await supabase.from('form_staff').update({
        count: 0,
        total_basic: 0,
        due_salary: 0,
      }).eq('id', existing.id)
    } else {
      await supabase.from('form_staff').delete().eq('id', existing.id)
    }
  }
  return { success: true }
}

export async function deleteFormStaffSuspendedRow(submissionId: number, gradeId: number) {
  const supabase = createOfficeClient()
  const { data: existing } = await supabase
    .from('form_staff')
    .select('id, count, total_basic, due_salary')
    .eq('submission_id', submissionId)
    .eq('grade_id', gradeId)
    .maybeSingle()

  if (existing) {
    if ((existing.count ?? 0) > 0 || (existing.total_basic ?? 0) > 0) {
      await supabase.from('form_staff').update({
        suspended_count: 0,
        suspended_total_basic: 0,
        suspended_due_salary: 0,
      }).eq('id', existing.id)
    } else {
      await supabase.from('form_staff').delete().eq('id', existing.id)
    }
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
  const supabase = createOfficeClient()

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
  const supabase = createOfficeClient()

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

export async function saveFormRestRecreation(
  submissionId: number,
  data: {
    rest_recreation_amount: number
    rest_recreation_due: number
  }
) {
  const supabase = createOfficeClient()

  const { data: existing } = await supabase
    .from('form_leave')
    .select('*')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('form_leave')
      .update({
        rest_recreation_amount: data.rest_recreation_amount,
        rest_recreation_due: data.rest_recreation_due,
      })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('form_leave')
      .insert({
        submission_id: submissionId,
        leave_encashment_officer_basic: 0,
        leave_encashment_officer_due: 0,
        leave_encashment_staff_basic: 0,
        leave_encashment_staff_due: 0,
        rest_recreation_amount: data.rest_recreation_amount,
        rest_recreation_due: data.rest_recreation_due,
      })
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function saveFormAllowanceRow(
  submissionId: number,
  allowanceTypeId: number,
  data: { count: number; total_basic: number; amount: number; due: number }
) {
  const supabase = createOfficeClient()

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
  const supabase = createOfficeClient()

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

export async function deleteFormUtilityRow(
  submissionId: number,
  utilityTypeId: number
) {
  const supabase = createOfficeClient()
  const { error } = await supabase
    .from('form_utility')
    .delete()
    .eq('submission_id', submissionId)
    .eq('utility_type_id', utilityTypeId)
  if (error) return { error: error.message }
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
  const supabase = createOfficeClient()

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
  const supabase = createOfficeClient()

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

export async function deleteFormHouseRent(submissionId: number) {
  const supabase = createOfficeClient()
  const { error } = await supabase
    .from('form_house_rent')
    .delete()
    .eq('submission_id', submissionId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteFormReturnInfo(submissionId: number) {
  const supabase = createOfficeClient()
  const { error } = await supabase
    .from('form_return_info')
    .delete()
    .eq('submission_id', submissionId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function saveFormVehicleRow(
  submissionId: number,
  data: {
    id?: number
    vehicle_fuel_config_id: number
    count: number
    maintenance_cost?: number
    additional_expense: number
  }
) {
  const supabase = createOfficeClient()

  const payload: any = {
    submission_id: submissionId,
    vehicle_fuel_config_id: data.vehicle_fuel_config_id,
    count: data.count,
    additional_expense: data.additional_expense,
  }

  if (data.maintenance_cost !== undefined) {
    payload.maintenance_cost = data.maintenance_cost
  }

  if (data.id) {
    const { error } = await supabase
      .from('form_vehicles')
      .update(payload)
      .eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } else {
    // Check if entry already exists for this submission and config
    const { data: existing } = await supabase
      .from('form_vehicles')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('vehicle_fuel_config_id', data.vehicle_fuel_config_id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('form_vehicles')
        .update(payload)
        .eq('id', existing.id)
      if (error) return { error: error.message }
      return { success: true, id: existing.id }
    }

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
  const supabase = createOfficeClient()
  const { error } = await supabase.from('form_vehicles').delete().eq('id', rowId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function saveFormVehicleRentRow(
  submissionId: number,
  data: {
    id?: number
    vehicle_rent_config_id: number
    count: number
  }
) {
  const supabase = createOfficeClient()

  const payload = {
    submission_id: submissionId,
    vehicle_rent_config_id: data.vehicle_rent_config_id,
    count: data.count,
  }

  if (data.id) {
    const { error } = await supabase
      .from('form_vehicle_rent')
      .update(payload)
      .eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } else {
    // Check if entry exists
    const { data: existing } = await supabase
      .from('form_vehicle_rent')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('vehicle_rent_config_id', data.vehicle_rent_config_id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('form_vehicle_rent')
        .update(payload)
        .eq('id', existing.id)
      if (error) return { error: error.message }
      return { success: true, id: existing.id }
    }

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
  const supabase = createOfficeClient()
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
  const supabase = createOfficeClient()

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

export async function deleteFormITEquipmentRow(
  submissionId: number,
  equipmentTypeId: number
) {
  const supabase = createOfficeClient()
  const { error } = await supabase
    .from('form_it_equipment')
    .delete()
    .eq('submission_id', submissionId)
    .eq('equipment_type_id', equipmentTypeId)
  if (error) return { error: error.message }
  return { success: true }
}

export interface NewStaffRecord {
  grade_id: number
  count: number
  monthly_basic: number
  expected_date: string // YYYY-MM-DD
  remaining_months: number
  total_salary: number
}

export async function getFormNewStaffRows(submissionId: number): Promise<NewStaffRecord[]> {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('*').limit(1)
  if (!profiles || profiles.length === 0) return []
  const profile = profiles[0]
  const username = profile.username || ''
  const tag = `:::new_staff_${submissionId}=`
  if (!username.includes(tag)) return []
  try {
    const raw = username.split(tag)[1]?.split(':::')[0]
    return raw ? JSON.parse(decodeURIComponent(raw)) : []
  } catch {
    return []
  }
}

export async function saveFormNewStaffRows(submissionId: number, rows: NewStaffRecord[]) {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('*').limit(1)
  if (!profiles || profiles.length === 0) return { success: false, error: 'No admin profile' }
  const profile = profiles[0]
  let username = profile.username || ''
  const tag = `:::new_staff_${submissionId}=`

  // Remove existing entry for this submission if any
  if (username.includes(tag)) {
    const parts = username.split(tag)
    const after = parts[1].includes(':::') ? ':::' + parts[1].split(':::').slice(1).join(':::') : ''
    username = parts[0] + after
  }

  const encoded = encodeURIComponent(JSON.stringify(rows))
  username = `${username}${tag}${encoded}`

  const { error } = await supabase.from('admin_profiles').update({ username }).eq('id', profile.id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
