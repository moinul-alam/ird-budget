'use server'

import { createClient } from '@/lib/supabase/server'

interface SelectOption {
  id: string
  name: string
}

export async function searchOffice(budgetId: string): Promise<{ found: boolean; office?: { id: string; name: string } }> {
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { data } = await supabase
    .from('departments')
    .select('id, name')
    .order('name')

  return data || []
}

export async function getParentOffices(departmentId: string): Promise<SelectOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('parent_offices')
    .select('id, name')
    .eq('department_id', departmentId)
    .order('name')

  return data || []
}

export async function getOfficeTypes(departmentId: string): Promise<SelectOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('office_types')
    .select('id, name')
    .eq('department_id', departmentId)
    .order('name')

  return data || []
}
