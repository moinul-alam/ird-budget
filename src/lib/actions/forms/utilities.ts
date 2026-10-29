'use server'

import { errorMessage } from '@/lib/errors'

import { prisma } from '@/lib/db/client'
import { guardDigitCap, guardDraftWrite } from './guard'

export async function saveFormUtilityRow(
  submissionId: number,
  utilityTypeId: number,
  data: { annual_cost: number; due: number }
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  const capGuard = await guardDigitCap(submissionId, [data.annual_cost, data.due])
  if (capGuard) return capGuard

  try {
    await prisma.officeFormUtility.upsert({
      where: {
        submissionId_utilityTypeId: {
          submissionId: BigInt(submissionId),
          utilityTypeId: BigInt(utilityTypeId),
        },
      },
      update: {
        annualBill: data.annual_cost,
        arrearsDue: data.due,
      },
      create: {
        submissionId: BigInt(submissionId),
        utilityTypeId: BigInt(utilityTypeId),
        annualBill: data.annual_cost,
        arrearsDue: data.due,
      },
    })

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function deleteFormUtilityRow(
  submissionId: number,
  utilityTypeId: number
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    await prisma.officeFormUtility.deleteMany({
      where: {
        submissionId: BigInt(submissionId),
        utilityTypeId: BigInt(utilityTypeId),
      },
    })
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
