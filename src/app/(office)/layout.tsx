import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { FormLockProvider } from '@/components/form-lock-provider'
import { FormGuardProvider } from '@/components/form-guard-provider'
import { HazarProvider } from '@/components/hazar-provider'
import { strings } from '@/lib/strings'
import { getOfficeSession } from '@/lib/session'
import { getOpenCycle, getSubmissionState } from '@/lib/office/dashboard'
import { getSubmissionDigitCap } from '@/lib/budget/sheet'
import { DEFAULT_DIGIT_CAP } from '@/lib/budget/hazar'

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  // Whether the drawer offers the final budget sheet at all.
  const cycle = await getOpenCycle()

  // Forms are read-only when no cycle is open, before the office has started its
  // budget, and once it has submitted.
  let locked = true
  let lockNotice: string = strings.dashboard.formsLocked
  if (cycle !== null) {
    if (!session.submission_id) {
      lockNotice = strings.dashboard.startRequiredNotice
    } else {
      const state = await getSubmissionState(session.submission_id)
      locked = state?.isLocked ?? true
      lockNotice = strings.dashboard.lockedNotice
    }
  }

  // How many digits this office's level allows in a হাজার amount field.
  const digitCap = session.submission_id
    ? await getSubmissionDigitCap(session.submission_id)
    : DEFAULT_DIGIT_CAP

  return (
    <FormGuardProvider>
      <AppShell user={session} budgetStarted={cycle !== null && Boolean(session.submission_id)}>
        <FormLockProvider locked={locked} notice={lockNotice}>
          <HazarProvider digitCap={digitCap}>{children}</HazarProvider>
        </FormLockProvider>
      </AppShell>
    </FormGuardProvider>
  )
}
