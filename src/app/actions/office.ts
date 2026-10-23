'use server'

import { prisma } from '@/lib/db/client'

interface SelectOption {
  id: string
  name: string
}

export async function searchOffice(budgetId: string): Promise<{ found: boolean; office?: { id: string; name: string } }> {
  const office = await prisma.coreOffice.findUnique({
    where: { budgetId: budgetId.trim() },
    select: { id: true, name: true },
  })

  if (!office) {
    return { found: false }
  }

  return { found: true, office: { id: String(office.id), name: office.name } }
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

export async function getOfficeProfile(officeId: number) {
  const office = await prisma.coreOffice.findUnique({
    where: { id: BigInt(officeId) },
    include: {
      officeType: {
        select: { id: true, name: true, departmentId: true },
      },
      parentOffice: {
        select: { id: true, name: true },
      },
    },
  })

  if (!office) return null

  return {
    id: Number(office.id),
    name: office.name,
    budgetId: office.budgetId,
    officeTypeId: Number(office.officeTypeId),
    parentOfficeId: office.parentOfficeId ? Number(office.parentOfficeId) : null,
    departmentId: Number(office.departmentId),
  }
}

export async function updateOfficeProfile(data: {
  officeId: number
  name: string
  officeTypeId?: number
  parentOfficeId?: number | null
}) {
  try {
    const updatePayload: any = {
      name: data.name.trim(),
    }
    if (data.officeTypeId) {
      updatePayload.officeTypeId = BigInt(data.officeTypeId)
    }
    if (data.parentOfficeId !== undefined) {
      updatePayload.parentOfficeId = data.parentOfficeId ? BigInt(data.parentOfficeId) : null
    }

    await prisma.coreOffice.update({
      where: { id: BigInt(data.officeId) },
      data: updatePayload,
    })

    return { success: true, cleanName: data.name.trim() }
  } catch (error: any) {
    return { error: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে: ' + error.message }
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
