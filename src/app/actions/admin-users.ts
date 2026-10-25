'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { DEFAULT_ADMIN_PASSWORD } from '@/lib/admin/defaults'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export interface AdminUserItem {
  id: number
  username: string
  role: 'admin' | 'superadmin'
  active: boolean
  created_at: string
  assignedOfficeTypeIds: number[]
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function getAdminUsersList(): Promise<AdminUserItem[]> {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    throw new Error('অননুমোদিত প্রবেশাধিকার')
  }

  const users = await prisma.adminUser.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: {
      id: 'asc',
    },
  })

  return users.map((u) => ({
    id: Number(u.id),
    username: u.username,
    role: u.role as 'admin' | 'superadmin',
    active: u.isActive,
    created_at: u.createdAt.toISOString(),
    assignedOfficeTypeIds: [],
  }))
}

export async function createAdminUser(
  username: string,
  role: 'admin' | 'superadmin',
  password?: string
) {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    return { error: 'শুধুমাত্র সুপারঅ্যাডমিন নতুন অ্যাডমিন তৈরি করতে পারবেন।' }
  }

  const cleanUser = username.trim()
  if (!cleanUser) {
    return { error: 'অনুগ্রহ করে একটি সঠিক ইউজারনেম দিন।' }
  }

  const cleanPwd = (password || DEFAULT_ADMIN_PASSWORD).trim()
  const pwdHash = hashPassword(cleanPwd)

  // Check duplicate username
  const existing = await prisma.adminUser.findFirst({
    where: {
      username: {
        equals: cleanUser,
        mode: 'insensitive',
      },
    },
  })

  if (existing) {
    return { error: 'এই ইউজারনেমটি ইতিমধ্যেই ব্যবহার করা হয়েছে।' }
  }

  try {
    await prisma.adminUser.create({
      data: {
        username: cleanUser,
        passwordHash: pwdHash,
        role,
        isActive: true,
      },
    })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    return { error: 'সংরক্ষণ ব্যর্থ হয়েছে: ' + error.message }
  }
}

export async function updateAdminUserRole(
  adminId: number,
  newRole: 'admin' | 'superadmin',
  active: boolean,
  newPassword?: string
) {
  const session = await getAdminSession()
  if (!session || session.role !== 'superadmin') {
    return { error: 'শুধুমাত্র সুপারঅ্যাডমিন ইউজার রোল পরিবর্তন করতে পারবেন।' }
  }

  const updatePayload: any = {
    role: newRole,
    isActive: active,
  }

  if (newPassword && newPassword.trim()) {
    updatePayload.passwordHash = hashPassword(newPassword.trim())
  }

  try {
    await prisma.adminUser.update({
      where: { id: BigInt(adminId) },
      data: updatePayload,
    })

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    return { error: 'আপডেট ব্যর্থ হয়েছে: ' + error.message }
  }
}
