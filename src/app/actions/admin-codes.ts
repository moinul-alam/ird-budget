'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export interface BudgetCategoryItem {
  id: string
  code: string // e.g. '3111'
  title: string // e.g. 'নগদ মজুরি ও বেতন'
  hierarchy_order: number
}

export interface ExpenseCodeFullItem {
  id: number
  code: string // e.g. '3111101'
  name: string
  parent_code: string // e.g. '3111'
  parent_title: string // e.g. 'নগদ মজুরি ও বেতন'
  hierarchy_order: number // sort_order
  formula_key?: string | null
  is_manual?: boolean
  enabled?: boolean
}

const DEFAULT_CATEGORIES: BudgetCategoryItem[] = [
  { id: 'cat-3111', code: '3111', title: 'নগদ মজুরি ও বেতন', hierarchy_order: 1 },
  { id: 'cat-3211', code: '3211', title: 'প্রশাসনিক ব্যয়', hierarchy_order: 2 },
  { id: 'cat-3243', code: '3243', title: 'পেট্রোল, অয়েল ও লুব্রিকেন্ট', hierarchy_order: 3 },
  { id: 'cat-3244', code: '3244', title: 'ভ্রমণ ও বদলি', hierarchy_order: 4 },
  { id: 'cat-3255', code: '3255', title: 'মুদ্রণ ও মনিহারি', hierarchy_order: 5 },
  { id: 'cat-3256', code: '3256', title: 'সাধারণ সরবরাহ ও কাঁচামাল', hierarchy_order: 6 },
  { id: 'cat-3258', code: '3258', title: 'মেরামত ও সংরক্ষণ', hierarchy_order: 7 },
  { id: 'cat-3821', code: '3821', title: 'আবর্তক স্থানান্তর', hierarchy_order: 8 },
  { id: 'cat-4112', code: '4112', title: 'যন্ত্রপাতি ও সরঞ্জামাদি', hierarchy_order: 9 },
]

// -------------------------------------------------------------------
// CATEGORIES (Left side of Tab 1)
// -------------------------------------------------------------------
export async function getBudgetCategories(): Promise<BudgetCategoryItem[]> {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('id, username').limit(1)

  if (!profiles || profiles.length === 0) {
    return DEFAULT_CATEGORIES
  }

  const root = profiles[0]
  if (root.username.includes(':::categories=')) {
    try {
      const encoded = root.username.split(':::categories=')[1].split(':::')[0]
      const parsed = JSON.parse(decodeURIComponent(encoded))
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => a.hierarchy_order - b.hierarchy_order)
      }
    } catch {
      // fallback
    }
  }

  return DEFAULT_CATEGORIES
}

export async function saveBudgetCategory(data: {
  id?: string
  code: string
  title: string
  hierarchy_order: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmedCode = data.code.trim()
  const trimmedTitle = data.title.trim()
  if (!trimmedCode || !trimmedTitle) return { error: 'ক্যাটাগরি কোড ও নাম আবশ্যক' }

  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('*').limit(1)
  if (!profiles || profiles.length === 0) return { error: 'অ্যাডমিন প্রোফাইল পাওয়া যায়নি' }

  const root = profiles[0]
  const currentCategories = await getBudgetCategories()
  const list = [...currentCategories]

  if (data.id) {
    const idx = list.findIndex((c) => c.id === data.id)
    if (idx !== -1) {
      list[idx] = {
        id: data.id,
        code: trimmedCode,
        title: trimmedTitle,
        hierarchy_order: data.hierarchy_order || 1,
      }
    }
  } else {
    list.push({
      id: `cat-${trimmedCode}`,
      code: trimmedCode,
      title: trimmedTitle,
      hierarchy_order: data.hierarchy_order || list.length + 1,
    })
  }

  list.sort((a, b) => a.hierarchy_order - b.hierarchy_order)

  // Encode back into username
  let rawUsername = root.username
  if (rawUsername.includes(':::categories=')) {
    const parts = rawUsername.split(':::categories=')
    const before = parts[0]
    const afterSegments = parts[1].split(':::').slice(1).join(':::')
    rawUsername = afterSegments ? `${before}:::${afterSegments}` : before
  }

  const encoded = encodeURIComponent(JSON.stringify(list))
  const newUsername = `${rawUsername}:::categories=${encoded}`

  const { error } = await supabase
    .from('admin_profiles')
    .update({ username: newUsername })
    .eq('id', root.id)

  if (error) return { error: error.message }

  revalidatePath('/admin/codes')
  return { success: true }
}

export async function deleteBudgetCategory(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('*').limit(1)
  if (!profiles || profiles.length === 0) return { error: 'অ্যাডমিন প্রোফাইল পাওয়া যায়নি' }

  const root = profiles[0]
  const currentCategories = await getBudgetCategories()
  const list = currentCategories.filter((c) => c.id !== id)

  let rawUsername = root.username
  if (rawUsername.includes(':::categories=')) {
    const parts = rawUsername.split(':::categories=')
    const before = parts[0]
    const afterSegments = parts[1].split(':::').slice(1).join(':::')
    rawUsername = afterSegments ? `${before}:::${afterSegments}` : before
  }

  const encoded = encodeURIComponent(JSON.stringify(list))
  const newUsername = `${rawUsername}:::categories=${encoded}`

  const { error } = await supabase
    .from('admin_profiles')
    .update({ username: newUsername })
    .eq('id', root.id)

  if (error) return { error: error.message }

  revalidatePath('/admin/codes')
  return { success: true }
}

// -------------------------------------------------------------------
// ECONOMIC CODES (Right side of Tab 1) & Tab 2 (Enabling/Disabling)
// -------------------------------------------------------------------
export async function getExpenseCodesWithCategoryAndMapping(officeTypeId: number) {
  const supabase = createOfficeClient()

  // 1. Fetch all expense codes
  const { data: codes, error: e1 } = await supabase
    .from('expense_codes')
    .select('id, code, name, parent_code, parent_title, sort_order, formula_key, is_manual')
    .order('sort_order', { ascending: true })

  // 2. Fetch enabled mappings for this officeTypeId
  const { data: mappings, error: e2 } = await supabase
    .from('code_type_mapping')
    .select('code_id')
    .eq('office_type_id', officeTypeId)

  const enabledCodeIds = new Set<number>((mappings || []).map((m: any) => m.code_id))

  const list: ExpenseCodeFullItem[] = (codes || []).map((c: any) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    parent_code: c.parent_code || '',
    parent_title: c.parent_title || '',
    hierarchy_order: c.sort_order || 0,
    formula_key: c.formula_key,
    is_manual: c.is_manual ?? false,
    enabled: enabledCodeIds.has(c.id),
  }))

  return {
    codes: list,
    enabledCount: enabledCodeIds.size,
  }
}

export async function saveEconomicCode(data: {
  id?: number
  code: string
  name: string
  parent_code: string
  parent_title: string
  hierarchy_order: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmedCode = data.code.trim()
  const trimmedName = data.name.trim()
  if (!trimmedCode || !trimmedName) return { error: 'কোড ও বিবরণ আবশ্যক' }

  const supabase = createOfficeClient()

  if (data.id) {
    const { error } = await supabase
      .from('expense_codes')
      .update({
        code: trimmedCode,
        name: trimmedName,
        parent_code: data.parent_code,
        parent_title: data.parent_title,
        sort_order: data.hierarchy_order || 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('expense_codes').insert({
      code: trimmedCode,
      name: trimmedName,
      parent_code: data.parent_code,
      parent_title: data.parent_title,
      sort_order: data.hierarchy_order || 1,
      is_manual: true,
      active: true,
    })

    if (error) return { error: error.message }
  }

  revalidatePath('/admin/codes')
  revalidatePath('/office/budget-sheet')
  return { success: true }
}

export async function deleteEconomicCode(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()
  const { error } = await supabase.from('expense_codes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/codes')
  revalidatePath('/office/budget-sheet')
  return { success: true }
}

export async function toggleCodeForOfficeType(officeTypeId: number, codeId: number, enable: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  if (enable) {
    const { error } = await supabase.from('code_type_mapping').insert({
      office_type_id: officeTypeId,
      code_id: codeId,
    })
    if (error && !error.message.includes('duplicate')) {
      return { error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('code_type_mapping')
      .delete()
      .eq('office_type_id', officeTypeId)
      .eq('code_id', codeId)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/codes')
  revalidatePath('/office/budget-sheet')
  return { success: true }
}

export async function toggleAllCodesForOfficeType(officeTypeId: number, enableAll: boolean) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  if (enableAll) {
    const { data: allCodes } = await supabase.from('expense_codes').select('id')
    if (allCodes) {
      const rows = allCodes.map((c: any) => ({
        office_type_id: officeTypeId,
        code_id: c.id,
      }))
      await supabase.from('code_type_mapping').delete().eq('office_type_id', officeTypeId)
      const { error } = await supabase.from('code_type_mapping').insert(rows)
      if (error) return { error: error.message }
    }
  } else {
    const { error } = await supabase.from('code_type_mapping').delete().eq('office_type_id', officeTypeId)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/codes')
  revalidatePath('/office/budget-sheet')
  return { success: true }
}
