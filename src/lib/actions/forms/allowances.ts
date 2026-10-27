'use server'

import { errorMessage } from '@/lib/errors'

import { prisma } from '@/lib/db/client'
import { guardDraftWrite } from './guard'

export async function saveFormAllowanceRow(
  submissionId: number,
  allowanceTypeId: number,
  data: {
    count: number
    total_basic: number
    amount: number
    due: number
    date?: string
    applicable_category?: string | null
  }
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    const isZero =
      data.count === 0 && data.total_basic === 0 && data.amount === 0 && data.due === 0

    if (isZero) {
      await prisma.officeFormAllowance.deleteMany({
        where: {
          submissionId: BigInt(submissionId),
          allowanceTypeId: BigInt(allowanceTypeId),
        },
      })
      return { success: true }
    }

    // The single count input on the card is a headcount of whichever category
    // the allowance applies to, so it lands in the matching column.
    const isStaffOnly = data.applicable_category === 'staff'
    const officerCount = isStaffOnly ? 0 : data.count
    const staffCount = isStaffOnly ? data.count : 0
    const effectiveDate = data.date ? new Date(data.date) : null

    const payload = {
      officerCount,
      staffCount,
      totalBasic: data.total_basic,
      totalAnnualAmount: data.amount,
      dueAmount: data.due,
      effectiveDate,
    }

    await prisma.officeFormAllowance.upsert({
      where: {
        submissionId_allowanceTypeId: {
          submissionId: BigInt(submissionId),
          allowanceTypeId: BigInt(allowanceTypeId),
        },
      },
      update: payload,
      create: {
        submissionId: BigInt(submissionId),
        allowanceTypeId: BigInt(allowanceTypeId),
        ...payload,
      },
    })

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
