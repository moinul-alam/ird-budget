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
  hierarchy_order?: number | null
  hierarchy_label?: string
  is_group_budget: boolean
  created_at?: string
}

export interface OfficeLevelItem {
  id: string
  office_type_id: number
  office_type_name?: string
  department_id: number
  department_name?: string
  level_name: string
  level_order: number
  created_at?: string
}

export interface GroupBudgetSettingItem {
  id: string
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
// TAB 1: মন্ত্রণালয় / বিভাগ (core_ministries)
// -------------------------------------------------------------------
export async function getMinistries(): Promise<MinistryItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('core_ministries')
    .select('*')
    .order('id')

  if (error || !data) return []

  return data.map((m: any) => ({
    id: String(m.id),
    name: m.name,
    budget_id: m.code,
    created_at: m.created_at,
  }))
}

export async function saveMinistry(data: { id?: string; name: string; budget_id?: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'মন্ত্রণালয়/বিভাগের নাম আবশ্যক' }
  const trimmedBudget = (data.budget_id || `MIN_${Date.now()}`).trim()

  const supabase = createOfficeClient()

  if (data.id) {
    const idNum = parseInt(data.id, 10)
    const { error } = await supabase
      .from('core_ministries')
      .update({ name: trimmed, code: trimmedBudget, updated_at: new Date().toISOString() })
      .eq('id', idNum)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('core_ministries')
      .insert({ name: trimmed, code: trimmedBudget })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

export async function deleteMinistry(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const idNum = parseInt(id, 10)
  const { error } = await supabase.from('core_ministries').delete().eq('id', idNum)

  if (error) return { error: error.message }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

// -------------------------------------------------------------------
// TAB 2: দপ্তর / সংস্থা (core_departments)
// -------------------------------------------------------------------
export async function getDepartments(): Promise<DepartmentItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('core_departments')
    .select('*, core_ministries(id, name)')
    .order('id')

  if (error || !data) return []

  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    budget_id: d.code,
    ministry_id: String(d.ministry_id),
    ministry_name: d.core_ministries?.name || '',
    created_at: d.created_at,
  }))
}

export async function saveDepartment(data: { id?: number; name: string; ministry_id?: string; budget_id?: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'দপ্তর/সংস্থার নাম আবশ্যক' }
  const minId = data.ministry_id ? parseInt(data.ministry_id, 10) : 1
  const trimmedBudget = (data.budget_id || `DEPT_${data.id || Date.now()}`).trim()

  const supabase = createOfficeClient()

  if (data.id) {
    const { error } = await supabase
      .from('core_departments')
      .update({
        name: trimmed,
        code: trimmedBudget,
        ministry_id: minId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('core_departments')
      .insert({
        name: trimmed,
        code: trimmedBudget,
        ministry_id: minId,
      })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

export async function deleteDepartment(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase.from('core_departments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

// -------------------------------------------------------------------
// TAB 3: Office Types & Hierarchy (core_office_types)
// -------------------------------------------------------------------
export async function getOfficeTypesHierarchy(): Promise<OfficeTypeHierarchyItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('core_office_types')
    .select('*, core_departments(id, name)')
    .order('sort_order', { ascending: true })

  if (error || !data) return []

  return data.map((ot: any) => ({
    id: ot.id,
    name: ot.name,
    department_id: ot.department_id,
    department_name: ot.core_departments?.name || '',
    hierarchy_order: ot.sort_order || ot.id,
    hierarchy_label: '',
    is_group_budget: Boolean(ot.is_group_budget),
    created_at: ot.created_at,
  }))
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
    const { error } = await supabase
      .from('core_office_types')
      .update({
        name: trimmed,
        department_id: data.department_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { data: maxOrder } = await supabase
      .from('core_office_types')
      .select('sort_order')
      .eq('department_id', data.department_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (maxOrder?.sort_order || 0) + 1

    const { error } = await supabase
      .from('core_office_types')
      .insert({
        name: trimmed,
        department_id: data.department_id,
        sort_order: nextOrder,
        is_group_budget: false,
      })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

export async function updateOfficeTypeHierarchyOrder(id: number, hierarchy_order: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase
    .from('core_office_types')
    .update({ sort_order: hierarchy_order, updated_at: new Date().toISOString() })
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
    .from('core_office_types')
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
  const { error } = await supabase.from('core_office_types').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

// -------------------------------------------------------------------
// TAB 4: মাঠ অফিসের স্তর (admin_office_levels) - PERMANENT RELATIONAL TABLE
// -------------------------------------------------------------------
export async function getOfficeLevels(): Promise<OfficeLevelItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('admin_office_levels')
    .select(`
      id,
      department_id,
      office_type_id,
      level_name,
      level_order,
      created_at,
      core_departments(name),
      core_office_types(name)
    `)
    .order('level_order', { ascending: true })

  if (error || !data) return []

  return data.map((lvl: any) => ({
    id: String(lvl.id),
    office_type_id: lvl.office_type_id,
    office_type_name: lvl.core_office_types?.name || '',
    department_id: lvl.department_id,
    department_name: lvl.core_departments?.name || '',
    level_name: lvl.level_name,
    level_order: lvl.level_order,
    created_at: lvl.created_at,
  }))
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

  const supabase = createOfficeClient()

  // Fetch department_id from office_types
  const { data: otData } = await supabase
    .from('core_office_types')
    .select('department_id, name, core_departments(name)')
    .eq('id', data.office_type_id)
    .single()

  const deptId = otData?.department_id || 10

  const idNum = data.id && !isNaN(parseInt(data.id, 10)) ? parseInt(data.id, 10) : undefined

  let savedId: number = 0

  if (idNum) {
    const { error: updErr } = await supabase
      .from('admin_office_levels')
      .update({
        office_type_id: data.office_type_id,
        department_id: deptId,
        level_name: trimmed,
        level_order: data.level_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', idNum)

    if (updErr) return { error: updErr.message }
    savedId = idNum
  } else {
    const { data: insData, error: insErr } = await supabase
      .from('admin_office_levels')
      .insert({
        office_type_id: data.office_type_id,
        department_id: deptId,
        level_name: trimmed,
        level_order: data.level_order,
      })
      .select('id')
      .single()

    if (insErr) return { error: insErr.message }
    savedId = insData.id
  }

  const levelItem: OfficeLevelItem = {
    id: String(savedId),
    office_type_id: data.office_type_id,
    office_type_name: otData?.name || '',
    department_id: deptId,
    department_name: (otData as any)?.core_departments?.name || '',
    level_name: trimmed,
    level_order: data.level_order,
    created_at: new Date().toISOString(),
  }

  revalidatePath('/admin/offices-config')
  return { success: true, level: levelItem }
}

export async function deleteOfficeLevel(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const idNum = parseInt(id, 10)
  const { error } = await supabase.from('admin_office_levels').delete().eq('id', idNum)

  if (error) return { error: error.message }

  revalidatePath('/admin/offices-config')
  return { success: true }
}

// -------------------------------------------------------------------
// TAB 5: গ্রুপ বাজেট সেটিংস (admin_group_budget_rules / core_office_types)
// -------------------------------------------------------------------
export async function getGroupBudgetSettings(): Promise<GroupBudgetSettingItem[]> {
  const supabase = createOfficeClient()
  const [types, levels] = await Promise.all([
    getOfficeTypesHierarchy(),
    getOfficeLevels(),
  ])

  const levelMap = new Map(levels.map((l) => [l.id, l]))
  const typeMap = new Map(types.map((t) => [t.id, t]))

  // Attempt to fetch from admin_group_budget_rules table
  const { data: rules } = await supabase
    .from('admin_group_budget_rules')
    .select('*')
    .order('id', { ascending: true })

  if (rules && rules.length > 0) {
    return rules.map((r: any) => {
      const matchedOt = typeMap.get(r.office_type_id)
      const matchedLvl = r.office_level_id ? levelMap.get(String(r.office_level_id)) : undefined

      return {
        id: String(r.id),
        department_id: matchedOt?.department_id || r.department_id || 0,
        department_name: matchedOt?.department_name || '',
        office_type_id: r.office_type_id,
        office_type_name: matchedOt?.name || '',
        office_level_id: r.office_level_id ? String(r.office_level_id) : undefined,
        office_level_name: matchedLvl?.level_name || (r.office_level_name || ''),
        office_level_order: matchedLvl?.level_order,
        is_group_budget: Boolean(r.is_group_budget),
        created_at: r.created_at,
      }
    })
  }

  // Fallback to office types with is_group_budget = true
  return types
    .filter((t) => t.is_group_budget)
    .map((t) => ({
      id: String(t.id),
      department_id: t.department_id,
      department_name: t.department_name,
      office_type_id: t.id,
      office_type_name: t.name,
      is_group_budget: t.is_group_budget,
      created_at: t.created_at,
    }))
}

export async function saveGroupBudgetSetting(data: {
  id?: string
  office_type_id: number
  office_level_id?: string
  department_id?: number
  is_group_budget: boolean
}): Promise<{ success?: boolean; error?: string; setting?: GroupBudgetSettingItem }> {
  const supabase = createOfficeClient()

  // 1. Keep core_office_types.is_group_budget in sync
  await updateGroupBudgetStatus(data.office_type_id, data.is_group_budget)

  const [types, levels] = await Promise.all([
    getOfficeTypesHierarchy(),
    getOfficeLevels(),
  ])

  const matchedOt = types.find((t) => t.id === data.office_type_id)
  const matchedLvl = data.office_level_id ? levels.find((l) => l.id === data.office_level_id) : undefined

  const deptId = data.department_id || matchedOt?.department_id || 0
  const lvlIdNum = data.office_level_id ? parseInt(data.office_level_id, 10) : null

  let savedId = data.id || `rule-${Date.now()}`

  // Store in admin_group_budget_rules table
  const idNum = data.id && !data.id.startsWith('legacy-') && !data.id.startsWith('rule-') ? parseInt(data.id, 10) : undefined

  if (idNum) {
    const { error: updErr } = await supabase
      .from('admin_group_budget_rules')
      .update({
        office_type_id: data.office_type_id,
        office_level_id: isNaN(lvlIdNum as any) ? null : lvlIdNum,
        department_id: deptId,
        is_group_budget: data.is_group_budget,
        updated_at: new Date().toISOString(),
      })
      .eq('id', idNum)

    if (updErr) {
      console.error('[saveGroupBudgetSetting] update error:', updErr)
      return { error: `ডাটাবেস আপডেট ত্রুটি: ${updErr.message}` }
    }
    savedId = String(idNum)
  } else {
    const { data: insData, error: insErr } = await supabase
      .from('admin_group_budget_rules')
      .insert({
        office_type_id: data.office_type_id,
        office_level_id: isNaN(lvlIdNum as any) ? null : lvlIdNum,
        department_id: deptId,
        is_group_budget: data.is_group_budget,
      })
      .select('id')
      .single()

    if (insErr) {
      console.error('[saveGroupBudgetSetting] insert error:', insErr)
      return { error: `ডাটাবেস সংরক্ষণ ত্রুটি: ${insErr.message}` }
    }
    if (insData?.id) savedId = String(insData.id)
  }

  const settingItem: GroupBudgetSettingItem = {
    id: String(savedId),
    department_id: deptId,
    department_name: matchedOt?.department_name || '',
    office_type_id: data.office_type_id,
    office_type_name: matchedOt?.name || '',
    office_level_id: data.office_level_id || undefined,
    office_level_name: matchedLvl?.level_name || '',
    office_level_order: matchedLvl?.level_order,
    is_group_budget: data.is_group_budget,
    created_at: new Date().toISOString(),
  }

  revalidatePath('/admin/offices-config')
  return { success: true, setting: settingItem }
}

export async function deleteGroupBudgetSetting(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  const idNum = parseInt(id, 10)
  if (!isNaN(idNum)) {
    // Try delete from admin_group_budget_rules
    await supabase.from('admin_group_budget_rules').delete().eq('id', idNum)
    // Also try update office type
    await updateGroupBudgetStatus(idNum, false)
  }

  revalidatePath('/admin/offices-config')
  return { success: true }
}
