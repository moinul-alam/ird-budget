'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export interface MinistryItem {
  id: string
  name: string
  budget_id?: string
  created_at?: string
}

export interface DepartmentItem {
  id: string
  name: string
  budget_id?: string
  ministry_id?: string
  ministry_name?: string
  created_at?: string
}

export interface OfficeTypeHierarchyItem {
  id: string
  name: string
  department_id?: string
  department_name?: string
  hierarchy_order?: number | null
  hierarchy_label?: string
  is_group_budget: boolean
  created_at?: string
}

export interface OfficeLevelItem {
  id: string
  office_type_id: string
  office_type_name?: string
  department_id?: string
  department_name?: string
  level_name: string
  level_order: number
  created_at?: string
}

export interface GroupBudgetSettingItem {
  id: string
  department_id: string
  department_name?: string
  office_type_id: string
  office_type_name?: string
  office_level_id?: string
  office_level_name?: string
  office_level_order?: number
  is_group_budget: boolean
  created_at?: string
}

// -------------------------------------------------------------------
// TAB 1: মন্ত্রণালয় / বিভাগ (core_ministries)
// -------------------------------------------------------------------
export async function getMinistries(): Promise<MinistryItem[]> {
  const ministries = await prisma.coreMinistry.findMany({
    orderBy: { id: 'asc' },
  })

  return ministries.map((m) => ({
    id: String(m.id),
    name: m.name,
    budget_id: m.code,
    created_at: m.createdAt.toISOString(),
  }))
}

export async function saveMinistry(data: { id?: string; name: string; budget_id?: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'মন্ত্রণালয়/বিভাগের নাম আবশ্যক' }
  const trimmedBudget = (data.budget_id || `MIN_${Date.now()}`).trim()

  try {
    if (data.id) {
      await prisma.coreMinistry.update({
        where: { id: BigInt(data.id) },
        data: { name: trimmed, code: trimmedBudget },
      })
    } else {
      await prisma.coreMinistry.create({
        data: { name: trimmed, code: trimmedBudget },
      })
    }

    revalidatePath('/admin/offices-config')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteMinistry(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.coreMinistry.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/offices-config')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// -------------------------------------------------------------------
// TAB 2: বিভাগ (core_departments)
// -------------------------------------------------------------------
export async function getDepartments(): Promise<DepartmentItem[]> {
  const departments = await prisma.coreDepartment.findMany({
    include: {
      ministry: {
        select: { name: true },
      },
    },
    orderBy: { id: 'asc' },
  })

  return departments.map((d) => ({
    id: String(d.id),
    name: d.name,
    budget_id: d.code,
    ministry_id: d.ministryId ? String(d.ministryId) : undefined,
    ministry_name: d.ministry?.name,
    created_at: d.createdAt.toISOString(),
  }))
}

export async function saveDepartment(data: {
  id?: string
  name: string
  budget_id?: string
  ministry_id?: string
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'বিভাগের নাম আবশ্যক' }
  const trimmedBudget = (data.budget_id || `DEPT_${Date.now()}`).trim()

  try {
    if (data.id) {
      const updateData: any = {
        name: trimmed,
        code: trimmedBudget,
      }
      if (data.ministry_id) {
        updateData.ministryId = BigInt(data.ministry_id)
      }
      await prisma.coreDepartment.update({
        where: { id: BigInt(data.id) },
        data: updateData,
      })
    } else {
      const createData: any = {
        name: trimmed,
        code: trimmedBudget,
      }
      if (data.ministry_id) {
        createData.ministryId = BigInt(data.ministry_id)
      }
      await prisma.coreDepartment.create({
        data: createData,
      })
    }

    revalidatePath('/admin/offices-config')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteDepartment(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.coreDepartment.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/offices-config')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// -------------------------------------------------------------------
// TAB 3: অফিস টাইপ (core_office_types)
// -------------------------------------------------------------------
export async function getOfficeTypes(): Promise<OfficeTypeHierarchyItem[]> {
  const types = await prisma.coreOfficeType.findMany({
    include: {
      department: {
        select: { name: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return types.map((t) => ({
    id: String(t.id),
    name: t.name,
    department_id: t.departmentId ? String(t.departmentId) : undefined,
    department_name: t.department?.name,
    hierarchy_order: t.sortOrder,
    hierarchy_label: `Level ${t.sortOrder}`,
    is_group_budget: t.isGroupBudget,
    created_at: t.createdAt.toISOString(),
  }))
}

export async function saveOfficeType(data: {
  id?: string
  name: string
  department_id: string
  is_group_budget?: boolean
  sort_order?: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmed = data.name.trim()
  if (!trimmed) return { error: 'অফিস টাইপের নাম আবশ্যক' }

  try {
    if (data.id) {
      await prisma.coreOfficeType.update({
        where: { id: BigInt(data.id) },
        data: {
          name: trimmed,
          departmentId: BigInt(data.department_id),
          isGroupBudget: data.is_group_budget ?? false,
          sortOrder: data.sort_order ?? 1,
        },
      })
    } else {
      await prisma.coreOfficeType.create({
        data: {
          name: trimmed,
          departmentId: BigInt(data.department_id),
          isGroupBudget: data.is_group_budget ?? false,
          sortOrder: data.sort_order ?? 1,
        },
      })
    }

    revalidatePath('/admin/offices-config')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteOfficeType(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.coreOfficeType.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/offices-config')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// -------------------------------------------------------------------
// TAB 4: অফিস লেভেল (core_office_levels)
// -------------------------------------------------------------------
export async function getOfficeLevels(): Promise<OfficeLevelItem[]> {
  const levels = await prisma.coreOfficeLevel.findMany({
    include: {
      officeType: {
        select: { name: true, departmentId: true },
      },
    },
    orderBy: { levelOrder: 'asc' },
  })

  return levels.map((l) => ({
    id: String(l.id),
    office_type_id: String(l.officeTypeId),
    office_type_name: l.officeType?.name,
    department_id: l.officeType?.departmentId ? String(l.officeType.departmentId) : '',
    department_name: undefined,
    level_name: l.levelName,
    level_order: l.levelOrder,
    created_at: l.createdAt.toISOString(),
  }))
}

export async function saveOfficeLevel(data: {
  id?: string
  office_type_id: string
  level_name: string
  level_order?: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmedName = data.level_name.trim()
  if (!trimmedName) return { error: 'লেভেলের নাম আবশ্যক' }

  try {
    if (data.id) {
      await prisma.coreOfficeLevel.update({
        where: { id: BigInt(data.id) },
        data: {
          officeTypeId: BigInt(data.office_type_id),
          levelName: trimmedName,
          levelOrder: data.level_order ?? 1,
        },
      })
    } else {
      await prisma.coreOfficeLevel.create({
        data: {
          officeTypeId: BigInt(data.office_type_id),
          levelName: trimmedName,
          levelOrder: data.level_order ?? 1,
        },
      })
    }

    revalidatePath('/admin/offices-config')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteOfficeLevel(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.coreOfficeLevel.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/offices-config')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// -------------------------------------------------------------------
// TAB 5: গ্রুপ বাজেট সেটিংস (admin_group_budget_rules)
// -------------------------------------------------------------------
export async function getGroupBudgetSettings(): Promise<GroupBudgetSettingItem[]> {
  const rules = await prisma.adminGroupBudgetRule.findMany({
    include: {
      officeType: {
        select: { name: true },
      },
      officeLevel: {
        select: { levelName: true, levelOrder: true },
      },
    },
    orderBy: { id: 'asc' },
  })

  return rules.map((r) => ({
    id: String(r.id),
    department_id: '', // Office type doesn't directly link to department in new schema
    department_name: '',
    office_type_id: String(r.officeTypeId),
    office_type_name: r.officeType?.name,
    office_level_id: r.officeLevelId ? String(r.officeLevelId) : undefined,
    office_level_name: r.officeLevel?.levelName,
    office_level_order: r.officeLevel?.levelOrder,
    is_group_budget: r.isGroupBudget,
    created_at: r.createdAt.toISOString(),
  }))
}

export async function saveGroupBudgetSetting(data: {
  id?: string
  office_type_id: string
  office_level_id?: string
  is_group_budget: boolean
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    if (data.id) {
      await prisma.adminGroupBudgetRule.update({
        where: { id: BigInt(data.id) },
        data: {
          officeTypeId: BigInt(data.office_type_id),
          officeLevelId: data.office_level_id ? BigInt(data.office_level_id) : null,
          isGroupBudget: data.is_group_budget,
        },
      })
    } else {
      await prisma.adminGroupBudgetRule.create({
        data: {
          officeTypeId: BigInt(data.office_type_id),
          officeLevelId: data.office_level_id ? BigInt(data.office_level_id) : null,
          isGroupBudget: data.is_group_budget,
        },
      })
    }

    revalidatePath('/admin/offices-config')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteGroupBudgetSetting(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.adminGroupBudgetRule.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/offices-config')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
