'use server'

import { createOfficeClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

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

export async function getAllOfficeUsersList(): Promise<{ offices: OfficeUserItem[]; defaultPassword: string }> {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    throw new Error('অননুমোদিত প্রবেশাধিকার')
  }

  const supabase = createOfficeClient()

  const { data: offices, error } = await supabase
    .from('offices')
    .select(`
      id,
      budget_id,
      name,
      created_at,
      office_type:office_type_id(name),
      parent_office:parent_office_id(name)
    `)
    .order('id', { ascending: true })

  if (error || !offices || offices.length === 0) {
    return { offices: [], defaultPassword: '—' }
  }

  // Find most common password among offices to determine the extracted default
  const pwdCounts = new Map<string, number>()
  offices.forEach((o: any) => {
    const raw = o.name || ''
    if (raw.includes(':::pwd$')) {
      const p = raw.split(':::pwd$')[1]
      if (p) pwdCounts.set(p, (pwdCounts.get(p) || 0) + 1)
    }
  })

  // Whichever password is most frequent or extracted from first office
  let extractedDefault = '—'
  if (pwdCounts.size > 0) {
    let maxCount = -1
    for (const [pwd, count] of pwdCounts.entries()) {
      if (count > maxCount) {
        maxCount = count
        extractedDefault = pwd
      }
    }
  }

  const list = offices.map((o: any) => {
    let cleanName = o.name || ''
    let password = extractedDefault !== '—' ? extractedDefault : '—'
    let hasCustomPassword = false

    if (cleanName.includes(':::pwd$')) {
      const parts = cleanName.split(':::pwd$')
      cleanName = parts[0]
      password = parts[1] || password
      if (extractedDefault !== '—' && password !== extractedDefault) {
        hasCustomPassword = true
      }
    }

    return {
      id: o.id,
      budgetId: o.budget_id,
      name: cleanName,
      officeType: o.office_type?.name || 'N/A',
      parentOffice: o.parent_office?.name || '—',
      hasCustomPassword,
      currentPasswordHint: password,
      created_at: o.created_at,
    }
  })

  return { offices: list, defaultPassword: extractedDefault }
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

  // Fetch current office name
  const { data: office, error: getErr } = await supabase
    .from('offices')
    .select('name')
    .eq('id', officeId)
    .single()

  if (getErr || !office) {
    return { error: 'অফিস পাওয়া যায়নি।' }
  }

  let cleanName = office.name || ''
  if (cleanName.includes(':::pwd$')) {
    cleanName = cleanName.split(':::pwd$')[0]
  }

  const updatedName = cleanPwd === 'budget26' 
    ? cleanName 
    : `${cleanName}:::pwd$${cleanPwd}`

  const { error: updErr } = await supabase
    .from('offices')
    .update({ name: updatedName })
    .eq('id', officeId)

  if (updErr) {
    return { error: 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে: ' + updErr.message }
  }

  revalidatePath('/admin/offices-users')
  return { success: true }
}

export async function createNewOffice(formData: FormData) {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    return { error: 'শুধুমাত্র সুপারঅ্যাডমিন নতুন অফিস তৈরি করতে পারেন।' }
  }

  const name = (formData.get('name') as string)?.trim()
  const budgetId = (formData.get('budget_id') as string)?.trim()
  const typeId = formData.get('type_id') as string
  const parentId = formData.get('parent_id') as string | null
  const password = (formData.get('password') as string)?.trim() || 'budget26'

  if (!name || !budgetId || !typeId) {
    return { error: 'অফিসের নাম, বাজেট আইডি এবং ধরন আবশ্যক।' }
  }

  const supabase = createOfficeClient()

  // Check duplicate budget_id
  const { data: existing } = await supabase
    .from('offices')
    .select('id')
    .eq('budget_id', budgetId)
    .maybeSingle()

  if (existing) {
    return { error: 'এই বাজেট কোডটি ইতিমধ্যেই নিবন্ধিত।' }
  }

  const savedName = password && password !== 'budget26' 
    ? `${name}:::pwd$${password}` 
    : name

  const { data, error } = await supabase
    .from('offices')
    .insert({
      name: savedName,
      budget_id: budgetId,
      office_type_id: parseInt(typeId),
      parent_office_id: parentId ? parseInt(parentId) : null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'অফিস তৈরি ব্যর্থ হয়েছে: ' + error?.message }
  }

  revalidatePath('/admin/offices-users')
  return { success: true }
}
