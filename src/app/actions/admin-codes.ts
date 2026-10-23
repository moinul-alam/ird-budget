'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

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
  is_manual?: boolean
  enabled?: boolean
}

const DEFAULT_CATEGORIES: BudgetCategoryItem[] = [
  { id: 'cat-3111', code: '3111', title: 'নগদ মজুরি ও বেতন', hierarchy_order: 1 },
  { id: 'cat-3211', code: '3211', title: 'প্রশাসনিক ব্যয়', hierarchy_order: 2 },
  { id: 'cat-3243', code: '3243', title: 'পেট্রোল, অয়েল ও লুব্রিকেন্ট', hierarchy_order: 3 },
  { id: 'cat-3244', code: '3244', title: 'ভ্রমণ ও বদলি', hierarchy_order: 4 },
  { id: 'cat-3255', code: '3255', title: 'মুদ্রণ ও মনিহারি', hierarchy_order: 5 },
  { id: 'cat-3256', code: '3256', title: 'সাধারণ সরবরাহ ও কাঁচামাল', hierarchy_order: 6 },
  { id: 'cat-3258', code: '3258', title: 'মেরামত ও সংরক্ষণ', hierarchy_order: 7 },
  { id: 'cat-3821', code: '3821', title: 'আবর্তক স্থানান্তর', hierarchy_order: 8 },
  { id: 'cat-4112', code: '4112', title: 'যন্ত্রপাতি ও সরঞ্জামাদি', hierarchy_order: 9 },
]

// -------------------------------------------------------------------
// CATEGORIES (stored in ref_economic_codes.category field)
// -------------------------------------------------------------------
export async function getBudgetCategories(): Promise<BudgetCategoryItem[]> {
  // Get unique categories from economic codes
  const codes = await prisma.refEconomicCode.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ['category'],
  })

  if (codes.length === 0) {
    return DEFAULT_CATEGORIES
  }

  // Map categories to budget categories
  const categoryNameMap: Record<string, string> = {
    'Salary': 'নগদ মজুরি ও বেতন',
    'Admin': 'প্রশাসনিক ব্যয়',
    'Fuel': 'পেট্রোল, অয়েল ও লুব্রিকেন্ট',
    'Travel': 'ভ্রমণ ও বদলি',
    'Printing': 'মুদ্রণ ও মনিহারি',
    'Supply': 'সাধারণ সরবরাহ ও কাঁচামাল',
    'Maintenance': 'মেরামত ও সংরক্ষণ',
    'Transfer': 'আবর্তক স্থানান্তর',
    'Equipment': 'যন্ত্রপাতি ও সরঞ্জামাদি',
  }

  return codes
    .map((c, idx) => ({
      id: `cat-${c.category}`,
      code: c.category || 'OTHER',
      title: categoryNameMap[c.category || ''] || c.category || 'অন্যান্য ব্যয়',
      hierarchy_order: idx + 1,
    }))
    .sort((a, b) => a.hierarchy_order - b.hierarchy_order)
}

export async function saveBudgetCategory(data: {
  id?: string
  code: string
  title: string
  hierarchy_order: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  // Categories are derived from ref_economic_codes.category
  // This is a no-op in the new schema - categories are managed via economic codes
  return { error: 'ক্যাটাগরি পরিচালনা অর্থনৈতিক কোডের মাধ্যমে করুন' }
}

export async function deleteBudgetCategory(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  // Categories are derived from ref_economic_codes.category
  return { error: 'ক্যাটাগরি পরিচালনা অর্থনৈতিক কোডের মাধ্যমে করুন' }
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
  officeTypeId: number,
  officeLevelId?: string
) {
  // Fetch all economic codes
  const codes = await prisma.refEconomicCode.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  let enabledCodeIds = new Set<number>()

  if (officeLevelId) {
    enabledCodeIds = await getLevelEnabledCodeIds(officeLevelId)
  } else {
    // No level selected - use all codes
    enabledCodeIds = new Set(codes.map((c) => Number(c.id)))
  }

  const categoryNameMap: Record<string, string> = {
    '3111': 'নগদ মজুরি ও বেতন',
    '3211': 'প্রশাসনিক ব্যয়',
    '3243': 'পেট্রোল, অয়েল ও লুব্রিকেন্ট',
    '3244': 'ভ্রমণ ও বদলি',
    '3255': 'মুদ্রণ ও মনিহারি',
    '3256': 'সাধারণ সরবরাহ ও কাঁচামাল',
    '3258': 'মেরামত ও সংরক্ষণ',
    '3821': 'আবর্তক স্থানান্তর',
    '4112': 'যন্ত্রপাতি ও সরঞ্জামাদি',
  }

  const list: ExpenseCodeFullItem[] = codes.map((c) => {
    const pCode = c.code ? c.code.substring(0, 4) : ''
    const pTitle = c.category || categoryNameMap[pCode] || 'অন্যান্য ব্যয়'

    return {
      id: Number(c.id),
      code: c.code,
      name: c.name,
      parent_code: pCode,
      parent_title: pTitle,
      hierarchy_order: c.sortOrder || 0,
      formula_key: c.formulaKey,
      is_manual: c.isManual,
      enabled: enabledCodeIds.has(Number(c.id)),
    }
  })

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
  parent_title: string
  hierarchy_order: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const trimmedCode = data.code.trim()
  const trimmedName = data.name.trim()
  if (!trimmedCode || !trimmedName) return { error: 'কোড ও বিবরণ আবশ্যক' }

  try {
    if (data.id) {
      await prisma.refEconomicCode.update({
        where: { id: BigInt(data.id) },
        data: {
          code: trimmedCode,
          name: trimmedName,
          category: data.parent_code,
          sortOrder: data.hierarchy_order || 1,
        },
      })
    } else {
      await prisma.refEconomicCode.create({
        data: {
          code: trimmedCode,
          name: trimmedName,
          category: data.parent_code,
          sortOrder: data.hierarchy_order || 1,
          isManual: true,
          isActive: true,
        },
      })
    }

    revalidatePath('/admin/codes')
    revalidatePath('/office/budget-sheet')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
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
    revalidatePath('/office/budget-sheet')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function toggleCodeForOfficeType(
  officeTypeId: number,
  codeId: number,
  enable: boolean,
  officeLevelId?: string
) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  if (!officeLevelId) {
    return { error: 'অফিস লেভেল নির্বাচন আবশ্যক' }
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
    revalidatePath('/office/budget-sheet')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function toggleBulkCodesForOfficeType(
  officeTypeId: number,
  codeIds: number[],
  enable: boolean,
  officeLevelId?: string
) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }
  if (!codeIds || codeIds.length === 0) return { error: 'কোনো কোড নির্বাচন করা হয়নি' }

  if (!officeLevelId) {
    return { error: 'অফিস লেভেল নির্বাচন আবশ্যক' }
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
    revalidatePath('/office/budget-sheet')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
