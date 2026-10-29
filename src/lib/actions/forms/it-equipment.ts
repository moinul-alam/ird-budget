'use server'

import { errorMessage } from '@/lib/errors'

import { updateTag } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { guardDigitCap, guardDraftWrite } from './guard'
import { ADMIN_DATA_TAG } from '@/lib/budget/fetcher'

/**
 * The `admin_it_config` row for an office type's equipment, created on first use.
 * Form 10 keys its rows by that id, but the administrator manages equipment
 * prices on the equipment type itself, so the row is a thin per-office-type link
 * that is gap-filled the moment an office saves anything against it.
 */
async function resolveItConfigId(submissionId: number, equipmentTypeId: number) {
  const submission = await prisma.officeSubmission.findUnique({
    where: { id: BigInt(submissionId) },
    select: { office: { select: { officeTypeId: true } } },
  })
  if (!submission) return null

  // Equipment config is keyed by office type. Ministry/department offices have no office type,
  // so they have no Form 10 equipment to record against.
  const officeTypeId = submission.office.officeTypeId
  if (officeTypeId === null) return null

  const config = await prisma.adminItConfig.upsert({
    where: {
      officeTypeId_equipmentTypeId: {
        officeTypeId,
        equipmentTypeId: BigInt(equipmentTypeId),
      },
    },
    update: {},
    create: {
      officeTypeId,
      equipmentTypeId: BigInt(equipmentTypeId),
    },
  })
  // The upsert may have just added a row the cached reference set does not know
  // about, and the budget sheet resolves this row's price through it — so the
  // cache has to be dropped here, not only from the /admin screens.
  updateTag(ADMIN_DATA_TAG)
  return config.id
}

export async function saveFormITEquipmentRow(
  submissionId: number,
  equipmentTypeId: number,
  data: {
    existing_count: number
    damaged_count: number
    toner_cost: number
    required_qty: number
  }
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  const capGuard = await guardDigitCap(submissionId, [data.toner_cost])
  if (capGuard) return capGuard

  try {
    const itConfigId = await resolveItConfigId(submissionId, equipmentTypeId)
    if (!itConfigId) return { error: 'অফিসের তথ্য পাওয়া যায়নি' }

    await prisma.officeFormItEquipment.upsert({
      where: {
        submissionId_itConfigId: {
          submissionId: BigInt(submissionId),
          itConfigId,
        },
      },
      update: {
        existingCount: data.existing_count,
        damagedCount: data.damaged_count,
        newDemandCount: data.required_qty,
        tonerCostMonthly: data.toner_cost,
      },
      create: {
        submissionId: BigInt(submissionId),
        itConfigId,
        existingCount: data.existing_count,
        damagedCount: data.damaged_count,
        newDemandCount: data.required_qty,
        tonerCostMonthly: data.toner_cost,
      },
    })

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function deleteFormITEquipmentRow(
  submissionId: number,
  equipmentTypeId: number
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    // Deleting must not bring a config row into existence, so the lookup is a
    // plain read here rather than the save path's gap-filling upsert.
    const submission = await prisma.officeSubmission.findUnique({
      where: { id: BigInt(submissionId) },
      select: { office: { select: { officeTypeId: true } } },
    })
    if (!submission) return { error: 'অফিসের তথ্য পাওয়া যায়নি' }

    // Ministry/department offices have no office type, so no equipment config exists to delete.
    const officeTypeId = submission.office.officeTypeId
    if (officeTypeId === null) return { success: true }

    const config = await prisma.adminItConfig.findUnique({
      where: {
        officeTypeId_equipmentTypeId: {
          officeTypeId,
          equipmentTypeId: BigInt(equipmentTypeId),
        },
      },
      select: { id: true },
    })
    if (!config) return { success: true }

    await prisma.officeFormItEquipment.deleteMany({
      where: {
        submissionId: BigInt(submissionId),
        itConfigId: config.id,
      },
    })
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
