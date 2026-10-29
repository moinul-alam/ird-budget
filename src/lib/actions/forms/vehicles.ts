'use server'

import { errorMessage } from '@/lib/errors'

import { prisma } from '@/lib/db/client'
import { currentSubmissionId, NOT_OWNED, guardDigitCap, guardDraftWrite } from './guard'

export async function saveFormVehicleRow(
  submissionId: number,
  data: {
    id?: number
    vehicle_fuel_config_id: number
    /** The fuel the office declares it buys — the config names only its category. */
    fuel_type_id: number
    count: number
    maintenance_cost?: number
    additional_expense: number
  }
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  const capGuard = await guardDigitCap(submissionId, [
    data.maintenance_cost,
    data.additional_expense,
  ])
  if (capGuard) return capGuard

  try {
    const payload = {
      vehicleConfigId: BigInt(data.vehicle_fuel_config_id),
      fuelTypeId: BigInt(data.fuel_type_id),
      vehicleCount: data.count,
      maintenanceDue: data.maintenance_cost || 0,
      additionalExpense: data.additional_expense || 0,
    }

    if (data.id) {
      // The row id comes from the client as well, so this update is scoped by the
      // submission too — naming another office's row must update nothing.
      const updated = await prisma.officeFormVehicleGovt.updateMany({
        where: { id: BigInt(data.id), submissionId: BigInt(submissionId) },
        data: payload,
      })
      if (updated.count === 0) return NOT_OWNED
      return { success: true, id: data.id }
    }

    // No id yet, but the row may already be stored: the modal saves on its own and
    // the form's Save then re-sends every row. Upserting on the natural key the
    // database enforces keeps that second pass from colliding with the first.
    const saved = await prisma.officeFormVehicleGovt.upsert({
      where: {
        submissionId_vehicleConfigId_fuelTypeId: {
          submissionId: BigInt(submissionId),
          vehicleConfigId: BigInt(data.vehicle_fuel_config_id),
          fuelTypeId: BigInt(data.fuel_type_id),
        },
      },
      update: payload,
      create: {
        submissionId: BigInt(submissionId),
        ...payload,
      },
    })
    return { success: true, id: Number(saved.id) }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function deleteFormVehicleRow(rowId: number) {
  const ownedId = await currentSubmissionId()
  if (ownedId === null) return NOT_OWNED
  // The row id alone does not carry a status, so the draft lock is checked through the
  // submission this session owns — the same guard every other write uses.
  const guard = await guardDraftWrite(ownedId)
  if (guard) return guard

  try {
    // Scoped by the submission rather than a bare id: the delete then cannot reach
    // another office's row, whichever id the client sends.
    await prisma.officeFormVehicleGovt.deleteMany({
      where: { id: BigInt(rowId), submissionId: BigInt(ownedId) },
    })
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function saveFormVehicleRentRow(
  submissionId: number,
  data: {
    id?: number
    vehicle_rent_config_id: number
    count: number
  }
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  try {
    if (data.id) {
      // Scoped by the submission as well: the row id comes from the client too.
      const updated = await prisma.officeFormVehicleRent.updateMany({
        where: { id: BigInt(data.id), submissionId: BigInt(submissionId) },
        data: {
          vehicleRentConfigId: BigInt(data.vehicle_rent_config_id),
          vehicleCount: data.count,
        },
      })
      if (updated.count === 0) return NOT_OWNED
      return { success: true, id: data.id }
    }

    // Same shape as saveFormVehicleRow: the modal saves on its own and the form's
    // Save re-sends every row, so an insert must tolerate the row already existing.
    const saved = await prisma.officeFormVehicleRent.upsert({
      where: {
        submissionId_vehicleRentConfigId: {
          submissionId: BigInt(submissionId),
          vehicleRentConfigId: BigInt(data.vehicle_rent_config_id),
        },
      },
      update: { vehicleCount: data.count },
      create: {
        submissionId: BigInt(submissionId),
        vehicleRentConfigId: BigInt(data.vehicle_rent_config_id),
        vehicleCount: data.count,
      },
    })
    return { success: true, id: Number(saved.id) }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function deleteFormVehicleRentRow(rowId: number) {
  const ownedId = await currentSubmissionId()
  if (ownedId === null) return NOT_OWNED
  const guard = await guardDraftWrite(ownedId)
  if (guard) return guard

  try {
    await prisma.officeFormVehicleRent.deleteMany({
      where: { id: BigInt(rowId), submissionId: BigInt(ownedId) },
    })
    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
