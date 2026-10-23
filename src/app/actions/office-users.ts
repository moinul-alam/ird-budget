'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export interface OfficeUserItem {
  id: number
  budgetId: string
  name: string
  officeType: string
  parentOffice: string
  hasCustomPassword: boolean
  currentPasswordHint: string
  created_at: string
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function getAllOfficeUsersList(): Promise<{ offices: OfficeUserItem[]; defaultPassword: string }> {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    throw new Error('অননুমোদিত প্রবেশাধিকার')
  }

  const offices = await prisma.coreOffice.findMany({
    select: {
      id: true,
      budgetId: true,
      name: true,
      createdAt: true,
      officeType: {
        select: {
          name: true,
        },
      },
      parentOffice: {
        select: {
          name: true,
        },
      },
      officeUsers: {
        select: {
          passwordHint: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  })

  if (!offices || offices.length === 0) {
    return { offices: [], defaultPassword: '12345' }
  }

  const defaultPassword = '12345'

  const list: OfficeUserItem[] = offices.map((o) => {
    const hint = o.officeUsers?.[0]?.passwordHint || defaultPassword
    const hasCustomPassword = hint !== defaultPassword

    return {
      id: Number(o.id),
      budgetId: o.budgetId,
      name: o.name,
      officeType: o.officeType?.name || 'N/A',
      parentOffice: o.parentOffice?.name || '—',
      hasCustomPassword,
      currentPasswordHint: hint,
      created_at: o.createdAt.toISOString(),
    }
  })

  return { offices: list, defaultPassword }
}

export async function updateOfficePassword(
  officeId: number,
  newPassword: string
) {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    return { error: 'শুধুমাত্র সুপারঅ্যাডমিন অফিসের পাসওয়ার্ড পরিবর্তন করতে পারেন।' }
  }

  const cleanPwd = newPassword.trim()
  if (!cleanPwd) {
    return { error: 'অনুগ্রহ করে একটি পাসওয়ার্ড লিখুন।' }
  }

  const pwdHash = hashPassword(cleanPwd)

  try {
    await prisma.officeUser.upsert({
      where: { officeId: BigInt(officeId) },
      update: {
        passwordHash: pwdHash,
      },
      create: {
        officeId: BigInt(officeId),
        passwordHash: pwdHash,
      },
    })

    revalidatePath('/admin/offices-users')
    return { success: true }
  } catch (error: any) {
    return { error: 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে: ' + error.message }
  }
}

export async function resetOfficePassword(officeId: number) {
  return updateOfficePassword(officeId, '12345')
}

export async function resetAllOfficesPassword(targetPassword = '12345') {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    return { error: 'অননুমোদিত প্রবেশাধিকার' }
  }

  const cleanPwd = targetPassword.trim() || '12345'
  const pwdHash = hashPassword(cleanPwd)

  try {
    await prisma.officeUser.updateMany({
      data: {
        passwordHash: pwdHash,
        passwordHint: cleanPwd,
      },
    })

    revalidatePath('/admin/offices-users')
    return { success: true }
  } catch (error: any) {
    return { error: 'সকল পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে: ' + error.message }
  }
}
