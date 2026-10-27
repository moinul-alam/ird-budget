'use server'

import { errorMessage } from '@/lib/errors'

import { prisma } from '@/lib/db/client'
import { guardDraftWrite } from './guard'

export async function saveFormReturnInfo(
  submissionId: number,
  data: { tin_count: number; return_submitted_count: number }
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    // The /admin/settings ডাক card is the sole source: its value is the per-notice cost
    // and its second field the notices served per non-filer. The stored mirror matches
    // code 3211119, which reads both numbers from that same card.
    const tile = await prisma.adminSalaryConfig.findUnique({
      where: { key: 'postal_rate' },
      select: { value: true, secondaryValue: true },
    })

    // No compiled-in rate either: whatever the table does not supply reads as 0.
    const rate = tile ? Number(tile.value) : 0
    const notices = Number(tile?.secondaryValue) || 0
    const nonFilerCount = Math.max(0, data.tin_count - data.return_submitted_count)
    const totalPostalDemand = nonFilerCount * notices * rate

    await prisma.officeFormReturnInfo.upsert({
      where: { submissionId: BigInt(submissionId) },
      update: {
        tinCount: data.tin_count,
        returnSubmittedCount: data.return_submitted_count,
        totalPostalDemand,
      },
      create: {
        submissionId: BigInt(submissionId),
        tinCount: data.tin_count,
        returnSubmittedCount: data.return_submitted_count,
        totalPostalDemand,
      },
    })

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function deleteFormReturnInfo(submissionId: number) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    await prisma.officeFormReturnInfo.delete({
      where: { submissionId: BigInt(submissionId) },
    })
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
