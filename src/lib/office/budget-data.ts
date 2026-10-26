import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/client'

/**
 * Guard for deleting an office (ministry, department, head office, or field office).
 *
 * Budget data outlives the configuration row it belongs to, so an office that has started a
 * draft or sent a submission must never be removed — the admin has to edit or copy it instead.
 * Returns the message to show the admin, or null when the office holds no budget data.
 *
 * @param entityLabel Locative form used in the message, e.g. 'হেড অফিসে'.
 */
export async function budgetDataBlockMessage(
  officeWhere: Prisma.CoreOfficeWhereInput,
  entityLabel: string,
): Promise<string | null> {
  const office = await prisma.coreOffice.findFirst({ where: officeWhere, select: { id: true } })
  if (!office) return null

  const submissions = await prisma.officeSubmission.findMany({
    where: { officeId: office.id },
    select: { status: true },
  })
  if (submissions.length === 0) return null

  const state = submissions.some((s) => s.status === 'submitted') ? 'দাখিলকৃত বাজেট ডেটা' : 'খসড়া বাজেট ডেটা'
  return `এই ${entityLabel} ${state} রয়েছে, তাই এটি মুছে ফেলা যাবে না। চাইলে সম্পাদনা করুন অথবা কপি করুন।`
}
