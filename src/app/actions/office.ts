'use server'

import { createOfficeClient } from '@/lib/supabase/server'

interface SelectOption {
  id: string
  name: string
}

export async function searchOffice(budgetId: string): Promise<{ found: boolean; office?: { id: string; name: string } }> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('offices')
    .select('id, name')
    .eq('budget_id', budgetId)
    .maybeSingle()

  if (error || !data) {
    return { found: false }
  }

  return { found: true, office: data }
}

export async function getDepartments(): Promise<SelectOption[]> {
  const supabase = createOfficeClient()
  const { data } = await supabase
    .from('departments')
    .select('id, name')
    .order('name')

  return data || []
}

export async function getParentOffices(departmentId: string): Promise<SelectOption[]> {
  const supabase = createOfficeClient()
  const { data } = await supabase
    .from('parent_offices')
    .select('id, name')
    .eq('department_id', departmentId)
    .order('name')

  return data || []
}

export async function getOfficeTypes(departmentId: string): Promise<SelectOption[]> {
  const supabase = createOfficeClient()
  const { data } = await supabase
    .from('office_types')
    .select('id, name')
    .eq('department_id', departmentId)
    .order('name')

  return data || []
}

export async function getOfficeProfile(officeId: number) {
  const supabase = createOfficeClient()
  const { data: office, error } = await supabase
    .from('offices')
    .select(`
      id,
      name,
      budget_id,
      office_type_id,
      parent_office_id,
      office_type:office_types(id, name, department_id, departments(id, name)),
      parent_office:parent_offices(id, name)
    `)
    .eq('id', officeId)
    .maybeSingle()

  if (error || !office) return null

  let cleanName = office.name || ''
  if (cleanName.includes(':::pwd$')) {
    cleanName = cleanName.split(':::pwd$')[0]
  }

  const departmentId = (office as any).office_type?.department_id || null

  return {
    id: office.id,
    name: cleanName,
    budgetId: office.budget_id,
    officeTypeId: office.office_type_id,
    parentOfficeId: office.parent_office_id,
    departmentId,
  }
}

export async function updateOfficeProfile(data: {
  officeId: number
  name: string
  officeTypeId?: number
  parentOfficeId?: number | null
}) {
  const supabase = createOfficeClient()
  
  // Fetch existing office record to preserve custom password if present
  const { data: existing } = await supabase
    .from('offices')
    .select('name')
    .eq('id', data.officeId)
    .maybeSingle()

  let finalName = data.name.trim()
  if (existing?.name && existing.name.includes(':::pwd$')) {
    const pwd = existing.name.split(':::pwd$')[1]
    if (pwd) {
      finalName = `${finalName}:::pwd$${pwd}`
    }
  }

  const updatePayload: any = {
    name: finalName,
  }
  if (data.officeTypeId) {
    updatePayload.office_type_id = data.officeTypeId
  }
  if (data.parentOfficeId !== undefined) {
    updatePayload.parent_office_id = data.parentOfficeId
  }

  const { error } = await supabase
    .from('offices')
    .update(updatePayload)
    .eq('id', data.officeId)

  if (error) {
    return { error: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে: ' + error.message }
  }

  return { success: true, cleanName: data.name.trim() }
}
