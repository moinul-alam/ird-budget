'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'
import { getOfficeTypes, getDepartments, getMinistries } from './admin-offices-config'
import { DEFAULT_OFFICE_PASSWORD } from '@/lib/office/defaults'

export interface HeadOfficeItem {
  id: string
  name: string
  budget_id?: string
  department_id: string
  department_name: string
  ministry_id?: string
  ministry_name?: string
  office_type_id: string
  office_type_name: string
  office_level_id?: string
  office_level_name?: string
  created_at?: string
}

export interface FieldOfficeItem {
  id: string
  budget_id: string
  name: string
  department_id?: string
  department_name: string
  ministry_id?: string
  ministry_name?: string
  office_type_id: string
  office_type_name: string
  office_level_id?: string
  office_level_name?: string
  head_office_id: string
  head_office_name: string
  password_hint: string
  created_at?: string
}

// Head offices are listed alphabetically with natural numeric ordering (১, ২, ৩ … ১০, ১১)
// rather than by insertion order. Postgres has no Bengali collation configured, so the sort
// happens here.
const nameCollator = new Intl.Collator('bn', { numeric: true, sensitivity: 'base' })

// -------------------------------------------------------------
// HEAD OFFICES (parent_office_id IS NULL)
// -------------------------------------------------------------

export async function getHeadOffices(): Promise<HeadOfficeItem[]> {
  const offices = await prisma.coreOffice.findMany({
    where: { parentOfficeId: null },
    include: {
      department: {
        select: { name: true },
      },
      officeType: {
        select: { name: true },
      },
      officeLevel: {
        select: { levelName: true, levelOrder: true },
      },
    },
    orderBy: { id: 'asc' },
  })

  return offices
    .map((o) => ({
      id: String(o.id),
      name: o.name,
      budget_id: o.budgetId,
      department_id: o.departmentId ? String(o.departmentId) : '',
      department_name: o.department?.name || '—',
      ministry_id: '',
      ministry_name: '',
      office_type_id: o.officeTypeId ? String(o.officeTypeId) : '',
      office_type_name: o.officeType?.name || '—',
      office_level_id: o.officeLevelId ? String(o.officeLevelId) : undefined,
      office_level_name: o.officeLevel?.levelName,
      created_at: o.createdAt.toISOString(),
    }))
    .sort((a, b) => nameCollator.compare(a.name, b.name))
}

export async function saveHeadOffice(data: {
  id?: string
  name: string
  department_id: string
  office_type_id: string
  budget_id?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'হেড অফিসের নাম আবশ্যক' }
  if (!data.department_id) return { error: 'দপ্তর/সংস্থা নির্বাচন আবশ্যক' }
  if (!data.office_type_id) return { error: 'অফিসের ধরণ নির্বাচন আবশ্যক' }
  const trimmedBudget = data.budget_id ? data.budget_id.trim() : ''

  try {
    // A head office always sits at the top level of its office type, so the level is
    // resolved from the office type's hierarchy instead of being picked by the admin.
    const topLevel = await prisma.coreOfficeLevel.findFirst({
      where: { officeTypeId: BigInt(data.office_type_id) },
      orderBy: [{ levelOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    })

    // Verify budget_id uniqueness
    if (trimmedBudget) {
      const existing = await prisma.coreOffice.findFirst({
        where: {
          budgetId: trimmedBudget,
          ...(data.id && { id: { not: BigInt(data.id) } }),
        },
      })
      if (existing) {
        return { error: 'এই বাজেট আইডিটি ইতিমধ্যে অন্য অফিসের জন্য ব্যবহৃত হচ্ছে।' }
      }
    }

    if (data.id) {
      await prisma.coreOffice.update({
        where: { id: BigInt(data.id) },
        data: {
          name: trimmed,
          budgetId: trimmedBudget || undefined,
          departmentId: BigInt(data.department_id),
          officeTypeId: BigInt(data.office_type_id),
          officeLevelId: topLevel ? topLevel.id : null,
        },
      })
    } else {
      if (!trimmedBudget) return { error: 'বাজেট আইডি আবশ্যক' }
      await prisma.coreOffice.create({
        data: {
          name: trimmed,
          budgetId: trimmedBudget,
          departmentId: BigInt(data.department_id),
          officeTypeId: BigInt(data.office_type_id),
          officeLevelId: topLevel ? topLevel.id : null,
          isActive: true,
        },
      })
    }

    revalidatePath('/admin/offices-management/head-offices')
    revalidatePath('/admin/offices-management/field-offices')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteHeadOffice(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    // Check for child offices
    const children = await prisma.coreOffice.findFirst({
      where: { parentOfficeId: BigInt(id) },
    })

    if (children) {
      return { error: 'এই হেড অফিসের অধীনে মাঠ পর্যায়ের অফিস বিদ্যমান রয়েছে। প্রথমে সংশ্লিষ্ট মাঠ পর্যায়ের অফিসসমূহ অপসারণ করুন।' }
    }

    await prisma.coreOffice.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/offices-management/head-offices')
    revalidatePath('/admin/offices-management/field-offices')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// -------------------------------------------------------------
// FIELD OFFICES (parent_office_id NOT NULL)
// -------------------------------------------------------------

export async function getFieldOffices(): Promise<FieldOfficeItem[]> {
  const offices = await prisma.coreOffice.findMany({
    where: {
      parentOfficeId: { not: null },
    },
    include: {
      department: {
        select: { name: true },
      },
      officeType: {
        select: { name: true },
      },
      officeLevel: {
        select: { levelName: true, levelOrder: true },
      },
      parentOffice: {
        select: { name: true },
      },
      officeUsers: {
        select: { passwordHint: true },
      },
    },
    orderBy: { id: 'desc' },
  })

  return offices.map((off) => ({
    id: String(off.id),
    budget_id: off.budgetId,
    name: off.name,
    department_id: off.departmentId ? String(off.departmentId) : '',
    department_name: off.department?.name || '—',
    ministry_id: '',
    ministry_name: '',
    office_type_id: off.officeTypeId ? String(off.officeTypeId) : '',
    office_type_name: off.officeType?.name || '—',
    office_level_id: off.officeLevelId ? String(off.officeLevelId) : undefined,
    office_level_name: off.officeLevel?.levelName,
    head_office_id: off.parentOfficeId ? String(off.parentOfficeId) : '',
    head_office_name: off.parentOffice?.name || '—',
    password_hint: off.officeUsers?.[0]?.passwordHint || DEFAULT_OFFICE_PASSWORD,
    created_at: off.createdAt.toISOString(),
  }))
}

export async function saveFieldOffice(data: {
  id?: string
  name: string
  budget_id: string
  head_office_id: string
  office_type_id: string
  department_id?: string
  /** The field office's level — it decides which economic codes the admin grants it. */
  office_level_id?: string
  password?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmedName = data.name.trim()
  const trimmedBudget = data.budget_id.trim()
  const pwd = (data.password?.trim()) || DEFAULT_OFFICE_PASSWORD

  if (!trimmedName) return { error: 'মাঠ পর্যায়ের অফিসের নাম আবশ্যক' }
  if (!trimmedBudget) return { error: 'বাজেট আইডি আবশ্যক' }
  if (!data.head_office_id) return { error: 'হেড অফিস নির্বাচন আবশ্যক' }
  if (!data.office_type_id) return { error: 'অফিসের ধরণ নির্বাচন আবশ্যক' }
  if (!data.office_level_id) return { error: 'মাঠ পর্যায়ের অফিসের স্তর নির্বাচন আবশ্যক' }

  try {
    // Check unique budget_id
    const existing = await prisma.coreOffice.findFirst({
      where: {
        budgetId: trimmedBudget,
        ...(data.id && { id: { not: BigInt(data.id) } }),
      },
    })
    if (existing) {
      return { error: 'এই বাজেট আইডিটি ইতিমধ্যে অন্য অফিসের জন্য ব্যবহৃত হচ্ছে।' }
    }

    const pwdHash = require('crypto').createHash('sha256').update(pwd).digest('hex')

  // Get departmentId from office_type if not provided
  let departmentId: bigint
  if (data.department_id) {
    departmentId = BigInt(data.department_id)
  } else {
    const officeType = await prisma.coreOfficeType.findUnique({
      where: { id: BigInt(data.office_type_id) },
      select: { departmentId: true },
    })
    if (!officeType) {
      return { error: 'অফিসের ধরণ পাওয়া যায়নি' }
    }
    departmentId = officeType.departmentId
  }

  if (data.id) {
    await prisma.coreOffice.update({
      where: { id: BigInt(data.id) },
      data: {
        name: trimmedName,
        budgetId: trimmedBudget,
        parentOfficeId: BigInt(data.head_office_id),
        officeTypeId: BigInt(data.office_type_id),
        departmentId: departmentId,
        officeLevelId: BigInt(data.office_level_id),
      },
    })

      // Update password
      await prisma.officeUser.upsert({
        where: { officeId: BigInt(data.id) },
        update: {
          passwordHash: pwdHash,
          passwordHint: pwd,
        },
        create: {
          officeId: BigInt(data.id),
          passwordHash: pwdHash,
          passwordHint: pwd,
        },
      })
    } else {
      const newOffice = await prisma.coreOffice.create({
        data: {
          name: trimmedName,
          budgetId: trimmedBudget,
          parentOfficeId: BigInt(data.head_office_id),
          officeTypeId: BigInt(data.office_type_id),
          departmentId: departmentId,
          officeLevelId: BigInt(data.office_level_id),
          isActive: true,
        },
      })

      // Create user record
      await prisma.officeUser.create({
        data: {
          officeId: newOffice.id,
          passwordHash: pwdHash,
          passwordHint: pwd,
        },
      })
    }

    revalidatePath('/admin/offices-management/field-offices')
    revalidatePath('/admin/offices-users')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFieldOffice(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.coreOffice.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/offices-management/field-offices')
    revalidatePath('/admin/offices-users')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
