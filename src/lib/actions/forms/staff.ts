'use server'

import { errorMessage } from '@/lib/errors'

import { prisma } from '@/lib/db/client'
import { currentSubmissionId, guardDraftWrite } from './guard'

export async function saveFormStaffActiveRows(
  submissionId: number,
  rows: Array<{
    grade_id: number
    count: number
    total_basic: number
    due_salary: number
  }>
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    for (const row of rows) {
      await prisma.officeFormStaffWorking.upsert({
        where: {
          submissionId_gradeId: {
            submissionId: BigInt(submissionId),
            gradeId: row.grade_id,
          },
        },
        update: {
          staffCount: row.count,
          monthlyBasic: row.total_basic,
          dueSalary: row.due_salary,
        },
        create: {
          submissionId: BigInt(submissionId),
          gradeId: row.grade_id,
          staffCount: row.count,
          monthlyBasic: row.total_basic,
          dueSalary: row.due_salary,
        },
      })
    }

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function saveFormStaffSuspendedRows(
  submissionId: number,
  rows: Array<{
    grade_id: number
    suspended_count: number
    suspended_total_basic: number
    suspended_due_salary: number
  }>
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    for (const row of rows) {
      await prisma.officeFormStaffSuspended.upsert({
        where: {
          submissionId_gradeId: {
            submissionId: BigInt(submissionId),
            gradeId: row.grade_id,
          },
        },
        update: {
          suspendedCount: row.suspended_count,
          suspendedMonthlyBasic: row.suspended_total_basic,
          suspendedDueSalary: row.suspended_due_salary,
        },
        create: {
          submissionId: BigInt(submissionId),
          gradeId: row.grade_id,
          suspendedCount: row.suspended_count,
          suspendedMonthlyBasic: row.suspended_total_basic,
          suspendedDueSalary: row.suspended_due_salary,
        },
      })
    }

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function deleteFormStaffActiveRow(submissionId: number, gradeId: number) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    await prisma.officeFormStaffWorking.delete({
      where: {
        submissionId_gradeId: {
          submissionId: BigInt(submissionId),
          gradeId: gradeId,
        },
      },
    })
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function deleteFormStaffSuspendedRow(submissionId: number, gradeId: number) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    await prisma.officeFormStaffSuspended.delete({
      where: {
        submissionId_gradeId: {
          submissionId: BigInt(submissionId),
          gradeId: gradeId,
        },
      },
    })
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function saveFormStaffRow(
  submissionId: number,
  gradeId: number,
  data: {
    count: number
    total_basic: number
    due_salary: number
    suspended_count: number
    suspended_total_basic: number
    suspended_due_salary: number
  }
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    // Save active
    await prisma.officeFormStaffWorking.upsert({
      where: {
        submissionId_gradeId: {
          submissionId: BigInt(submissionId),
          gradeId: gradeId,
        },
      },
      update: {
        staffCount: data.count,
        monthlyBasic: data.total_basic,
        dueSalary: data.due_salary,
      },
      create: {
        submissionId: BigInt(submissionId),
        gradeId: gradeId,
        staffCount: data.count,
        monthlyBasic: data.total_basic,
        dueSalary: data.due_salary,
      },
    })

    // Save suspended
    await prisma.officeFormStaffSuspended.upsert({
      where: {
        submissionId_gradeId: {
          submissionId: BigInt(submissionId),
          gradeId: gradeId,
        },
      },
      update: {
        suspendedCount: data.suspended_count,
        suspendedMonthlyBasic: data.suspended_total_basic,
        suspendedDueSalary: data.suspended_due_salary,
      },
      create: {
        submissionId: BigInt(submissionId),
        gradeId: gradeId,
        suspendedCount: data.suspended_count,
        suspendedMonthlyBasic: data.suspended_total_basic,
        suspendedDueSalary: data.suspended_due_salary,
      },
    })

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export interface NewStaffRecord {
  grade_id: number
  count: number
  monthly_basic: number
  expected_date: string
  remaining_months: number
  total_salary: number
}

export async function getFormNewStaffRows(submissionId: number): Promise<NewStaffRecord[]> {
  if (submissionId !== (await currentSubmissionId())) return []

  const records = await prisma.officeFormStaffNewRecruit.findMany({
    where: { submissionId: BigInt(submissionId) },
    orderBy: { gradeId: 'asc' },
  })

  return records.map((r) => ({
    grade_id: r.gradeId,
    count: r.recruitCount,
    monthly_basic: Number(r.monthlyBasic),
    expected_date: r.joiningDate?.toISOString().split('T')[0] || '',
    remaining_months: r.monthsRemaining,
    total_salary: Number(r.totalSalary),
  }))
}

export async function saveFormNewStaffRows(submissionId: number, rows: NewStaffRecord[]) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    // Clean existing rows
    await prisma.officeFormStaffNewRecruit.deleteMany({
      where: { submissionId: BigInt(submissionId) },
    })

    if (!rows || rows.length === 0) {
      return { success: true }
    }

    const inserts = rows.map((r) => ({
      submissionId: BigInt(submissionId),
      gradeId: r.grade_id,
      recruitCount: r.count,
      monthlyBasic: r.monthly_basic,
      joiningDate: r.expected_date ? new Date(r.expected_date) : new Date(),
      monthsRemaining: r.remaining_months,
      totalSalary: r.total_salary,
    }))

    await prisma.officeFormStaffNewRecruit.createMany({
      data: inserts,
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}
