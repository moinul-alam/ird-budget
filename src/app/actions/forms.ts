'use server'

import { updateTag } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { formBasicSchema } from '@/lib/schemas/forms'
import { ADMIN_DATA_TAG } from '@/lib/budget/fetcher'
import { getOfficeSession } from '@/lib/session'

/**
 * The submission the signed-in office owns, or null when there is no session.
 * Every form write below is scoped through this — the submission id arrives from the
 * client, so it can never be trusted on its own.
 */
async function currentSubmissionId(): Promise<number | null> {
  const session = await getOfficeSession()
  return session?.submission_id ?? null
}

/** Shown when a caller names a submission or row its own office does not own. */
const NOT_OWNED = { error: 'এই দাখিলে আপনার অফিসের প্রবেশাধিকার নেই।' }

export async function saveFormBasic(submissionId: number, formData: FormData) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  const parsed = formBasicSchema.safeParse({
    head_of_office: formData.get('head_of_office'),
    designation: formData.get('designation'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    address: formData.get('address'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const payload = {
    headOfOffice: parsed.data.head_of_office,
    designation: parsed.data.designation,
    phone: parsed.data.phone,
    email: parsed.data.email,
    address: parsed.data.address,
  }

  try {
    await prisma.officeFormBasic.upsert({
      where: { submissionId: BigInt(submissionId) },
      update: payload,
      create: {
        submissionId: BigInt(submissionId),
        ...payload,
      },
    })

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function saveFormStaffActiveRows(
  submissionId: number,
  rows: Array<{
    grade_id: number
    count: number
    total_basic: number
    due_salary: number
  }>
) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    for (const row of rows) {
      await prisma.officeFormStaffWorking.upsert({
        where: {
          submissionId_gradeId: {
            submissionId: BigInt(submissionId),
            gradeId: row.grade_id,
          },
        },
        update: {
          staffCount: row.count,
          monthlyBasic: row.total_basic,
          dueSalary: row.due_salary,
        },
        create: {
          submissionId: BigInt(submissionId),
          gradeId: row.grade_id,
          staffCount: row.count,
          monthlyBasic: row.total_basic,
          dueSalary: row.due_salary,
        },
      })
    }

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function saveFormStaffSuspendedRows(
  submissionId: number,
  rows: Array<{
    grade_id: number
    suspended_count: number
    suspended_total_basic: number
    suspended_due_salary: number
  }>
) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    for (const row of rows) {
      await prisma.officeFormStaffSuspended.upsert({
        where: {
          submissionId_gradeId: {
            submissionId: BigInt(submissionId),
            gradeId: row.grade_id,
          },
        },
        update: {
          suspendedCount: row.suspended_count,
          suspendedMonthlyBasic: row.suspended_total_basic,
          suspendedDueSalary: row.suspended_due_salary,
        },
        create: {
          submissionId: BigInt(submissionId),
          gradeId: row.grade_id,
          suspendedCount: row.suspended_count,
          suspendedMonthlyBasic: row.suspended_total_basic,
          suspendedDueSalary: row.suspended_due_salary,
        },
      })
    }

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFormStaffActiveRow(submissionId: number, gradeId: number) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    await prisma.officeFormStaffWorking.delete({
      where: {
        submissionId_gradeId: {
          submissionId: BigInt(submissionId),
          gradeId: gradeId,
        },
      },
    })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFormStaffSuspendedRow(submissionId: number, gradeId: number) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    await prisma.officeFormStaffSuspended.delete({
      where: {
        submissionId_gradeId: {
          submissionId: BigInt(submissionId),
          gradeId: gradeId,
        },
      },
    })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function saveFormStaffRow(
  submissionId: number,
  gradeId: number,
  data: {
    count: number
    total_basic: number
    due_salary: number
    suspended_count: number
    suspended_total_basic: number
    suspended_due_salary: number
  }
) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    // Save active
    await prisma.officeFormStaffWorking.upsert({
      where: {
        submissionId_gradeId: {
          submissionId: BigInt(submissionId),
          gradeId: gradeId,
        },
      },
      update: {
        staffCount: data.count,
        monthlyBasic: data.total_basic,
        dueSalary: data.due_salary,
      },
      create: {
        submissionId: BigInt(submissionId),
        gradeId: gradeId,
        staffCount: data.count,
        monthlyBasic: data.total_basic,
        dueSalary: data.due_salary,
      },
    })

    // Save suspended
    await prisma.officeFormStaffSuspended.upsert({
      where: {
        submissionId_gradeId: {
          submissionId: BigInt(submissionId),
          gradeId: gradeId,
        },
      },
      update: {
        suspendedCount: data.suspended_count,
        suspendedMonthlyBasic: data.suspended_total_basic,
        suspendedDueSalary: data.suspended_due_salary,
      },
      create: {
        submissionId: BigInt(submissionId),
        gradeId: gradeId,
        suspendedCount: data.suspended_count,
        suspendedMonthlyBasic: data.suspended_total_basic,
        suspendedDueSalary: data.suspended_due_salary,
      },
    })

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

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
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

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
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function saveFormRestRecreation(
  submissionId: number,
  data: {
    rest_recreation_amount: number
    rest_recreation_due: number
  }
) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

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
  } catch (error: any) {
    return { error: error.message }
  }
}

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
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

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
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function saveFormUtilityRow(
  submissionId: number,
  utilityTypeId: number,
  data: { annual_cost: number; due: number }
) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

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
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFormUtilityRow(
  submissionId: number,
  utilityTypeId: number
) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    await prisma.officeFormUtility.deleteMany({
      where: {
        submissionId: BigInt(submissionId),
        utilityTypeId: BigInt(utilityTypeId),
      },
    })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function saveFormHouseRent(
  submissionId: number,
  data: {
    monthly_bill: number
    due: number
    contract_start_date: string | null
    contract_end_date: string | null
  }
) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    // The rate row is only kept as the FK target of `vat_rate_id`; the VAT
    // percentage itself is read from /admin/settings (see loadVatPercentage).
    const vatRate = await prisma.adminRate.findFirst({
      where: { key: 'vat_percentage' },
    })

    const contractStartDate = data.contract_start_date
      ? new Date(data.contract_start_date)
      : null
    const contractEndDate = data.contract_end_date
      ? new Date(data.contract_end_date)
      : null

    await prisma.officeFormHouseRent.upsert({
      where: { submissionId: BigInt(submissionId) },
      update: {
        monthlyRent: data.monthly_bill,
        arrearsDue: data.due,
        vatRateId: vatRate?.id,
        annualTotal: (data.monthly_bill * 12) + data.due,
        contractStartDate,
        contractEndDate,
      },
      create: {
        submissionId: BigInt(submissionId),
        monthlyRent: data.monthly_bill,
        arrearsDue: data.due,
        vatRateId: vatRate?.id,
        annualTotal: (data.monthly_bill * 12) + data.due,
        contractStartDate,
        contractEndDate,
      },
    })

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function saveFormReturnInfo(
  submissionId: number,
  data: { tin_count: number; return_submitted_count: number }
) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    // Same precedence as the budget engine: the /admin/settings card wins and the
    // legacy admin_rates row is only a fallback. The stored mirror matches code
    // 3211119, which reads both the per-notice cost and the notices per non-filer
    // from the ডাক card.
    const tile = await prisma.adminSalaryConfig.findUnique({
      where: { key: 'postal_rate' },
      select: { value: true, secondaryValue: true },
    })
    const legacyRate = await prisma.adminRate.findFirst({
      where: { key: 'postal_expense_rate' },
    })

    // No compiled-in rate either: whatever the tables do not supply reads as 0.
    const rate = tile ? Number(tile.value) : legacyRate ? Number(legacyRate.value) : 0
    const notices = Number(tile?.secondaryValue) || 0
    const nonFilerCount = Math.max(0, data.tin_count - data.return_submitted_count)
    const totalPostalDemand = nonFilerCount * notices * rate

    await prisma.officeFormReturnInfo.upsert({
      where: { submissionId: BigInt(submissionId) },
      update: {
        tinCount: data.tin_count,
        returnSubmittedCount: data.return_submitted_count,
        postalRateId: legacyRate?.id,
        totalPostalDemand,
      },
      create: {
        submissionId: BigInt(submissionId),
        tinCount: data.tin_count,
        returnSubmittedCount: data.return_submitted_count,
        postalRateId: legacyRate?.id,
        totalPostalDemand,
      },
    })

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFormHouseRent(submissionId: number) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    await prisma.officeFormHouseRent.delete({
      where: { submissionId: BigInt(submissionId) },
    })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFormReturnInfo(submissionId: number) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    await prisma.officeFormReturnInfo.delete({
      where: { submissionId: BigInt(submissionId) },
    })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

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
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

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
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFormVehicleRow(rowId: number) {
  const ownedId = await currentSubmissionId()
  if (ownedId === null) return NOT_OWNED

  try {
    // Scoped by the submission rather than a bare id: the delete then cannot reach
    // another office's row, whichever id the client sends.
    await prisma.officeFormVehicleGovt.deleteMany({
      where: { id: BigInt(rowId), submissionId: BigInt(ownedId) },
    })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
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
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

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
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFormVehicleRentRow(rowId: number) {
  const ownedId = await currentSubmissionId()
  if (ownedId === null) return NOT_OWNED

  try {
    await prisma.officeFormVehicleRent.deleteMany({
      where: { id: BigInt(rowId), submissionId: BigInt(ownedId) },
    })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

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
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

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
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFormITEquipmentRow(
  submissionId: number,
  equipmentTypeId: number
) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

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
  } catch (error: any) {
    return { error: error.message }
  }
}

export interface NewStaffRecord {
  grade_id: number
  count: number
  monthly_basic: number
  expected_date: string
  remaining_months: number
  total_salary: number
}

export async function getFormNewStaffRows(submissionId: number): Promise<NewStaffRecord[]> {
  if (submissionId !== (await currentSubmissionId())) return []

  const records = await prisma.officeFormStaffNewRecruit.findMany({
    where: { submissionId: BigInt(submissionId) },
    orderBy: { gradeId: 'asc' },
  })

  return records.map((r) => ({
    grade_id: r.gradeId,
    count: r.recruitCount,
    monthly_basic: Number(r.monthlyBasic),
    expected_date: r.joiningDate?.toISOString().split('T')[0] || '',
    remaining_months: r.monthsRemaining,
    total_salary: Number(r.totalSalary),
  }))
}

export async function saveFormNewStaffRows(submissionId: number, rows: NewStaffRecord[]) {
  if (submissionId !== (await currentSubmissionId())) return NOT_OWNED

  try {
    // Clean existing rows
    await prisma.officeFormStaffNewRecruit.deleteMany({
      where: { submissionId: BigInt(submissionId) },
    })

    if (!rows || rows.length === 0) {
      return { success: true }
    }

    const inserts = rows.map((r) => ({
      submissionId: BigInt(submissionId),
      gradeId: r.grade_id,
      recruitCount: r.count,
      monthlyBasic: r.monthly_basic,
      joiningDate: r.expected_date ? new Date(r.expected_date) : new Date(),
      monthsRemaining: r.remaining_months,
      totalSalary: r.total_salary,
    }))

    await prisma.officeFormStaffNewRecruit.createMany({
      data: inserts,
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
