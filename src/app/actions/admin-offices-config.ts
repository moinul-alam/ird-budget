'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export interface MinistryItem {
  id: string
  name: string
  budget_id?: string
  created_at?: string
}

export interface DepartmentItem {
  id: number
  name: string
  budget_id?: string
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

export interface OfficeLevelItem {
  id: string // e.g. "lvl-123456789"
  office_type_id: number
  office_type_name?: string
  department_id: number
  department_name?: string
  level_name: string // e.g. "কর অঞ্চল", "কর আপীল অঞ্চল", "কর রেঞ্জসমূহ"
  level_order: number // e.g. 1, 1, 2
  created_at?: string
}

export interface GroupBudgetSettingItem {
  id: string // e.g. "grp-123456789"
  department_id: number
  department_name?: string
  office_type_id: number
  office_type_name?: string
  office_level_id?: string
  office_level_name?: string
  office_level_order?: number
  is_group_budget: boolean
  created_at?: string
}

// -------------------------------------------------------------------
// Helper for Ministry, Office Levels & Group Settings storage via admin_profiles
// -------------------------------------------------------------------
interface OfficeHierarchyConfig {
  ministries: MinistryItem[]
  office_levels?: OfficeLevelItem[]
  group_settings?: GroupBudgetSettingItem[]
}

async function getStoredOfficeConfig(): Promise<OfficeHierarchyConfig> {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('id, username').limit(1)
  if (!profiles || profiles.length === 0) return { ministries: [], office_levels: [], group_settings: [] }

  const root = profiles[0]
  if (root.username.includes(':::ocfg=')) {
    try {
      const encoded = root.username.split(':::ocfg=')[1].split(':::')[0]
      const parsed = JSON.parse(decodeURIComponent(encoded))
      return {
        ministries: Array.isArray(parsed.ministries) ? parsed.ministries : [],
        office_levels: Array.isArray(parsed.office_levels) ? parsed.office_levels : [],
        group_settings: Array.isArray(parsed.group_settings) ? parsed.group_settings : [],
      }
    } catch {
      return { ministries: [], office_levels: [], group_settings: [] }
    }
  }
  return { ministries: [], office_levels: [], group_settings: [] }
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

export async function saveMinistry(data: { id?: string; name: string; budget_id?: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'মন্ত্রণালয়/বিভাগের নাম আবশ্যক' }
  const trimmedBudget = data.budget_id ? data.budget_id.trim() : ''

  const supabase = createOfficeClient()

  // If budget_id provided, verify uniqueness in offices table
  if (trimmedBudget) {
    const { data: existing } = await supabase
      .from('offices')
      .select('id, name')
      .eq('budget_id', trimmedBudget)
      .maybeSingle()

    // If an office exists with this budget_id, check if it's not our ministry office
    if (existing) {
      const isOurOffice = existing.name.includes(`:::mid=${data.id || ''}`)
      if (!isOurOffice) {
        return { error: 'এই বাজেট আইডিটি ইতিমধ্যে অন্য অফিসের জন্য ব্যবহৃত হচ্ছে।' }
      }
    }
  }

  const cfg = await getStoredOfficeConfig()
  const list = [...cfg.ministries]
  let minId = data.id

  if (data.id) {
    const idx = list.findIndex((m) => m.id === data.id)
    if (idx !== -1) {
      const oldItem = list[idx]
      // If budget_id was removed or changed, handle old office
      if (oldItem.budget_id && oldItem.budget_id !== trimmedBudget) {
        await supabase
          .from('offices')
          .delete()
          .eq('budget_id', oldItem.budget_id)
      }
      list[idx] = { ...list[idx], name: trimmed, budget_id: trimmedBudget || undefined }
    }
  } else {
    minId = `min-${Date.now()}`
    list.push({
      id: minId,
      name: trimmed,
      budget_id: trimmedBudget || undefined,
      created_at: new Date().toISOString(),
    })
  }

  // If budget_id is provided, sync to offices table so they can log in
  if (trimmedBudget && minId) {
    // Get a valid office_type_id (fallback to first available type if needed)
    const { data: otData } = await supabase.from('office_types').select('id').limit(1)
    const defaultTypeId = otData && otData.length > 0 ? otData[0].id : 1

    const officeName = `${trimmed}:::mid=${minId}`

    // Check if office exists with this budget_id
    const { data: existingOffice } = await supabase
      .from('offices')
      .select('id')
      .eq('budget_id', trimmedBudget)
      .maybeSingle()

    if (existingOffice) {
      await supabase
        .from('offices')
        .update({
          name: officeName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOffice.id)
    } else {
      await supabase
        .from('offices')
        .insert({
          name: officeName,
          budget_id: trimmedBudget,
          office_type_id: defaultTypeId,
          parent_office_id: null,
        })
    }
  }

  const res = await saveStoredOfficeConfig({ ministries: list })
  if (res.error) return { error: res.error }

  revalidatePath('/admin/offices-config')
  revalidatePath('/admin/offices-management/field-offices')
  revalidatePath('/')
  return { success: true }
}

export async function deleteMinistry(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cfg = await getStoredOfficeConfig()
  const target = cfg.ministries.find((m) => m.id === id)
  const list = cfg.ministries.filter((m) => m.id !== id)

  const supabase = createOfficeClient()
  if (target?.budget_id) {
    await supabase.from('offices').delete().eq('budget_id', target.budget_id)
  }

  const res = await saveStoredOfficeConfig({ ministries: list })
  if (res.error) return { error: res.error }

  revalidatePath('/admin/offices-config')
  revalidatePath('/admin/offices-management/field-offices')
  revalidatePath('/')
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
    let budget_id = ''

    if (name.includes(':::budget=')) {
      const bParts = name.split(':::budget=')
      name = bParts[0]
      const bRest = bParts[1] || ''
      if (bRest.includes(':::')) {
        budget_id = bRest.split(':::')[0]
      } else {
        budget_id = bRest
      }
    }

    if (name.includes(':::min=')) {
      const parts = name.split(':::min=')
      name = parts[0]
      ministry_id = parts[1] || ''
      ministry_name = minMap.get(ministry_id) || ''
    }

    return {
      id: d.id,
      name,
      budget_id,
      ministry_id,
      ministry_name,
      created_at: d.created_at,
    }
  })
}

export async function saveDepartment(data: { id?: number; name: string; ministry_id?: string; budget_id?: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'দপ্তর/সংস্থার নাম আবশ্যক' }
  const trimmedBudget = data.budget_id ? data.budget_id.trim() : ''

  const supabase = createOfficeClient()

  // If budget_id provided, verify uniqueness in offices table
  if (trimmedBudget) {
    const { data: existing } = await supabase
      .from('offices')
      .select('id, name')
      .eq('budget_id', trimmedBudget)
      .maybeSingle()

    if (existing) {
      const isOurOffice = existing.name.includes(`:::did=${data.id || ''}`)
      if (!isOurOffice) {
        return { error: 'এই বাজেট আইডিটি ইতিমধ্যে অন্য অফিসের জন্য ব্যবহৃত হচ্ছে।' }
      }
    }
  }

  // Handle old budget_id if department being updated
  if (data.id) {
    const { data: oldDept } = await supabase
      .from('departments')
      .select('name')
      .eq('id', data.id)
      .maybeSingle()

    if (oldDept?.name && oldDept.name.includes(':::budget=')) {
      const oldB = oldDept.name.split(':::budget=')[1]?.split(':::')[0]
      if (oldB && oldB !== trimmedBudget) {
        await supabase.from('offices').delete().eq('budget_id', oldB)
      }
    }
  }

  let storedName = trimmed
  if (data.ministry_id) storedName += `:::min=${data.ministry_id}`
  if (trimmedBudget) storedName += `:::budget=${trimmedBudget}`

  let deptId = data.id

  if (data.id) {
    const { error } = await supabase
      .from('departments')
      .update({ name: storedName, updated_at: new Date().toISOString() })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { data: inserted, error } = await supabase
      .from('departments')
      .insert({ name: storedName })
      .select('id')
      .single()
    if (error) return { error: error.message }
    deptId = inserted.id
  }

  // Sync to offices table if budget_id provided
  if (trimmedBudget && deptId) {
    // Find office type belonging to this department, or fallback
    const { data: otData } = await supabase
      .from('office_types')
      .select('id')
      .eq('department_id', deptId)
      .limit(1)

    let officeTypeId = otData && otData.length > 0 ? otData[0].id : null
    if (!officeTypeId) {
      const { data: anyOt } = await supabase.from('office_types').select('id').limit(1)
      officeTypeId = anyOt && anyOt.length > 0 ? anyOt[0].id : 1
    }

    const officeName = `${trimmed}:::did=${deptId}`

    const { data: existingOffice } = await supabase
      .from('offices')
      .select('id')
      .eq('budget_id', trimmedBudget)
      .maybeSingle()

    if (existingOffice) {
      await supabase
        .from('offices')
        .update({
          name: officeName,
          office_type_id: officeTypeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOffice.id)
    } else {
      await supabase
        .from('offices')
        .insert({
          name: officeName,
          budget_id: trimmedBudget,
          office_type_id: officeTypeId,
          parent_office_id: null,
        })
    }
  }

  revalidatePath('/admin/offices-config')
  revalidatePath('/admin/offices-management/field-offices')
  revalidatePath('/')
  return { success: true }
}

export async function deleteDepartment(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  // Clean up linked office if any
  const { data: oldDept } = await supabase
    .from('departments')
    .select('name')
    .eq('id', id)
    .maybeSingle()

  if (oldDept?.name && oldDept.name.includes(':::budget=')) {
    const oldB = oldDept.name.split(':::budget=')[1]?.split(':::')[0]
    if (oldB) {
      await supabase.from('offices').delete().eq('budget_id', oldB)
    }
  }

  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/offices-config')
  revalidatePath('/admin/offices-management/field-offices')
  revalidatePath('/')
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

// -------------------------------------------------------------------
// TAB 4: মাঠ অফিসের স্তর (Office Levels Hierarchy)
// -------------------------------------------------------------------
export async function getOfficeLevels(): Promise<OfficeLevelItem[]> {
  const cfg = await getStoredOfficeConfig()
  const officeTypes = await getOfficeTypesHierarchy()
  const officeTypeMap = new Map(officeTypes.map((ot) => [ot.id, ot]))

  const levels = cfg.office_levels || []
  return levels.map((lvl) => {
    const ot = officeTypeMap.get(lvl.office_type_id)
    return {
      ...lvl,
      office_type_name: ot?.name || lvl.office_type_name || '',
      department_id: ot?.department_id || lvl.department_id,
      department_name: ot?.department_name || lvl.department_name || '',
    }
  }).sort((a, b) => {
    if (a.level_order !== b.level_order) {
      return a.level_order - b.level_order
    }
    return (a.level_name || '').localeCompare(b.level_name || '', 'bn')
  })
}

export async function saveOfficeLevel(data: {
  id?: string
  office_type_id: number
  level_name: string
  level_order: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.level_name.trim()
  if (!trimmed) return { error: 'স্তরের নাম আবশ্যক' }
  if (!data.office_type_id) return { error: 'অফিসের ধরণ নির্বাচন আবশ্যক' }
  if (!data.level_order || data.level_order < 1) return { error: 'সঠিক স্তরের ক্রম আবশ্যক' }

  const cfg = await getStoredOfficeConfig()
  const list = [...(cfg.office_levels || [])]

  // Get department info from office_types
  const supabase = createOfficeClient()
  const { data: otData } = await supabase
    .from('office_types')
    .select('id, name, department_id, departments(id, name)')
    .eq('id', data.office_type_id)
    .maybeSingle()

  let deptName = otData?.departments?.name || ''
  if (deptName.includes(':::min=')) {
    deptName = deptName.split(':::min=')[0]
  }

  let otName = otData?.name || ''
  if (otName.includes(':::order=')) {
    otName = otName.split(':::order=')[0]
  }
  if (otName.includes(':::label=')) {
    otName = otName.split(':::label=')[0]
  }

  const levelItem: OfficeLevelItem = {
    id: data.id || `lvl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    office_type_id: data.office_type_id,
    office_type_name: otName,
    department_id: otData?.department_id || 0,
    department_name: deptName,
    level_name: trimmed,
    level_order: data.level_order,
    created_at: new Date().toISOString(),
  }

  if (data.id) {
    const idx = list.findIndex((l) => l.id === data.id)
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...levelItem }
    } else {
      list.push(levelItem)
    }
  } else {
    list.push(levelItem)
  }

  const res = await saveStoredOfficeConfig({
    ministries: cfg.ministries,
    office_levels: list,
    group_settings: cfg.group_settings,
  })

  if (res.error) return { error: res.error }

  revalidatePath('/admin/offices-config')
  return { success: true, level: levelItem }
}

export async function deleteOfficeLevel(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cfg = await getStoredOfficeConfig()
  const list = (cfg.office_levels || []).filter((l) => l.id !== id)

  const res = await saveStoredOfficeConfig({
    ministries: cfg.ministries,
    office_levels: list,
    group_settings: cfg.group_settings,
  })

  if (res.error) return { error: res.error }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

// -------------------------------------------------------------------
// TAB 5: গ্রুপ বাজেট নির্ধারণ (Group Budget Settings)
// -------------------------------------------------------------------
export async function getGroupBudgetSettings(): Promise<GroupBudgetSettingItem[]> {
  const cfg = await getStoredOfficeConfig()
  const officeTypes = await getOfficeTypesHierarchy()
  const officeLevels = await getOfficeLevels()

  const otMap = new Map(officeTypes.map((ot) => [ot.id, ot]))
  const lvlMap = new Map(officeLevels.map((lvl) => [lvl.id, lvl]))

  const list = cfg.group_settings || []
  return list.map((g) => {
    const ot = otMap.get(g.office_type_id)
    const lvl = g.office_level_id ? lvlMap.get(g.office_level_id) : undefined
    return {
      ...g,
      department_name: ot?.department_name || g.department_name || 'সাধারণ',
      office_type_name: ot?.name || g.office_type_name || '',
      office_level_name: lvl?.level_name || g.office_level_name || '',
      office_level_order: lvl?.level_order || g.office_level_order,
    }
  })
}

export async function saveGroupBudgetSetting(data: {
  id?: string
  department_id: number
  office_type_id: number
  office_level_id?: string
  is_group_budget: boolean
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  if (!data.office_type_id) return { error: 'অফিসের ধরণ নির্বাচন আবশ্যক' }

  const cfg = await getStoredOfficeConfig()
  const officeTypes = await getOfficeTypesHierarchy()
  const officeLevels = await getOfficeLevels()

  const ot = officeTypes.find((o) => o.id === data.office_type_id)
  const lvl = data.office_level_id ? officeLevels.find((l) => l.id === data.office_level_id) : undefined

  const list = [...(cfg.group_settings || [])]

  const item: GroupBudgetSettingItem = {
    id: data.id || `grp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    department_id: data.department_id || ot?.department_id || 0,
    department_name: ot?.department_name || '',
    office_type_id: data.office_type_id,
    office_type_name: ot?.name || '',
    office_level_id: data.office_level_id || '',
    office_level_name: lvl?.level_name || '',
    office_level_order: lvl?.level_order,
    is_group_budget: data.is_group_budget,
    created_at: new Date().toISOString(),
  }

  // Also update is_group_budget on office_types table so existing logic keeps working
  await updateGroupBudgetStatus(data.office_type_id, data.is_group_budget)

  if (data.id) {
    const idx = list.findIndex((g) => g.id === data.id)
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item }
    } else {
      list.push(item)
    }
  } else {
    // If setting already exists for this office_type_id + office_level_id, update it
    const existingIdx = list.findIndex(
      (g) => g.office_type_id === data.office_type_id && (g.office_level_id || '') === (data.office_level_id || '')
    )
    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...item }
    } else {
      list.push(item)
    }
  }

  const res = await saveStoredOfficeConfig({
    ministries: cfg.ministries,
    office_levels: cfg.office_levels,
    group_settings: list,
  })

  if (res.error) return { error: res.error }

  revalidatePath('/admin/offices-config')
  return { success: true, setting: item }
}

export async function deleteGroupBudgetSetting(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cfg = await getStoredOfficeConfig()
  const target = (cfg.group_settings || []).find((g) => g.id === id)
  const list = (cfg.group_settings || []).filter((g) => g.id !== id)

  if (target?.office_type_id) {
    // If no other group settings remain for this office_type, turn is_group_budget off
    const hasOthers = list.some((g) => g.office_type_id === target.office_type_id && g.is_group_budget)
    if (!hasOthers) {
      await updateGroupBudgetStatus(target.office_type_id, false)
    }
  }

  const res = await saveStoredOfficeConfig({
    ministries: cfg.ministries,
    office_levels: cfg.office_levels,
    group_settings: list,
  })

  if (res.error) return { error: res.error }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

