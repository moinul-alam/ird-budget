import { prisma } from '@/lib/db/client'

export async function getOfficeTypeIdForOffice(officeId: number): Promise<number | null> {
  const office = await prisma.coreOffice.findUnique({
    where: { id: BigInt(officeId) },
    select: { officeTypeId: true },
  })
  return office ? Number(office.officeTypeId) : null
}

export async function loadFormBasicInitial(submissionId: number) {
  const row = await prisma.officeFormBasic.findUnique({
    where: { submissionId: BigInt(submissionId) },
  })
  if (!row) return null
  return {
    head_of_office: row.headOfOffice,
    designation: row.designation ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
  }
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
    is_calculated: t.isCalculated,
    formula_key: t.formulaKey,
    applicable_category: t.applicableCategory,
  }))
}

export async function loadFormAllowancesInitial(submissionId: number) {
  const rows = await prisma.officeFormAllowance.findMany({
    where: { submissionId: BigInt(submissionId) },
  })
  return rows.map((r) => ({
    allowance_type_id: Number(r.allowanceTypeId),
    officer_count: r.officerCount,
    staff_count: r.staffCount,
    total_annual_amount: Number(r.totalAnnualAmount),
    effective_date: r.effectiveDate?.toISOString().split('T')[0] ?? null,
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
  const configs = await prisma.adminVehicleConfig.findMany({
    where: { officeTypeId: BigInt(officeTypeId) },
    include: {
      vehicleType: { select: { id: true, name: true } },
      fuelType: { select: { id: true, name: true } },
    },
    orderBy: { id: 'asc' },
  })
  return configs.map((c) => ({
    id: Number(c.id),
    office_type_id: Number(c.officeTypeId),
    car_type_id: Number(c.vehicleTypeId),
    fuel_type_id: Number(c.fuelTypeId),
    car_type: { id: Number(c.vehicleType.id), name: c.vehicleType.name },
    fuel_type: { id: Number(c.fuelType.id), name: c.fuelType.name },
    monthly_fuel_quota_liter: Number(c.monthlyFuelQuotaLiter),
    annual_lube_allowance: Number(c.annualLubeAllowance),
    annual_maintenance_allowance: Number(c.annualMaintenanceAllowance),
  }))
}

export async function loadFormVehiclesGovtInitial(submissionId: number) {
  const rows = await prisma.officeFormVehicleGovt.findMany({
    where: { submissionId: BigInt(submissionId) },
    include: {
      config: {
        include: {
          vehicleType: { select: { id: true, name: true } },
          fuelType: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { id: 'asc' },
  })
  return rows.map((r) => ({
    id: Number(r.id),
    vehicle_fuel_config_id: Number(r.vehicleConfigId),
    vehicle_count: r.vehicleCount,
    maintenance_due: Number(r.maintenanceDue),
    vehicle_fuel_config: r.config
      ? {
          id: Number(r.config.id),
          car_type_id: Number(r.config.vehicleTypeId),
          fuel_type_id: Number(r.config.fuelTypeId),
          car_type: { id: Number(r.config.vehicleType.id), name: r.config.vehicleType.name },
          fuel_type: { id: Number(r.config.fuelType.id), name: r.config.fuelType.name },
        }
      : undefined,
  }))
}

export async function loadVehicleRentConfigsForOfficeType(officeTypeId: number) {
  const configs = await prisma.adminVehicleRentConfig.findMany({
    where: { officeTypeId: BigInt(officeTypeId) },
    include: { vehicleType: { select: { id: true, name: true } } },
    orderBy: { id: 'asc' },
  })
  return configs.map((c) => ({
    id: Number(c.id),
    office_type_id: Number(c.officeTypeId),
    car_type_id: Number(c.vehicleTypeId),
    car_type: { id: Number(c.vehicleType.id), name: c.vehicleType.name },
    monthly_rent_rate: Number(c.monthlyRentRate),
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
    vehicle_count: r.vehicleCount,
    vehicle_rent_config: r.config
      ? {
          id: Number(r.config.id),
          car_type_id: Number(r.config.vehicleTypeId),
          car_type: { id: Number(r.config.vehicleType.id), name: r.config.vehicleType.name },
        }
      : undefined,
  }))
}

export async function loadVatPercentage(): Promise<number> {
  const rate = await prisma.adminRate.findFirst({ where: { key: 'vat_percentage' } })
  return rate ? Number(rate.value) : 15
}

export async function loadFormHouseRentInitial(submissionId: number) {
  const row = await prisma.officeFormHouseRent.findUnique({
    where: { submissionId: BigInt(submissionId) },
  })
  if (!row) return null
  return {
    monthly_bill: Number(row.monthlyRent),
    due: Number(row.arrearsDue),
    contract_start_date: '',
    contract_end_date: '',
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

export async function loadItAdminPrices(officeTypeId: number) {
  const configs = await prisma.adminItConfig.findMany({
    where: { officeTypeId: BigInt(officeTypeId) },
    include: { equipmentType: { select: { name: true } } },
  })
  const findPrice = (keyword: string) => {
    const match = configs.find((c) =>
      c.equipmentType.name.toLowerCase().includes(keyword.toLowerCase())
    )
    return match ? Number(match.unitBudget) : 0
  }
  return {
    computer: findPrice('computer') || findPrice('কম্পিউ'),
    printer: findPrice('printer') || findPrice('প্রিন্ট'),
    scanner: findPrice('scanner') || findPrice('স্ক্যান'),
    photocopier: findPrice('accessor') || findPrice('ফটো'),
  }
}

export async function loadFormItEquipmentInitial(submissionId: number) {
  const rows = await prisma.officeFormItEquipment.findMany({
    where: { submissionId: BigInt(submissionId) },
    include: {
      config: { include: { equipmentType: { select: { id: true, name: true } } } },
    },
  })
  return rows.map((r) => ({
    equipment_type_id: Number(r.config.equipmentTypeId),
    existing_count: r.existingCount,
    damaged_count: 0,
    toner_cost: Number(r.tonerCostMonthly),
    required_qty: r.newDemandCount,
    unit_budget: Number(r.config.unitBudget),
  }))
}

export async function loadFormReturnInfoInitial(submissionId: number) {
  const row = await prisma.officeFormReturnInfo.findUnique({
    where: { submissionId: BigInt(submissionId) },
  })
  if (!row) return null
  return {
    tin_count: 0,
    return_submitted_count: row.returnSubmittedCount,
  }
}

export async function loadOfficeDashboardStats(submissionId: number) {
  const sid = BigInt(submissionId)
  const [
    basic,
    staffWorking,
    staffSuspended,
    newRecruits,
    allowances,
    leave,
    vehiclesGovt,
    vehiclesRent,
    houseRent,
    itRows,
    utilities,
    returnInfo,
    submission,
    budgetSum,
  ] = await Promise.all([
    prisma.officeFormBasic.findUnique({ where: { submissionId: sid }, select: { id: true } }),
    prisma.officeFormStaffWorking.count({ where: { submissionId: sid } }),
    prisma.officeFormStaffSuspended.count({ where: { submissionId: sid } }),
    prisma.officeFormStaffNewRecruit.count({ where: { submissionId: sid } }),
    prisma.officeFormAllowance.count({ where: { submissionId: sid } }),
    prisma.officeFormLeaveEncashment.findUnique({ where: { submissionId: sid } }),
    prisma.officeFormVehicleGovt.count({ where: { submissionId: sid } }),
    prisma.officeFormVehicleRent.count({ where: { submissionId: sid } }),
    prisma.officeFormHouseRent.findUnique({ where: { submissionId: sid } }),
    prisma.officeFormItEquipment.count({ where: { submissionId: sid } }),
    prisma.officeFormUtility.count({ where: { submissionId: sid } }),
    prisma.officeFormReturnInfo.findUnique({ where: { submissionId: sid } }),
    prisma.officeSubmission.findUnique({
      where: { id: sid },
      include: {
        cycle: {
          include: {
            fiscalYear: { select: { year: true } },
            budgetType: { select: { name: true } },
          },
        },
      },
    }),
    prisma.officeBudgetSheet.aggregate({
      where: { submissionId: sid },
      _sum: { finalValue: true },
    }),
  ])

  const completedForms = new Set<string>()
  if (basic) completedForms.add('form1')
  if (staffWorking > 0) completedForms.add('form2')
  if (staffSuspended > 0) completedForms.add('form3')
  if (newRecruits > 0) completedForms.add('form4')
  if (allowances > 0) completedForms.add('form5')
  if (leave && (Number(leave.leaveEncashmentOfficerBasic) > 0 || Number(leave.leaveEncashmentStaffBasic) > 0))
    completedForms.add('form6')
  if (vehiclesGovt > 0) completedForms.add('form7')
  if (vehiclesRent > 0) completedForms.add('form8')
  if (houseRent && Number(houseRent.monthlyRent) > 0) completedForms.add('form9')
  if (itRows > 0) completedForms.add('form10')
  if (utilities > 0) completedForms.add('form11')
  if (returnInfo && returnInfo.returnSubmittedCount > 0) completedForms.add('form12')

  const cycle = submission?.cycle
  return {
    completedForms,
    submissionStatus: (submission?.status === 'submitted' ? 'submitted' : 'draft') as
      | 'draft'
      | 'submitted',
    totalBudgetAmount: Number(budgetSum._sum.finalValue ?? 0),
    cycleInfo: cycle
      ? {
          fiscal_year: cycle.fiscalYear.year,
          budget_type_name: cycle.budgetType.name,
          status: cycle.status,
        }
      : null,
  }
}
