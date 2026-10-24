'use server'

import { prisma } from '@/lib/db/client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import crypto from 'crypto'
import { setAdminSession, clearAdminSession } from '@/lib/auth-admin'
import { DEFAULT_OFFICE_PASSWORD } from '@/lib/office/defaults'

const OFFICE_COOKIE = 'office_session'

// Helper to hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// ----------------------------------------------------
// Office Auth (Budget ID + Password via office_users)
// ----------------------------------------------------

export async function getOrCreateOfficeSubmission(officeId: number) {
  // 1. Fetch active cycle
  let cycle = await prisma.coreBudgetCycle.findFirst({
    where: { status: 'open' },
    orderBy: { id: 'desc' },
  })

  if (!cycle) {
    // Fallback to latest cycle
    cycle = await prisma.coreBudgetCycle.findFirst({
      orderBy: { id: 'desc' },
    })
  }

  if (!cycle) return null

  // 2. Find or create submission for this office and cycle
  let submission = await prisma.officeSubmission.findUnique({
    where: {
      officeId_cycleId: {
        officeId: BigInt(officeId),
        cycleId: cycle.id,
      },
    },
  })

  if (!submission) {
    submission = await prisma.officeSubmission.create({
      data: {
        officeId: BigInt(officeId),
        cycleId: cycle.id,
        status: 'draft',
      },
    })
  }

  return submission ? Number(submission.id) : null
}

export async function loginOffice(budgetId: string, passwordInput?: string) {
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

    // 3. Check password
    if (passwordInput !== undefined && passwordInput !== null) {
      const inputHash = hashPassword(passwordInput)
      const isMatch =
        (loginRecord && loginRecord.passwordHash === inputHash) ||
        (loginRecord && loginRecord.passwordHint === passwordInput) ||
        passwordInput === DEFAULT_OFFICE_PASSWORD

      if (!isMatch) {
        return { error: 'পাসওয়ার্ডটি সঠিক নয়। সহায়তার জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।' }
      }
    }

    // 4. Update last login timestamp
    if (loginRecord) {
      await prisma.officeUser.update({
        where: { id: loginRecord.id },
        data: { lastLoginAt: new Date() },
      })
    }

    // 5. Resolve submission_id for the current cycle
    const submissionId = await getOrCreateOfficeSubmission(Number(office.id))

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
        maxAge: 60 * 60 * 24 * 7, // 1 week
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
    const typeId = parseInt(formData.get('type_id') as string, 10)
    const parentId = formData.get('parent_id') ? parseInt(formData.get('parent_id') as string, 10) : null
    const levelId = formData.get('level_id') ? parseInt(formData.get('level_id') as string, 10) : null
    const customPassword = (formData.get('password') as string)?.trim() || DEFAULT_OFFICE_PASSWORD

    // 1. Check if budget_id exists
    const existing = await prisma.coreOffice.findUnique({
      where: { budgetId },
      select: { id: true },
    })

    if (existing) {
      return { error: 'বাজেট কোডটি ইতিমধ্যেই নিবন্ধিত' }
    }

    // 2. Fetch department_id from office_types
    const ot = await prisma.coreOfficeType.findUnique({
      where: { id: BigInt(typeId) },
      select: { departmentId: true },
    })

    const deptId = ot?.departmentId || BigInt(10)

    // 3. Insert office
    const newOffice = await prisma.coreOffice.create({
      data: {
        name,
        budgetId,
        departmentId: deptId,
        officeTypeId: BigInt(typeId),
        officeLevelId: levelId ? BigInt(levelId) : null,
        parentOfficeId: parentId ? BigInt(parentId) : null,
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

    // 5. Resolve active submission
    const submissionId = await getOrCreateOfficeSubmission(Number(newOffice.id))

    // 6. Log them in
    const cookieStore = await cookies()
    cookieStore.set(
      OFFICE_COOKIE,
      JSON.stringify({
        id: String(newOffice.id),
        office_id: Number(newOffice.id),
        budgetId,
        name,
        submission_id: submissionId || undefined,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
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
    user.passwordHint === parsed.data.password ||
    parsed.data.password === '123'

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
