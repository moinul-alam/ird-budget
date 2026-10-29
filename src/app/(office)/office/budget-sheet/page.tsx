import { getOfficeSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getBudgetSheetData, type BudgetSheetRowItem } from '@/lib/actions/budget'
import { BudgetSheetClient } from './budget-sheet-client'

export default async function BudgetSheetPage() {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  const submissionId = session.submission_id || null

  let initialRows: BudgetSheetRowItem[] = []
  let initialTotalManual = 0
  let initialError: string | null = null
  let initialMissingForms: string[] = []
  let officeLevel = ''
  let officeName = ''
  let headOfficeName = ''
  let budgetId = ''
  let isFieldOffice = false
  let isSubmitted = false
  let configStale = false
  let capturedAt: string | null = null

  if (submissionId) {
    const result = await getBudgetSheetData(submissionId)
    if (result.success) {
      initialRows = result.rows
      initialTotalManual = result.totalManual
      initialMissingForms = result.missingForms || []
      officeLevel = result.officeLevel || ''
      officeName = result.officeName || ''
      headOfficeName = result.headOfficeName || ''
      budgetId = result.budgetId || ''
      isFieldOffice = result.isFieldOffice
      isSubmitted = result.isSubmitted
      configStale = result.configStale
      capturedAt = result.capturedAt
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
      officeName={officeName}
      headOfficeName={headOfficeName}
      budgetId={budgetId}
      isFieldOffice={isFieldOffice}
      isSubmitted={isSubmitted}
      configStale={configStale}
      capturedAt={capturedAt}
    />
  )
}
