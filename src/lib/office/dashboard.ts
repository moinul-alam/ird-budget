import { cache } from 'react'
import { prisma } from '@/lib/db/client'
import { loadOfficeDashboardStats } from './load-form-data'

/**
 * Office-facing dashboard data. Everything the dashboard and the drawer need to
 * decide what to show, in one place, so the two never disagree about whether a
 * cycle is open.
 */

export interface OfficeCycleInfo {
  id: number
  title: string
  fiscal_year: string
  budget_type: string
}

/**
 * The cycle currently accepting submissions, or null when none is open. Unlike
 * the admin reporting helper this never falls back to a closed cycle: the office
 * side must show the "no cycle" state the moment the administrator closes one.
 *
 * `cache()` collapses the layout's call and the page's call into one query — the
 * office layout and every office page both ask for the open cycle on the same
 * request, and before this they each paid for a separate lookup.
 */
export const getOpenCycle = cache(async (): Promise<OfficeCycleInfo | null> => {
  const cycle = await prisma.coreBudgetCycle.findFirst({
    where: { status: 'open' },
    orderBy: { id: 'desc' },
    include: {
      fiscalYear: { select: { year: true } },
      budgetType: { select: { name: true } },
    },
  })

  if (!cycle) return null

  return {
    id: Number(cycle.id),
    title: cycle.title,
    fiscal_year: cycle.fiscalYear?.year ?? '',
    budget_type: cycle.budgetType?.name ?? '',
  }
})

export interface OfficeHeader {
  officeName: string
  /** Head quarter: the department name. Field office: its head quarter's name. */
  subtitle: string
  isHeadQuarter: boolean
}

export async function getOfficeHeader(officeId: number): Promise<OfficeHeader | null> {
  const office = await prisma.coreOffice.findUnique({
    where: { id: BigInt(officeId) },
    select: {
      name: true,
      parentOfficeId: true,
      department: { select: { name: true } },
      parentOffice: { select: { name: true } },
    },
  })

  if (!office) return null

  // A head office is a top-level office (no parent); a field office hangs off one.
  const isHeadQuarter = office.parentOfficeId === null

  return {
    officeName: office.name,
    subtitle: isHeadQuarter ? office.department?.name ?? '' : office.parentOffice?.name ?? '',
    isHeadQuarter,
  }
}

export interface OfficeSubmissionState {
  isLocked: boolean
  /** A draft that was unlocked after a previous submission — a revision in progress. */
  isRevision: boolean
}

/**
 * The editability of a submission. `submitted_at` is deliberately kept after an
 * unlock (it is the last submission time), so a draft that still carries one is a
 * revision in progress rather than a never-submitted form.
 */
export async function getSubmissionState(submissionId: number): Promise<OfficeSubmissionState | null> {
  const sub = await prisma.officeSubmission.findUnique({
    where: { id: BigInt(submissionId) },
    select: { status: true, submittedAt: true },
  })
  if (!sub) return null
  return {
    isLocked: sub.status === 'submitted',
    isRevision: sub.status !== 'submitted' && sub.submittedAt !== null,
  }
}

export interface OfficeDashboardData {
  header: OfficeHeader | null
  cycle: OfficeCycleInfo | null
  submission: {
    id: number
    status: 'draft' | 'submitted'
    submittedAt: string | null
    isRevision: boolean
  } | null
  completedForms: string[]
  totalBudgetAmount: number
}

export async function getOfficeDashboard(officeId: number): Promise<OfficeDashboardData> {
  const [header, cycle] = await Promise.all([getOfficeHeader(officeId), getOpenCycle()])

  if (!cycle) {
    return { header, cycle: null, submission: null, completedForms: [], totalBudgetAmount: 0 }
  }

  const sub = await prisma.officeSubmission.findUnique({
    where: {
      officeId_cycleId: { officeId: BigInt(officeId), cycleId: BigInt(cycle.id) },
    },
    select: { id: true, status: true, submittedAt: true },
  })

  if (!sub) {
    return { header, cycle, submission: null, completedForms: [], totalBudgetAmount: 0 }
  }

  const stats = await loadOfficeDashboardStats(Number(sub.id))

  return {
    header,
    cycle,
    submission: {
      id: Number(sub.id),
      status: stats.submissionStatus,
      submittedAt: stats.submittedAt,
      isRevision: stats.submissionStatus !== 'submitted' && sub.submittedAt !== null,
    },
    completedForms: [...stats.completedForms],
    totalBudgetAmount: stats.totalBudgetAmount,
  }
}
