import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getBudgetSheetData } from '@/app/actions/budget'
import { BudgetSheetClient } from './budget-sheet-client'

export default async function BudgetSheetPage() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialRows: any[] = []
  let initialTotalManual = 0
  let initialError: string | null = null
  let initialMissingForms: string[] = []
  let officeLevel = ''

  if (submissionId) {
    const result = await getBudgetSheetData(submissionId)
    if (result.success) {
      initialRows = result.rows
      initialTotalManual = result.totalManual
      initialMissingForms = result.missingForms || []
      officeLevel = result.officeLevel || ''
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
      initialTotalManual={initialTotalManual}
      initialError={initialError}
      initialMissingForms={initialMissingForms}
      officeLevel={officeLevel}
    />
  )
}
