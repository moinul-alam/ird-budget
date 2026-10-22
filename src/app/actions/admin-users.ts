'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export interface AdminUserItem {
  id: number
  username: string
  role: 'admin' | 'superadmin'
  active: boolean
  created_at: string
  assignedOfficeTypeIds: number[]
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function getAdminUsersList(): Promise<AdminUserItem[]> {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    throw new Error('অননুমোদিত প্রবেশাধিকার')
  }

  const supabase = createOfficeClient()

  const { data: users, error } = await supabase
    .from('admin_users')
    .select('id, username, role, is_active, created_at')
    .order('id', { ascending: true })

  if (error || !users) {
    return []
  }

  return users.map((u: any) => ({
    id: u.id,
    username: u.username,
    role: u.role as 'admin' | 'superadmin',
    active: Boolean(u.is_active),
    created_at: u.created_at,
    assignedOfficeTypeIds: [],
  }))
}

export async function createAdminUser(
  username: string,
  role: 'admin' | 'superadmin',
  password?: string
) {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    return { error: 'শুধুমাত্র সুপারঅ্যাডমিন নতুন অ্যাডমিন তৈরি করতে পারবেন।' }
  }

  const cleanUser = username.trim()
  if (!cleanUser) {
    return { error: 'অনুগ্রহ করে একটি সঠিক ইউজারনেম দিন।' }
  }

  const cleanPwd = (password || '123').trim()
  const pwdHash = hashPassword(cleanPwd)

  const supabase = createOfficeClient()

  // Check duplicate username
  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .ilike('username', cleanUser)
    .maybeSingle()

  if (existing) {
    return { error: 'এই ইউজারনেমটি ইতিমধ্যেই ব্যবহার করা হয়েছে।' }
  }

  const { error: insErr } = await supabase
    .from('admin_users')
    .insert({
      username: cleanUser,
      password_hash: pwdHash,
      password_hint: cleanPwd,
      role,
      is_active: true,
    })

  if (insErr) {
    return { error: 'সংরক্ষণ ব্যর্থ হয়েছে: ' + insErr.message }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function updateAdminUserRole(
  adminId: number,
  newRole: 'admin' | 'superadmin',
  active: boolean,
  newPassword?: string
) {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    return { error: 'শুধুমাত্র সুপারঅ্যাডমিন ইউজার রোল পরিবর্তন করতে পারবেন।' }
  }

  const supabase = createOfficeClient()

  const updatePayload: any = {
    role: newRole,
    is_active: active,
    updated_at: new Date().toISOString(),
  }

  if (newPassword && newPassword.trim()) {
    updatePayload.password_hash = hashPassword(newPassword.trim())
    updatePayload.password_hint = newPassword.trim()
  }

  const { error: updErr } = await supabase
    .from('admin_users')
    .update(updatePayload)
    .eq('id', adminId)

  if (updErr) {
    return { error: 'আপডেট ব্যর্থ হয়েছে: ' + updErr.message }
  }

  revalidatePath('/admin/users')
  return { success: true }
}
