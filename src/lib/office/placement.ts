import { prisma } from '@/lib/db/client'

/**
 * Placement rules for an office row.
 *
 * Every writer that creates or moves an office — the admin head-office and field-office forms,
 * the office's own self-service profile, and public registration — funnels through
 * `assertOfficePlacement` before it touches the table. The database backs the same rules up with
 * CHECK constraints and a trigger (see migration `office_hierarchy_constraints`), so a write that
 * bypasses this module still cannot corrupt the hierarchy.
 *
 * The chain being defended is:
 *
 *   মন্ত্রণালয় → দপ্তর/সংস্থা → অফিসের ধরণ → স্তর → অফিস (হেড → মাঠ পর্যায়)
 *
 * An office's department is never taken from the client: it is the owning office type's
 * department, which is what keeps the two from drifting apart.
 */

/** Anything bigint-ish a caller may hold: a Prisma bigint, a route param, or a form field. */
type IdLike = bigint | number | string | null | undefined

function toId(value: IdLike): bigint | null {
  if (value === null || value === undefined || value === '') return null
  try {
    return BigInt(value)
  } catch {
    return null
  }
}

/** A value the caller supplied that is not parseable as an id — a malformed id, not an absent one. */
function isMalformedId(value: IdLike): boolean {
  return value !== null && value !== undefined && value !== '' && toId(value) === null
}

/**
 * The tier a head office of this type sits on: the type's lowest-ordered level.
 * Null only for an office type that has no levels configured yet.
 */
export async function resolveTopLevelId(officeTypeId: bigint): Promise<bigint | null> {
  const level = await prisma.coreOfficeLevel.findFirst({
    where: { officeTypeId },
    orderBy: [{ levelOrder: 'asc' }, { id: 'asc' }],
    select: { id: true },
  })
  return level?.id ?? null
}

export type OfficePlacement =
  | {
      ok: true
      officeTypeId: bigint
      officeLevelId: bigint | null
      officeLevelOrder: number | null
      /** Null makes the row a head office. */
      parentOfficeId: bigint | null
      /** The department the office must be filed under — always the office type's own. */
      departmentId: bigint
    }
  | { ok: false; error: string }

/**
 * Validates an office's position and returns the canonical ids to write.
 *
 * A level must belong to the office type it is being used with, and a parent must be a head
 * office of that same type and department. Because a parent is always a head office, a cyclic
 * chain cannot be built — but the row is still forbidden from parenting itself, since that would
 * slip through as a one-node cycle.
 */
export async function assertOfficePlacement(input: {
  officeTypeId: IdLike
  officeLevelId?: IdLike
  parentOfficeId?: IdLike
  /** The row being written, so it can never become its own ancestor. */
  excludeOfficeId?: IdLike
}): Promise<OfficePlacement> {
  // A supplied value that does not parse is a malformed request, not an omitted field. Treating
  // it as null would silently drop the level or the parent, so it is refused outright.
  if (isMalformedId(input.officeTypeId)) return { ok: false, error: 'অফিসের ধরণ সঠিক নয়' }
  if (isMalformedId(input.officeLevelId)) return { ok: false, error: 'নির্বাচিত স্তরটি সঠিক নয়' }
  if (isMalformedId(input.parentOfficeId)) return { ok: false, error: 'নির্বাচিত হেড অফিসটি সঠিক নয়' }

  const officeTypeId = toId(input.officeTypeId)
  if (officeTypeId === null) return { ok: false, error: 'অফিসের ধরণ নির্বাচন আবশ্যক' }

  const officeType = await prisma.coreOfficeType.findUnique({
    where: { id: officeTypeId },
    select: { departmentId: true },
  })
  if (!officeType) return { ok: false, error: 'অফিসের ধরণ পাওয়া যায়নি' }
  const departmentId = officeType.departmentId

  const officeLevelId = toId(input.officeLevelId)
  let officeLevelOrder: number | null = null
  if (officeLevelId !== null) {
    const level = await prisma.coreOfficeLevel.findUnique({
      where: { id: officeLevelId },
      select: { officeTypeId: true, levelOrder: true },
    })
    if (!level) return { ok: false, error: 'নির্বাচিত স্তরটি পাওয়া যায়নি' }
    // A level owned by a ministry or a department is not a field-office tier, and a level of
    // another office type would hand this office the wrong set of economic codes.
    if (level.officeTypeId === null || level.officeTypeId !== officeTypeId) {
      return { ok: false, error: 'নির্বাচিত স্তরটি এই অফিসের ধরণের অন্তর্ভুক্ত নয়' }
    }
    officeLevelOrder = level.levelOrder
  }

  const parentOfficeId = toId(input.parentOfficeId)
  const excludeOfficeId = toId(input.excludeOfficeId)
  if (parentOfficeId !== null) {
    if (excludeOfficeId !== null && parentOfficeId === excludeOfficeId) {
      return { ok: false, error: 'একটি অফিস নিজেই নিজের হেড অফিস হতে পারে না' }
    }

    const parent = await prisma.coreOffice.findUnique({
      where: { id: parentOfficeId },
      select: {
        officeTypeId: true,
        departmentId: true,
        parentOfficeId: true,
        officeLevel: { select: { levelOrder: true } },
      },
    })
    if (!parent) return { ok: false, error: 'নির্বাচিত হেড অফিসটি পাওয়া যায়নি' }

    if (parent.parentOfficeId !== null) {
      return { ok: false, error: 'শুধুমাত্র হেড অফিসকে অভিভাবক হিসেবে নির্বাচন করা যায়' }
    }
    if (parent.officeTypeId !== officeTypeId) {
      return { ok: false, error: 'হেড অফিসটি অবশ্যই একই অফিসের ধরণের হতে হবে' }
    }
    if (parent.departmentId !== departmentId) {
      return { ok: false, error: 'হেড অফিসটি অবশ্যই একই দপ্তর/সংস্থার হতে হবে' }
    }

    const parentOrder = parent.officeLevel?.levelOrder ?? null
    if (officeLevelOrder !== null && parentOrder !== null && officeLevelOrder < parentOrder) {
      return { ok: false, error: 'নির্বাচিত স্তরটি হেড অফিসের স্তরের অধীনস্থ হতে হবে' }
    }
  }

  return {
    ok: true,
    officeTypeId,
    officeLevelId,
    officeLevelOrder,
    parentOfficeId,
    departmentId,
  }
}
