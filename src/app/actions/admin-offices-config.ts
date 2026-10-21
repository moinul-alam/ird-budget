'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export interface DepartmentItem {
  id: number
  name: string
  created_at?: string
}

export interface OfficeTypeHierarchyItem {
  id: number
  name: string
  department_id: number
  department_name?: string
  hierarchy_order: number // 1, 2, 3...
  is_group_budget: boolean
  created_at?: string
}

// -------------------------------------------------------------------
// TAB 1: Department Types (বিভাগ)
// -------------------------------------------------------------------
export async function getDepartments(): Promise<DepartmentItem[]> {
  const supabase = createOfficeClient()
  const { data, error } = await supabase.from('departments').select('*').order('id')
  if (error || !data) return []
  return data
}

export async function saveDepartment(data: { id?: number; name: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'বিভাগের নাম আবশ্যক' }

  const supabase = createOfficeClient()

  if (data.id) {
    const { error } = await supabase
      .from('departments')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('departments')
      .insert({ name: trimmed })
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
    let order = ot.id

    // Check if hierarchy order encoded (e.g. "কর অঞ্চল:::order=1")
    if (name.includes(':::order=')) {
      const parts = name.split(':::order=')
      name = parts[0]
      order = parseInt(parts[1], 10) || ot.id
    }

    return {
      id: ot.id,
      name,
      department_id: ot.department_id,
      department_name: ot.departments?.name || '',
      hierarchy_order: order,
      is_group_budget: ot.is_group_budget || false,
      created_at: ot.created_at,
    }
  }).sort((a: any, b: any) => a.hierarchy_order - b.hierarchy_order)
}

export async function saveOfficeTypeHierarchy(data: {
  id?: number
  name: string
  department_id: number
  hierarchy_order: number
  is_group_budget?: boolean
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'অফিসের ধরণ আবশ্যক' }

  const supabase = createOfficeClient()
  const encodedName = `${trimmed}:::order=${data.hierarchy_order}`

  if (data.id) {
    const { error } = await supabase
      .from('office_types')
      .update({
        name: encodedName,
        department_id: data.department_id,
        is_group_budget: data.is_group_budget ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('office_types')
      .insert({
        name: encodedName,
        department_id: data.department_id,
        is_group_budget: data.is_group_budget ?? false,
      })
    if (error) return { error: error.message }
  }

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
