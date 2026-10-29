'use server'

import { errorMessage } from '@/lib/errors'

import { prisma } from '@/lib/db/client'
import { guardDigitCap, guardDraftWrite } from './guard'

export async function saveFormLeave(
  submissionId: number,
  data: {
    leave_encashment_officer_basic: number
    leave_encashment_officer_due: number
    leave_encashment_staff_basic: number
    leave_encashment_staff_due: number
    rest_recreation_amount: number
    rest_recreation_due: number
  }
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  const capGuard = await guardDigitCap(submissionId, [
    data.leave_encashment_officer_basic,
    data.leave_encashment_officer_due,
    data.leave_encashment_staff_basic,
    data.leave_encashment_staff_due,
    data.rest_recreation_amount,
    data.rest_recreation_due,
  ])
  if (capGuard) return capGuard

  try {
    await prisma.officeFormLeaveEncashment.upsert({
      where: { submissionId: BigInt(submissionId) },
      update: {
        leaveEncashmentOfficerBasic: data.leave_encashment_officer_basic,
        leaveEncashmentOfficerDue: data.leave_encashment_officer_due,
        leaveEncashmentStaffBasic: data.leave_encashment_staff_basic,
        leaveEncashmentStaffDue: data.leave_encashment_staff_due,
        restRecreationAmount: data.rest_recreation_amount,
        restRecreationDue: data.rest_recreation_due,
      },
      create: {
        submissionId: BigInt(submissionId),
        leaveEncashmentOfficerBasic: data.leave_encashment_officer_basic,
        leaveEncashmentOfficerDue: data.leave_encashment_officer_due,
        leaveEncashmentStaffBasic: data.leave_encashment_staff_basic,
        leaveEncashmentStaffDue: data.leave_encashment_staff_due,
        restRecreationAmount: data.rest_recreation_amount,
        restRecreationDue: data.rest_recreation_due,
      },
    })

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export async function saveFormRestRecreation(
  submissionId: number,
  data: {
    rest_recreation_amount: number
    rest_recreation_due: number
  }
) {
  const guard = await guardDraftWrite(submissionId)
  if (guard) return guard

  const capGuard = await guardDigitCap(submissionId, [
    data.rest_recreation_amount,
    data.rest_recreation_due,
  ])
  if (capGuard) return capGuard

  try {
    const existing = await prisma.officeFormLeaveEncashment.findUnique({
      where: { submissionId: BigInt(submissionId) },
    })

    if (existing) {
      await prisma.officeFormLeaveEncashment.update({
        where: { submissionId: BigInt(submissionId) },
        data: {
          restRecreationAmount: data.rest_recreation_amount,
          restRecreationDue: data.rest_recreation_due,
        },
      })
    } else {
      await prisma.officeFormLeaveEncashment.create({
        data: {
          submissionId: BigInt(submissionId),
          leaveEncashmentOfficerBasic: 0,
          leaveEncashmentOfficerDue: 0,
          leaveEncashmentStaffBasic: 0,
          leaveEncashmentStaffDue: 0,
          restRecreationAmount: data.rest_recreation_amount,
          restRecreationDue: data.rest_recreation_due,
        },
      })
    }

    return { success: true }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
