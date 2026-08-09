import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { getOfficeSession } from '@/lib/session'

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getOfficeSession()
  if (!session) redirect('/')

  return <AppShell user={session}>{children}</AppShell>
}
