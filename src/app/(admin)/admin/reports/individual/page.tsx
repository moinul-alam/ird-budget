import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { getSubmissionSheet } from '@/lib/budget/sheet'
import { getActiveCycle } from '@/lib/budget/report'
import { IndividualReportsClient, type OfficeCodeRow, type OfficeReportItem } from './individual-reports-client'

export const metadata = {
  title: 'অফিসভিত্তিক প্রতিবেদন',
}

export default async function IndividualReportPage({
  searchParams,
}: {
  searchParams: Promise<{ office?: string }>
}) {
  const session = await getAdminSession()
  if (!session) {
    redirect('/admin/login')
  }

  const [params, cycle, offices, groupRules] = await Promise.all([
    searchParams,
    getActiveCycle(),
    prisma.coreOffice.findMany({
      include: {
        officeType: {
          include: { department: true },
        },
      },
      orderBy: { id: 'asc' },
    }),
    // "গ্রুপ বাজেট" is defined solely by the flagged rules on
    // /admin/offices-management/group-budget (office type × optional level) — the same
    // source the dashboard card and the combined report read.
    prisma.adminGroupBudgetRule.findMany({
      where: { isGroupBudget: true },
      select: { officeTypeId: true, officeLevelId: true },
    }),
  ])

  // A rule with no level covers every level of its office type, matching the combined report.
  const isGroupBudgetOffice = (officeTypeId: number | null, officeLevelId: number | null) =>
    officeTypeId !== null &&
    groupRules.some(
      (rule) =>
        Number(rule.officeTypeId) === officeTypeId &&
        (rule.officeLevelId === null || Number(rule.officeLevelId) === officeLevelId)
    )

  const submissions = cycle
    ? await prisma.officeSubmission.findMany({
        where: { cycleId: BigInt(cycle.id) },
        select: { id: true, officeId: true, status: true, submittedAt: true },
      })
    : []

  const subMap = new Map<number, { id: number; status: string; submittedAt: Date | null }>()
  for (const sub of submissions) {
    subMap.set(Number(sub.officeId), {
      id: Number(sub.id),
      status: sub.status,
      submittedAt: sub.submittedAt,
    })
  }

  const officeList: OfficeReportItem[] = offices.map((off) => {
    const sub = subMap.get(Number(off.id))

    let deptName = off.officeType?.department?.name || 'সাধারণ'
    if (deptName.includes(':::min=')) {
      deptName = deptName.split(':::min=')[0]
    }

    return {
      id: Number(off.id),
      budget_id: off.budgetId,
      name: off.name,
      department_name: deptName,
      office_type_name: off.officeType?.name || 'অফিস',
      is_group_budget: isGroupBudgetOffice(
        off.officeTypeId !== null ? Number(off.officeTypeId) : null,
        off.officeLevelId !== null ? Number(off.officeLevelId) : null
      ),
      status: (sub?.status === 'submitted' ? 'submitted' : sub ? 'draft' : 'not_started') as
        | 'submitted'
        | 'draft'
        | 'not_started',
      submitted_at: sub?.submittedAt?.toISOString(),
      submission_id: sub?.id ?? null,
    }
  })

  // Drill-down: one office's code-wise budget, read through the same branch point its
  // own budget sheet uses — a submitted office reads its frozen snapshot.
  const selectedId = params.office ? parseInt(params.office, 10) : null
  const selectedOffice = officeList.find((o) => o.id === selectedId) || null

  let detail:
    | { office: OfficeReportItem; rows: OfficeCodeRow[]; total: number }
    | null = null

  if (selectedOffice?.submission_id) {
    const sheet = await getSubmissionSheet(selectedOffice.submission_id)
    detail = {
      office: selectedOffice,
      rows: sheet.rows.map((r) => ({ ...r, amount: r.final_value })),
      total: sheet.total,
    }
  }

  return (
    <div className="space-y-6">
      <IndividualReportsClient
        offices={officeList}
        fiscalYear={cycle?.fiscal_year ?? ''}
        cycleName={cycle?.budget_type ?? ''}
        selectedOffice={selectedOffice}
        detail={detail}
      />
    </div>
  )
}
