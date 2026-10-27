'use server'

import { errorMessage } from '@/lib/errors'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath, updateTag } from 'next/cache'
import { ADMIN_DATA_TAG } from '@/lib/budget/fetcher'

export interface BudgetCategoryItem {
  id: string
  code: string
  title: string
  hierarchy_order: number
}

export interface ExpenseCodeFullItem {
  id: number
  code: string
  name: string
  parent_code: string
  parent_title: string
  hierarchy_order: number
  formula_key?: string | null
  /** The form numbers whose data produced this code's amount. Empty for a manual code. */
  source_forms?: number[]
  is_manual?: boolean
  enabled?: boolean
}

/** One engine formula the administrator can bind a code to (ref_formula_types). */
export interface FormulaTypeItem {
  key: string
  label_bn: string
}

/**
 * The formulas the engine can run, as rows. Binding a code to one of these keys
 * is what makes the code computed; a key with no arithmetic in the engine
 * computes 0, so this list can never invent an amount.
 */
export async function getFormulaTypes(): Promise<FormulaTypeItem[]> {
  const types = await prisma.refFormulaType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
    select: { key: true, labelBn: true },
  })

  return types.map((t) => ({ key: t.key, label_bn: t.labelBn }))
}

// -------------------------------------------------------------------
// CATEGORIES (ref_budget_categories)
// -------------------------------------------------------------------
export async function getBudgetCategories(): Promise<BudgetCategoryItem[]> {
  const categories = await prisma.refBudgetCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  })

  return categories.map((c, idx) => ({
    id: String(c.id),
    code: c.code,
    title: c.title,
    hierarchy_order: c.sortOrder || idx + 1,
  }))
}

export async function saveBudgetCategory(data: {
  id?: string
  code: string
  title: string
  hierarchy_order: number
}): Promise<{ success?: true; error?: string; category?: BudgetCategoryItem }> {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const code = data.code.trim()
  const title = data.title.trim()
  if (!code || !title) return { error: 'ক্যাটাগরি কোড ও নাম আবশ্যক' }

  try {
    const row = data.id
      ? await prisma.refBudgetCategory.update({
        where: { id: BigInt(data.id) },
        data: { code, title, sortOrder: data.hierarchy_order || 1 },
      })
      : await prisma.refBudgetCategory.create({
        data: { code, title, sortOrder: data.hierarchy_order || 1 },
      })

    revalidatePath('/admin/codes')
    updateTag(ADMIN_DATA_TAG)
    return {
      success: true,
      category: {
        id: String(row.id),
        code: row.code,
        title: row.title,
        hierarchy_order: row.sortOrder,
      },
    }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return { error: `ক্যাটাগরি কোড ${code} ইতিমধ্যে ব্যবহৃত` }
    }
    return { error: (error as Error).message }
  }
}

export async function deleteBudgetCategory(
  id: string
): Promise<{ success?: true; error?: string }> {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    // Integrity Check: a category still referenced by economic codes must not vanish
    const assigned = await prisma.refEconomicCode.count({ where: { categoryId: BigInt(id) } })
    if (assigned > 0) {
      return { error: `এই ক্যাটাগরির অধীনে ${assigned} টি ইকোনমিক কোড রয়েছে — আগে সেগুলো সরান` }
    }

    await prisma.refBudgetCategory.delete({ where: { id: BigInt(id) } })

    revalidatePath('/admin/codes')
    updateTag(ADMIN_DATA_TAG)
    return { success: true }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

// -------------------------------------------------------------------
// ECONOMIC CODES & MAPPING
// -------------------------------------------------------------------

/**
 * Get enabled code IDs for a specific office level from office_level_economic_code_mapping.
 */
async function getLevelEnabledCodeIds(officeLevelId: string): Promise<Set<number>> {
  const mappings = await prisma.officeLevelEconomicCodeMapping.findMany({
    where: {
      officeLevelId: BigInt(officeLevelId),
      isEnabled: true,
    },
    select: { economicCodeId: true },
  })

  return new Set(mappings.map((m) => Number(m.economicCodeId)))
}

export async function getExpenseCodesWithCategoryAndMapping(
  officeTypeId: string,
  officeLevelId?: string
) {
  // Fetch all economic codes
  const codes = await prisma.refEconomicCode.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { category: { select: { code: true, title: true } } },
  })

  let enabledCodeIds = new Set<number>()

  if (officeLevelId) {
    enabledCodeIds = await getLevelEnabledCodeIds(officeLevelId)
  } else {
    // No level selected - use all codes
    enabledCodeIds = new Set(codes.map((c) => Number(c.id)))
  }

  const list: ExpenseCodeFullItem[] = codes.map((c) => ({
    id: Number(c.id),
    code: c.code,
    name: c.name,
    parent_code: c.category?.code ?? '',
    parent_title: c.category?.title ?? 'ক্যাটাগরি নির্ধারিত নয়',
    hierarchy_order: c.sortOrder || 0,
    formula_key: c.formulaKey,
    source_forms: (c.sourceForms || []).map(Number),
    is_manual: c.isManual,
    enabled: enabledCodeIds.has(Number(c.id)),
  }))

  return {
    codes: list,
    enabledCount: enabledCodeIds.size,
  }
}

export async function saveEconomicCode(data: {
  id?: number
  code: string
  name: string
  parent_code: string
  hierarchy_order: number
  /** The engine formula that computes this code; empty/omitted keeps it manual. */
  formula_key?: string | null
  /** The form numbers whose data produced this code's amount. */
  source_forms?: number[]
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmedCode = data.code.trim()
  const trimmedName = data.name.trim()
  if (!trimmedCode || !trimmedName) return { error: 'কোড ও বিবরণ আবশ্যক' }

  // A code that names a formula is computed, so it is never manual and carries the
  // forms that feed it; a code with no formula is a manual entry and has none.
  const formulaKey = data.formula_key?.trim() || null
  const sourceForms = formulaKey
    ? (data.source_forms || []).map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : []

  try {
    const category = await prisma.refBudgetCategory.findUnique({
      where: { code: data.parent_code.trim() },
      select: { id: true },
    })
    if (!category) return { error: 'নির্বাচিত ক্যাটাগরি পাওয়া যায়নি' }

    if (data.id) {
      await prisma.refEconomicCode.update({
        where: { id: BigInt(data.id) },
        data: {
          code: trimmedCode,
          name: trimmedName,
          categoryId: category.id,
          sortOrder: data.hierarchy_order || 1,
          formulaKey,
          sourceForms,
          isManual: !formulaKey,
        },
      })
    } else {
      await prisma.refEconomicCode.create({
        data: {
          code: trimmedCode,
          name: trimmedName,
          categoryId: category.id,
          sortOrder: data.hierarchy_order || 1,
          formulaKey,
          sourceForms,
          isManual: !formulaKey,
          isActive: true,
        },
      })
    }

    revalidatePath('/admin/codes')
    updateTag(ADMIN_DATA_TAG)
    revalidatePath('/office/budget-sheet')
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function deleteEconomicCode(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    // Integrity Check: Check if any office has active budget data for this code
    const activeEntries = await prisma.officeBudgetSheet.findFirst({
      where: {
        economicCodeId: BigInt(id),
        OR: [
          { autoValue: { gt: 0 } },
          { manualValue: { gt: 0 } },
        ],
      },
    })

    if (activeEntries) {
      return {
        error: 'এই কোডে বিভিন্ন অফিসের সক্রিয় বাজেট তথ্য বিদ্যমান রয়েছে! ডাটার নিরাপত্তার স্বার্থে এটি মুছে ফেলা সম্ভব নয়।'
      }
    }

    await prisma.refEconomicCode.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/codes')
    updateTag(ADMIN_DATA_TAG)
    revalidatePath('/office/budget-sheet')
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function toggleCodeForOfficeType(
  officeTypeId: string,
  codeId: number,
  enable: boolean,
  officeLevelId?: string
) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  if (!officeLevelId) {
    return { error: 'অফিসের স্তর নির্বাচন আবশ্যক' }
  }

  try {
    await prisma.officeLevelEconomicCodeMapping.upsert({
      where: {
        officeLevelId_economicCodeId: {
          officeLevelId: BigInt(officeLevelId),
          economicCodeId: BigInt(codeId),
        },
      },
      update: { isEnabled: enable },
      create: {
        officeLevelId: BigInt(officeLevelId),
        economicCodeId: BigInt(codeId),
        isEnabled: enable,
      },
    })

    revalidatePath('/admin/codes')
    updateTag(ADMIN_DATA_TAG)
    revalidatePath('/office/budget-sheet')
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function toggleBulkCodesForOfficeType(
  officeTypeId: string,
  codeIds: number[],
  enable: boolean,
  officeLevelId?: string
) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }
  if (!codeIds || codeIds.length === 0) return { error: 'কোনো কোড নির্বাচন করা হয়নি' }

  if (!officeLevelId) {
    return { error: 'অফিসের স্তর নির্বাচন আবশ্যক' }
  }

  try {
    // Upsert all codes
    for (const codeId of codeIds) {
      await prisma.officeLevelEconomicCodeMapping.upsert({
        where: {
          officeLevelId_economicCodeId: {
            officeLevelId: BigInt(officeLevelId),
            economicCodeId: BigInt(codeId),
          },
        },
        update: { isEnabled: enable },
        create: {
          officeLevelId: BigInt(officeLevelId),
          economicCodeId: BigInt(codeId),
          isEnabled: enable,
        },
      })
    }

    revalidatePath('/admin/codes')
    updateTag(ADMIN_DATA_TAG)
    revalidatePath('/office/budget-sheet')
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
