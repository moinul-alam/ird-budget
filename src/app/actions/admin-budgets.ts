'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export interface BudgetTypeItem {
  id: string
  name: string
  code: 'revised' | 'new'
  created_at?: string
}

export interface FiscalYearItem {
  id: string
  year: string
  created_at?: string
}

export interface CycleItem {
  id: number
  fiscal_year: string
  budget_type: 'new' | 'revised'
  budget_type_name: string
  status: 'open' | 'closed'
  has_data?: boolean
  submission_count?: number
  opened_at?: string | null
  closed_at?: string | null
  created_at?: string
}

const DEFAULT_BUDGET_TYPES: BudgetTypeItem[] = [
  { id: 'bt-1', name: 'প্রাক্কলিত', code: 'new' },
  { id: 'bt-2', name: 'সংশোধিত', code: 'revised' },
]

const DEFAULT_FISCAL_YEARS: FiscalYearItem[] = [
  { id: 'fy-1', year: '২০২৪-২৫' },
  { id: 'fy-2', year: '২০২৫-২৬' },
  { id: 'fy-3', year: '২০২৬-২৭' },
  { id: 'fy-4', year: '২০২৭-২৮' },
]

// -------------------------------------------------------------------
// TAB 1: বাজেটের ধরণ (Budget Types) - Simplified to return defaults
// -------------------------------------------------------------------
export async function getBudgetTypes(): Promise<BudgetTypeItem[]> {
  return DEFAULT_BUDGET_TYPES
}

export async function saveBudgetType(data: { id?: string; name: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  // Budget types are hardcoded defaults for now
  return { error: 'বাজেটের ধরণ পরিবর্তন করা যাবে না' }
}

export async function deleteBudgetType(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  return { error: 'বাজেটের ধরণ মুছে ফেলা যাবে না' }
}

// -------------------------------------------------------------------
// TAB 2: অর্থবছর (Fiscal Years) - Simplified to return defaults
// -------------------------------------------------------------------
export async function getFiscalYears(): Promise<FiscalYearItem[]> {
  return DEFAULT_FISCAL_YEARS
}

export async function saveFiscalYear(data: { id?: string; year: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  // Fiscal years are hardcoded defaults for now
  return { error: 'অর্থবছর পরিবর্তন করা যাবে না' }
}

export async function deleteFiscalYear(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  return { error: 'অর্থবছর মুছে ফেলা যাবে না' }
}

// -------------------------------------------------------------------
// TAB 3: বাজেট নির্ধারণ ও সাইকেল ব্যবস্থাপনা (Cycles)
// -------------------------------------------------------------------
export async function getCyclesList(): Promise<CycleItem[]> {
  const cycles = await prisma.coreBudgetCycle.findMany({
    orderBy: { id: 'desc' },
  })

  // Get submission counts
  const cycleIds = cycles.map((c) => c.id)
  const submissions = await prisma.officeSubmission.groupBy({
    by: ['cycleId'],
    where: { cycleId: { in: cycleIds } },
    _count: true,
  })

  const subCountMap = new Map(submissions.map((s) => [s.cycleId, s._count]))

  return cycles.map((c) => {
    const fy = c.fiscalYear || ''
    const typeName = c.budgetType === 'revised' ? 'সংশোধিত' : 'প্রাক্কলিত'
    const count = subCountMap.get(c.id) || 0

    return {
      id: Number(c.id),
      fiscal_year: fy,
      budget_type: c.budgetType as 'new' | 'revised',
      budget_type_name: typeName,
      status: c.status as 'open' | 'closed',
      has_data: count > 0,
      submission_count: count,
      opened_at: c.openedAt?.toISOString(),
      closed_at: c.closedAt?.toISOString(),
      created_at: c.createdAt.toISOString(),
    }
  })
}

export async function saveCycle(data: {
  id?: number
  fiscal_year: string
  budget_type_name: string
  status: 'open' | 'closed'
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  if (!data.fiscal_year?.trim() || !data.budget_type_name?.trim()) {
    return { error: 'অর্থবছর ও বাজেটের ধরণ আবশ্যক' }
  }

  const isRevised =
    data.budget_type_name.includes('সংশোধিত') ||
    data.budget_type_name.toLowerCase().includes('revised')
  const budgetType: 'new' | 'revised' = isRevised ? 'revised' : 'new'

  try {
    // If opening this cycle, close all other cycles
    if (data.status === 'open') {
      await prisma.coreBudgetCycle.updateMany({
        where: { id: { not: data.id ? BigInt(data.id) : undefined } },
        data: { status: 'closed' },
      })
    }

    if (data.id) {
      await prisma.coreBudgetCycle.update({
        where: { id: BigInt(data.id) },
        data: {
          fiscalYear: data.fiscal_year,
          budgetType,
          status: data.status,
          openedAt: data.status === 'open' ? new Date() : undefined,
          closedAt: data.status === 'closed' ? new Date() : undefined,
        },
      })
    } else {
      // Check for duplicate
      const existing = await prisma.coreBudgetCycle.findFirst({
        where: {
          budgetType,
          fiscalYear: { startsWith: data.fiscal_year },
        },
      })

      if (existing) {
        return { error: 'এই অর্থবছর এবং বাজেটের ধরণের সাইকেল ইতোমধ্যে বিদ্যমান' }
      }

      await prisma.coreBudgetCycle.create({
        data: {
          fiscalYear: data.fiscal_year,
          budgetType,
          title: `${data.fiscal_year} ${data.budget_type_name}`,
          status: data.status,
          openedAt: data.status === 'open' ? new Date() : undefined,
          closedAt: data.status === 'closed' ? new Date() : undefined,
        },
      })
    }

    revalidatePath('/admin/budgets')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function toggleCycleStatus(id: number, targetStatus: 'open' | 'closed') {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    if (targetStatus === 'open') {
      // Close other cycles
      await prisma.coreBudgetCycle.updateMany({
        where: { id: { not: BigInt(id) } },
        data: { status: 'closed' },
      })
    }

    await prisma.coreBudgetCycle.update({
      where: { id: BigInt(id) },
      data: {
        status: targetStatus,
        openedAt: targetStatus === 'open' ? new Date() : undefined,
        closedAt: targetStatus === 'closed' ? new Date() : undefined,
      },
    })

    revalidatePath('/admin/budgets')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteOrArchiveCycle(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    // Check if submissions exist
    const subs = await prisma.officeSubmission.findFirst({
      where: { cycleId: BigInt(id) },
    })

    if (subs) {
      // Has data: Archive by marking status = 'closed'
      await prisma.coreBudgetCycle.update({
        where: { id: BigInt(id) },
        data: { status: 'closed' },
      })

      revalidatePath('/admin/budgets')
      revalidatePath('/dashboard')
      return { success: true, archived: true }
    }

    // No submissions: Safely remove
    await prisma.coreBudgetCycle.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/budgets')
    revalidatePath('/dashboard')
    return { success: true, deleted: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
