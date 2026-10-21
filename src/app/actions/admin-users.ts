'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export interface AdminUserItem {
  id: number
  username: string
  role: 'admin' | 'superadmin'
  active: boolean
  created_at: string
  assignedOfficeTypeIds: number[]
}

interface StoredSubAdmin {
  id: number
  username: string
  role: 'admin' | 'superadmin'
  active: boolean
  password?: string
  created_at: string
}

// Helper to unpack sub-admins stored in the root superadmin profile
function parseSubAdmins(storedString: string): { baseUsername: string; password?: string; subAdmins: StoredSubAdmin[] } {
  let baseUsername = 'superadmin'
  let password = '123456'
  let subAdmins: StoredSubAdmin[] = []

  let remainder = storedString

  if (remainder.includes(':::pwd$')) {
    const parts = remainder.split(':::pwd$')
    baseUsername = parts[0]
    const afterPwd = parts[1] || ''
    if (afterPwd.includes(':::subadmins$')) {
      const [pwd, subStr] = afterPwd.split(':::subadmins$')
      password = pwd
      try {
        subAdmins = JSON.parse(decodeURIComponent(subStr))
      } catch {
        subAdmins = []
      }
    } else {
      password = afterPwd
    }
  } else if (remainder.includes(':::subadmins$')) {
    const [name, subStr] = remainder.split(':::subadmins$')
    baseUsername = name
    try {
      subAdmins = JSON.parse(decodeURIComponent(subStr))
    } catch {
      subAdmins = []
    }
  } else {
    baseUsername = storedString
  }

  return { baseUsername, password, subAdmins }
}

function packSubAdmins(baseUsername: string, password?: string, subAdmins?: StoredSubAdmin[]): string {
  let result = baseUsername
  if (password && password !== '123456') {
    result += `:::pwd$${password}`
  }
  if (subAdmins && subAdmins.length > 0) {
    result += `:::subadmins$${encodeURIComponent(JSON.stringify(subAdmins))}`
  }
  return result
}

export async function getAdminUsersList(): Promise<AdminUserItem[]> {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    throw new Error('অননুমোদিত প্রবেশাধিকার')
  }

  const supabase = createOfficeClient()

  // 1. Fetch main profile
  const { data: profiles, error: pError } = await supabase
    .from('admin_profiles')
    .select('id, username, role, active, created_at')
    .order('id')

  if (pError || !profiles || profiles.length === 0) {
    return []
  }

  const rootUser = profiles[0]
  const parsed = parseSubAdmins(rootUser.username)

  const list: AdminUserItem[] = [
    {
      id: rootUser.id,
      username: parsed.baseUsername,
      role: rootUser.role as 'admin' | 'superadmin',
      active: rootUser.active,
      created_at: rootUser.created_at,
      assignedOfficeTypeIds: [],
    },
  ]

  // Add additional created admins
  parsed.subAdmins.forEach((sa) => {
    list.push({
      id: sa.id,
      username: sa.username,
      role: sa.role,
      active: sa.active,
      created_at: sa.created_at,
      assignedOfficeTypeIds: [],
    })
  })

  return list
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

  const supabase = createOfficeClient()
  const { data: profiles } = await supabase.from('admin_profiles').select('*').limit(1)
  if (!profiles || profiles.length === 0) {
    return { error: 'সিস্টেম অ্যাডমিন প্রোফাইল পাওয়া যায়নি।' }
  }

  const root = profiles[0]
  const parsed = parseSubAdmins(root.username)

  // Check duplicate username
  const exists =
    parsed.baseUsername.toLowerCase() === cleanUser.toLowerCase() ||
    parsed.subAdmins.some((sa) => sa.username.toLowerCase() === cleanUser.toLowerCase())

  if (exists) {
    return { error: 'এই ইউজারনেম দিয়ে ইতিমধ্যেই একটি অ্যাকাউন্ট রয়েছে।' }
  }

  const newAdmin: StoredSubAdmin = {
    id: Date.now(),
    username: cleanUser,
    role,
    active: true,
    password: password?.trim() || '123456',
    created_at: new Date().toISOString(),
  }

  parsed.subAdmins.push(newAdmin)

  const updatedRaw = packSubAdmins(parsed.baseUsername, parsed.password, parsed.subAdmins)

  const { error: updErr } = await supabase
    .from('admin_profiles')
    .update({ username: updatedRaw })
    .eq('id', root.id)

  if (updErr) {
    return { error: 'সংরক্ষণ ব্যর্থ হয়েছে: ' + updErr.message }
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
  const { data: profiles } = await supabase.from('admin_profiles').select('*').limit(1)
  if (!profiles || profiles.length === 0) {
    return { error: 'সিস্টেম অ্যাডমিন প্রোফাইল পাওয়া যায়নি।' }
  }

  const root = profiles[0]
  const parsed = parseSubAdmins(root.username)

  if (adminId === root.id) {
    // Updating root user
    if (newPassword && newPassword.trim()) {
      parsed.password = newPassword.trim()
    }
    const updatedRaw = packSubAdmins(parsed.baseUsername, parsed.password, parsed.subAdmins)
    await supabase
      .from('admin_profiles')
      .update({
        username: updatedRaw,
        role: newRole,
        active,
      })
      .eq('id', root.id)
  } else {
    // Updating subadmin
    const target = parsed.subAdmins.find((sa) => sa.id === adminId)
    if (!target) {
      return { error: 'ইউজার পাওয়া যায়নি।' }
    }
    target.role = newRole
    target.active = active
    if (newPassword && newPassword.trim()) {
      target.password = newPassword.trim()
    }
    const updatedRaw = packSubAdmins(parsed.baseUsername, parsed.password, parsed.subAdmins)
    await supabase
      .from('admin_profiles')
      .update({ username: updatedRaw })
      .eq('id', root.id)
  }

  revalidatePath('/admin/users')
  return { success: true }
}
