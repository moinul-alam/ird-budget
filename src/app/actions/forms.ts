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

  const { data: existing } = await supabase
    .from('office_form_basic')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('office_form_basic')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('office_form_basic')
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
    const payload = {
      submission_id: submissionId,
      grade_id: row.grade_id,
      staff_count: row.count,
      monthly_basic: row.total_basic,
      due_salary: row.due_salary,
    }

    const { data: existing } = await supabase
      .from('office_form_staff_working')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('grade_id', row.grade_id)
      .maybeSingle()

    if (existing) {
      await supabase.from('office_form_staff_working').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('office_form_staff_working').insert(payload)
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
    const payload = {
      submission_id: submissionId,
      grade_id: row.grade_id,
      suspended_count: row.suspended_count,
      suspended_monthly_basic: row.suspended_total_basic,
      suspended_due_salary: row.suspended_due_salary,
    }

    const { data: existing } = await supabase
      .from('office_form_staff_suspended')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('grade_id', row.grade_id)
      .maybeSingle()

    if (existing) {
      await supabase.from('office_form_staff_suspended').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('office_form_staff_suspended').insert(payload)
    }
  }

  return { success: true }
}

export async function deleteFormStaffActiveRow(submissionId: number, gradeId: number) {
  const supabase = createOfficeClient()
  await supabase
    .from('office_form_staff_working')
    .delete()
    .eq('submission_id', submissionId)
    .eq('grade_id', gradeId)
  return { success: true }
}

export async function deleteFormStaffSuspendedRow(submissionId: number, gradeId: number) {
  const supabase = createOfficeClient()
  await supabase
    .from('office_form_staff_suspended')
    .delete()
    .eq('submission_id', submissionId)
    .eq('grade_id', gradeId)
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

  // Save active
  const { data: exActive } = await supabase
    .from('office_form_staff_working')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('grade_id', gradeId)
    .maybeSingle()

  const activePayload = {
    submission_id: submissionId,
    grade_id: gradeId,
    staff_count: data.count,
    monthly_basic: data.total_basic,
    due_salary: data.due_salary,
  }

  if (exActive) {
    await supabase.from('office_form_staff_working').update(activePayload).eq('id', exActive.id)
  } else {
    await supabase.from('office_form_staff_working').insert(activePayload)
  }

  // Save suspended
  const { data: exSuspended } = await supabase
    .from('office_form_staff_suspended')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('grade_id', gradeId)
    .maybeSingle()

  const suspendedPayload = {
    submission_id: submissionId,
    grade_id: gradeId,
    suspended_count: data.suspended_count,
    suspended_monthly_basic: data.suspended_total_basic,
    suspended_due_salary: data.suspended_due_salary,
  }

  if (exSuspended) {
    await supabase.from('office_form_staff_suspended').update(suspendedPayload).eq('id', exSuspended.id)
  } else {
    await supabase.from('office_form_staff_suspended').insert(suspendedPayload)
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
    .from('office_form_leave_encashment')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('office_form_leave_encashment')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('office_form_leave_encashment')
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
    .from('office_form_leave_encashment')
    .select('*')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('office_form_leave_encashment')
      .update({
        rest_recreation_amount: data.rest_recreation_amount,
        rest_recreation_due: data.rest_recreation_due,
      })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('office_form_leave_encashment')
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

  const allowanceName = `allowance_${allowanceTypeId}`

  if (isZero) {
    await supabase
      .from('office_form_allowances')
      .delete()
      .eq('submission_id', submissionId)
      .eq('allowance_name', allowanceName)
    return { success: true }
  }

  const payload = {
    submission_id: submissionId,
    allowance_name: allowanceName,
    officer_count: data.count,
    staff_count: 0,
    total_annual_amount: data.amount,
  }

  const { data: existing } = await supabase
    .from('office_form_allowances')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('allowance_name', allowanceName)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('office_form_allowances')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('office_form_allowances')
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
  const utilityName = `util_${utilityTypeId}`

  const payload = {
    submission_id: submissionId,
    utility_name: utilityName,
    annual_bill: data.annual_cost,
    arrears_due: data.due,
  }

  const { data: existing } = await supabase
    .from('office_form_utilities')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('utility_name', utilityName)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('office_form_utilities')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('office_form_utilities')
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
  const utilityName = `util_${utilityTypeId}`
  const { error } = await supabase
    .from('office_form_utilities')
    .delete()
    .eq('submission_id', submissionId)
    .eq('utility_name', utilityName)
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
    monthly_rent: data.monthly_bill,
    arrears_due: data.due,
    vat_percentage: 15,
    annual_total: (data.monthly_bill * 12) + data.due,
  }

  const { data: existing } = await supabase
    .from('office_form_house_rent')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('office_form_house_rent')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('office_form_house_rent')
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
    return_submitted_count: data.return_submitted_count,
    postal_rate_per_return: 50,
    total_postal_demand: data.return_submitted_count * 50,
  }

  const { data: existing } = await supabase
    .from('office_form_return_info')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('office_form_return_info')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('office_form_return_info')
      .insert(payload)
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function deleteFormHouseRent(submissionId: number) {
  const supabase = createOfficeClient()
  const { error } = await supabase
    .from('office_form_house_rent')
    .delete()
    .eq('submission_id', submissionId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteFormReturnInfo(submissionId: number) {
  const supabase = createOfficeClient()
  const { error } = await supabase
    .from('office_form_return_info')
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
    vehicle_type: `Vehicle ${data.vehicle_fuel_config_id}`,
    fuel_type: 'Octane',
    vehicle_count: data.count,
    annual_maintenance_allowance: data.additional_expense,
    maintenance_due: data.maintenance_cost || 0,
  }

  if (data.id) {
    const { error } = await supabase
      .from('office_form_vehicles_govt')
      .update(payload)
      .eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } else {
    const { data: inserted, error } = await supabase
      .from('office_form_vehicles_govt')
      .insert(payload)
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { success: true, id: inserted.id }
  }
}

export async function deleteFormVehicleRow(rowId: number) {
  const supabase = createOfficeClient()
  const { error } = await supabase.from('office_form_vehicles_govt').delete().eq('id', rowId)
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
    vehicle_type: `Rent Vehicle ${data.vehicle_rent_config_id}`,
    vehicle_count: data.count,
    monthly_rent_rate: 0,
    annual_total_rent: 0,
  }

  if (data.id) {
    const { error } = await supabase
      .from('office_form_vehicles_rent')
      .update(payload)
      .eq('id', data.id)
    if (error) return { error: error.message }
    return { success: true, id: data.id }
  } else {
    const { data: inserted, error } = await supabase
      .from('office_form_vehicles_rent')
      .insert(payload)
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { success: true, id: inserted.id }
  }
}

export async function deleteFormVehicleRentRow(rowId: number) {
  const supabase = createOfficeClient()
  const { error } = await supabase.from('office_form_vehicles_rent').delete().eq('id', rowId)
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
    equipment_type: `IT Equip ${equipmentTypeId}`,
    existing_count: data.existing_count,
    new_demand_count: data.required_qty,
    toner_cost_monthly: data.toner_cost,
    annual_total_cost: (data.required_qty * data.unit_budget) + (data.toner_cost * 12),
  }

  const { data: existing } = await supabase
    .from('office_form_it_equipment')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('equipment_type', payload.equipment_type)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('office_form_it_equipment')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('office_form_it_equipment')
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
  const eqName = `IT Equip ${equipmentTypeId}`
  const { error } = await supabase
    .from('office_form_it_equipment')
    .delete()
    .eq('submission_id', submissionId)
    .eq('equipment_type', eqName)
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
  const { data: records, error } = await supabase
    .from('office_form_staff_new_recruits')
    .select('*')
    .eq('submission_id', submissionId)
    .order('grade_id')

  if (error || !records) return []

  return records.map((r: any) => ({
    grade_id: Number(r.grade_id),
    count: Number(r.recruit_count || 0),
    monthly_basic: Number(r.monthly_basic || 0),
    expected_date: r.joining_date || '',
    remaining_months: Number(r.months_remaining || 12),
    total_salary: Number(r.total_salary || 0),
  }))
}

export async function saveFormNewStaffRows(submissionId: number, rows: NewStaffRecord[]) {
  const supabase = createOfficeClient()
  
  // Clean existing rows for this submission in office_form_staff_new_recruits
  await supabase
    .from('office_form_staff_new_recruits')
    .delete()
    .eq('submission_id', submissionId)

  if (!rows || rows.length === 0) {
    return { success: true }
  }

  const inserts = rows.map((r) => ({
    submission_id: submissionId,
    grade_id: r.grade_id,
    recruit_count: r.count,
    monthly_basic: r.monthly_basic,
    joining_date: r.expected_date ? r.expected_date : null,
    months_remaining: r.remaining_months,
    total_salary: r.total_salary,
  }))

  const { error } = await supabase
    .from('office_form_staff_new_recruits')
    .insert(inserts)

  if (error) return { success: false, error: error.message }

  return { success: true }
}
