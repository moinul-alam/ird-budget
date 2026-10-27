'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'
import { getOfficeTypes, getDepartments, getMinistries } from './admin-offices-config'
import { DEFAULT_OFFICE_PASSWORD } from '@/lib/office/defaults'
import { budgetDataBlockMessage } from '@/lib/office/budget-data'
import { assertOfficePlacement, resolveTopLevelId } from '@/lib/office/placement'

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
    // A head office is a root office that sits under an office type. Root offices without one are
    // the ministry/department accounts themselves (created for login and code grants), so they
    // belong on their own tabs, not in the head-office list.
    where: { parentOfficeId: null, officeTypeId: { not: null } },
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
  office_type_id: string
  budget_id?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'হেড অফিসের নাম আবশ্যক' }
  if (!data.office_type_id) return { error: 'অফিসের ধরণ নির্বাচন আবশ্যক' }
  const trimmedBudget = data.budget_id ? data.budget_id.trim() : ''

  try {
    // A head office sits at the top level of its office type, and the office type already fixes
    // the দপ্তর/সংস্থা (and through it the মন্ত্রণালয়/বিভাগ), so the admin only picks the type and
    // the rest is resolved here — through the same validator every other office writer uses.
    const placement = await assertOfficePlacement({
      officeTypeId: data.office_type_id,
      excludeOfficeId: data.id,
    })
    if (!placement.ok) return { error: placement.error }
    const topLevelId = await resolveTopLevelId(placement.officeTypeId)

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

    // One head office per office type is the shape the whole tab assumes (see the unique index
    // on head offices). Refuse the duplicate here so the admin reads Bangla, not a raw
    // constraint violation.
    const conflictingHeadOffice = await prisma.coreOffice.findFirst({
      where: {
        officeTypeId: placement.officeTypeId,
        parentOfficeId: null,
        ...(data.id && { id: { not: BigInt(data.id) } }),
      },
      select: { id: true },
    })
    if (conflictingHeadOffice) {
      return { error: 'এই অফিসের ধরণের অধীনে ইতিমধ্যে একটি হেড অফিস বিদ্যমান রয়েছে।' }
    }

    if (data.id) {
      await prisma.coreOffice.update({
        where: { id: BigInt(data.id) },
        data: {
          name: trimmed,
          budgetId: trimmedBudget || undefined,
          departmentId: placement.departmentId,
          officeTypeId: placement.officeTypeId,
          officeLevelId: topLevelId,
        },
      })
    } else {
      if (!trimmedBudget) return { error: 'বাজেট আইডি আবশ্যক' }

      await prisma.coreOffice.create({
        data: {
          name: trimmed,
          budgetId: trimmedBudget,
          departmentId: placement.departmentId,
          officeTypeId: placement.officeTypeId,
          officeLevelId: topLevelId,
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
    // Budget data (a draft or a sent submission) outlives the configuration row, so an office
    // that has started budgeting can only be edited or copied, never removed.
    const budgetMessage = await budgetDataBlockMessage({ id: BigInt(id) }, 'হেড অফিসে')
    if (budgetMessage) return { error: budgetMessage }

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
    // The office type owns the দপ্তর/সংস্থা, and both the level and the head office must belong
    // to that same type — so the whole placement is validated in one place, never trusted from
    // the client. The department is taken from the type, so the two can never drift apart.
    const placement = await assertOfficePlacement({
      officeTypeId: data.office_type_id,
      officeLevelId: data.office_level_id,
      parentOfficeId: data.head_office_id,
      excludeOfficeId: data.id,
    })
    if (!placement.ok) return { error: placement.error }

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

    if (data.id) {
      await prisma.coreOffice.update({
        where: { id: BigInt(data.id) },
        data: {
          name: trimmedName,
          budgetId: trimmedBudget,
          parentOfficeId: placement.parentOfficeId,
          officeTypeId: placement.officeTypeId,
          departmentId: placement.departmentId,
          officeLevelId: placement.officeLevelId,
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
          parentOfficeId: placement.parentOfficeId,
          officeTypeId: placement.officeTypeId,
          departmentId: placement.departmentId,
          officeLevelId: placement.officeLevelId,
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
    // The password is returned rather than imported by the client: it lives only in the
    // server environment, so this authenticated response is the only way the admin UI can
    // show the value that was actually stored.
    return { success: true, password: pwd }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFieldOffice(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    // A field office that has started budgeting (draft or submitted) must be preserved — the
    // admin can edit or copy it instead of deleting it.
    const budgetMessage = await budgetDataBlockMessage({ id: BigInt(id) }, 'মাঠ পর্যায়ের অফিসে')
    if (budgetMessage) return { error: budgetMessage }

    // `parent_office_id` is SetNull, so deleting a field office that has children would quietly
    // promote those children to head offices. Refuse instead, and let the admin re-point them.
    const children = await prisma.coreOffice.findFirst({
      where: { parentOfficeId: BigInt(id) },
      select: { id: true },
    })
    if (children) {
      return { error: 'এই মাঠ পর্যায়ের অফিসের অধীনে অন্য অফিস বিদ্যমান রয়েছে, তাই এটি মুছে ফেলা যাবে না। প্রথমে সেগুলো সরান বা অন্য হেড অফিসে স্থানান্তর করুন।' }
    }

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
