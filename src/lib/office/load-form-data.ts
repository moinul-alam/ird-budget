import { prisma } from '@/lib/db/client'
import { computeSubmissionSheet } from '@/lib/budget/sheet'

export async function getOfficeTypeIdForOffice(officeId: number): Promise<number | null> {
  const office = await prisma.coreOffice.findUnique({
    where: { id: BigInt(officeId) },
    select: { officeTypeId: true },
  })
  // Ministry/department offices carry a NULL office type, which must stay null rather than
  // collapse to 0 — a falsey 0 would be indistinguishable from a real (never-assigned) type.
  return office && office.officeTypeId !== null ? Number(office.officeTypeId) : null
}

export async function loadFormBasicInitial(submissionId: number) {
  const toInitial = (row: {
    headOfOffice: string
    designation: string | null
    phone: string | null
    email: string | null
    address: string | null
  }) => ({
    head_of_office: row.headOfOffice,
    designation: row.designation ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
  })

  const row = await prisma.officeFormBasic.findUnique({
    where: { submissionId: BigInt(submissionId) },
  })
  if (row) return toInitial(row)

  // Nothing saved in this cycle yet: fall back to the office's most recent
  // form so the office's details carry over from its previous submission.
  const submission = await prisma.officeSubmission.findUnique({
    where: { id: BigInt(submissionId) },
    select: { officeId: true },
  })
  if (!submission) return null

  const previous = await prisma.officeFormBasic.findFirst({
    where: { submission: { officeId: submission.officeId } },
    orderBy: { updatedAt: 'desc' },
  })
  return previous ? toInitial(previous) : null
}

export async function loadGrades() {
  const grades = await prisma.refGrade.findMany({
    orderBy: { gradeNo: 'asc' },
    include: { category: { select: { categoryName: true, categoryNameBn: true } } },
  })
  return grades.map((g) => ({
    id: g.id,
    grade_no: g.gradeNo,
    // The category comes from ref_employee_categories through the FK, so the
    // officer/staff split follows the table rather than a grade-number guess.
    category: g.category.categoryName,
    category_bn: g.category.categoryNameBn,
  }))
}

export async function loadFormStaffWorkingInitial(submissionId: number) {
  const rows = await prisma.officeFormStaffWorking.findMany({
    where: { submissionId: BigInt(submissionId) },
    orderBy: { gradeId: 'asc' },
  })
  return rows.map((r) => ({
    grade_id: r.gradeId,
    count: r.staffCount,
    total_basic: Number(r.monthlyBasic),
    due_salary: Number(r.dueSalary),
  }))
}

export async function loadFormStaffSuspendedInitial(submissionId: number) {
  const rows = await prisma.officeFormStaffSuspended.findMany({
    where: { submissionId: BigInt(submissionId) },
    orderBy: { gradeId: 'asc' },
  })
  return rows.map((r) => ({
    grade_id: r.gradeId,
    suspended_count: r.suspendedCount,
    suspended_total_basic: Number(r.suspendedMonthlyBasic),
    suspended_due_salary: Number(r.suspendedDueSalary),
  }))
}

export async function loadSubmissionFiscalYear(submissionId: number): Promise<string | null> {
  const sub = await prisma.officeSubmission.findUnique({
    where: { id: BigInt(submissionId) },
    include: { cycle: { select: { fiscalYear: { select: { year: true } } } } },
  })
  return sub?.cycle?.fiscalYear?.year ?? null
}

export async function loadAllowanceTypes() {
  const types = await prisma.refAllowanceType.findMany({ orderBy: { id: 'asc' } })
  return types.map((t) => ({
    id: Number(t.id),
    name: t.name,
    label_bn: t.labelBn ?? t.name,
    count_label_bn: t.countLabelBn ?? '',
    is_calculated: t.isCalculated,
    formula_key: t.formulaKey,
    applicable_category: t.applicableCategory,
    has_basic: t.hasBasic,
    has_amount: t.hasAmount,
    has_due: t.hasDue,
  }))
}

export async function loadFormAllowancesInitial(submissionId: number) {
  const rows = await prisma.officeFormAllowance.findMany({
    where: { submissionId: BigInt(submissionId) },
  })
  return rows.map((r) => ({
    allowance_type_id: Number(r.allowanceTypeId),
    count: r.officerCount || r.staffCount,
    total_basic: Number(r.totalBasic),
    amount: Number(r.totalAnnualAmount),
    due: Number(r.dueAmount),
    date: r.effectiveDate?.toISOString().split('T')[0] ?? '',
  }))
}

export async function loadFormRestRecreationInitial(submissionId: number) {
  const row = await prisma.officeFormLeaveEncashment.findUnique({
    where: { submissionId: BigInt(submissionId) },
    select: { restRecreationAmount: true, restRecreationDue: true },
  })
  if (!row) return null
  return {
    rest_recreation_amount: Number(row.restRecreationAmount),
    rest_recreation_due: Number(row.restRecreationDue),
  }
}

export async function loadFormLeaveEncashmentInitial(submissionId: number) {
  const row = await prisma.officeFormLeaveEncashment.findUnique({
    where: { submissionId: BigInt(submissionId) },
  })
  if (!row) return null
  return {
    leave_encashment_officer_basic: Number(row.leaveEncashmentOfficerBasic),
    leave_encashment_officer_due: Number(row.leaveEncashmentOfficerDue),
    leave_encashment_staff_basic: Number(row.leaveEncashmentStaffBasic),
    leave_encashment_staff_due: Number(row.leaveEncashmentStaffDue),
    rest_recreation_amount: Number(row.restRecreationAmount),
    rest_recreation_due: Number(row.restRecreationDue),
  }
}

export async function loadVehicleFuelConfigsForOfficeType(officeTypeId: number) {
  // Rows with a NULL office type are the global defaults the settings page
  // manages; every office type inherits them alongside its own rows.
  // A config names the fuel category, not a fuel: the office picks the exact fuel.
  // Lubricant and maintenance belong to the vehicle type, not to the category.
  const configs = await prisma.adminVehicleConfig.findMany({
    where: {
      OR: [{ officeTypeId: BigInt(officeTypeId) }, { officeTypeId: null }],
    },
    include: {
      vehicleType: { include: { allowanceConfig: true } },
      fuelCategory: { select: { id: true, categoryNameBn: true } },
    },
    orderBy: { id: 'asc' },
  })
  return configs.map((c) => ({
    id: Number(c.id),
    office_type_id: c.officeTypeId === null ? null : Number(c.officeTypeId),
    car_type_id: Number(c.vehicleTypeId),
    fuel_category_id: Number(c.fuelCategoryId),
    car_type: { id: Number(c.vehicleType.id), name: c.vehicleType.name },
    fuel_category: { id: Number(c.fuelCategory.id), name_bn: c.fuelCategory.categoryNameBn },
    monthly_fuel_quota_liter: Number(c.monthlyFuelQuotaLiter),
    annual_lube_allowance: Number(c.vehicleType.allowanceConfig?.annualLubeAllowance || 0),
    annual_maintenance_allowance: Number(
      c.vehicleType.allowanceConfig?.annualMaintenanceAllowance || 0
    ),
  }))
}

export async function loadFormVehiclesGovtInitial(submissionId: number) {
  const rows = await prisma.officeFormVehicleGovt.findMany({
    where: { submissionId: BigInt(submissionId) },
    include: {
      fuelType: { select: { id: true, name: true, categoryId: true } },
      config: {
        include: {
          vehicleType: { select: { id: true, name: true } },
          fuelCategory: { select: { id: true, categoryNameBn: true } },
        },
      },
    },
    orderBy: { id: 'asc' },
  })
  return rows.map((r) => ({
    id: Number(r.id),
    vehicle_fuel_config_id: Number(r.vehicleConfigId),
    fuel_type_id: Number(r.fuelTypeId),
    count: r.vehicleCount,
    maintenance_cost: Number(r.maintenanceDue),
    additional_expense: Number(r.additionalExpense),
    fuel_type: {
      id: Number(r.fuelType.id),
      name: r.fuelType.name,
      category_id: Number(r.fuelType.categoryId),
    },
    vehicle_fuel_config: r.config
      ? {
          id: Number(r.config.id),
          car_type_id: Number(r.config.vehicleTypeId),
          fuel_category_id: Number(r.config.fuelCategoryId),
          car_type: { id: Number(r.config.vehicleType.id), name: r.config.vehicleType.name },
          fuel_category: {
            id: Number(r.config.fuelCategory.id),
            name_bn: r.config.fuelCategory.categoryNameBn,
          },
        }
      : undefined,
  }))
}

export async function loadVehicleRentConfigsForOfficeType(officeTypeId: number) {
  // NULL office type marks a global default row (see loadVehicleFuelConfigs…).
  const configs = await prisma.adminVehicleRentConfig.findMany({
    where: {
      OR: [{ officeTypeId: BigInt(officeTypeId) }, { officeTypeId: null }],
    },
    include: { vehicleType: { select: { id: true, name: true } } },
    orderBy: { id: 'asc' },
  })
  return configs.map((c) => ({
    id: Number(c.id),
    office_type_id: c.officeTypeId === null ? null : Number(c.officeTypeId),
    car_type_id: Number(c.vehicleTypeId),
    car_type: { id: Number(c.vehicleType.id), name: c.vehicleType.name },
    monthly_rent_allowance: Number(c.monthlyRentRate),
  }))
}

export async function loadFormVehiclesRentInitial(submissionId: number) {
  const rows = await prisma.officeFormVehicleRent.findMany({
    where: { submissionId: BigInt(submissionId) },
    include: {
      config: { include: { vehicleType: { select: { id: true, name: true } } } },
    },
    orderBy: { id: 'asc' },
  })
  return rows.map((r) => ({
    id: Number(r.id),
    vehicle_rent_config_id: Number(r.vehicleRentConfigId),
    count: r.vehicleCount,
    vehicle_rent_config: r.config
      ? {
          id: Number(r.config.id),
          car_type_id: Number(r.config.vehicleTypeId),
          car_type: { id: Number(r.config.vehicleType.id), name: r.config.vehicleType.name },
        }
      : undefined,
  }))
}

/**
 * The office-rent VAT rate. /admin/settings tab 1 is where it is edited, so the
 * `office_rent_vat_percent` tile wins; the legacy admin_rates row only remains
 * as a fallback for databases that predate the tile. With neither present the rate
 * reads as 0 — no percentage is compiled in.
 */
export async function loadVatPercentage(): Promise<number> {
  const tile = await prisma.adminSalaryConfig.findUnique({
    where: { key: 'office_rent_vat_percent' },
    select: { value: true },
  })
  if (tile) return Number(tile.value)

  const rate = await prisma.adminRate.findFirst({ where: { key: 'vat_percentage' } })
  return rate ? Number(rate.value) : 0
}

/** The administrator's monthly দায়িত্ব ভাতা rate (form 5 previews it live). */
export async function loadDutyAllowanceMonthlyRate(): Promise<number> {
  const tile = await prisma.adminSalaryConfig.findUnique({
    where: { key: 'duty_allowance' },
    select: { value: true },
  })
  return tile ? Number(tile.value) : 0
}

export async function loadFormHouseRentInitial(submissionId: number) {
  const row = await prisma.officeFormHouseRent.findUnique({
    where: { submissionId: BigInt(submissionId) },
  })
  if (!row) return null
  return {
    monthly_bill: Number(row.monthlyRent),
    due: Number(row.arrearsDue),
    contract_start_date: row.contractStartDate?.toISOString().split('T')[0] ?? '',
    contract_end_date: row.contractEndDate?.toISOString().split('T')[0] ?? '',
  }
}

export async function loadFormUtilitiesInitial(submissionId: number) {
  const rows = await prisma.officeFormUtility.findMany({
    where: { submissionId: BigInt(submissionId) },
    include: { utilityType: { select: { id: true, name: true } } },
  })
  return rows.map((r) => ({
    utility_type_id: Number(r.utilityTypeId),
    utility_type_name: r.utilityType.name,
    annual_cost: Number(r.annualBill),
    due: Number(r.arrearsDue),
  }))
}

/**
 * The equipment a form 10 card can budget for, one entry per global equipment
 * type (`/admin/settings?tab=equipment`). The per-office-type row is only an
 * optional override: the unit price the administrator edits on the equipment
 * type is what the form uses, so a card is never priced at 0 merely because no
 * `admin_it_config` row has been created for the office type yet. That row is
 * created on demand when the office saves (`saveFormITEquipmentRow`), which is
 * why `id` may be null here.
 */
export async function loadItConfigsForOfficeType(officeTypeId: number) {
  const [equipmentTypes, overrides] = await Promise.all([
    prisma.refItEquipmentType.findMany({ orderBy: { id: 'asc' } }),
    prisma.adminItConfig.findMany({ where: { officeTypeId: BigInt(officeTypeId) } }),
  ])

  const overrideByEquipmentType = new Map(
    overrides.map((o) => [Number(o.equipmentTypeId), o])
  )

  return equipmentTypes.map((t) => {
    const override = overrideByEquipmentType.get(Number(t.id))
    return {
      id: override ? Number(override.id) : null,
      office_type_id: officeTypeId,
      equipment_type_id: Number(t.id),
      equipment_type_name: t.name,
      unit_budget: Number(override?.unitBudget ?? 0),
      unit_price: Number(t.unitPrice),
    }
  })
}

export async function loadFormItEquipmentInitial(submissionId: number) {
  const rows = await prisma.officeFormItEquipment.findMany({
    where: { submissionId: BigInt(submissionId) },
    include: {
      config: { include: { equipmentType: { select: { id: true, name: true, unitPrice: true } } } },
    },
  })
  return rows.map((r) => ({
    it_config_id: Number(r.itConfigId),
    equipment_type_id: Number(r.config.equipmentTypeId),
    existing_count: r.existingCount,
    damaged_count: r.damagedCount,
    toner_cost: Number(r.tonerCostMonthly),
    required_qty: r.newDemandCount,
    unit_budget: Number(r.config.unitBudget ?? 0),
    unit_price: Number(r.config.equipmentType.unitPrice),
  }))
}

/**
 * The বেতন-ভাতা মাস tile: how many months a year the budget multiplies monthly
 * figures by. Form 6 and form 10 read it from here rather than assuming twelve.
 */
export async function loadSalaryMonths(): Promise<number> {
  const tile = await prisma.adminSalaryConfig.findUnique({
    where: { key: 'salary_months' },
    select: { value: true },
  })
  return tile ? Number(tile.value) : 0
}

export async function loadFormReturnInfoInitial(submissionId: number) {
  const row = await prisma.officeFormReturnInfo.findUnique({
    where: { submissionId: BigInt(submissionId) },
  })
  if (!row) return null
  return {
    tin_count: row.tinCount,
    return_submitted_count: row.returnSubmittedCount,
  }
}

export async function loadOfficeDashboardStats(submissionId: number) {
  const sid = BigInt(submissionId)
  // Eight statements instead of fourteen. The submission row already owns every
  // form through a relation, so the four to-one forms come back as nested reads
  // and the eight to-many forms as `_count` aggregates. Fewer statements is what
  // matters on Vercel, where a serverless instance holds a single connection and
  // the whole render serialises through it. (Prisma's default relation strategy
  // resolves the nested reads one after another, so this trades parallel batches
  // for a shorter queue — the right way round for a one-connection pool.)
  const [submission, sheet] = await Promise.all([
    prisma.officeSubmission.findUnique({
      where: { id: sid },
      select: {
        status: true,
        submittedAt: true,
        cycle: {
          select: {
            status: true,
            fiscalYear: { select: { year: true } },
            budgetType: { select: { name: true } },
          },
        },
        formBasic: { select: { id: true } },
        leaveEncashment: {
          select: { leaveEncashmentOfficerBasic: true, leaveEncashmentStaffBasic: true },
        },
        houseRent: { select: { monthlyRent: true } },
        returnInfo: { select: { returnSubmittedCount: true } },
        _count: {
          select: {
            staffWorking: true,
            staffSuspended: true,
            staffNewRecruits: true,
            allowances: true,
            vehiclesGovt: true,
            vehiclesRent: true,
            itEquipments: true,
            utilities: true,
          },
        },
      },
    }),
    // The sheet is the same code-wise vector every report reads, so the dashboard
    // total can never disagree with what the office sees on the budget sheet.
    computeSubmissionSheet(submissionId),
  ])

  const counts = submission?._count
  const completedForms = new Set<string>()
  if (submission?.formBasic) completedForms.add('form1')
  if ((counts?.staffWorking ?? 0) > 0) completedForms.add('form2')
  if ((counts?.staffSuspended ?? 0) > 0) completedForms.add('form3')
  if ((counts?.staffNewRecruits ?? 0) > 0) completedForms.add('form4')
  if ((counts?.allowances ?? 0) > 0) completedForms.add('form5')
  if (
    submission?.leaveEncashment &&
    (Number(submission.leaveEncashment.leaveEncashmentOfficerBasic) > 0 ||
      Number(submission.leaveEncashment.leaveEncashmentStaffBasic) > 0)
  )
    completedForms.add('form6')
  if ((counts?.vehiclesGovt ?? 0) > 0) completedForms.add('form7')
  if ((counts?.vehiclesRent ?? 0) > 0) completedForms.add('form8')
  if (submission?.houseRent && Number(submission.houseRent.monthlyRent) > 0) completedForms.add('form9')
  if ((counts?.itEquipments ?? 0) > 0) completedForms.add('form10')
  if ((counts?.utilities ?? 0) > 0) completedForms.add('form11')
  if (submission?.returnInfo && submission.returnInfo.returnSubmittedCount > 0) completedForms.add('form12')

  const cycle = submission?.cycle
  return {
    completedForms,
    submissionStatus: (submission?.status === 'submitted' ? 'submitted' : 'draft') as
      | 'draft'
      | 'submitted',
    submittedAt: submission?.submittedAt ? submission.submittedAt.toISOString() : null,
    totalBudgetAmount: sheet.total,
    cycleInfo: cycle
      ? {
          fiscal_year: cycle.fiscalYear.year,
          budget_type_name: cycle.budgetType.name,
          status: cycle.status,
        }
      : null,
  }
}
