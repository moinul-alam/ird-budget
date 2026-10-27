'use server'

import { prisma } from '@/lib/db/client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import crypto from 'crypto'
import { setAdminSession, clearAdminSession } from '@/lib/auth-admin'
import { DEFAULT_OFFICE_PASSWORD } from '@/lib/office/defaults'
import { assertOfficePlacement } from '@/lib/office/placement'
import { BUDGET_ID_LENGTH, SESSION_MAX_AGE_SECONDS } from '@/lib/constants'
import { toBanglaNumber } from '@/lib/bangla'

const OFFICE_COOKIE = 'office_session'

// Helper to hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// ----------------------------------------------------
// Office Auth (Budget ID + Password via office_users)
// ----------------------------------------------------

/**
 * The office's submission id for the cycle that is currently open, or null.
 *
 * This is a read-only lookup on purpose: a draft must not be minted just because
 * someone signed in. The office starts its budget from the dashboard offer, and only
 * that decision creates the row.
 */
export async function findOpenCycleSubmission(officeId: number) {
  const cycle = await prisma.coreBudgetCycle.findFirst({
    where: { status: 'open' },
    orderBy: { id: 'desc' },
    select: { id: true },
  })

  if (!cycle) return null

  const submission = await prisma.officeSubmission.findUnique({
    where: {
      officeId_cycleId: {
        officeId: BigInt(officeId),
        cycleId: cycle.id,
      },
    },
    select: { id: true },
  })

  return submission ? Number(submission.id) : null
}

export async function loginOffice(budgetId: string, passwordInput: string) {
  try {
    const cleanBudgetId = budgetId.trim()

    // 1. Fetch office record
    const office = await prisma.coreOffice.findUnique({
      where: { budgetId: cleanBudgetId },
      select: {
        id: true,
        name: true,
        budgetId: true,
        isActive: true,
      },
    })

    if (!office) {
      return { error: 'অফিস পাওয়া যায়নি', notFound: true }
    }

    if (!office.isActive) {
      return { error: 'অফিসটি নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।' }
    }

    // 2. Fetch login credentials from office_users
    let loginRecord = await prisma.officeUser.findUnique({
      where: { officeId: office.id },
      select: {
        id: true,
        passwordHash: true,
        passwordHint: true,
        isActive: true,
      },
    })

    // If login record doesn't exist yet, auto-create with the system default password
    if (!loginRecord) {
      const defaultHash = hashPassword(DEFAULT_OFFICE_PASSWORD)
      loginRecord = await prisma.officeUser.create({
        data: {
          officeId: office.id,
          passwordHash: defaultHash,
          passwordHint: DEFAULT_OFFICE_PASSWORD,
          isActive: true,
        },
      })
    }

    // 3. Check password. It is mandatory: a budget ID alone must not mint a session.
    const inputHash = hashPassword(passwordInput)
    const isMatch =
      loginRecord.passwordHash === inputHash ||
      loginRecord.passwordHint === passwordInput

    if (!isMatch) {
      return { error: 'পাসওয়ার্ডটি সঠিক নয়। সহায়তার জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।' }
    }

    // 4. Update last login timestamp
    await prisma.officeUser.update({
      where: { id: loginRecord.id },
      data: { lastLoginAt: new Date() },
    })

    // 5. Attach an already-started submission for the open cycle, if there is one.
    //    Signing in never creates the draft — the office starts it from the dashboard.
    const submissionId = await findOpenCycleSubmission(Number(office.id))

    // 6. Set custom cookie for office session
    const cookieStore = await cookies()
    cookieStore.set(
      OFFICE_COOKIE,
      JSON.stringify({
        id: String(office.id),
        office_id: Number(office.id),
        budget_id: office.budgetId,
        name: office.name,
        submission_id: submissionId || undefined,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS, // 1 week
      }
    )

    return { success: true, officeName: office.name }
  } catch (err: any) {
    return { error: err?.message || 'লগইন ব্যর্থ হয়েছে' }
  }
}

export async function registerOffice(formData: FormData) {
  try {
    const name = (formData.get('name') as string)?.trim()
    const budgetId = (formData.get('budget_id') as string)?.trim()
    const rawTypeId = formData.get('type_id') as string
    const typeId = rawTypeId ? parseInt(rawTypeId, 10) : NaN
    const parentId = formData.get('parent_id') ? parseInt(formData.get('parent_id') as string, 10) : null
    const levelId = formData.get('level_id') ? parseInt(formData.get('level_id') as string, 10) : null
    const customPassword = (formData.get('password') as string)?.trim() || DEFAULT_OFFICE_PASSWORD

    if (!name) return { error: 'অফিসের নাম আবশ্যক' }
    if (!budgetId) return { error: 'বাজেট আইডি আবশ্যক' }
    // The landing form already restricts input to English digits, but the id is the office's
    // primary identifier — validate it here too rather than trusting the client.
    if (budgetId.length !== BUDGET_ID_LENGTH || !/^[0-9]+$/.test(budgetId)) {
      return { error: `বাজেট আইডি ${toBanglaNumber(BUDGET_ID_LENGTH)} সংখ্যার ইংরেজি অঙ্কে হতে হবে` }
    }

    // 1. Check if budget_id exists
    const existing = await prisma.coreOffice.findUnique({
      where: { budgetId },
      select: { id: true },
    })

    if (existing) {
      return { error: 'বাজেট কোডটি ইতিমধ্যেই নিবন্ধিত' }
    }

    // 2. Validate the placement through the same validator every other office writer uses: the
    //    office type fixes the department, the level must belong to that type, and the parent
    //    must be a head office of the same type and department.
    const placement = await assertOfficePlacement({
      officeTypeId: typeId,
      officeLevelId: levelId,
      parentOfficeId: parentId,
    })
    if (!placement.ok) return { error: placement.error }

    // 3. Insert office
    const newOffice = await prisma.coreOffice.create({
      data: {
        name,
        budgetId,
        departmentId: placement.departmentId,
        officeTypeId: placement.officeTypeId,
        officeLevelId: placement.officeLevelId,
        parentOfficeId: placement.parentOfficeId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        budgetId: true,
      },
    })

    // 4. Create login record in office_users
    const pwdHash = hashPassword(customPassword)
    await prisma.officeUser.create({
      data: {
        officeId: newOffice.id,
        passwordHash: pwdHash,
        passwordHint: customPassword,
        isActive: true,
      },
    })

    // 5. Attach the submission if the office had already started one for this cycle
    const submissionId = await findOpenCycleSubmission(Number(newOffice.id))

    // 6. Log them in
    const cookieStore = await cookies()
    cookieStore.set(
      OFFICE_COOKIE,
      JSON.stringify({
        id: String(newOffice.id),
        office_id: Number(newOffice.id),
        budget_id: budgetId,
        name,
        submission_id: submissionId || undefined,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      }
    )

    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'নিবন্ধন ব্যর্থ হয়েছে' }
  }
}

export async function logoutOffice() {
  const cookieStore = await cookies()
  cookieStore.delete(OFFICE_COOKIE)
  redirect('/')
}

// ----------------------------------------------------
// Admin Auth (admin_users table with username + password)
// ----------------------------------------------------

const adminLoginSchema = z.object({
  username: z.string().min(1, 'অনুগ্রহ করে ইউজারনেম লিখুন'),
  password: z.string().min(1, 'অনুগ্রহ করে পাসওয়ার্ড লিখুন'),
})

export async function loginAdmin(formData: FormData) {
  const username = (formData.get('username') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()

  const parsed = adminLoginSchema.safeParse({ username, password })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // 1. Fetch user from admin_users table
  const user = await prisma.adminUser.findFirst({
    where: {
      username: {
        equals: parsed.data.username,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      passwordHint: true,
      role: true,
      isActive: true,
    },
  })

  if (!user) {
    return { error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়' }
  }

  if (!user.isActive) {
    return { error: 'এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।' }
  }

  // 2. Validate Password (hash or hint comparison)
  const inputHash = hashPassword(parsed.data.password)
  const isMatch =
    user.passwordHash === inputHash ||
    user.passwordHint === parsed.data.password

  if (!isMatch) {
    return { error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়' }
  }

  // 3. Set secure HTTP-only signed admin session
  await setAdminSession({
    id: Number(user.id),
    username: user.username,
    role: user.role as 'admin' | 'superadmin',
  })

  return { success: true }
}

export async function logoutAdmin() {
  await clearAdminSession()
  redirect('/admin/login')
}
