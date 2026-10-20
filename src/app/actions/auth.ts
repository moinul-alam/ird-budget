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

export async function loginOffice(budgetId: string) {
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

    return { success: true }
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

    // 2. Insert
    const { data, error } = await supabase
      .from('offices')
      .insert({
        name,
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
        name: data.name,
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
// Admin Auth (Supabase Auth)
// ----------------------------------------------------
const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function loginAdmin(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const parsed = adminLoginSchema.safeParse({ email, password })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/admin/dashboard')
}

export async function logoutAdmin() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/superadmin/login')
}
