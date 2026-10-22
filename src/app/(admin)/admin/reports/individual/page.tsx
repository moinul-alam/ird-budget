import { getAdminSession } from '@/lib/auth-admin'
import { redirect } from 'next/navigation'
import { createOfficeClient } from '@/lib/supabase/server'
import { IndividualReportsClient } from './individual-reports-client'

export const metadata = {
  title: 'অফিসভিত্তিক প্রতিবেদন | আইআরডি বাজেট ব্যবস্থাপনা',
}

export default async function IndividualReportPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const supabase = createOfficeClient()

  // 1. Get active cycle
  const { data: cycles } = await supabase
    .from('core_budget_cycles')
    .select('*')
    .order('id', { ascending: false })

  const activeCycle = cycles?.find((c: any) => c.status === 'open') || cycles?.[0] || null
  const cycleId = activeCycle?.id || 1

  // 2. Fetch offices
  const { data: offices } = await supabase
    .from('core_offices')
    .select(`
      id,
      name,
      budget_id,
      office_type_id,
      core_office_types (
        id,
        name,
        is_group_budget,
        core_departments (
          id,
          name
        )
      )
    `)
    .order('id')

  // 3. Fetch submissions for this cycle
  const { data: submissions } = await supabase
    .from('office_submissions')
    .select(`
      id,
      office_id,
      status,
      submitted_at,
      office_budget_sheet (
        auto_value,
        manual_value
      )
    `)
    .eq('cycle_id', cycleId)

  const subMap = new Map<number, any>()
  if (submissions) {
    for (const sub of submissions) {
      let subTotal = 0
      if (sub.budget_sheet) {
        subTotal = sub.budget_sheet.reduce((sum: number, b: any) => {
          return sum + (Number(b.manual_value ?? b.auto_value) || 0)
        }, 0)
      }
      subMap.set(sub.office_id, {
        ...sub,
        total: subTotal,
      })
    }
  }

  const officeList = (offices || []).map((off: any) => {
    const sub = subMap.get(off.id)
    const isSubmitted = sub?.status === 'submitted'
    const isDraft = sub?.status === 'draft'

    let deptName = off.office_types?.departments?.name || 'সাধারণ'
    if (deptName.includes(':::min=')) {
      deptName = deptName.split(':::min=')[0]
    }

    return {
      id: off.id,
      budget_id: off.budget_id,
      name: off.name,
      department_name: deptName,
      office_type_name: off.office_types?.name || 'অফিস',
      is_group_budget: off.office_types?.is_group_budget || false,
      status: (isSubmitted ? 'submitted' : isDraft ? 'draft' : 'not_started') as 'submitted' | 'draft' | 'not_started',
      submitted_at: sub?.submitted_at,
      total_budget: sub?.total || 0,
      submission_id: sub?.id || null,
    }
  })

  let fy = activeCycle?.fiscal_year || '২০২৬-২৭'
  let cycleName = 'প্রাক্কলিত বাজেট'
  if (fy.includes(':::name=')) {
    const parts = fy.split(':::name=')
    fy = parts[0]
    cycleName = parts[1] || cycleName
  }

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
