'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import crypto from 'crypto'

/**
 * Self-service side of the admin account: reading your own identity and rotating your own
 * password. It is deliberately separate from `admin-users.ts` — that module is the
 * superadmin managing *other* people's accounts, while these actions only ever touch the
 * row behind the caller's own session.
 */

/** Every password is compared against this floor, so a one-character password can't be set. */
const MIN_PASSWORD_LENGTH = 6

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export interface AdminProfileInfo {
  id: number
  username: string
  role: 'admin' | 'superadmin'
  createdAt: string
}

export async function getAdminProfile(): Promise<AdminProfileInfo | null> {
  const session = await getAdminSession()
  if (!session) return null

  const user = await prisma.adminUser.findUnique({
    where: { id: BigInt(session.id) },
    select: { id: true, username: true, role: true, createdAt: true },
  })

  if (!user) return null

  return {
    id: Number(user.id),
    username: user.username,
    role: user.role as 'admin' | 'superadmin',
    createdAt: user.createdAt.toISOString(),
  }
}

/**
 * Rotate the signed-in admin's own password.
 *
 * The current password is verified with the exact comparison `loginAdmin` uses, so a
 * password that can sign in is always a password that can be changed — no account can end
 * up in the state where it can log in but not change its own password.
 */
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'সেশন শেষ হয়ে গেছে — অনুগ্রহ করে পুনরায় লগইন করুন।' }
  }

  const current = currentPassword.trim()
  const next = newPassword.trim()
  const confirm = confirmPassword.trim()

  if (!current) return { error: 'অনুগ্রহ করে বর্তমান পাসওয়ার্ড লিখুন।' }
  if (!next) return { error: 'অনুগ্রহ করে নতুন পাসওয়ার্ড লিখুন।' }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { error: `নতুন পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD_LENGTH} অক্ষরের হতে হবে।` }
  }
  if (next !== confirm) {
    return { error: 'নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।' }
  }
  if (next === current) {
    return { error: 'নতুন পাসওয়ার্ডটি বর্তমান পাসওয়ার্ডের মতো হতে পারবে না।' }
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: BigInt(session.id) },
    select: { id: true, passwordHash: true, passwordHint: true, isActive: true },
  })

  if (!user) return { error: 'অ্যাকাউন্ট পাওয়া যায়নি — অনুগ্রহ করে পুনরায় লগইন করুন।' }
  if (!user.isActive) return { error: 'এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।' }

  const isMatch = user.passwordHash === hashPassword(current) || user.passwordHint === current
  if (!isMatch) return { error: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' }

  try {
    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(next),
        // The legacy plaintext hint is cleared rather than rewritten: `loginAdmin` also
        // accepts a hint match, so leaving the old value behind would keep the previous
        // password working after the change.
        passwordHint: null,
      },
    })

    return { success: true }
  } catch (error: any) {
    return { error: 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে: ' + (error?.message || '') }
  }
}
