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
interface StoredLevelMapping {
  [levelId: string]: number[] // array of code_ids enabled for this level
}

async function getStoredLevelMappings(): Promise<StoredLevelMapping> {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('id, username').limit(1)
  if (!profiles || profiles.length === 0) return {}

  const root = profiles[0]
  if (root.username.includes(':::clmap=')) {
    try {
      const encoded = root.username.split(':::clmap=')[1].split(':::')[0]
      const parsed = JSON.parse(decodeURIComponent(encoded))
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      return {}
    }
  }
  return {}
}

async function saveStoredLevelMappings(map: StoredLevelMapping) {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('*').limit(1)
  if (!profiles || profiles.length === 0) return { error: 'অ্যাডমিন প্রোফাইল পাওয়া যায়নি' }

  const root = profiles[0]
  let rawUsername = root.username
  if (rawUsername.includes(':::clmap=')) {
    const parts = rawUsername.split(':::clmap=')
    const before = parts[0]
    const afterSegments = parts[1].split(':::').slice(1).join(':::')
    rawUsername = afterSegments ? `${before}:::${afterSegments}` : before
  }

  const encoded = encodeURIComponent(JSON.stringify(map))
  const newUsername = `${rawUsername}:::clmap=${encoded}`

  const { error } = await supabase
    .from('admin_profiles')
    .update({ username: newUsername })
    .eq('id', root.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getExpenseCodesWithCategoryAndMapping(
  officeTypeId: number,
  officeLevelId?: string
) {
  const supabase = createOfficeClient()

  // 1. Fetch all expense codes from core_economic_codes (or core_expense_codes)
  let { data: codes, error } = await supabase
    .from('core_economic_codes')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error || !codes) {
    const fallbackRes = await supabase
      .from('core_expense_codes')
      .select('*')
      .order('sort_order', { ascending: true })
    codes = fallbackRes.data || []
  }

  let enabledCodeIds = new Set<number>()

  if (officeLevelId) {
    const levelMap = await getStoredLevelMappings()
    if (levelMap[officeLevelId]) {
      enabledCodeIds = new Set<number>(levelMap[officeLevelId])
    } else {
      // Fallback: enabled by default for all office types if not customized
      enabledCodeIds = new Set<number>((codes || []).map((c: any) => c.id))
    }
  } else {
    // Enabled by default if level mapping not customized
    enabledCodeIds = new Set<number>((codes || []).map((c: any) => c.id))
  }

  const categoryNameMap: Record<string, string> = {
    '3111': 'নগদ মজুরি ও বেতন',
    '3211': 'প্রশাসনিক ব্যয়',
    '3243': 'পেট্রোল, অয়েল ও লুব্রিকেন্ট',
    '3244': 'ভ্রমণ ও বদলি',
    '3255': 'মুদ্রণ ও মনিহারি',
    '3256': 'সাধারণ সরবরাহ ও কাঁচামাল',
    '3258': 'মেরামত ও সংরক্ষণ',
    '3821': 'আবর্তক স্থানান্তর',
    '4112': 'যন্ত্রপাতি ও সরঞ্জামাদি',
  }

  const list: ExpenseCodeFullItem[] = (codes || []).map((c: any) => {
    const pCode = c.parent_code || (c.code ? c.code.substring(0, 4) : '')
    const pTitle = c.parent_title || categoryNameMap[pCode] || 'অন্যান্য ব্যয়'

    return {
      id: c.id,
      code: c.code,
      name: c.name,
      parent_code: pCode,
      parent_title: pTitle,
      hierarchy_order: c.sort_order || 0,
      formula_key: c.formula_key,
      is_manual: c.is_manual ?? false,
      enabled: enabledCodeIds.has(c.id),
    }
  })

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

  const targetTable = 'core_economic_codes'

  if (data.id) {
    let { error } = await supabase
      .from(targetTable)
      .update({
        code: trimmedCode,
        name: trimmedName,
        parent_code: data.parent_code,
        parent_title: data.parent_title,
        sort_order: data.hierarchy_order || 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)

    if (error) {
      // Fallback to core_expense_codes
      await supabase
        .from('core_expense_codes')
        .update({
          code: trimmedCode,
          name: trimmedName,
          sort_order: data.hierarchy_order || 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
    }
  } else {
    let { error } = await supabase.from(targetTable).insert({
      code: trimmedCode,
      name: trimmedName,
      parent_code: data.parent_code,
      parent_title: data.parent_title,
      sort_order: data.hierarchy_order || 1,
      is_manual: true,
      is_active: true,
    })

    if (error) {
      await supabase.from('core_expense_codes').insert({
        code: trimmedCode,
        name: trimmedName,
        sort_order: data.hierarchy_order || 1,
        is_manual: true,
        is_active: true,
      })
    }
  }

  revalidatePath('/admin/codes')
  revalidatePath('/office/budget-sheet')
  return { success: true }
}

export async function deleteEconomicCode(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  // Integrity Check: Check if any office has entered data or active budget exists for this code
  const { data: activeEntries } = await supabase
    .from('office_budget_sheet')
    .select('id, auto_value, manual_value')
    .eq('code_id', id)
    .or('auto_value.gt.0,manual_value.gt.0')
    .limit(1)

  if (activeEntries && activeEntries.length > 0) {
    return {
      error: 'এই কোডে বিভিন্ন অফিসের সক্রিয় বাজেট তথ্য বিদ্যমান রয়েছে! ডাটার নিরাপত্তার স্বার্থে এটি মুছে ফেলা সম্ভব নয়।'
    }
  }

  let { error } = await supabase.from('core_economic_codes').delete().eq('id', id)
  if (error) {
    await supabase.from('core_expense_codes').delete().eq('id', id)
  }

  revalidatePath('/admin/codes')
  revalidatePath('/office/budget-sheet')
  return { success: true }
}

export async function toggleCodeForOfficeType(
  officeTypeId: number,
  codeId: number,
  enable: boolean,
  officeLevelId?: string
) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  if (officeLevelId) {
    const levelMap = await getStoredLevelMappings()
    let currentCodes = levelMap[officeLevelId]
    if (!currentCodes) {
      // Initialize with office type codes
      const { data: mappings } = await supabase
        .from('code_type_mapping')
        .select('code_id')
        .eq('office_type_id', officeTypeId)
      currentCodes = (mappings || []).map((m: any) => m.code_id)
    }

    const codeSet = new Set<number>(currentCodes)
    if (enable) {
      codeSet.add(codeId)
    } else {
      codeSet.delete(codeId)
    }

    levelMap[officeLevelId] = Array.from(codeSet)
    const saveRes = await saveStoredLevelMappings(levelMap)
    if (saveRes.error) return { error: saveRes.error }
  } else {
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
  }

  revalidatePath('/admin/codes')
  revalidatePath('/office/budget-sheet')
  return { success: true }
}

export async function toggleBulkCodesForOfficeType(
  officeTypeId: number,
  codeIds: number[],
  enable: boolean,
  officeLevelId?: string
) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }
  if (!codeIds || codeIds.length === 0) return { error: 'কোনো কোড নির্বাচন করা হয়নি' }

  const supabase = createOfficeClient()

  if (officeLevelId) {
    const levelMap = await getStoredLevelMappings()
    let currentCodes = levelMap[officeLevelId]
    if (!currentCodes) {
      // Initialize from office_type mappings if not yet set
      const { data: mappings } = await supabase
        .from('code_type_mapping')
        .select('code_id')
        .eq('office_type_id', officeTypeId)
      currentCodes = (mappings || []).map((m: any) => m.code_id)
    }

    const codeSet = new Set<number>(currentCodes)
    for (const id of codeIds) {
      if (enable) {
        codeSet.add(id)
      } else {
        codeSet.delete(id)
      }
    }

    levelMap[officeLevelId] = Array.from(codeSet)
    const saveRes = await saveStoredLevelMappings(levelMap)
    if (saveRes.error) return { error: saveRes.error }
  } else {
    if (enable) {
      const rows = codeIds.map((cid) => ({
        office_type_id: officeTypeId,
        code_id: cid,
      }))
      const { error } = await supabase.from('code_type_mapping').upsert(rows, { onConflict: 'code_id,office_type_id' })
      if (error && !error.message.includes('duplicate')) {
        return { error: error.message }
      }
    } else {
      const { error } = await supabase
        .from('code_type_mapping')
        .delete()
        .eq('office_type_id', officeTypeId)
        .in('code_id', codeIds)
      if (error) return { error: error.message }
    }
  }

  revalidatePath('/admin/codes')
  revalidatePath('/office/budget-sheet')
  return { success: true }
}
