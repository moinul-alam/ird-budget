'use server'

import { createOfficeClient } from '@/lib/supabase/server'

interface SelectOption {
  id: string
  name: string
}

export async function searchOffice(budgetId: string): Promise<{ found: boolean; office?: { id: string; name: string } }> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('core_offices')
    .select('id, name')
    .eq('budget_id', budgetId.trim())
    .maybeSingle()

  if (error || !data) {
    return { found: false }
  }

  return { found: true, office: { id: String(data.id), name: data.name } }
}

export async function getMinistriesList(): Promise<SelectOption[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('core_ministries')
    .select('id, name')
    .order('id')

  if (error || !data) return []
  return data.map((m: any) => ({ id: String(m.id), name: m.name }))
}

export async function getDepartments(ministryId?: string): Promise<(SelectOption & { ministry_id?: string })[]> {
  const supabase = createOfficeClient()
  let query = supabase.from('core_departments').select('id, name, ministry_id').order('id')

  if (ministryId) {
    query = query.eq('ministry_id', parseInt(ministryId, 10))
  }

  const { data, error } = await query
  if (error || !data) return []

  return data.map((d: any) => ({
    id: String(d.id),
    name: d.name,
    ministry_id: String(d.ministry_id),
  }))
}

export async function getParentOffices(departmentId: string): Promise<SelectOption[]> {
  const supabase = createOfficeClient()
  const deptIdNum = parseInt(departmentId, 10)
  if (isNaN(deptIdNum)) return []

  const { data, error } = await supabase
    .from('core_offices')
    .select('id, name')
    .eq('department_id', deptIdNum)
    .order('id')

  if (error || !data) return []

  return data.map((p: any) => ({
    id: String(p.id),
    name: p.name,
  }))
}

export async function getOfficeTypes(departmentId: string): Promise<SelectOption[]> {
  const supabase = createOfficeClient()
  const deptIdNum = parseInt(departmentId, 10)
  if (isNaN(deptIdNum)) return []

  const { data, error } = await supabase
    .from('core_office_types')
    .select('id, name')
    .eq('department_id', deptIdNum)
    .order('sort_order', { ascending: true })

  if (error || !data) return []

  return data.map((t: any) => ({
    id: String(t.id),
    name: t.name,
  }))
}

export async function getOfficeProfile(officeId: number) {
  const supabase = createOfficeClient()
  const { data: office, error } = await supabase
    .from('core_offices')
    .select(`
      id,
      name,
      budget_id,
      department_id,
      office_type_id,
      parent_office_id,
      office_type:core_office_types(id, name, department_id, departments:core_departments(id, name)),
      parent_office:parent_office_id(id, name)
    `)
    .eq('id', officeId)
    .maybeSingle()

  if (error || !office) return null

  return {
    id: office.id,
    name: office.name,
    budgetId: office.budget_id,
    officeTypeId: office.office_type_id,
    parentOfficeId: office.parent_office_id,
    departmentId: office.department_id,
  }
}

export async function updateOfficeProfile(data: {
  officeId: number
  name: string
  officeTypeId?: number
  parentOfficeId?: number | null
}) {
  const supabase = createOfficeClient()
  
  const updatePayload: any = {
    name: data.name.trim(),
    updated_at: new Date().toISOString(),
  }
  if (data.officeTypeId) {
    updatePayload.office_type_id = data.officeTypeId
  }
  if (data.parentOfficeId !== undefined) {
    updatePayload.parent_office_id = data.parentOfficeId
  }

  const { error } = await supabase
    .from('core_offices')
    .update(updatePayload)
    .eq('id', data.officeId)

  if (error) {
    return { error: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে: ' + error.message }
  }

  return { success: true, cleanName: data.name.trim() }
}
