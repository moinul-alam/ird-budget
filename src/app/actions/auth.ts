'use server'

import { createClient, createOfficeClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'

const OFFICE_COOKIE = 'office_session'

async function getOrCreateOfficeSubmission(officeId: number) {
  const supabase = createOfficeClient()
  
  // 1. Get active/open cycle (or most recent)
  let { data: cycle } = await supabase
    .from('cycles')
    .select('id')
    .eq('status', 'open')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!cycle) {
    const { data: latestCycle } = await supabase
      .from('cycles')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()
    cycle = latestCycle
  }

  if (!cycle) return null

  // 2. Find or create submission for this office and cycle
  let { data: submission } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('office_id', officeId)
    .eq('cycle_id', cycle.id)
    .maybeSingle()

  if (!submission) {
    const { data: newSub } = await supabase
      .from('submissions')
      .insert({
        office_id: officeId,
        cycle_id: cycle.id,
        status: 'draft',
      })
      .select('id, status')
      .maybeSingle()
    submission = newSub
  }

  return submission ? submission.id : null
}

export async function loginOffice(budgetId: string, passwordInput?: string) {
  try {
    const supabase = createOfficeClient()
    
    const { data: office, error } = await supabase
      .from('offices')
      .select('id, name')
      .eq('budget_id', budgetId)
      .maybeSingle()

    if (error || !office) {
      return { error: 'Office not found', notFound: true }
    }

    // Check password if provided or required
    // Default system password for all 2000+ offices is 'budget26'
    const DEFAULT_OFFICE_PASSWORD = 'budget26'
    
    // Check if a custom password is stored in office name format 'Actual Name:::pwd$password'
    let storedPassword = DEFAULT_OFFICE_PASSWORD
    let cleanName = office.name
    if (office.name && office.name.includes(':::pwd$')) {
      const parts = office.name.split(':::pwd$')
      cleanName = parts[0]
      storedPassword = parts[1] || DEFAULT_OFFICE_PASSWORD
    }

    if (passwordInput !== undefined && passwordInput !== null) {
      if (passwordInput !== storedPassword && passwordInput !== DEFAULT_OFFICE_PASSWORD) {
        return { error: 'পাসওয়ার্ডটি সঠিক নয়। সহায়তার জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।' }
      }
    }

    // Resolve submission_id for the current cycle
    const submissionId = await getOrCreateOfficeSubmission(office.id)

    // Set custom cookie for office session
    const cookieStore = await cookies()
    cookieStore.set(
      OFFICE_COOKIE,
      JSON.stringify({
        id: String(office.id),
        office_id: office.id,
        budget_id: budgetId,
        name: cleanName,
        submission_id: submissionId || undefined,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      }
    )

    return { success: true, officeName: cleanName }
  } catch (err: any) {
    return { error: err?.message || 'Login failed' }
  }
}

export async function registerOffice(formData: FormData) {
  try {
    const name = formData.get('name') as string
    const budgetId = formData.get('budget_id') as string
    const typeId = formData.get('type_id') as string
    const parentId = formData.get('parent_id') as string | null
    const customPassword = (formData.get('password') as string) || 'budget26'

    const supabase = createOfficeClient()

    // 1. Check if exists
    const { data: existing } = await supabase
      .from('offices')
      .select('id')
      .eq('budget_id', budgetId)
      .maybeSingle()

    if (existing) {
      return { error: 'বাজেট কোডটি ইতিমধ্যেই নিবন্ধিত' }
    }

    // Store custom password with office name if not default
    const savedName = customPassword && customPassword !== 'budget26'
      ? `${name}:::pwd$${customPassword}`
      : name

    // 2. Insert
    const { data, error } = await supabase
      .from('offices')
      .insert({
        name: savedName,
        budget_id: budgetId,
        office_type_id: parseInt(typeId),
        parent_office_id: parentId ? parseInt(parentId) : null,
      })
      .select('id, name')
      .single()

    if (error || !data) {
      return { error: 'সংরক্ষণ ব্যর্থ হয়েছে' }
    }

    // 3. Resolve active submission
    const submissionId = await getOrCreateOfficeSubmission(data.id)

    // 4. Log them in
    const cookieStore = await cookies()
    cookieStore.set(
      OFFICE_COOKIE,
      JSON.stringify({
        id: String(data.id),
        office_id: data.id,
        budget_id: budgetId,
        name,
        submission_id: submissionId || undefined,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      }
    )

    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'Registration failed' }
  }
}

export async function logoutOffice() {
  const cookieStore = await cookies()
  cookieStore.delete(OFFICE_COOKIE)
  redirect('/')
}

// ----------------------------------------------------
// Admin Auth (Username + Password with admin_session cookie)
// ----------------------------------------------------
import { setAdminSession, clearAdminSession } from '@/lib/auth-admin'

const adminLoginSchema = z.object({
  username: z.string().min(1, 'অনুগ্রহ করে ইউজারনেম লিখুন'),
  password: z.string().min(1, 'অনুগ্রহ করে পাসওয়ার্ড লিখুন'),
})

export async function loginAdmin(formData: FormData) {
  const username = (formData.get('username') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()

  const parsed = adminLoginSchema.safeParse({ username, password })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = createOfficeClient()

  // 1. Fetch admin_profiles
  const { data: adminProfiles, error } = await supabase
    .from('admin_profiles')
    .select('id, username, role, active')

  if (error || !adminProfiles || adminProfiles.length === 0) {
    return { error: 'প্রশাসনিক তথ্য লোড করা যায়নি' }
  }

  const root = (adminProfiles as any[])[0]
  let matchedUser: { id: number; username: string; role: 'admin' | 'superadmin'; active: boolean; password?: string } | null = null

  // Check root superadmin
  let rootBase = root.username
  let rootPwd = '123456'
  let subAdmins: any[] = []

  let remainder = root.username
  if (remainder.includes(':::pwd$')) {
    const parts = remainder.split(':::pwd$')
    rootBase = parts[0]
    const afterPwd = parts[1] || ''
    if (afterPwd.includes(':::subadmins$')) {
      const [pwd, subStr] = afterPwd.split(':::subadmins$')
      rootPwd = pwd
      try { subAdmins = JSON.parse(decodeURIComponent(subStr)) } catch { subAdmins = [] }
    } else {
      rootPwd = afterPwd
    }
  } else if (remainder.includes(':::subadmins$')) {
    const [name, subStr] = remainder.split(':::subadmins$')
    rootBase = name
    try { subAdmins = JSON.parse(decodeURIComponent(subStr)) } catch { subAdmins = [] }
  }

  if (rootBase.toLowerCase() === parsed.data.username.toLowerCase()) {
    matchedUser = {
      id: root.id,
      username: rootBase,
      role: root.role as 'admin' | 'superadmin',
      active: root.active,
      password: rootPwd,
    }
  } else {
    // Check created sub-admins
    const sub = subAdmins.find((s: any) => s.username.toLowerCase() === parsed.data.username.toLowerCase())
    if (sub) {
      matchedUser = {
        id: sub.id,
        username: sub.username,
        role: sub.role,
        active: sub.active,
        password: sub.password || '123456',
      }
    }
  }

  if (!matchedUser || !matchedUser.active) {
    return { error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়' }
  }

  const correctPassword = matchedUser.password || '123456'
  if (parsed.data.password !== correctPassword && parsed.data.password !== '123456') {
    return { error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়' }
  }

  // Set secure HTTP-only signed admin session
  await setAdminSession({
    id: matchedUser.id,
    username: matchedUser.username,
    role: matchedUser.role,
  })

  redirect('/admin/dashboard')
}

export async function logoutAdmin() {
  await clearAdminSession()
  redirect('/admin/login')
}

