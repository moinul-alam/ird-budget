'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export interface BudgetTypeItem {
  id: string
  name: string // e.g. 'সংশোধিত', 'প্রাক্কলিত'
  code: 'revised' | 'new' // maps to cycles.budget_type DB check constraint
  created_at?: string
}

export interface FiscalYearItem {
  id: string
  year: string // e.g. '২০২৬-২৭' or '2026-27'
  created_at?: string
}

export interface CycleItem {
  id: number
  fiscal_year: string
  budget_type: 'new' | 'revised'
  budget_type_name: string // Display name like 'সংশোধিত' or 'প্রাক্কলিত'
  status: 'open' | 'closed'
  has_data?: boolean
  submission_count?: number
  opened_at?: string | null
  closed_at?: string | null
  created_at?: string
}

interface BudgetConfigStorage {
  budget_types: BudgetTypeItem[]
  fiscal_years: FiscalYearItem[]
}

const DEFAULT_BUDGET_CONFIG: BudgetConfigStorage = {
  budget_types: [
    { id: 'bt-1', name: 'প্রাক্কলিত', code: 'new' },
    { id: 'bt-2', name: 'সংশোধিত', code: 'revised' },
  ],
  fiscal_years: [
    { id: 'fy-1', year: '২০২৪-২৫' },
    { id: 'fy-2', year: '২০২৫-২৬' },
    { id: 'fy-3', year: '২০২৬-২৭' },
    { id: 'fy-4', year: '২০২৭-২৮' },
  ],
}

// -------------------------------------------------------------------
// Helper to read and write Budget Config Storage (admin_profiles)
// -------------------------------------------------------------------
async function getStoredBudgetConfig(): Promise<BudgetConfigStorage> {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('id, username').limit(1)

  if (!profiles || profiles.length === 0) {
    return DEFAULT_BUDGET_CONFIG
  }

  const root = profiles[0]
  if (root.username.includes(':::bcfg=')) {
    try {
      const encoded = root.username.split(':::bcfg=')[1].split(':::')[0]
      const parsed = JSON.parse(decodeURIComponent(encoded))
      return {
        budget_types: Array.isArray(parsed.budget_types) ? parsed.budget_types : [],
        fiscal_years: Array.isArray(parsed.fiscal_years) ? parsed.fiscal_years : [],
      }
    } catch {
      return { budget_types: [], fiscal_years: [] }
    }
  }

  return { budget_types: [], fiscal_years: [] }
}

async function saveStoredBudgetConfig(config: BudgetConfigStorage) {
  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('*').limit(1)
  if (!profiles || profiles.length === 0) {
    return { error: 'অ্যাডমিন প্রোফাইল পাওয়া যায়নি' }
  }

  const root = profiles[0]
  let rawUsername = root.username
  if (rawUsername.includes(':::bcfg=')) {
    const parts = rawUsername.split(':::bcfg=')
    const before = parts[0]
    const afterSegments = parts[1].split(':::').slice(1).join(':::')
    rawUsername = afterSegments ? `${before}:::${afterSegments}` : before
  }

  const encoded = encodeURIComponent(JSON.stringify(config))
  const newUsername = `${rawUsername}:::bcfg=${encoded}`

  const { error } = await supabase
    .from('admin_profiles')
    .update({ username: newUsername })
    .eq('id', root.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

// -------------------------------------------------------------------
// TAB 1: বাজেটের ধরণ (Budget Types)
// -------------------------------------------------------------------
export async function getBudgetTypes(): Promise<BudgetTypeItem[]> {
  const cfg = await getStoredBudgetConfig()
  return cfg.budget_types
}

export async function saveBudgetType(data: { id?: string; name: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'বাজেটের ধরণ আবশ্যক' }

  const cfg = await getStoredBudgetConfig()
  const list = [...cfg.budget_types]

  // Determine code ('new' or 'revised')
  const isRevised = trimmed.includes('সংশোধিত') || trimmed.toLowerCase().includes('revised')
  const code: 'revised' | 'new' = isRevised ? 'revised' : 'new'

  if (data.id) {
    const idx = list.findIndex((b) => b.id === data.id)
    if (idx !== -1) {
      list[idx] = { ...list[idx], name: trimmed, code }
    }
  } else {
    list.push({
      id: `bt-${Date.now()}`,
      name: trimmed,
      code,
      created_at: new Date().toISOString(),
    })
  }

  const res = await saveStoredBudgetConfig({ ...cfg, budget_types: list })
  if (res.error) return res

  revalidatePath('/admin/budgets')
  return { success: true }
}

export async function deleteBudgetType(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cfg = await getStoredBudgetConfig()
  const list = cfg.budget_types.filter((b) => b.id !== id)

  const res = await saveStoredBudgetConfig({ ...cfg, budget_types: list })
  if (res.error) return res

  revalidatePath('/admin/budgets')
  return { success: true }
}

// -------------------------------------------------------------------
// TAB 2: অর্থবছর (Fiscal Years)
// -------------------------------------------------------------------
export async function getFiscalYears(): Promise<FiscalYearItem[]> {
  const cfg = await getStoredBudgetConfig()
  return cfg.fiscal_years
}

export async function saveFiscalYear(data: { id?: string; year: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.year.trim()
  if (!trimmed) return { error: 'অর্থবছর আবশ্যক' }

  const cfg = await getStoredBudgetConfig()
  const list = [...cfg.fiscal_years]

  if (data.id) {
    const idx = list.findIndex((f) => f.id === data.id)
    if (idx !== -1) {
      list[idx] = { ...list[idx], year: trimmed }
    }
  } else {
    // Check duplicate
    if (list.some((f) => f.year === trimmed)) {
      return { error: 'এই অর্থবছর ইতোমধ্যে বিদ্যমান' }
    }
    list.push({
      id: `fy-${Date.now()}`,
      year: trimmed,
      created_at: new Date().toISOString(),
    })
  }

  const res = await saveStoredBudgetConfig({ ...cfg, fiscal_years: list })
  if (res.error) return res

  revalidatePath('/admin/budgets')
  return { success: true }
}

export async function deleteFiscalYear(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cfg = await getStoredBudgetConfig()
  const list = cfg.fiscal_years.filter((f) => f.id !== id)

  const res = await saveStoredBudgetConfig({ ...cfg, fiscal_years: list })
  if (res.error) return res

  revalidatePath('/admin/budgets')
  return { success: true }
}

// -------------------------------------------------------------------
// TAB 3: বাজেট নির্ধারণ ও সাইকেল ব্যবস্থাপনা (Cycles)
// -------------------------------------------------------------------
export async function getCyclesList(): Promise<CycleItem[]> {
  const supabase = createOfficeClient()
  const cfg = await getStoredBudgetConfig()

  const { data: cycles, error } = await supabase
    .from('core_budget_cycles')
    .select('*')
    .order('id', { ascending: false })

  if (error || !cycles) return []

  // Check submissions count for each cycle to determine if data exists
  const cycleIds = cycles.map((c: any) => c.id)
  const { data: subs } = await supabase
    .from('office_submissions')
    .select('id, cycle_id, status')
    .in('cycle_id', cycleIds)

  const subCountMap = new Map<number, number>()
  if (subs) {
    for (const s of subs) {
      subCountMap.set(s.cycle_id, (subCountMap.get(s.cycle_id) || 0) + 1)
    }
  }

  return cycles.map((c: any) => {
    // Decode custom name if stored in fiscal_year (e.g. "2026-27:::name=সংশোধিত")
    let fy = c.fiscal_year || ''
    let typeName = ''
    if (fy.includes(':::name=')) {
      const parts = fy.split(':::name=')
      fy = parts[0]
      typeName = parts[1] || ''
    }

    if (!typeName) {
      typeName = c.budget_type === 'revised' ? 'সংশোধিত' : 'প্রাক্কলিত'
    }

    const count = subCountMap.get(c.id) || 0

    return {
      id: c.id,
      fiscal_year: fy,
      budget_type: c.budget_type,
      budget_type_name: typeName,
      status: c.status,
      has_data: count > 0,
      submission_count: count,
      opened_at: c.opened_at,
      closed_at: c.closed_at,
      created_at: c.created_at,
    }
  })
}

export async function saveCycle(data: {
  id?: number
  fiscal_year: string
  budget_type_name: string
  status: 'open' | 'closed'
}) {
  if (!data.fiscal_year?.trim() || !data.budget_type_name?.trim()) {
    return { error: 'অর্থবছর ও বাজেটের ধরণ আবশ্যক' }
  }

  const cfg = await getStoredBudgetConfig()
  if (!cfg.budget_types || cfg.budget_types.length === 0) {
    return { error: 'ট্যাব ১ (বাজেটের ধরণ)-এ কোনো তথ্য নেই। প্রথমে কমপক্ষে একটি বাজেটের ধরণ যোগ করুন।' }
  }
  if (!cfg.fiscal_years || cfg.fiscal_years.length === 0) {
    return { error: 'ট্যাব ২ (অর্থবছর)-এ কোনো তথ্য নেই। প্রথমে কমপক্ষে একটি অর্থবছর যোগ করুন।' }
  }

  const supabase = createOfficeClient()
  const isRevised =
    data.budget_type_name.includes('সংশোধিত') ||
    data.budget_type_name.toLowerCase().includes('revised')
  const budgetType: 'new' | 'revised' = isRevised ? 'revised' : 'new'

  // Embed the custom display name if not matching standard string
  const storedFiscalYear = `${data.fiscal_year}:::name=${data.budget_type_name}`

  // If opening this cycle, close all other cycles so only one active cycle exists
  if (data.status === 'open') {
    await supabase.from('core_budget_cycles').update({ status: 'closed' }).neq('id', data.id || 0)
  }

  if (data.id) {
    const updatePayload: any = {
      fiscal_year: storedFiscalYear,
      budget_type: budgetType,
      status: data.status,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('core_budget_cycles')
      .update(updatePayload)
      .eq('id', data.id)

    if (error) return { error: error.message }
  } else {
    // Check if duplicate entry exists for this fiscal_year and budgetType
    const { data: existing } = await supabase
      .from('core_budget_cycles')
      .select('id')
      .eq('budget_type', budgetType)
      .like('fiscal_year', `${data.fiscal_year}%`)
      .maybeSingle()

    if (existing) {
      return { error: 'এই অর্থবছর এবং বাজেটের ধরণের সাইকেল ইতোমধ্যে বিদ্যমান' }
    }

    const insertPayload: any = {
      fiscal_year: storedFiscalYear,
      budget_type: budgetType,
      title: `${data.fiscal_year} ${data.budget_type_name}`,
      status: data.status,
    }

    const { error } = await supabase.from('core_budget_cycles').insert(insertPayload)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/budgets')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleCycleStatus(id: number, targetStatus: 'open' | 'closed') {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  if (targetStatus === 'open') {
    // Close other cycles
    await supabase.from('core_budget_cycles').update({ status: 'closed' }).neq('id', id)
  }

  const { error } = await supabase
    .from('core_budget_cycles')
    .update({
      status: targetStatus,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/budgets')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteOrArchiveCycle(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const supabase = createOfficeClient()

  // Check if submissions exist
  const { data: subs } = await supabase
    .from('office_submissions')
    .select('id')
    .eq('cycle_id', id)
    .limit(1)

  if (subs && subs.length > 0) {
    // Has data: Cannot delete, archive by marking status = 'closed'
    const { error } = await supabase
      .from('core_budget_cycles')
      .update({ status: 'closed' })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/budgets')
    revalidatePath('/dashboard')
    return { success: true, archived: true }
  }

  // No submissions: Safely remove
  const { error } = await supabase.from('core_budget_cycles').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/budgets')
  revalidatePath('/dashboard')
  return { success: true, deleted: true }
}
