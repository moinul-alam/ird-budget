'use server'

import { prisma } from '@/lib/db/client'
import { getOfficeSession, setOfficeSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

interface SelectOption {
  id: string
  name: string
}

/**
 * The office the current session belongs to. Everything an office may change about
 * itself is scoped through this — the row id comes from the signed-in session and
 * never from the client.
 */
async function currentOfficeId(): Promise<number | null> {
  const session = await getOfficeSession()
  if (!session) return null
  const id = session.office_id ?? Number(session.id)
  return Number.isFinite(id) && id > 0 ? id : null
}

export async function searchOffice(
  budgetId: string
): Promise<{ found: boolean; office?: { id: string; name: string; headOffice: string | null } }> {
  const office = await prisma.coreOffice.findUnique({
    where: { budgetId: budgetId.trim() },
    select: { id: true, name: true, parentOffice: { select: { name: true } } },
  })

  if (!office) {
    return { found: false }
  }

  return {
    found: true,
    office: {
      id: String(office.id),
      name: office.name,
      // Null when the office itself is the head office — its own name is then the whole answer.
      headOffice: office.parentOffice?.name ?? null,
    },
  }
}

export async function getMinistriesList(): Promise<SelectOption[]> {
  const ministries = await prisma.coreMinistry.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  })

  return ministries.map((m) => ({ id: String(m.id), name: m.name }))
}

export async function getDepartments(ministryId?: string): Promise<(SelectOption & { ministry_id?: string })[]> {
  const where = ministryId ? { ministryId: BigInt(ministryId) } : undefined

  const departments = await prisma.coreDepartment.findMany({
    where,
    select: { id: true, name: true, ministryId: true },
    orderBy: { id: 'asc' },
  })

  return departments.map((d) => ({
    id: String(d.id),
    name: d.name,
    ministry_id: d.ministryId ? String(d.ministryId) : undefined,
  }))
}

export async function getParentOffices(departmentId: string): Promise<SelectOption[]> {
  const deptIdNum = BigInt(departmentId)

  const offices = await prisma.coreOffice.findMany({
    where: { departmentId: deptIdNum },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  })

  return offices.map((p) => ({
    id: String(p.id),
    name: p.name,
  }))
}

export async function getOfficeTypes(departmentId: string): Promise<SelectOption[]> {
  const deptIdNum = BigInt(departmentId)

  const types = await prisma.coreOfficeType.findMany({
    where: { departmentId: deptIdNum },
    select: { id: true, name: true },
    orderBy: { sortOrder: 'asc' },
  })

  return types.map((t) => ({
    id: String(t.id),
    name: t.name,
  }))
}

export interface MyOfficeProfile {
  /** The row id — read-only, both here and in the edit form. */
  id: number
  name: string
  budgetId: string
  departmentId: string
  departmentName: string
  ministryId: string
  ministryName: string
  officeTypeId: string
  officeTypeName: string
  officeLevelId: string
  officeLevelName: string
  parentOfficeId: string
  parentOfficeName: string
}

/**
 * Everything that was recorded when the office registered, for the signed-in office
 * only. The id comes from the session, so an office can never read another's record.
 */
export async function getMyOfficeProfile(): Promise<MyOfficeProfile | null> {
  const officeId = await currentOfficeId()
  if (!officeId) return null

  const office = await prisma.coreOffice.findUnique({
    where: { id: BigInt(officeId) },
    select: {
      id: true,
      name: true,
      budgetId: true,
      departmentId: true,
      officeTypeId: true,
      officeLevelId: true,
      parentOfficeId: true,
      department: {
        select: { name: true, ministryId: true, ministry: { select: { name: true } } },
      },
      officeType: { select: { name: true } },
      officeLevel: { select: { levelName: true } },
      parentOffice: { select: { name: true } },
    },
  })

  if (!office) return null

  return {
    id: Number(office.id),
    name: office.name,
    budgetId: office.budgetId,
    // Ministry/department offices have no department, office type or parent; keep those as
    // empty strings so callers treat them as "not set" rather than the literal "null".
    departmentId: office.departmentId ? String(office.departmentId) : '',
    departmentName: office.department?.name || '',
    ministryId: office.department?.ministryId ? String(office.department.ministryId) : '',
    ministryName: office.department?.ministry?.name || '',
    officeTypeId: office.officeTypeId ? String(office.officeTypeId) : '',
    officeTypeName: office.officeType?.name || '',
    officeLevelId: office.officeLevelId ? String(office.officeLevelId) : '',
    officeLevelName: office.officeLevel?.levelName || '',
    parentOfficeId: office.parentOfficeId ? String(office.parentOfficeId) : '',
    parentOfficeName: office.parentOffice?.name || '',
  }
}

/**
 * Saves the office's own details. Only the row id is fixed: the office may correct the
 * budget id as well, but it has to stay unique, since login resolves an office by it.
 */
export async function updateMyOfficeProfile(data: {
  name: string
  budgetId: string
  officeTypeId: string
  officeLevelId: string
  parentOfficeId: string
  departmentId: string
}) {
  const officeId = await currentOfficeId()
  if (!officeId) {
    return { error: 'অফিস সেশন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।' }
  }

  const trimmedName = data.name.trim()
  const trimmedBudget = data.budgetId.trim()

  if (!trimmedName) return { error: 'মাঠ পর্যায়ের অফিসের নাম আবশ্যক' }
  if (!trimmedBudget) return { error: 'অফিসের বাজেট আইডি আবশ্যক' }
  if (!data.officeTypeId) return { error: 'অফিসের ধরণ নির্বাচন আবশ্যক' }
  if (!data.officeLevelId) return { error: 'মাঠ পর্যায়ের অফিসের স্তর নির্বাচন আবশ্যক' }
  if (!data.parentOfficeId) return { error: 'হেড অফিস নির্বাচন আবশ্যক' }

  try {
    const clash = await prisma.coreOffice.findFirst({
      where: { budgetId: trimmedBudget, id: { not: BigInt(officeId) } },
      select: { id: true },
    })
    if (clash) {
      return { error: 'এই বাজেট আইডিটি ইতিমধ্যে অন্য অফিসের জন্য ব্যবহৃত হচ্ছে।' }
    }

    const parent = await prisma.coreOffice.findUnique({
      where: { id: BigInt(data.parentOfficeId) },
      select: { departmentId: true },
    })

    await prisma.coreOffice.update({
      where: { id: BigInt(officeId) },
      data: {
        name: trimmedName,
        budgetId: trimmedBudget,
        officeTypeId: BigInt(data.officeTypeId),
        officeLevelId: BigInt(data.officeLevelId),
        parentOfficeId: BigInt(data.parentOfficeId),
        departmentId: parent?.departmentId ?? BigInt(data.departmentId),
      },
    })

    // The shell reads the name and budget id from the cookie, so refresh it too.
    const session = await getOfficeSession()
    if (session) {
      await setOfficeSession({ ...session, name: trimmedName, budget_id: trimmedBudget })
    }

    revalidatePath('/office/office-info')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { error: 'অফিসের তথ্য সংরক্ষণ ব্যর্থ হয়েছে: ' + error.message }
  }
}

export async function getOfficeLevelsForType(officeTypeId: number) {
  const levels = await prisma.coreOfficeLevel.findMany({
    where: { officeTypeId: BigInt(officeTypeId) },
    select: { id: true, levelName: true },
    orderBy: { levelOrder: 'asc' },
  })

  return levels.map((l) => ({ id: String(l.id), name: l.levelName }))
}
