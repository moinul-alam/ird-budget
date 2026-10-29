import { createHash } from 'crypto'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db/client'
import type { BudgetContext, BudgetSalary } from './calculate'

/**
 * Everything the office side reads but only the administrator writes: the
 * salary tiles and slabs, the vehicle / IT / utility reference tables, the
 * office types and the economic-code catalogue.
 *
 * Why one tag for all of them: a production render holds a single pooled
 * connection, so every statement queues behind the one before it. These shared
 * tables were roughly half of a dashboard render's wall clock, and re-reading the
 * same rows for every office and every render bought nothing — they only change
 * when the administrator saves something, which is what the tag is for.
 */
export const ADMIN_DATA_TAG = 'admin-data'

/** One row of `ref_economic_codes`, before its category is joined on. */
export interface EconomicCodeRow {
  id: number
  code: string
  name: string
  categoryId: number | null
  isManual: boolean
  allowManualOverride: boolean
  /** The engine formula this code dispatches to (see RefFormulaType); null for a manual code. */
  formulaKey: string | null
  /** The form numbers whose data produced this code, so the sheet can point at the form to edit. */
  sourceForms: number[]
  sortOrder: number
}

/**
 * The administrator-owned tables every render needs, flattened to plain numbers
 * and strings. It has to stay JSON-shaped — the cache stores it as JSON — so the
 * lookup Maps are built by the caller, not returned from here.
 */
export interface RefData {
  salary: BudgetSalary
  gradeCategoryNames: Array<{ gradeNo: number; categoryName: string }>
  /** Each fuel carries the economic code its category points at and its own unit price. */
  fuelTypes: Array<{
    id: number
    name: string
    unitPrice: number
    categoryId: number
    categoryEconomicCode: string | null
  }>
  vehicleConfigs: Array<{
    id: number
    vehicleTypeId: number
    fuelCategoryId: number
    fuelCategoryEconomicCode: string | null
    monthlyFuelQuotaLiter: number
  }>
  vehicleAllowances: Array<{
    vehicleTypeId: number
    annualLubeAllowance: number
    annualMaintenanceAllowance: number
  }>
  vehicleRentConfigs: Array<{ id: number; monthlyRentRate: number }>
  itConfigs: Array<{ id: number; equipmentTypeId: number; unitBudget: number }>
  /** `has_toner` says which devices draw toner — the engine never matches on the name. */
  itEquipmentTypes: Array<{ id: number; name: string; unitPrice: number; hasToner: boolean }>
  /** Each utility names the economic code its bill lands in. */
  utilityTypes: Array<{ id: number; name: string; economicCode: string | null }>
  /** Each allowance card names the engine formula that consumes it. */
  allowanceTypes: Array<{ id: number; name: string; formulaKey: string | null }>
  economicCodes: EconomicCodeRow[]
  budgetCategories: Array<{ id: number; code: string; title: string; sortOrder: number }>
  levelCodeMappings: Array<{ officeLevelId: number; economicCodeId: number }>
  /**
   * A hash of everything above — the whole admin-owned input set the engine computes
   * from. Two renders with the same fingerprint would compute the same amounts, so a
   * captured snapshot can be compared against the current config with one string compare
   * instead of a per-table audit. Computed here so it can never fall out of step with
   * the data it describes.
   */
  configFingerprint: string
}

/**
 * Reads the whole shared reference set. Deliberately plain `findMany` calls with
 * no `include`: a nested relation costs an extra statement each, which is exactly
 * the cost this cache exists to remove — the joins happen in memory instead.
 */
async function loadRefData(): Promise<RefData> {
  const [
    fuelTypeRows,
    fuelCategoryRows,
    salaryTiles,
    salarySlabs,
    gradeRows,
    employeeCategoryRows,
    vehicleConfigRows,
    vehicleAllowanceRows,
    vehicleRentConfigRows,
    itConfigRows,
    itEquipmentTypeRows,
    utilityTypeRows,
    allowanceTypeRows,
    economicCodeRows,
    budgetCategoryRows,
    levelCodeMappingRows,
  ] = await Promise.all([
    prisma.refFuelType.findMany({
      select: { id: true, name: true, unitPrice: true, categoryId: true },
    }),
    prisma.refFuelCategory.findMany({
      select: { id: true, categoryName: true, economicCodeId: true },
    }),
    prisma.adminSalaryConfig.findMany({
      select: {
        key: true,
        value: true,
        inputType: true,
        fromGrade: true,
        toGrade: true,
        secondaryValue: true,
      },
    }),
    prisma.adminSalarySlab.findMany({
      select: { configKey: true, fromGrade: true, toGrade: true, value: true },
    }),
    prisma.refGrade.findMany({ select: { gradeNo: true, categoryId: true } }),
    prisma.refEmployeeCategory.findMany({ select: { id: true, categoryName: true } }),
    prisma.adminVehicleConfig.findMany({
      select: {
        id: true,
        vehicleTypeId: true,
        fuelCategoryId: true,
        monthlyFuelQuotaLiter: true,
      },
    }),
    prisma.adminVehicleAllowanceConfig.findMany({
      select: { vehicleTypeId: true, annualLubeAllowance: true, annualMaintenanceAllowance: true },
    }),
    prisma.adminVehicleRentConfig.findMany({
      select: { id: true, monthlyRentRate: true },
    }),
    prisma.adminItConfig.findMany({
      select: { id: true, equipmentTypeId: true, unitBudget: true },
    }),
    prisma.refItEquipmentType.findMany({
      select: { id: true, name: true, unitPrice: true, hasToner: true },
    }),
    prisma.refUtilityType.findMany({ select: { id: true, name: true, economicCodeId: true } }),
    prisma.refAllowanceType.findMany({ select: { id: true, name: true, formulaKey: true } }),
    prisma.refEconomicCode.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        categoryId: true,
        isManual: true,
        allowManualOverride: true,
        formulaKey: true,
        sourceForms: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.refBudgetCategory.findMany({
      select: { id: true, code: true, title: true, sortOrder: true },
    }),
    prisma.officeLevelEconomicCodeMapping.findMany({
      where: { isEnabled: true },
      select: { officeLevelId: true, economicCodeId: true },
    }),
  ])

  const employeeCategoryNameById = new Map(
    employeeCategoryRows.map((c) => [Number(c.id), c.categoryName])
  )

  // The economic code behind an id, so a fuel category / utility that names a code
  // resolves to the code string the engine computes against. A link to an inactive
  // code resolves to nothing: the code is not on any sheet, so it is not payable.
  const economicCodeById = new Map(economicCodeRows.map((c) => [Number(c.id), c.code]))
  const fuelCategoryEconomicCodeById = new Map(
    fuelCategoryRows.map((c) => [
      Number(c.id),
      c.economicCodeId !== null ? economicCodeById.get(Number(c.economicCodeId)) ?? null : null,
    ])
  )

  // Grade-scoped tiles: house rent, mobile allowance and special benefit keep
  // their rates per grade band, and the rest either apply to a grade range or to
  // everybody. The engine resolves the right one per staff row.
  const salary: BudgetSalary = { tiles: {}, slabs: {} }
  for (const tile of salaryTiles) {
    salary.tiles[tile.key] = {
      value: Number(tile.value),
      secondary_value: Number(tile.secondaryValue),
      input_type: tile.inputType,
      from_grade: tile.fromGrade,
      to_grade: tile.toGrade,
    }
  }
  for (const slab of salarySlabs) {
    ;(salary.slabs[slab.configKey] ||= []).push({
      from_grade: slab.fromGrade,
      to_grade: slab.toGrade,
      value: Number(slab.value),
    })
  }

  const data: Omit<RefData, 'configFingerprint'> = {
    salary,
    gradeCategoryNames: gradeRows.map((g) => ({
      gradeNo: g.gradeNo,
      categoryName: employeeCategoryNameById.get(Number(g.categoryId)) || '',
    })),
    fuelTypes: fuelTypeRows.map((f) => ({
      id: Number(f.id),
      name: f.name,
      unitPrice: Number(f.unitPrice),
      categoryId: Number(f.categoryId),
      categoryEconomicCode: fuelCategoryEconomicCodeById.get(Number(f.categoryId)) ?? null,
    })),
    vehicleConfigs: vehicleConfigRows.map((c) => ({
      id: Number(c.id),
      vehicleTypeId: Number(c.vehicleTypeId),
      fuelCategoryId: Number(c.fuelCategoryId),
      fuelCategoryEconomicCode:
        fuelCategoryEconomicCodeById.get(Number(c.fuelCategoryId)) ?? null,
      monthlyFuelQuotaLiter: Number(c.monthlyFuelQuotaLiter || 0),
    })),
    vehicleAllowances: vehicleAllowanceRows.map((a) => ({
      vehicleTypeId: Number(a.vehicleTypeId),
      annualLubeAllowance: Number(a.annualLubeAllowance || 0),
      annualMaintenanceAllowance: Number(a.annualMaintenanceAllowance || 0),
    })),
    vehicleRentConfigs: vehicleRentConfigRows.map((c) => ({
      id: Number(c.id),
      monthlyRentRate: Number(c.monthlyRentRate || 0),
    })),
    itConfigs: itConfigRows.map((c) => ({
      id: Number(c.id),
      equipmentTypeId: Number(c.equipmentTypeId),
      unitBudget: Number(c.unitBudget || 0),
    })),
    itEquipmentTypes: itEquipmentTypeRows.map((t) => ({
      id: Number(t.id),
      name: t.name,
      unitPrice: Number(t.unitPrice),
      hasToner: t.hasToner,
    })),
    utilityTypes: utilityTypeRows.map((t) => ({
      id: Number(t.id),
      name: t.name,
      economicCode:
        t.economicCodeId !== null ? economicCodeById.get(Number(t.economicCodeId)) ?? null : null,
    })),
    allowanceTypes: allowanceTypeRows.map((t) => ({
      id: Number(t.id),
      name: t.name,
      formulaKey: t.formulaKey,
    })),
    economicCodes: economicCodeRows.map((c) => ({
      id: Number(c.id),
      code: c.code,
      name: c.name || '',
      categoryId: c.categoryId ? Number(c.categoryId) : null,
      isManual: c.isManual,
      allowManualOverride: c.allowManualOverride,
      formulaKey: c.formulaKey,
      sourceForms: (c.sourceForms || []).map(Number),
      sortOrder: Number(c.sortOrder || 0),
    })),
    budgetCategories: budgetCategoryRows.map((c) => ({
      id: Number(c.id),
      code: c.code,
      title: c.title,
      sortOrder: Number(c.sortOrder || 0),
    })),
    levelCodeMappings: levelCodeMappingRows.map((m) => ({
      officeLevelId: Number(m.officeLevelId),
      economicCodeId: Number(m.economicCodeId),
    })),
  }

  // Every field above is built in a fixed order from ordered queries, so the same
  // admin data always stringifies identically and the hash is stable across renders.
  const configFingerprint = createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')

  return { ...data, configFingerprint }
}

/**
 * The current config fingerprint, read from the same cached reference set the office
 * side renders from. A snapshot that stored a different value was priced against
 * admin config that has since changed.
 */
export async function getConfigFingerprint(): Promise<string> {
  return (await getRefData()).configFingerprint
}

/**
 * The cached reader. The tag is dropped by every /admin save action, so an edit
 * shows up on the next render; `revalidate` is only a backstop in case a write
 * path is ever added without one.
 */
export const getRefData = unstable_cache(loadRefData, [ADMIN_DATA_TAG], {
  tags: [ADMIN_DATA_TAG],
  revalidate: 300,
})

/**
 * Fetches all form data for a given submission and shapes it into
 * the BudgetContext expected by the calculation engine using the new schema.
 */
export async function getBudgetContext(submissionId: number): Promise<BudgetContext> {
  // The shared reference tables come from the cache; only the office's own rows
  // are read here, and without `include` — each nested relation would be one more
  // statement queued behind the single pooled connection production renders on.
  // The one exception is the submission's cycle, whose বেতন-মাস scalar the engine
  // needs and which cannot come from the cached reference set.
  const [
    ref,
    staffWorking,
    staffNewRecruits,
    leave,
    utilities,
    houseRent,
    vehiclesGovt,
    vehicleRent,
    returnInfo,
    itEquipment,
    submission,
    allowanceRows,
  ] = await Promise.all([
    getRefData(),
    prisma.officeFormStaffWorking.findMany({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormStaffNewRecruit.findMany({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormLeaveEncashment.findUnique({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormUtility.findMany({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormHouseRent.findUnique({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormVehicleGovt.findMany({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormVehicleRent.findMany({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormReturnInfo.findUnique({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormItEquipment.findMany({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeSubmission.findUnique({
      where: { id: BigInt(submissionId) },
      select: {
        cycle: { select: { salaryMonths: true } },
      },
    }),
    prisma.officeFormAllowance.findMany({
      where: { submissionId: BigInt(submissionId) },
    }),
  ])

  // Grade → category, read from the reference table so the boundary between
  // officers and staff is never guessed from the grade number here.
  const categoryByGradeNo = new Map(ref.gradeCategoryNames.map((g) => [g.gradeNo, g.categoryName]))
  const categoryOf = (gradeNo: number): 'officer' | 'staff' | null => {
    const name = categoryByGradeNo.get(gradeNo)
    return name === 'officer' || name === 'staff' ? name : null
  }

  const fuelTypeById = new Map(ref.fuelTypes.map((f) => [f.id, f]))
  const vehicleConfigById = new Map(ref.vehicleConfigs.map((c) => [c.id, c]))
  const vehicleAllowanceByVehicleTypeId = new Map(ref.vehicleAllowances.map((a) => [a.vehicleTypeId, a]))
  const vehicleRentConfigById = new Map(ref.vehicleRentConfigs.map((c) => [c.id, c]))
  const itConfigById = new Map(ref.itConfigs.map((c) => [c.id, c]))
  const itEquipmentTypeById = new Map(ref.itEquipmentTypes.map((t) => [t.id, t]))
  const utilityTypeEconomicCodeById = new Map(ref.utilityTypes.map((t) => [t.id, t.economicCode]))
  const allowanceTypeFormulaKeyById = new Map(ref.allowanceTypes.map((t) => [t.id, t.formulaKey]))

  // Form 5 allowance cards: the office supplies the count and, for the cards that
  // ask for a figure, the rate or lump sum too. The engine dispatches on the card's
  // formula key — never its name — and scales the monthly ones by বেতন-ভাতা মাস.
  const allowances = allowanceRows.map((a) => ({
    formula_key: allowanceTypeFormulaKeyById.get(Number(a.allowanceTypeId)) ?? null,
    count: Number(a.officerCount || 0) + Number(a.staffCount || 0),
    amount: Number(a.totalAnnualAmount || 0),
    total_basic: Number(a.totalBasic || 0),
    due: Number(a.dueAmount || 0),
  }))

  // Format Staff Working
  const formattedStaff = staffWorking.map((s) => ({
    category: categoryOf(s.gradeId),
    total_basic: Number(s.monthlyBasic || 0),
    due_basic: Number(s.dueSalary || 0),
    count: Number(s.staffCount || 0),
    grade_id: s.gradeId,
  }))

  // Format New Recruits
  const formattedNewStaff = staffNewRecruits.map((p) => ({
    category: categoryOf(p.gradeId),
    total_salary: Number(p.totalSalary || 0),
  }))

  // Format Utilities — each bill carries the economic code its utility type names.
  const formattedUtilities = utilities.map((u) => ({
    economic_code: utilityTypeEconomicCodeById.get(Number(u.utilityTypeId)) ?? null,
    annual_cost: Number(u.annualBill || 0),
    due: Number(u.arrearsDue || 0),
  }))

  // Format Vehicles
  const formattedVehicles = vehiclesGovt.map((v) => {
    // The price is the fuel's own admin-set unit price; the category the config (or
    // the fuel itself) names decides which fuel code the cost lands in — read through
    // the FK to ref_fuel_categories rather than guessed from any name.
    const fuelType = fuelTypeById.get(Number(v.fuelTypeId))
    const config = vehicleConfigById.get(Number(v.vehicleConfigId))
    const allowance = config
      ? vehicleAllowanceByVehicleTypeId.get(config.vehicleTypeId)
      : undefined

    return {
      fuel_economic_code: config?.fuelCategoryEconomicCode || fuelType?.categoryEconomicCode || null,
      fuel_unit_price: Number(fuelType?.unitPrice || 0),
      count: Number(v.vehicleCount || 1),
      monthly_fuel_allowance: Number(config?.monthlyFuelQuotaLiter || 0),
      annual_lube_allowance: Number(allowance?.annualLubeAllowance || 0),
      annual_maintenance_allowance: Number(allowance?.annualMaintenanceAllowance || 0),
      additional_expense: Number(v.additionalExpense || 0),
    }
  })

  // Format Vehicle Rent
  const formattedVehicleRent = vehicleRent.map((v) => ({
    count: Number(v.vehicleCount || 1),
    monthly_rent_allowance: Number(
      vehicleRentConfigById.get(Number(v.vehicleRentConfigId))?.monthlyRentRate || 0
    ),
  }))

  // Format IT Equipment — `has_toner` on the admin's equipment type says which
  // devices the toner formula sums; the office's row supplies the counts.
  const formattedITEquipment = itEquipment.map((eq) => {
    const config = itConfigById.get(Number(eq.itConfigId))
    const equipmentType = config ? itEquipmentTypeById.get(config.equipmentTypeId) : undefined

    return {
      has_toner: Boolean(equipmentType?.hasToner),
      existing_count: Number(eq.existingCount || 0),
      damaged_count: Number(eq.damagedCount || 0),
      toner_cost: Number(eq.tonerCostMonthly || 0),
      new_demand_count: Number(eq.newDemandCount || 0),
      // The administrator's price is the global equipment type price; a
      // per-office-type override on admin_it_config wins when one is set.
      unit_price: Number(config?.unitBudget || 0) || Number(equipmentType?.unitPrice || 0),
    }
  })

  // A submission whose cycle cannot be resolved would make every monthly-derived figure
  // read as zero; fail loudly instead of rendering a silently empty sheet.
  const salaryMonths = submission?.cycle?.salaryMonths
  if (!salaryMonths) {
    throw new Error('সক্রিয় বাজেট চক্র বা বেতন-মাস পাওয়া যায়নি — মাসিক হিসাব বন্ধ।')
  }

  return {
    staff: formattedStaff,
    newStaff: formattedNewStaff,
    leave: leave ? {
      leave_encashment_officer_basic: Number(leave.leaveEncashmentOfficerBasic || 0),
      leave_encashment_officer_due: Number(leave.leaveEncashmentOfficerDue || 0),
      leave_encashment_staff_basic: Number(leave.leaveEncashmentStaffBasic || 0),
      leave_encashment_staff_due: Number(leave.leaveEncashmentStaffDue || 0),
      rest_recreation_amount: Number(leave.restRecreationAmount || 0),
    } : null,
    utilities: formattedUtilities,
    houseRent: houseRent ? {
      monthly_bill: Number(houseRent.monthlyRent || 0),
      due: Number(houseRent.arrearsDue || 0),
    } : null,
    vehicles: formattedVehicles,
    vehicleRent: formattedVehicleRent,
    returnInfo: returnInfo ? {
      tin_count: Number(returnInfo.tinCount || 0),
      return_submitted_count: Number(returnInfo.returnSubmittedCount || 0),
    } : null,
    itEquipment: formattedITEquipment,
    salary: ref.salary,
    salary_months: salaryMonths,
    allowances,
  }
}
