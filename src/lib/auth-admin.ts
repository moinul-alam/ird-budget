import { cookies } from 'next/headers'
import crypto from 'crypto'
import { SESSION_MAX_AGE_SECONDS } from '@/lib/constants'

export interface AdminSession {
  id: number
  username: string
  role: 'admin' | 'superadmin'
}

const ADMIN_COOKIE_NAME = 'admin_session'

// HMAC key that signs the admin session cookie. Read lazily so that a missing
// value is a loud failure in production rather than a silent fallback to a key
// that is committed to this (public) repository — which would let anyone forge
// an `admin_session` cookie for any role.
function getSecretKey(): string {
  const secret = process.env.AUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET is not set. Refusing to sign admin sessions with a public key — set AUTH_SECRET in the host environment.'
    )
  }
  return 'dev-only-insecure-secret'
}

// Simple tamper-proof payload signer
function sign(value: string): string {
  const hmac = crypto.createHmac('sha256', getSecretKey()).update(value).digest('hex')
  return `${Buffer.from(value).toString('base64url')}.${hmac}`
}

function verify(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [b64Payload, signature] = parts
  const payload = Buffer.from(b64Payload, 'base64url').toString()
  const expectedHmac = crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex')
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
    maxAge: SESSION_MAX_AGE_SECONDS, // 7 days
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
