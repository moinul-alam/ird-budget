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

export async function getMinistriesList(): Promise<SelectOption[]> {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('id, username').limit(1)
  if (!profiles || profiles.length === 0) return []

  const root = profiles[0]
  if (root.username.includes(':::ocfg=')) {
    try {
      const encoded = root.username.split(':::ocfg=')[1].split(':::')[0]
      const parsed = JSON.parse(decodeURIComponent(encoded))
      if (Array.isArray(parsed.ministries)) {
        return parsed.ministries.map((m: any) => ({ id: m.id, name: m.name }))
      }
    } catch {
      return []
    }
  }
  return []
}

export async function getDepartments(ministryId?: string): Promise<(SelectOption & { ministry_id?: string })[]> {
  const supabase = createOfficeClient()
  const { data } = await supabase
    .from('departments')
    .select('id, name')
    .order('id')

  if (!data) return []

  const list: (SelectOption & { ministry_id?: string })[] = data.map((d: any) => {
    let cleanName = d.name || ''
    let minId = ''
    if (cleanName.includes(':::min=')) {
      const parts = cleanName.split(':::min=')
      cleanName = parts[0]
      minId = parts[1] || ''
    }
    return {
      id: String(d.id),
      name: cleanName,
      ministry_id: minId,
    }
  })

  if (ministryId) {
    return list.filter((d: SelectOption & { ministry_id?: string }) => d.ministry_id === ministryId)
  }

  return list
}

export async function getParentOffices(departmentId: string): Promise<SelectOption[]> {
  const supabase = createOfficeClient()
  const { data } = await supabase
    .from('parent_offices')
    .select('id, name')
    .eq('department_id', departmentId)
    .order('id')

  if (!data) return []

  return data.map((p: any) => {
    let cleanName = p.name || ''
    if (cleanName.includes(':::type=')) {
      cleanName = cleanName.split(':::type=')[0]
    }
    return {
      id: String(p.id),
      name: cleanName,
    }
  })
}

export async function getOfficeTypes(departmentId: string): Promise<SelectOption[]> {
  const supabase = createOfficeClient()
  const { data } = await supabase
    .from('office_types')
    .select('id, name')
    .eq('department_id', departmentId)
    .order('id')

  if (!data) return []

  return data.map((t: any) => {
    let cleanName = t.name || ''
    if (cleanName.includes(':::order=')) {
      cleanName = cleanName.split(':::order=')[0]
    }
    return {
      id: String(t.id),
      name: cleanName,
    }
  })
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
