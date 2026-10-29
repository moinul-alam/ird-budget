'use server'

import { errorMessage } from '@/lib/errors'

import { prisma } from '@/lib/db/client'
import { guardDigitCap, guardDraftWrite } from './guard'
import { loadSalaryMonths } from '@/lib/office/load-form-data'

export async function saveFormHouseRent(
  submissionId: number,
  data: {
    monthly_bill: number
    due: number
    contract_start_date: string | null
    contract_end_date: string | null
  }
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  const capGuard = await guardDigitCap(submissionId, [data.monthly_bill, data.due])
  if (capGuard) return capGuard

  try {
    const contractStartDate = data.contract_start_date
      ? new Date(data.contract_start_date)
      : null
    const contractEndDate = data.contract_end_date
      ? new Date(data.contract_end_date)
      : null

    // The stored mirror follows the engine's `office_rent` formula, which annualises the
    // monthly rent with the cycle's বেতন-মাস rather than an assumed twelve.
    const salaryMonths = await loadSalaryMonths()

    await prisma.officeFormHouseRent.upsert({
      where: { submissionId: BigInt(submissionId) },
      update: {
        monthlyRent: data.monthly_bill,
        arrearsDue: data.due,
        annualTotal: (data.monthly_bill * salaryMonths) + data.due,
        contractStartDate,
        contractEndDate,
      },
      create: {
        submissionId: BigInt(submissionId),
        monthlyRent: data.monthly_bill,
        arrearsDue: data.due,
        annualTotal: (data.monthly_bill * salaryMonths) + data.due,
        contractStartDate,
        contractEndDate,
      },
    })

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function deleteFormHouseRent(submissionId: number) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    await prisma.officeFormHouseRent.delete({
      where: { submissionId: BigInt(submissionId) },
    })
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
