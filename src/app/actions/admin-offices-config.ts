'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath, updateTag } from 'next/cache'
import { ADMIN_DATA_TAG } from '@/lib/budget/fetcher'
import { budgetDataBlockMessage } from '@/lib/office/budget-data'

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

/** A level belongs to exactly one owner: a ministry, a department, or an office type. */
export type LevelOwnerType = 'ministry' | 'department' | 'office_type'

export interface OfficeLevelItem {
  id: string
  office_type_id: string
  office_type_name?: string
  ministry_id?: string
  ministry_name?: string
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
    await prisma.$transaction(async (tx) => {
      const ministry = data.id
        ? await tx.coreMinistry.update({
          where: { id: BigInt(data.id) },
          data: { name: trimmed, code: trimmedBudget },
        })
        : await tx.coreMinistry.create({ data: { name: trimmed, code: trimmedBudget } })

      const level =
        (await tx.coreOfficeLevel.findFirst({
          where: { ministryId: ministry.id },
          orderBy: { id: 'asc' },
        })) ??
        (await tx.coreOfficeLevel.create({
          data: { ministryId: ministry.id, levelName: 'মন্ত্রণালয়', levelOrder: 1 },
        }))

      const office = await tx.coreOffice.findFirst({ where: { ministryId: ministry.id } })
      if (office) {
        await tx.coreOffice.update({
          where: { id: office.id },
          data: { name: trimmed, budgetId: trimmedBudget, officeLevelId: level.id },
        })
      } else {
        await tx.coreOffice.create({
          data: {
            budgetId: trimmedBudget,
            name: trimmed,
            ministryId: ministry.id,
            officeLevelId: level.id,
            isActive: true,
          },
        })
      }
    })

    revalidatePath('/admin/offices-config')
    revalidatePath('/admin/offices-users')
    return { success: true }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { error: 'এই বাজেট আইডিটি ইতিমধ্যে অন্য অফিসের জন্য ব্যবহৃত হচ্ছে।' }
    }
    return { error: error.message }
  }
}

export async function deleteMinistry(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    const ministryId = BigInt(id)
    // A ministry that has started budgeting (draft or submitted) must be preserved.
    const budgetMessage = await budgetDataBlockMessage({ ministryId }, 'মন্ত্রণালয়/বিভাগে')
    if (budgetMessage) return { error: budgetMessage }

    await prisma.$transaction(async (tx) => {
      // The ministry's own office row goes first: core_offices.ministry_id is restrictive, so
      // it would otherwise block the delete. Its login row cascades away with it.
      await tx.coreOffice.deleteMany({ where: { ministryId } })
      // Deleting the ministry cascades to its level, which cascades to its code grants.
      await tx.coreMinistry.delete({ where: { id: ministryId } })
    })

    revalidatePath('/admin/offices-config')
    revalidatePath('/admin/offices-users')
    // The level (and its code grants) just went away, so the cached reference set is stale.
    updateTag(ADMIN_DATA_TAG)
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
    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        name: trimmed,
        code: trimmedBudget,
      }
      if (data.ministry_id) {
        updateData.ministryId = BigInt(data.ministry_id)
      }

      const department = data.id
        ? await tx.coreDepartment.update({
          where: { id: BigInt(data.id) },
          data: updateData,
        })
        : await tx.coreDepartment.create({ data: updateData })

      // Like a ministry, a department owns a level (its code grants) and an office (its login),
      // kept in step with the name and budget id the admin edits here.
      const level =
        (await tx.coreOfficeLevel.findFirst({
          where: { departmentId: department.id },
          orderBy: { id: 'asc' },
        })) ??
        (await tx.coreOfficeLevel.create({
          // A department sits at tier 2 on the global scale (ministry = 1, office-type levels
          // start at 3), so its auto-created level is fixed at 2.
          data: { departmentId: department.id, levelName: 'দপ্তর', levelOrder: 2 },
        }))

      const office = await tx.coreOffice.findFirst({
        where: { departmentId: department.id, officeTypeId: null },
      })
      if (office) {
        await tx.coreOffice.update({
          where: { id: office.id },
          data: { name: trimmed, budgetId: trimmedBudget, officeLevelId: level.id },
        })
      } else {
        await tx.coreOffice.create({
          data: {
            budgetId: trimmedBudget,
            name: trimmed,
            departmentId: department.id,
            officeLevelId: level.id,
            isActive: true,
          },
        })
      }
    })

    revalidatePath('/admin/offices-config')
    revalidatePath('/admin/offices-users')
    return { success: true }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { error: 'এই বাজেট আইডিটি ইতিমধ্যে অন্য অফিসের জন্য ব্যবহৃত হচ্ছে।' }
    }
    return { error: error.message }
  }
}

export async function deleteDepartment(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    const departmentId = BigInt(id)
    // A department that has started budgeting (draft or submitted) must be preserved.
    const budgetMessage = await budgetDataBlockMessage(
      { departmentId, officeTypeId: null },
      'দপ্তর/সংস্থায়',
    )
    if (budgetMessage) return { error: budgetMessage }

    await prisma.$transaction(async (tx) => {
      // Remove only the department's own office row (the one with no office type). A head or
      // field office under it keeps core_offices.department_id restrictive, so the delete still
      // refuses loudly when real offices are attached.
      await tx.coreOffice.deleteMany({ where: { departmentId, officeTypeId: null } })
      // Deleting the department cascades to its level, which cascades to its code grants.
      await tx.coreDepartment.delete({
        where: { id: departmentId },
      })
    })

    revalidatePath('/admin/offices-config')
    revalidatePath('/admin/offices-users')
    // The level (and its code grants) just went away, so the cached reference set is stale.
    updateTag(ADMIN_DATA_TAG)
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
      const typeId = BigInt(data.id)
      const nextDepartmentId = BigInt(data.department_id)
      const current = await prisma.coreOfficeType.findUnique({
        where: { id: typeId },
        select: { departmentId: true },
      })

      // Moving a type to another দপ্তর/সংস্থা leaves the offices beneath it filed under the old
      // one — their department_id is a separate column — so the same office would read as two
      // different departments depending on the screen. Refuse while offices are attached rather
      // than desync them silently.
      if (current && current.departmentId !== nextDepartmentId) {
        const attached = await prisma.coreOffice.findFirst({
          where: { officeTypeId: typeId },
          select: { id: true },
        })
        if (attached) {
          return { error: 'এই অফিসের ধরণের অধীনে অফিস বিদ্যমান থাকায় দপ্তর/সংস্থা পরিবর্তন করা যাবে না। প্রথমে সংশ্লিষ্ট অফিসসমূহ সরান।' }
        }
      }

      await prisma.coreOfficeType.update({
        where: { id: typeId },
        data: {
          name: trimmed,
          departmentId: nextDepartmentId,
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
    // Office types are part of the cached reference set the budget pages read.
    updateTag(ADMIN_DATA_TAG)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteOfficeType(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    const officeTypeId = BigInt(id)

    // Offices reference the type with `Restrict`, so the delete would refuse anyway — but with a
    // raw FK violation. Say it in Bangla instead, in the same slot the admin already reads.
    const inUse = await prisma.coreOffice.findFirst({
      where: { officeTypeId },
      select: { id: true },
    })
    if (inUse) {
      return { error: 'এই অফিসের ধরণের অধীনে অফিস বিদ্যমান রয়েছে, তাই এটি মুছে ফেলা যাবে না। প্রথমে সংশ্লিষ্ট অফিসসমূহ সরান।' }
    }

    await prisma.coreOfficeType.delete({
      where: { id: officeTypeId },
    })

    revalidatePath('/admin/offices-config')
    updateTag(ADMIN_DATA_TAG)
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
      officeType: { select: { name: true } },
      ministry: { select: { name: true } },
      department: { select: { name: true } },
    },
    orderBy: [{ levelOrder: 'asc' }, { id: 'asc' }],
  })

  return levels.map((l) => ({
    id: String(l.id),
    office_type_id: l.officeTypeId ? String(l.officeTypeId) : '',
    office_type_name: l.officeType?.name,
    ministry_id: l.ministryId ? String(l.ministryId) : '',
    ministry_name: l.ministry?.name,
    department_id: l.departmentId ? String(l.departmentId) : '',
    department_name: l.department?.name,
    level_name: l.levelName,
    level_order: l.levelOrder,
    created_at: l.createdAt.toISOString(),
  }))
}

export async function saveOfficeLevel(data: {
  id?: string
  owner_type: LevelOwnerType
  owner_id: string
  level_name: string
  level_order?: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmedName = data.level_name.trim()
  if (!trimmedName) return { error: 'লেভেলের নাম আবশ্যক' }
  if (!data.owner_id) return { error: 'স্তরের মালিক নির্বাচন আবশ্যক' }

  // A level has exactly one owner, so picking a new one clears the other two links.
  const ownerId = BigInt(data.owner_id)
  const ownership =
    data.owner_type === 'ministry'
      ? { ministryId: ownerId, departmentId: null, officeTypeId: null }
      : data.owner_type === 'department'
        ? { ministryId: null, departmentId: ownerId, officeTypeId: null }
        : { ministryId: null, departmentId: null, officeTypeId: ownerId }

  try {
    // Tier 3 is the first field-office level (ministry = 1, department = 2). The modal always
    // sends an explicit order, so the fallback only guards a caller that omits one.
    const levelOrder = data.level_order ?? 3
    if (data.id) {
      await prisma.coreOfficeLevel.update({
        where: { id: BigInt(data.id) },
        data: { ...ownership, levelName: trimmedName, levelOrder },
      })
    } else {
      await prisma.coreOfficeLevel.create({
        data: { ...ownership, levelName: trimmedName, levelOrder },
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
    const levelId = BigInt(id)

    // `core_offices.office_level_id` is SetNull and the office's code grants are keyed by its
    // level, so deleting a level an office sits on would blank that office's sheet with no error
    // at all. Refuse while any office still points here (a ministry/department's own level is
    // covered too, since that entity's login office references it).
    const inUse = await prisma.coreOffice.findFirst({
      where: { officeLevelId: levelId },
      select: { id: true },
    })
    if (inUse) {
      return { error: 'এই স্তরের অধীনে অফিস বিদ্যমান রয়েছে, তাই স্তরটি মুছে ফেলা যাবে না। প্রথমে সংশ্লিষ্ট অফিসসমূহ সরান বা অন্য স্তরে স্থানান্তর করুন।' }
    }

    await prisma.coreOfficeLevel.delete({
      where: { id: levelId },
    })

    revalidatePath('/admin/offices-config')
    // Deleting the level also drops the economic codes granted to it, so the cached
    // reference set the budget sheets read must be refreshed.
    updateTag(ADMIN_DATA_TAG)
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

    revalidatePath('/admin/offices-management/group-budget')
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

    revalidatePath('/admin/offices-management/group-budget')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
