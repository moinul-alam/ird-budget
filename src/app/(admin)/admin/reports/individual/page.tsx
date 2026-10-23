import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { IndividualReportsClient } from './individual-reports-client'

export const metadata = {
  title: 'অফিসভিত্তিক প্রতিবেদন | আইআরডি বাজেট ব্যবস্থাপনা',
}

export default async function IndividualReportPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  // 1. Get active cycle
  const cycles = await prisma.coreBudgetCycle.findMany({
    orderBy: { id: 'desc' },
    include: {
      fiscalYear: { select: { year: true } },
      budgetType: { select: { name: true } },
    },
  })

  const activeCycle = cycles?.find((c) => c.status === 'open') || cycles?.[0] || null
  const cycleId = activeCycle?.id || BigInt(1)

  // 2. Fetch offices
  const offices = await prisma.coreOffice.findMany({
    include: {
      officeType: {
        include: {
          department: true
        }
      }
    },
    orderBy: { id: 'asc' }
  })

  // 3. Fetch submissions for this cycle
  const submissions = await prisma.officeSubmission.findMany({
    where: { cycleId },
    include: {
      budgetSheets: true
    }
  })

  const subMap = new Map<number, any>()
  if (submissions) {
    for (const sub of submissions) {
      let subTotal = 0
      if (sub.budgetSheets) {
        subTotal = sub.budgetSheets.reduce((sum: number, b: any) => {
          return sum + (Number(b.manualValue ?? b.autoValue) || 0)
        }, 0)
      }
      subMap.set(Number(sub.officeId), {
        ...sub,
        total: subTotal,
      })
    }
  }

  const officeList = offices.map((off) => {
    const sub = subMap.get(Number(off.id))
    const isSubmitted = sub?.status === 'submitted'
    const isDraft = sub?.status === 'draft'

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
      is_group_budget: off.officeType?.isGroupBudget || false,
      status: (isSubmitted ? 'submitted' : isDraft ? 'draft' : 'not_started') as 'submitted' | 'draft' | 'not_started',
      submitted_at: sub?.submittedAt,
      total_budget: sub?.total || 0,
      submission_id: sub?.id ? Number(sub.id) : null,
    }
  })

  const fy = activeCycle?.fiscalYear.year ?? ''
  const cycleName = activeCycle?.budgetType.name ?? ''

  return (
    <div className="space-y-6">
      <IndividualReportsClient
        offices={officeList}
        fiscalYear={fy}
        cycleName={cycleName}
      />
    </div>
  )
}
