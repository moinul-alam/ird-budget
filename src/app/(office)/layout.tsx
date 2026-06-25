import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { cookies } from 'next/headers'

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const sessionStr = cookieStore.get('office_session')?.value
  
  if (!sessionStr) {
    redirect('/')
  }

  let office
  try {
    office = JSON.parse(sessionStr)
  } catch (e) {
    redirect('/')
  }

  return <AppShell user={office}>{children}</AppShell>
}
