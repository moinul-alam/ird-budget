'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'
import { SALARY_MONTHS_MAX, SALARY_MONTHS_MIN } from '@/lib/constants'

export interface BudgetTypeItem {
  id: string
  name: string
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
  budget_type_name: string
  /** বেতন-মাস — the cycle's annualising multiplier for monthly figures. */
  salary_months: number
  status: 'open' | 'closed'
  has_data?: boolean
  submission_count?: number
  opened_at?: string | null
  closed_at?: string | null
  created_at?: string
}

// -------------------------------------------------------------------
// TAB 1: বাজেটের ধরণ (Budget Types)
// -------------------------------------------------------------------
export async function getBudgetTypes(): Promise<BudgetTypeItem[]> {
  const types = await prisma.refBudgetType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })

  return types.map((t) => ({
    id: String(t.id),
    name: t.name,
    created_at: t.createdAt.toISOString(),
  }))
}

export async function saveBudgetType(data: { id?: string; name: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const name = data.name.trim()
  if (!name) return { error: 'বাজেটের ধরণ আবশ্যক' }

  try {
    const row = data.id
      ? await prisma.refBudgetType.update({ where: { id: BigInt(data.id) }, data: { name } })
      : await prisma.refBudgetType.create({ data: { name, sortOrder: await nextBudgetTypeOrder() } })

    revalidatePath('/admin/budgets')
    revalidatePath('/dashboard')
    return { success: true, budgetType: { id: String(row.id), name: row.name } }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return { error: `"${name}" ধরণটি ইতিমধ্যে বিদ্যমান` }
    }
    return { error: (error as Error).message }
  }
}

export async function deleteBudgetType(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    const inUse = await prisma.coreBudgetCycle.count({ where: { budgetTypeId: BigInt(id) } })
    if (inUse > 0) {
      return { error: `এই ধরণটি ${inUse} টি বাজেট সাইকেলে ব্যবহৃত — আগে সেগুলো সরান` }
    }

    await prisma.refBudgetType.delete({ where: { id: BigInt(id) } })
    revalidatePath('/admin/budgets')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

async function nextBudgetTypeOrder(): Promise<number> {
  const last = await prisma.refBudgetType.findFirst({ orderBy: { sortOrder: 'desc' } })
  return (last?.sortOrder ?? 0) + 1
}

// -------------------------------------------------------------------
// TAB 2: অর্থবছর (Fiscal Years)
// -------------------------------------------------------------------
export async function getFiscalYears(): Promise<FiscalYearItem[]> {
  const years = await prisma.refFiscalYear.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })

  return years.map((y) => ({
    id: String(y.id),
    year: y.year,
    created_at: y.createdAt.toISOString(),
  }))
}

export async function saveFiscalYear(data: { id?: string; year: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const year = data.year.trim()
  if (!year) return { error: 'অর্থবছর আবশ্যক' }

  try {
    const row = data.id
      ? await prisma.refFiscalYear.update({ where: { id: BigInt(data.id) }, data: { year } })
      : await prisma.refFiscalYear.create({ data: { year, sortOrder: await nextFiscalYearOrder() } })

    revalidatePath('/admin/budgets')
    revalidatePath('/dashboard')
    return { success: true, fiscalYear: { id: String(row.id), year: row.year } }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return { error: `"${year}" অর্থবছরটি ইতিমধ্যে বিদ্যমান` }
    }
    return { error: (error as Error).message }
  }
}

export async function deleteFiscalYear(id: string) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    const inUse = await prisma.coreBudgetCycle.count({ where: { fiscalYearId: BigInt(id) } })
    if (inUse > 0) {
      return { error: `এই অর্থবছরটি ${inUse} টি বাজেট সাইকেলে ব্যবহৃত — আগে সেগুলো সরান` }
    }

    await prisma.refFiscalYear.delete({ where: { id: BigInt(id) } })
    revalidatePath('/admin/budgets')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

async function nextFiscalYearOrder(): Promise<number> {
  const last = await prisma.refFiscalYear.findFirst({ orderBy: { sortOrder: 'desc' } })
  return (last?.sortOrder ?? 0) + 1
}

// -------------------------------------------------------------------
// TAB 3: বাজেট নির্ধারণ ও সাইকেল ব্যবস্থাপনা (Cycles)
// -------------------------------------------------------------------
export async function getCyclesList(): Promise<CycleItem[]> {
  const cycles = await prisma.coreBudgetCycle.findMany({
    orderBy: { id: 'desc' },
    include: {
      fiscalYear: { select: { year: true } },
      budgetType: { select: { name: true } },
    },
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
    const count = subCountMap.get(c.id) || 0

    return {
      id: Number(c.id),
      fiscal_year: c.fiscalYear.year,
      budget_type_name: c.budgetType.name,
      salary_months: c.salaryMonths,
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
  salary_months: number
  status: 'open' | 'closed'
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  if (!data.fiscal_year?.trim() || !data.budget_type_name?.trim()) {
    return { error: 'অর্থবছর ও বাজেটের ধরণ আবশ্যক' }
  }

  // বেতন-মাস is the number of months the sheet annualises by; a fiscal year holds
  // twelve at most, so anything outside that range is a typo, not a budget.
  const salaryMonths = Number(data.salary_months)
  if (
    !Number.isInteger(salaryMonths) ||
    salaryMonths < SALARY_MONTHS_MIN ||
    salaryMonths > SALARY_MONTHS_MAX
  ) {
    return { error: 'বেতন-মাস ১ থেকে ১২ এর মধ্যে একটি পূর্ণসংখ্যা হতে হবে' }
  }

  // Both sides of a cycle are reference rows; resolve them to their foreign keys.
  const [fiscalYear, budgetType] = await Promise.all([
    prisma.refFiscalYear.findUnique({ where: { year: data.fiscal_year.trim() }, select: { id: true } }),
    prisma.refBudgetType.findUnique({ where: { name: data.budget_type_name.trim() }, select: { id: true } }),
  ])

  if (!fiscalYear) return { error: 'নির্বাচিত অর্থবছর পাওয়া যায়নি' }
  if (!budgetType) return { error: 'নির্বাচিত বাজেটের ধরণ পাওয়া যায়নি' }

  try {
    await prisma.$transaction(async (tx) => {
      const payload = {
        fiscalYearId: fiscalYear.id,
        budgetTypeId: budgetType.id,
        title: `${data.fiscal_year.trim()} ${data.budget_type_name.trim()}`,
        salaryMonths,
        status: data.status,
        openedAt: data.status === 'open' ? new Date() : undefined,
        closedAt: data.status === 'closed' ? new Date() : undefined,
      }

      const row = data.id
        ? await tx.coreBudgetCycle.update({ where: { id: BigInt(data.id) }, data: payload })
        : await tx.coreBudgetCycle.create({ data: payload })

      // Opening a cycle closes every other one. This runs *after* the write above and
      // inside the same transaction, so a rejected save — most likely the unique
      // (fiscal year × budget type) index — cannot leave the installation with the
      // previously open cycle closed and no replacement.
      if (data.status === 'open') {
        await tx.coreBudgetCycle.updateMany({
          where: { id: { not: row.id } },
          data: { status: 'closed' },
        })
      }
    })

    revalidatePath('/admin/budgets')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { error: 'এই অর্থবছর এবং বাজেটের ধরণের সাইকেল ইতোমধ্যে বিদ্যমান' }
    }
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
