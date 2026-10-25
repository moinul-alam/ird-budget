import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db/client'
import type { BudgetContext, BudgetSalary } from './calculate'

/** Maps a fuel name to the rate key the calculation engine expects. */
function fuelRateKey(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('diesel') || name.includes('ডিজেল')) return 'fuel_price_diesel'
  if (lower.includes('cng') || lower.includes('gas') || name.includes('গ্যাস') || name.includes('সিএনজি')) {
    return 'fuel_price_cng'
  }
  return 'fuel_price_octane'
}

/**
 * Salary tiles from /admin/settings that the engine reads as a flat rate, mapped
 * to the rate key each formula looks up. The grade-banded tiles (বাড়ি ভাড়া,
 * মোবাইল ভাতা, বিশেষ সুবিধা) and the grade-scoped ones carry their scope on the
 * tile, so the engine resolves those through `salary` instead.
 */
const SALARY_TILE_RATES: Record<string, string> = {
  education_allowance: 'education_allowance',
  medical_allowance: 'medical_allowance_monthly',
  festival_bonus_multiplier: 'festival_bonus_multiplier',
  office_rent_vat_percent: 'vat_percentage',
  postal_rate: 'postal_expense_rate',
}

/**
 * A few cards are a rate × quantity pair; this maps such a tile to the rate key the
 * formula reads the card's *second* field from. ডাক is the only one today: the cost of
 * one notice times the notices served per non-filer.
 */
const SALARY_TILE_QUANTITY_RATES: Record<string, string> = {
  postal_rate: 'postal_notice_count',
}

/**
 * Everything the office side reads but only the administrator writes: the rate
 * card, the salary tiles and slabs, the vehicle / IT / utility reference tables,
 * the office types and the economic-code catalogue.
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
  sortOrder: number
}

/**
 * The administrator-owned tables every render needs, flattened to plain numbers
 * and strings. It has to stay JSON-shaped — the cache stores it as JSON — so the
 * lookup Maps are built by the caller, not returned from here.
 */
export interface RefData {
  /** `admin_rates`, `ref_fuel_types.unit_price` and the /admin/settings tiles, layered. */
  rates: Record<string, number>
  salary: BudgetSalary
  gradeCategoryNames: Array<{ gradeNo: number; categoryName: string }>
  fuelTypes: Array<{ id: number; name: string; unitPrice: number; categoryName: string }>
  vehicleConfigs: Array<{
    id: number
    vehicleTypeId: number
    fuelCategoryName: string
    monthlyFuelQuotaLiter: number
  }>
  vehicleAllowances: Array<{
    vehicleTypeId: number
    annualLubeAllowance: number
    annualMaintenanceAllowance: number
  }>
  vehicleRentConfigs: Array<{ id: number; monthlyRentRate: number }>
  itConfigs: Array<{ id: number; equipmentTypeId: number; unitBudget: number }>
  itEquipmentTypes: Array<{ id: number; name: string; unitPrice: number }>
  utilityTypes: Array<{ id: number; name: string }>
  allowanceTypes: Array<{ id: number; name: string }>
  officeTypes: Array<{ id: number; name: string }>
  economicCodes: EconomicCodeRow[]
  budgetCategories: Array<{ id: number; code: string; title: string; sortOrder: number }>
  levelCodeMappings: Array<{ officeLevelId: number; economicCodeId: number }>
}

/**
 * Reads the whole shared reference set. Deliberately plain `findMany` calls with
 * no `include`: a nested relation costs an extra statement each, which is exactly
 * the cost this cache exists to remove — the joins happen in memory instead.
 */
async function loadRefData(): Promise<RefData> {
  const [
    rateRows,
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
    officeTypeRows,
    economicCodeRows,
    budgetCategoryRows,
    levelCodeMappingRows,
  ] = await Promise.all([
    prisma.adminRate.findMany({ select: { key: true, value: true } }),
    prisma.refFuelType.findMany({
      select: { id: true, name: true, unitPrice: true, categoryId: true },
    }),
    prisma.refFuelCategory.findMany({ select: { id: true, categoryName: true } }),
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
    prisma.refItEquipmentType.findMany({ select: { id: true, name: true, unitPrice: true } }),
    prisma.refUtilityType.findMany({ select: { id: true, name: true } }),
    prisma.refAllowanceType.findMany({ select: { id: true, name: true } }),
    prisma.coreOfficeType.findMany({ select: { id: true, name: true } }),
    prisma.refEconomicCode.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        categoryId: true,
        isManual: true,
        allowManualOverride: true,
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

  const fuelCategoryNameById = new Map(fuelCategoryRows.map((c) => [Number(c.id), c.categoryName]))
  const employeeCategoryNameById = new Map(
    employeeCategoryRows.map((c) => [Number(c.id), c.categoryName])
  )

  // Every rate comes from a table — `admin_rates`, `ref_fuel_types.unit_price`, or the
  // /admin/settings tiles. Nothing is compiled in, so a rate no table supplies reads as
  // 0 rather than as a number this file invented.
  const rates: Record<string, number> = {}
  for (const r of rateRows) {
    rates[r.key] = Number(r.value)
  }
  // The price the administrator edits on ref_fuel_types wins over the legacy
  // admin_rates value; a blank price leaves the existing rate untouched.
  for (const f of fuelTypeRows) {
    const price = Number(f.unitPrice)
    if (price > 0) rates[fuelRateKey(f.name)] = price
  }
  // Same idea for the salary tiles: /admin/settings is where these are edited, so
  // the tile value wins over the legacy admin_rates row.
  for (const tile of salaryTiles) {
    const rateKey = SALARY_TILE_RATES[tile.key]
    if (rateKey) rates[rateKey] = Number(tile.value)

    // Paired cards contribute their second field under its own key.
    const quantityKey = SALARY_TILE_QUANTITY_RATES[tile.key]
    if (quantityKey) rates[quantityKey] = Number(tile.secondaryValue)
  }

  // Grade-scoped tiles: house rent, mobile allowance and special benefit keep
  // their rates per grade band, and the rest either apply to a grade range or to
  // everybody. The engine resolves the right one per staff row.
  const salary: BudgetSalary = { tiles: {}, slabs: {} }
  for (const tile of salaryTiles) {
    salary.tiles[tile.key] = {
      value: Number(tile.value),
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

  return {
    rates,
    salary,
    gradeCategoryNames: gradeRows.map((g) => ({
      gradeNo: g.gradeNo,
      categoryName: employeeCategoryNameById.get(Number(g.categoryId)) || '',
    })),
    fuelTypes: fuelTypeRows.map((f) => ({
      id: Number(f.id),
      name: f.name,
      unitPrice: Number(f.unitPrice),
      categoryName: fuelCategoryNameById.get(Number(f.categoryId)) || '',
    })),
    vehicleConfigs: vehicleConfigRows.map((c) => ({
      id: Number(c.id),
      vehicleTypeId: Number(c.vehicleTypeId),
      fuelCategoryName: fuelCategoryNameById.get(Number(c.fuelCategoryId)) || '',
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
    })),
    utilityTypes: utilityTypeRows.map((t) => ({ id: Number(t.id), name: t.name })),
    allowanceTypes: allowanceTypeRows.map((t) => ({ id: Number(t.id), name: t.name })),
    officeTypes: officeTypeRows.map((t) => ({ id: Number(t.id), name: t.name })),
    economicCodes: economicCodeRows.map((c) => ({
      id: Number(c.id),
      code: c.code,
      name: c.name || '',
      categoryId: c.categoryId ? Number(c.categoryId) : null,
      isManual: c.isManual,
      allowManualOverride: c.allowManualOverride,
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
        office: { select: { officeTypeId: true } },
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
  const utilityTypeNameById = new Map(ref.utilityTypes.map((t) => [t.id, t.name]))
  const allowanceTypeNameById = new Map(ref.allowanceTypes.map((t) => [t.id, t.name]))
  const officeTypeNameById = new Map(ref.officeTypes.map((t) => [t.id, t.name]))

  // Office type name
  const officeTypeName: string = officeTypeNameById.get(Number(submission?.office?.officeTypeId)) || ''

  // Form 5 allowance cards: the office supplies the count and, for the cards that
  // ask for a figure, the rate or lump sum too. The engine scales the monthly ones
  // by বেতন-ভাতা মাস.
  const allowances = allowanceRows.map((a) => ({
    name: allowanceTypeNameById.get(Number(a.allowanceTypeId)) || '',
    officer_count: Number(a.officerCount || 0),
    staff_count: Number(a.staffCount || 0),
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

  // Format Utilities
  const formattedUtilities = utilities.map((u) => ({
    type_name: utilityTypeNameById.get(Number(u.utilityTypeId)) || '',
    annual_cost: Number(u.annualBill || 0),
  }))

  // Format Vehicles
  const formattedVehicles = vehiclesGovt.map((v) => {
    // The price is the office's declared fuel: the config names only the category, so
    // the exact fuel on the row is what tells অকটেন from ডিজেল.
    const fuelType = fuelTypeById.get(Number(v.fuelTypeId))
    const config = vehicleConfigById.get(Number(v.vehicleConfigId))
    const allowance = config
      ? vehicleAllowanceByVehicleTypeId.get(config.vehicleTypeId)
      : undefined

    return {
      rate_key: fuelRateKey(fuelType?.name || ''),
      // The category the administrator picked on /admin/settings tab 4 decides which of
      // the two fuel codes the cost lands in. Read through the FK to ref_fuel_categories
      // rather than guessed from the fuel's name; the fuel's own category is the same
      // value, so a row whose config was reassigned still follows its config.
      fuel_category: (config?.fuelCategoryName || fuelType?.categoryName) === 'gas' ? ('gas' as const) : ('oil' as const),
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

  // Format IT Equipment
  const formattedITEquipment = itEquipment.map((eq) => {
    const config = itConfigById.get(Number(eq.itConfigId))
    const equipmentType = config ? itEquipmentTypeById.get(config.equipmentTypeId) : undefined

    return {
      equipment_name: equipmentType?.name || '',
      existing_count: Number(eq.existingCount || 0),
      toner_cost: Number(eq.tonerCostMonthly || 0),
      new_demand_count: Number(eq.newDemandCount || 0),
      // The administrator's price is the global equipment type price; a
      // per-office-type override on admin_it_config wins when one is set.
      unit_price: Number(config?.unitBudget || 0) || Number(equipmentType?.unitPrice || 0),
    }
  })

  return {
    officeTypeName,
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
    rates: ref.rates,
    salary: ref.salary,
    salary_months: Number(submission?.cycle?.salaryMonths ?? 0),
    allowances,
  }
}
