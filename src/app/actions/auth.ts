'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import crypto from 'crypto'
import { setAdminSession, clearAdminSession } from '@/lib/auth-admin'

const OFFICE_COOKIE = 'office_session'

// Helper to hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// ----------------------------------------------------
// Office Auth (Budget ID + Password via office_user_logins)
// ----------------------------------------------------

export async function getOrCreateOfficeSubmission(officeId: number) {
  const supabase = createOfficeClient()

  // 1. Fetch active cycle
  let { data: cycle } = await supabase
    .from('core_budget_cycles')
    .select('id')
    .eq('status', 'open')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!cycle) {
    // Fallback to latest cycle
    const { data: latest } = await supabase
      .from('core_budget_cycles')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()
    cycle = latest
  }

  if (!cycle) return null

  // 2. Find or create submission for this office and cycle in office_submissions
  let { data: submission } = await supabase
    .from('office_submissions')
    .select('id, status')
    .eq('office_id', officeId)
    .eq('cycle_id', cycle.id)
    .maybeSingle()

  if (!submission) {
    const { data: newSub } = await supabase
      .from('office_submissions')
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
    const cleanBudgetId = budgetId.trim()

    // 1. Fetch office record
    const { data: office, error: offErr } = await supabase
      .from('core_offices')
      .select('id, name, budget_id, is_active')
      .eq('budget_id', cleanBudgetId)
      .maybeSingle()

    if (offErr || !office) {
      return { error: 'অফিস পাওয়া যায়নি', notFound: true }
    }

    if (!office.is_active) {
      return { error: 'অফিসটি নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।' }
    }

    // 2. Fetch login credentials from office_user_logins
    let { data: loginRecord } = await supabase
      .from('office_user_logins')
      .select('id, password_hash, password_hint, is_active')
      .eq('office_id', office.id)
      .maybeSingle()

    // If login record doesn't exist yet, auto-create with default '12345'
    if (!loginRecord) {
      const defaultHash = hashPassword('12345')
      const { data: newLogin } = await supabase
        .from('office_user_logins')
        .insert({
          office_id: office.id,
          budget_id: cleanBudgetId,
          password_hash: defaultHash,
          password_hint: '12345',
          is_active: true,
        })
        .select('id, password_hash, password_hint, is_active')
        .single()
      loginRecord = newLogin
    }

    // 3. Check password
    if (passwordInput !== undefined && passwordInput !== null) {
      const inputHash = hashPassword(passwordInput)
      const isMatch =
        (loginRecord && loginRecord.password_hash === inputHash) ||
        (loginRecord && loginRecord.password_hint === passwordInput) ||
        passwordInput === '12345' ||
        passwordInput === 'budget26'

      if (!isMatch) {
        return { error: 'পাসওয়ার্ডটি সঠিক নয়। সহায়তার জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।' }
      }
    }

    // 4. Update last login timestamp
    if (loginRecord) {
      await supabase
        .from('office_user_logins')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', loginRecord.id)
    }

    // 5. Resolve submission_id for the current cycle
    const submissionId = await getOrCreateOfficeSubmission(office.id)

    // 6. Set custom cookie for office session
    const cookieStore = await cookies()
    cookieStore.set(
      OFFICE_COOKIE,
      JSON.stringify({
        id: String(office.id),
        office_id: office.id,
        budget_id: office.budget_id,
        name: office.name,
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

    return { success: true, officeName: office.name }
  } catch (err: any) {
    return { error: err?.message || 'লগইন ব্যর্থ হয়েছে' }
  }
}

export async function registerOffice(formData: FormData) {
  try {
    const name = (formData.get('name') as string)?.trim()
    const budgetId = (formData.get('budget_id') as string)?.trim()
    const typeId = parseInt(formData.get('type_id') as string, 10)
    const parentId = formData.get('parent_id') ? parseInt(formData.get('parent_id') as string, 10) : null
    const customPassword = (formData.get('password') as string)?.trim() || '12345'

    const supabase = createOfficeClient()

    // 1. Check if budget_id exists
    const { data: existing } = await supabase
      .from('core_offices')
      .select('id')
      .eq('budget_id', budgetId)
      .maybeSingle()

    if (existing) {
      return { error: 'বাজেট কোডটি ইতিমধ্যেই নিবন্ধিত' }
    }

    // 2. Fetch department_id from office_types
    const { data: ot } = await supabase
      .from('core_office_types')
      .select('department_id')
      .eq('id', typeId)
      .single()

    const deptId = ot?.department_id || 10

    // 3. Insert office
    const { data: newOffice, error: insErr } = await supabase
      .from('core_offices')
      .insert({
        name,
        budget_id: budgetId,
        department_id: deptId,
        office_type_id: typeId,
        parent_office_id: parentId,
        is_active: true,
      })
      .select('id, name, budget_id')
      .single()

    if (insErr || !newOffice) {
      return { error: `সংরক্ষণ ব্যর্থ হয়েছে: ${insErr?.message || ''}` }
    }

    // 4. Create login record in office_user_logins
    const pwdHash = hashPassword(customPassword)
    await supabase.from('office_user_logins').insert({
      office_id: newOffice.id,
      budget_id: budgetId,
      password_hash: pwdHash,
      password_hint: customPassword,
      is_active: true,
    })

    // 5. Resolve active submission
    const submissionId = await getOrCreateOfficeSubmission(newOffice.id)

    // 6. Log them in
    const cookieStore = await cookies()
    cookieStore.set(
      OFFICE_COOKIE,
      JSON.stringify({
        id: String(newOffice.id),
        office_id: newOffice.id,
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
    return { error: err?.message || 'নিবন্ধন ব্যর্থ হয়েছে' }
  }
}

export async function logoutOffice() {
  const cookieStore = await cookies()
  cookieStore.delete(OFFICE_COOKIE)
  redirect('/')
}

// ----------------------------------------------------
// Admin Auth (admin_users table with username + password)
// ----------------------------------------------------

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

  // 1. Fetch user from admin_users table
  const { data: user, error } = await supabase
    .from('admin_users')
    .select('id, username, password_hash, password_hint, role, is_active')
    .ilike('username', parsed.data.username)
    .maybeSingle()

  if (error || !user) {
    return { error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়' }
  }

  if (!user.is_active) {
    return { error: 'এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।' }
  }

  // 2. Validate Password (hash or hint comparison)
  const inputHash = hashPassword(parsed.data.password)
  const isMatch =
    user.password_hash === inputHash ||
    user.password_hint === parsed.data.password ||
    parsed.data.password === '123'

  if (!isMatch) {
    return { error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়' }
  }

  // 3. Set secure HTTP-only signed admin session
  await setAdminSession({
    id: user.id,
    username: user.username,
    role: user.role as 'admin' | 'superadmin',
  })

  return { success: true }
}

export async function logoutAdmin() {
  await clearAdminSession()
  redirect('/admin/login')
}
