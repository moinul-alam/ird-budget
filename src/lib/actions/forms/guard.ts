import { prisma } from '@/lib/db/client'
import { getOfficeSession } from '@/lib/session'
import { getSubmissionDigitCap } from '@/lib/budget/sheet'
import {
  TAKA_PER_HAZAR,
  exceedsDigitCap,
  hazarCapCeiling,
  toHazar,
} from '@/lib/budget/hazar'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { strings } from '@/lib/strings'

/**
 * The submission the signed-in office owns, or null when there is no session.
 * Every form write below is scoped through this — the submission id arrives from the
 * client, so it can never be trusted on its own.
 */
export async function currentSubmissionId(): Promise<number | null> {
  const session = await getOfficeSession()
  return session?.submission_id ?? null
}

/** Shown when a caller names a submission or row its own office does not own. */
export const NOT_OWNED = { error: 'এই দাখিলে আপনার অফিসের প্রবেশাধিকার নেই।' }

/** Shown when a write targets a submission that has already been dakhil (submitted). */
const SUBMITTED_LOCKED = {
  error: 'বাজেট দাখিল সম্পন্ন হয়েছে — এই দাখিলে আর কোনো তথ্য পরিবর্তন করা যাবে না।',
}

/**
 * The ownership *and* editability check every form write starts with.
 *
 * Ownership alone was the old guard, which left the submitted lock enforced only in the
 * UI (the forms render `inert`) — a crafted request could still write to a submitted
 * submission. Here the status is part of the statement itself: the update matches only a
 * draft, so a submitted row rejects the write before any of the form data lands.
 *
 * The same statement stamps `last_data_write_at`, the "your inputs moved" signal — one
 * query for both, rather than a read for the guard and a second write for the stamp.
 */
export async function guardDraftWrite(submissionId: number): Promise<{ error: string } | null> {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  const touched = await prisma.officeSubmission.updateMany({
    where: { id: BigInt(submissionId), status: 'draft' },
    data: { lastDataWriteAt: new Date() },
  })

  return touched.count === 0 ? SUBMITTED_LOCKED : null
}

/**
 * The office level's digit cap, re-applied to the amounts a write is about to store.
 *
 * The amount field already refuses an over-cap entry, but the figure reaches the server
 * as a plain number, so the same limit is re-checked here — a crafted request cannot slip
 * a 1000× figure past the cap the office level allows. Amounts are in taka, the unit the
 * engine and the database use; the cap counts digits of the হাজার they stand for.
 */
export async function guardDigitCap(
  submissionId: number,
  amounts: Array<number | null | undefined>
): Promise<{ error: string } | null> {
  const cap = await getSubmissionDigitCap(submissionId)
  const over = amounts.some(
    (amount) => amount !== null && amount !== undefined && exceedsDigitCap(toHazar(amount), cap)
  )
  if (!over) return null

  const maxHazar = hazarCapCeiling(cap)
  return {
    error: strings.hazar.capExceeded(
      toBanglaNumber(cap),
      toBanglaNumber(maxHazar),
      toBanglaAmount(maxHazar * TAKA_PER_HAZAR)
    ),
  }
}
