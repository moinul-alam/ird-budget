'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'
import { getOfficeTypesHierarchy, getDepartments, getMinistries } from './admin-offices-config'

export interface HeadOfficeItem {
  id: number
  name: string
  budget_id?: string
  department_id: number
  department_name: string
  ministry_id?: string
  ministry_name?: string
  office_type_id: number
  office_type_name: string
  office_level: number // Level from hierarchy
  created_at?: string
}

export interface FieldOfficeItem {
  id: number
  budget_id: string
  name: string
  department_id: number
  department_name: string
  ministry_id?: string
  ministry_name?: string
  office_type_id: number
  office_type_name: string
  office_level: number
  head_office_id: number
  head_office_name: string
  password_hint: string
  created_at?: string
}

// -------------------------------------------------------------
// HEAD OFFICES (parent_offices) CRUD
// -------------------------------------------------------------

export async function getHeadOffices(): Promise<HeadOfficeItem[]> {
  const supabase = createOfficeClient()

  // Head offices = core_offices where parent_office_id IS NULL
  const { data, error } = await supabase
    .from('core_offices')
    .select('*')
    .is('parent_office_id', null)
    .order('id', { ascending: false })

  if (error || !data) {
    console.error('[getHeadOffices] error:', error?.message)
    return []
  }

  // Fetch departments and office types for display names
  const [departments, officeTypes] = await Promise.all([
    getDepartments(),
    getOfficeTypesHierarchy(),
  ])

  const deptMap = new Map(departments.map((d) => [d.id, d]))
  const otMap = new Map(officeTypes.map((ot) => [ot.id, ot]))

  return data.map((o: any) => {
    const dept = deptMap.get(o.department_id)
    const ot = otMap.get(o.office_type_id)

    return {
      id: o.id,
      name: o.name,
      budget_id: o.budget_id || '',
      department_id: o.department_id,
      department_name: dept?.name || '—',
      ministry_id: dept?.ministry_id || '',
      ministry_name: '',
      office_type_id: o.office_type_id,
      office_type_name: ot?.name || '—',
      office_level: o.office_level_id || 1,
      created_at: o.created_at,
    }
  })
}

export async function saveHeadOffice(data: {
  id?: number
  name: string
  department_id: number
  office_type_id: number
  office_level: number
  budget_id?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'হেড অফিসের নাম আবশ্যক' }
  if (!data.department_id) return { error: 'দপ্তর/সংস্থা নির্বাচন আবশ্যক' }
  if (!data.office_type_id) return { error: 'অফিসের ধরণ নির্বাচন আবশ্যক' }
  const trimmedBudget = data.budget_id ? data.budget_id.trim() : ''

  const supabase = createOfficeClient()

  // Auto-assign office_level_id: first level of the selected office type
  const { data: levels } = await supabase
    .from('admin_office_levels')
    .select('id')
    .eq('office_type_id', data.office_type_id)
    .order('level_order', { ascending: true })
    .limit(1)
  const officeLevelId = levels?.[0]?.id || null

  // Verify budget_id uniqueness
  if (trimmedBudget) {
    const query = supabase
      .from('core_offices')
      .select('id')
      .eq('budget_id', trimmedBudget)
    if (data.id) query.neq('id', data.id)
    const { data: existing } = await query.maybeSingle()
    if (existing) {
      return { error: 'এই বাজেট আইডিটি ইতিমধ্যে অন্য অফিসের জন্য ব্যবহৃত হচ্ছে।' }
    }
  }

  if (data.id) {
    const { error } = await supabase
      .from('core_offices')
      .update({
        name: trimmed,
        budget_id: trimmedBudget || undefined,
        department_id: data.department_id,
        office_type_id: data.office_type_id,
        office_level_id: officeLevelId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    if (!trimmedBudget) return { error: 'বাজেট আইডি আবশ্যক' }
    const { error } = await supabase
      .from('core_offices')
      .insert({
        name: trimmed,
        budget_id: trimmedBudget,
        department_id: data.department_id,
        office_type_id: data.office_type_id,
        office_level_id: officeLevelId,
        is_active: true,
      })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/offices-management/head-offices')
  revalidatePath('/admin/offices-management/field-offices')
  revalidatePath('/')
  return { success: true }
}

export async function deleteHeadOffice(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  // Check for child offices
  const { data: children } = await supabase
    .from('core_offices')
    .select('id')
    .eq('parent_office_id', id)
    .limit(1)

  if (children && children.length > 0) {
    return { error: 'এই হেড অফিসের অধীনে মাঠ পর্যায়ের অফিস বিদ্যমান রয়েছে। প্রথমে সংশ্লিষ্ট মাঠ পর্যায়ের অফিসসমূহ অপসারণ করুন।' }
  }

  const { error } = await supabase.from('core_offices').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/offices-management/head-offices')
  revalidatePath('/admin/offices-management/field-offices')
  revalidatePath('/')
  return { success: true }
}

// -------------------------------------------------------------
// FIELD OFFICES (offices) CRUD + User & Password
// -------------------------------------------------------------

export async function getFieldOffices(): Promise<FieldOfficeItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase
    .from('offices')
    .select(`
      id,
      budget_id,
      name,
      parent_office_id,
      office_type_id,
      created_at,
      office_type:office_type_id(id, name, department_id, departments(id, name)),
      parent_office:parent_office_id(id, name, department_id, departments(id, name))
    `)
    .order('id', { ascending: false })

  if (error || !data) return []

  const [ministries, officeTypes] = await Promise.all([
    getMinistries(),
    getOfficeTypesHierarchy(),
  ])

  const minMap = new Map(ministries.map((m) => [m.id, m.name]))

  // Filter out self-synced head offices (:::poid=), ministries (:::mid=), and departments (:::did=)
  const fieldOfficeRows = data.filter((off: any) => {
    const raw = off.name || ''
    return !raw.includes(':::poid=') && !raw.includes(':::mid=') && !raw.includes(':::did=')
  })

  return fieldOfficeRows.map((off: any) => {
    let cleanName = off.name || ''
    let passwordHint = '12345'

    if (cleanName.includes(':::pwd$')) {
      const parts = cleanName.split(':::pwd$')
      cleanName = parts[0]
      passwordHint = parts[1] || '12345'
    }
    if (cleanName.includes(':::mid=')) cleanName = cleanName.split(':::mid=')[0]
    if (cleanName.includes(':::did=')) cleanName = cleanName.split(':::did=')[0]
    if (cleanName.includes(':::poid=')) cleanName = cleanName.split(':::poid=')[0]

    // Head office clean name
    let headOfficeName = off.parent_office?.name || '—'
    if (headOfficeName.includes(':::type=')) {
      headOfficeName = headOfficeName.split(':::type=')[0]
    }

    // Type clean name & order
    const matchedType = officeTypes.find((ot) => ot.id === off.office_type_id)
    const office_level = matchedType?.hierarchy_order || 1

    // Department & Ministry
    const deptObj = off.office_type?.departments || off.parent_office?.departments
    let deptName = deptObj?.name || ''
    let ministry_id = ''
    let ministry_name = ''
    if (deptName.includes(':::min=')) {
      const minParts = deptName.split(':::min=')
      deptName = minParts[0]
      ministry_id = minParts[1] || ''
      ministry_name = minMap.get(ministry_id) || ''
    }

    return {
      id: off.id,
      budget_id: off.budget_id,
      name: cleanName,
      department_id: deptObj?.id || 0,
      department_name: deptName,
      ministry_id,
      ministry_name,
      office_type_id: off.office_type_id,
      office_type_name: matchedType?.name || off.office_type?.name || '—',
      office_level,
      head_office_id: off.parent_office_id || 0,
      head_office_name: headOfficeName,
      password_hint: passwordHint,
      created_at: off.created_at,
    }
  })
}

export async function saveFieldOffice(data: {
  id?: number
  name: string
  budget_id: string
  head_office_id: number
  office_type_id: number
  password?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmedName = data.name.trim()
  const trimmedBudget = data.budget_id.trim()
  const pwd = (data.password?.trim()) || '12345'

  if (!trimmedName) return { error: 'মাঠ পর্যায়ের অফিসের নাম আবশ্যক' }
  if (!trimmedBudget) return { error: 'বাজেট আইডি আবশ্যক' }
  if (!data.head_office_id) return { error: 'হেড অফিস নির্বাচন আবশ্যক' }
  if (!data.office_type_id) return { error: 'অফিসের ধরণ নির্বাচন আবশ্যক' }

  const supabase = createOfficeClient()

  // Check unique budget_id
  if (data.id) {
    const { data: existing } = await supabase
      .from('offices')
      .select('id')
      .eq('budget_id', trimmedBudget)
      .neq('id', data.id)
      .maybeSingle()
    if (existing) return { error: 'এই বাজেট আইডিটি ইতিমধ্যে অন্য অফিসের জন্য ব্যবহৃত হচ্ছে।' }
  } else {
    const { data: existing } = await supabase
      .from('offices')
      .select('id')
      .eq('budget_id', trimmedBudget)
      .maybeSingle()
    if (existing) return { error: 'এই বাজেট আইডিটি ইতিমধ্যে ব্যবহৃত হচ্ছে।' }
  }

  const encodedName = `${trimmedName}:::pwd$${pwd}`

  if (data.id) {
    const { error } = await supabase
      .from('offices')
      .update({
        name: encodedName,
        budget_id: trimmedBudget,
        parent_office_id: data.head_office_id,
        office_type_id: data.office_type_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('offices')
      .insert({
        name: encodedName,
        budget_id: trimmedBudget,
        parent_office_id: data.head_office_id,
        office_type_id: data.office_type_id,
      })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/offices-management/field-offices')
  revalidatePath('/admin/offices-users')
  revalidatePath('/')
  return { success: true }
}

export async function deleteFieldOffice(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase.from('offices').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/offices-management/field-offices')
  revalidatePath('/admin/offices-users')
  revalidatePath('/')
  return { success: true }
}
