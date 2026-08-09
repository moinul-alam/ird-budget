'use server'

import { cookies } from 'next/headers'

export interface OfficeSession {
  id: string
  name: string
  submission_id?: number
}

export async function getOfficeSession(): Promise<OfficeSession | null> {
  const cookieStore = await cookies()
  const sessionStr = cookieStore.get('office_session')?.value
  if (!sessionStr) return null

  try {
    return JSON.parse(sessionStr) as OfficeSession
  } catch {
    return null
  }
}
