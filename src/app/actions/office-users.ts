'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export interface OfficeUserItem {
  id: number
  budgetId: string
  name: string
  officeType: string
  parentOffice: string
  hasCustomPassword: boolean
  currentPasswordHint: string
  created_at: string
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function getAllOfficeUsersList(): Promise<{ offices: OfficeUserItem[]; defaultPassword: string }> {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    throw new Error('অননুমোদিত প্রবেশাধিকার')
  }

  const supabase = createOfficeClient()

  const { data: offices, error } = await supabase
    .from('core_offices')
    .select(`
      id,
      budget_id,
      name,
      created_at,
      office_type:office_type_id(name),
      parent_office:parent_office_id(name),
      login:office_user_logins(password_hint)
    `)
    .order('id', { ascending: true })

  if (error || !offices || offices.length === 0) {
    return { offices: [], defaultPassword: '12345' }
  }

  const defaultPassword = '12345'

  const list: OfficeUserItem[] = offices.map((o: any) => {
    const hint = (Array.isArray(o.login) ? o.login[0]?.password_hint : o.login?.password_hint) || defaultPassword
    const hasCustomPassword = hint !== defaultPassword

    return {
      id: o.id,
      budgetId: o.budget_id,
      name: o.name,
      officeType: o.office_type?.name || 'N/A',
      parentOffice: o.parent_office?.name || '—',
      hasCustomPassword,
      currentPasswordHint: hint,
      created_at: o.created_at,
    }
  })

  return { offices: list, defaultPassword }
}

export async function updateOfficePassword(
  officeId: number,
  newPassword: string
) {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    return { error: 'শুধুমাত্র সুপারঅ্যাডমিন অফিসের পাসওয়ার্ড পরিবর্তন করতে পারেন।' }
  }

  const cleanPwd = newPassword.trim()
  if (!cleanPwd) {
    return { error: 'অনুগ্রহ করে একটি পাসওয়ার্ড লিখুন।' }
  }

  const supabase = createOfficeClient()
  const pwdHash = hashPassword(cleanPwd)

  const { error: upsertErr } = await supabase
    .from('office_user_logins')
    .upsert({
      office_id: officeId,
      password_hash: pwdHash,
      password_hint: cleanPwd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'office_id' })

  if (upsertErr) {
    return { error: 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে: ' + upsertErr.message }
  }

  revalidatePath('/admin/offices-users')
  return { success: true }
}

export async function resetOfficePassword(officeId: number) {
  return updateOfficePassword(officeId, '12345')
}

export async function resetAllOfficesPassword(targetPassword = '12345') {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    return { error: 'অননুমোদিত প্রবেশাধিকার' }
  }

  const cleanPwd = targetPassword.trim() || '12345'
  const pwdHash = hashPassword(cleanPwd)

  const supabase = createOfficeClient()

  const { error } = await supabase
    .from('office_user_logins')
    .update({
      password_hash: pwdHash,
      password_hint: cleanPwd,
      updated_at: new Date().toISOString(),
    })
    .neq('id', 0)

  if (error) {
    return { error: 'সকল পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে: ' + error.message }
  }

  revalidatePath('/admin/offices-users')
  return { success: true }
}
