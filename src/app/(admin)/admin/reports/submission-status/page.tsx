import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { cleanTypeName } from '@/lib/bangla'
import {
  SubmissionStatusClient,
  type CycleOption,
  type StatusOfficeRow,
} from './submission-status-client'

export const metadata = {
  title: 'বাজেট দাখিলের অবস্থা',
}

/**
 * Office-by-office submission state for one budget cycle.
 *
 * The cycle is picked with two selectors (fiscal year × budget type) kept in the URL,
 * so the page re-renders on the server and a refresh keeps the chosen cycle. Only the
 * submission rows are read for the status — this page shows no amounts, so the whole
 * code-wise rollup the other reports need would be wasted work here.
 */
export default async function SubmissionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; bt?: string }>
}) {
  const session = await getAdminSession()
  if (!session) {
    redirect('/admin/login')
  }

  const params = await searchParams

  const cycles = await prisma.coreBudgetCycle.findMany({
    orderBy: { id: 'desc' },
    include: {
      fiscalYear: { select: { year: true } },
      budgetType: { select: { name: true } },
    },
  })

  const cycleOptions: CycleOption[] = cycles.map((c) => ({
    id: Number(c.id),
    year: c.fiscalYear.year,
    typeName: c.budgetType.name,
    isOpen: c.status === 'open',
  }))

  // Default to the open cycle — falling back to the newest one when nothing is open.
  const defaultCycle = cycleOptions.find((c) => c.isOpen) || cycleOptions[0] || null
  const selectedCycle =
    cycleOptions.find((c) => c.year === params.fy && c.typeName === params.bt) || defaultCycle

  const offices = await prisma.coreOffice.findMany({
    include: { officeType: true },
    orderBy: { id: 'asc' },
  })

  // A draft row exists only once an office started its budget, so "no row" is exactly
  // "not started" — the same three-way status the dashboard and reports use.
  const submissions = selectedCycle
    ? await prisma.officeSubmission.findMany({
        where: { cycleId: BigInt(selectedCycle.id) },
        select: { officeId: true, status: true },
      })
    : []

  const statusByOffice = new Map<number, 'submitted' | 'draft'>()
  for (const sub of submissions) {
    statusByOffice.set(Number(sub.officeId), sub.status === 'submitted' ? 'submitted' : 'draft')
  }

  const rows: StatusOfficeRow[] = offices.map((off) => ({
    id: Number(off.id),
    budgetId: off.budgetId,
    name: off.name,
    officeType: cleanTypeName(off.officeType?.name) || 'অফিস',
    status: statusByOffice.get(Number(off.id)) ?? 'not_started',
  }))

  return (
    <SubmissionStatusClient
      rows={rows}
      cycles={cycleOptions}
      selectedYear={selectedCycle?.year ?? ''}
      selectedType={selectedCycle?.typeName ?? ''}
    />
  )
}
