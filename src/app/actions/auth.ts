'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'

const OFFICE_COOKIE = 'office_session'

export async function loginOffice(budgetId: string) {
  const supabase = await createClient()
  
  // 1. Convert Bangla numbers to English if necessary (handled mostly on client or by bangla utility)
  // For safety, assuming it's already English numerals here
  const { data: office, error } = await supabase
    .from('offices')
    .select('id, name')
    .eq('budget_id', budgetId)
    .maybeSingle()

  if (error || !office) {
    return { error: 'Office not found', notFound: true }
  }

  // 2. Set custom cookie for office session
  const cookieStore = await cookies()
  cookieStore.set(OFFICE_COOKIE, JSON.stringify({ office_id: office.id, budget_id: budgetId, name: office.name }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  })

  return { success: true }
}

export async function registerOffice(formData: FormData) {
  const name = formData.get('name') as string
  const budgetId = formData.get('budget_id') as string
  const typeId = formData.get('type_id') as string
  const parentId = formData.get('parent_id') as string | null

  const supabase = await createClient()

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

  if (error) {
    return { error: 'সংরক্ষণ ব্যর্থ হয়েছে' }
  }

  // 3. Log them in
  const cookieStore = await cookies()
  cookieStore.set(OFFICE_COOKIE, JSON.stringify({ office_id: data.id, budget_id: budgetId, name: data.name }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return { success: true }
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
  redirect('/admin/login')
}
