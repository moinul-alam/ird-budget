'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export interface MinistryItem {
  id: string
  name: string
  created_at?: string
}

export interface DepartmentItem {
  id: number
  name: string
  ministry_id?: string
  ministry_name?: string
  created_at?: string
}

export interface OfficeTypeHierarchyItem {
  id: number
  name: string
  department_id: number
  department_name?: string
  hierarchy_order?: number | null // 1, 2, 3... or null if unassigned
  hierarchy_label?: string // Custom level name, e.g. "আঞ্চলিক শীর্ষ অফিস", "সার্কেল অফিস"
  is_group_budget: boolean
  created_at?: string
}

// -------------------------------------------------------------------
// Helper for Ministry storage via admin_profiles
// -------------------------------------------------------------------
interface OfficeHierarchyConfig {
  ministries: MinistryItem[]
}

async function getStoredOfficeConfig(): Promise<OfficeHierarchyConfig> {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('id, username').limit(1)
  if (!profiles || profiles.length === 0) return { ministries: [] }

  const root = profiles[0]
  if (root.username.includes(':::ocfg=')) {
    try {
      const encoded = root.username.split(':::ocfg=')[1].split(':::')[0]
      const parsed = JSON.parse(decodeURIComponent(encoded))
      return {
        ministries: Array.isArray(parsed.ministries) ? parsed.ministries : [],
      }
    } catch {
      return { ministries: [] }
    }
  }
  return { ministries: [] }
}

async function saveStoredOfficeConfig(config: OfficeHierarchyConfig) {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('*').limit(1)
  if (!profiles || profiles.length === 0) return { error: 'অ্যাডমিন প্রোফাইল পাওয়া যায়নি' }

  const root = profiles[0]
  let rawUsername = root.username
  if (rawUsername.includes(':::ocfg=')) {
    const parts = rawUsername.split(':::ocfg=')
    const before = parts[0]
    const afterSegments = parts[1].split(':::').slice(1).join(':::')
    rawUsername = afterSegments ? `${before}:::${afterSegments}` : before
  }

  const encoded = encodeURIComponent(JSON.stringify(config))
  const newUsername = `${rawUsername}:::ocfg=${encoded}`

  const { error } = await supabase
    .from('admin_profiles')
    .update({ username: newUsername })
    .eq('id', root.id)

  if (error) return { error: error.message }
  return { success: true }
}

// -------------------------------------------------------------------
// TAB 1: মন্ত্রণালয় / বিভাগ (Ministries)
// -------------------------------------------------------------------
export async function getMinistries(): Promise<MinistryItem[]> {
  const cfg = await getStoredOfficeConfig()
  return cfg.ministries
}

export async function saveMinistry(data: { id?: string; name: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'মন্ত্রণালয়/বিভাগের নাম আবশ্যক' }

  const cfg = await getStoredOfficeConfig()
  const list = [...cfg.ministries]

  if (data.id) {
    const idx = list.findIndex((m) => m.id === data.id)
    if (idx !== -1) list[idx] = { ...list[idx], name: trimmed }
  } else {
    list.push({
      id: `min-${Date.now()}`,
      name: trimmed,
      created_at: new Date().toISOString(),
    })
  }

  const res = await saveStoredOfficeConfig({ ministries: list })
  if (res.error) return { error: res.error }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

export async function deleteMinistry(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cfg = await getStoredOfficeConfig()
  const list = cfg.ministries.filter((m) => m.id !== id)

  const res = await saveStoredOfficeConfig({ ministries: list })
  if (res.error) return { error: res.error }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

// -------------------------------------------------------------------
// TAB 2: দপ্তর / সংস্থা (Departments)
// -------------------------------------------------------------------
export async function getDepartments(): Promise<DepartmentItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase.from('departments').select('*').order('id')
  if (error || !data) return []

  const cfg = await getStoredOfficeConfig()
  const minMap = new Map(cfg.ministries.map((m) => [m.id, m.name]))

  return data.map((d: any) => {
    let name = d.name || ''
    let ministry_id = ''
    let ministry_name = ''

    if (name.includes(':::min=')) {
      const parts = name.split(':::min=')
      name = parts[0]
      ministry_id = parts[1] || ''
      ministry_name = minMap.get(ministry_id) || ''
    }

    return {
      id: d.id,
      name,
      ministry_id,
      ministry_name,
      created_at: d.created_at,
    }
  })
}

export async function saveDepartment(data: { id?: number; name: string; ministry_id?: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'দপ্তর/সংস্থার নাম আবশ্যক' }

  const supabase = createOfficeClient()
  const storedName = data.ministry_id ? `${trimmed}:::min=${data.ministry_id}` : trimmed

  if (data.id) {
    const { error } = await supabase
      .from('departments')
      .update({ name: storedName, updated_at: new Date().toISOString() })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('departments')
      .insert({ name: storedName })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

export async function deleteDepartment(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

// -------------------------------------------------------------------
// TAB 2 & 3: Office Types & Hierarchy & Group Budget
// -------------------------------------------------------------------
export async function getOfficeTypesHierarchy(): Promise<OfficeTypeHierarchyItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('office_types')
    .select('*, departments(id, name)')
    .order('id')

  if (error || !data) return []

  return data.map((ot: any) => {
    let name = ot.name || ''
    let order: number | null = null
    let label = ''

    // Check if hierarchy label encoded (e.g. ":::label=আঞ্চলিক শীর্ষ অফিস")
    if (name.includes(':::label=')) {
      const labelParts = name.split(':::label=')
      name = labelParts[0]
      label = labelParts[1] || ''
    }

    // Check if hierarchy order encoded (e.g. "কর অঞ্চল:::order=1")
    if (name.includes(':::order=')) {
      const parts = name.split(':::order=')
      name = parts[0]
      const parsed = parseInt(parts[1], 10)
      if (!isNaN(parsed) && parsed > 0) {
        order = parsed
      }
    }

    let deptName = ot.departments?.name || ''
    if (deptName.includes(':::min=')) {
      deptName = deptName.split(':::min=')[0]
    }

    return {
      id: ot.id,
      name,
      department_id: ot.department_id,
      department_name: deptName,
      hierarchy_order: order,
      hierarchy_label: label,
      is_group_budget: ot.is_group_budget || false,
      created_at: ot.created_at,
    }
  }).sort((a: any, b: any) => {
    if (a.hierarchy_order && b.hierarchy_order) return a.hierarchy_order - b.hierarchy_order
    if (a.hierarchy_order) return -1
    if (b.hierarchy_order) return 1
    return a.id - b.id
  })
}

export async function saveOfficeTypeOnly(data: {
  id?: number
  name: string
  department_id: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'অফিসের ধরণ আবশ্যক' }

  const supabase = createOfficeClient()

  if (data.id) {
    // Preserve existing order if already set
    const { data: existing } = await supabase.from('office_types').select('name').eq('id', data.id).maybeSingle()
    let encodedName = trimmed
    if (existing?.name && existing.name.includes(':::order=')) {
      const order = parseInt(existing.name.split(':::order=')[1], 10)
      if (order && !isNaN(order)) {
        encodedName = `${trimmed}:::order=${order}`
      }
    }
    const { error } = await supabase
      .from('office_types')
      .update({
        name: encodedName,
        department_id: data.department_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    // Create office type without automatic hierarchy order (hierarchy is assigned explicitly in Tab 4)
    const { error } = await supabase
      .from('office_types')
      .insert({
        name: trimmed,
        department_id: data.department_id,
        is_group_budget: false,
      })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

export async function updateOfficeTypeHierarchyOrder(id: number, hierarchy_order: number, hierarchy_label?: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { data: existing } = await supabase.from('office_types').select('name').eq('id', id).maybeSingle()
  if (!existing) return { error: 'অফিসের ধরণ পাওয়া যায়নি' }

  let baseName = existing.name || ''
  if (baseName.includes(':::label=')) {
    baseName = baseName.split(':::label=')[0]
  }
  if (baseName.includes(':::order=')) {
    baseName = baseName.split(':::order=')[0]
  }

  const cleanLabel = (hierarchy_label || '').trim()
  const encodedName = cleanLabel
    ? `${baseName}:::order=${hierarchy_order}:::label=${cleanLabel}`
    : `${baseName}:::order=${hierarchy_order}`

  const { error } = await supabase
    .from('office_types')
    .update({ name: encodedName, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

export async function removeOfficeTypeHierarchyOrder(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { data: existing } = await supabase.from('office_types').select('name').eq('id', id).maybeSingle()
  if (!existing) return { error: 'অফিসের ধরণ পাওয়া যায়নি' }

  let baseName = existing.name || ''
  if (baseName.includes(':::label=')) {
    baseName = baseName.split(':::label=')[0]
  }
  if (baseName.includes(':::order=')) {
    baseName = baseName.split(':::order=')[0]
  }

  const { error } = await supabase
    .from('office_types')
    .update({ name: baseName, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

export async function updateGroupBudgetStatus(id: number, is_group_budget: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase
    .from('office_types')
    .update({ is_group_budget, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

export async function deleteOfficeType(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase.from('office_types').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/offices-config')
  return { success: true }
}
