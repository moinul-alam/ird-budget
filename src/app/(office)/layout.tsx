import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { FormLockProvider } from '@/components/form-lock-provider'
import { FormGuardProvider } from '@/components/form-guard-provider'
import { strings } from '@/lib/strings'
import { getOfficeSession } from '@/lib/session'
import { getOpenCycle, getSubmissionState } from '@/lib/office/dashboard'

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

  return (
    <FormGuardProvider>
      <AppShell user={session} budgetStarted={cycle !== null && Boolean(session.submission_id)}>
        <FormLockProvider locked={locked} notice={lockNotice}>
          {children}
        </FormLockProvider>
      </AppShell>
    </FormGuardProvider>
  )
}
