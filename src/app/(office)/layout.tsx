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

  // Forms are read-only when no cycle is open, or once the office has submitted.
  let locked = true
  let lockNotice: string = strings.dashboard.formsLocked
  if (cycle !== null) {
    const state = session.submission_id ? await getSubmissionState(session.submission_id) : null
    locked = session.submission_id ? state?.isLocked ?? true : true
    lockNotice = strings.dashboard.lockedNotice
  }

  return (
    <FormGuardProvider>
      <AppShell user={session} hasOpenCycle={cycle !== null}>
        <FormLockProvider locked={locked} notice={lockNotice}>
          {children}
        </FormLockProvider>
      </AppShell>
    </FormGuardProvider>
  )
}
