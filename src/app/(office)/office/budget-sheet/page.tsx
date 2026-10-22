import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getBudgetSheetData } from '@/app/actions/budget'
import { BudgetSheetClient } from './budget-sheet-client'

export default async function BudgetSheetPage() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialRows: any[] = []
  let initialTotalAuto = 0
  let initialTotalManual = 0
  let initialError: string | null = null
  let initialMissingForms: string[] = []

  if (submissionId) {
    const result = await getBudgetSheetData(submissionId)
    if (result.success) {
      initialRows = result.rows
      initialTotalAuto = result.totalAuto
      initialTotalManual = result.totalManual
      initialMissingForms = result.missingForms || []
    } else {
      initialError = result.error || 'বাজেট তথ্য লোড করা যায়নি।'
    }
  } else {
    initialError = 'কোনো সক্রিয় বাজেট দাখিল (Submission) পাওয়া যায়নি। অনুগ্রহ করে অফিসে পুনরায় লগইন করুন।'
  }

  return (
    <BudgetSheetClient
      initialRows={initialRows}
      submissionId={submissionId}
      initialTotalAuto={initialTotalAuto}
      initialTotalManual={initialTotalManual}
      initialError={initialError}
      initialMissingForms={initialMissingForms}
    />
  )
}
