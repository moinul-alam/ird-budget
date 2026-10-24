'use server'

import { cookies } from 'next/headers'

export interface OfficeSession {
  id: string
  office_id?: number
  budget_id?: string
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

/**
 * Rewrites the session cookie. Used after the office edits its own details, so the
 * name and budget id shown in the shell stay in step with what is in the database.
 */
export async function setOfficeSession(session: OfficeSession): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('office_session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}
