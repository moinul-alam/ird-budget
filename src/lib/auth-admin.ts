import { cookies } from 'next/headers'
import crypto from 'crypto'

export interface AdminSession {
  id: number
  username: string
  role: 'admin' | 'superadmin'
}

const ADMIN_COOKIE_NAME = 'admin_session'
const SECRET_KEY = process.env.AUTH_SECRET || 'ird_budget_secret_key_admin_auth_2026'

// Simple tamper-proof payload signer
function sign(value: string): string {
  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(value).digest('hex')
  return `${Buffer.from(value).toString('base64url')}.${hmac}`
}

function verify(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [b64Payload, signature] = parts
  const payload = Buffer.from(b64Payload, 'base64url').toString()
  const expectedHmac = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex')
  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac))) {
    return payload
  }
  return null
}

export async function setAdminSession(session: AdminSession) {
  const cookieStore = await cookies()
  const token = sign(JSON.stringify(session))
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(ADMIN_COOKIE_NAME)
    if (!cookie?.value) return null
    const payload = verify(cookie.value)
    if (!payload) return null
    return JSON.parse(payload) as AdminSession
  } catch {
    return null
  }
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
}
