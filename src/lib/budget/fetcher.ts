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
 * Fetches all form data for a given submission and shapes it into
 * the BudgetContext expected by the calculation engine using the new schema.
 */
export async function getBudgetContext(submissionId: number): Promise<BudgetContext> {
  // Run all queries in parallel against normalized tables
  const [
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
    ratesData,
    fuelTypes,
    salaryTiles,
    salarySlabs,
    allowanceRows,
    gradeCategories,
  ] = await Promise.all([
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
      include: { utilityType: true },
    }),
    prisma.officeFormHouseRent.findUnique({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormVehicleGovt.findMany({
      where: { submissionId: BigInt(submissionId) },
      include: {
        // The office's own fuel supplies the price; the config names the category, and
        // the allowances hang off the vehicle type rather than the category.
        fuelType: { include: { category: true } },
        config: {
          include: {
            fuelCategory: true,
            vehicleType: { include: { allowanceConfig: true } },
          },
        },
      },
    }),
    prisma.officeFormVehicleRent.findMany({
      where: { submissionId: BigInt(submissionId) },
      include: { config: true },
    }),
    prisma.officeFormReturnInfo.findUnique({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormItEquipment.findMany({
      where: { submissionId: BigInt(submissionId) },
      include: { config: { include: { equipmentType: true } } },
    }),
    prisma.officeSubmission.findUnique({
      where: { id: BigInt(submissionId) },
      include: {
        office: {
          include: {
            officeType: {
              select: { name: true },
            },
          },
        },
      },
    }),
    prisma.adminRate.findMany({
      select: { key: true, value: true },
    }),
    prisma.refFuelType.findMany({
      select: { name: true, unitPrice: true, category: { select: { categoryName: true } } },
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
    prisma.officeFormAllowance.findMany({
      where: { submissionId: BigInt(submissionId) },
      include: { allowanceType: { select: { name: true } } },
    }),
    // The officer/staff split comes from ref_grades → ref_employee_categories rather
    // than a grade-number boundary compiled into this file.
    prisma.refGrade.findMany({
      select: { gradeNo: true, category: { select: { categoryName: true } } },
    }),
  ])

  // Every rate comes from a table — `admin_rates`, `ref_fuel_types.unit_price`, or the
  // /admin/settings tiles. Nothing is compiled in, so a rate no table supplies reads as
  // 0 rather than as a number this file invented.
  const rates: Record<string, number> = {}
  if (ratesData && ratesData.length > 0) {
    for (const r of ratesData) {
      rates[r.key] = Number(r.value)
    }
  }
  // The price the administrator edits on ref_fuel_types wins over the legacy
  // admin_rates value; a blank price leaves the existing rate untouched.
  for (const f of fuelTypes) {
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

  // Form 5 allowance cards: the office supplies the count and, for the cards that
  // ask for a figure, the rate or lump sum too. The engine scales the monthly ones
  // by বেতন-ভাতা মাস.
  const allowances = allowanceRows.map((a) => ({
    name: a.allowanceType?.name || '',
    officer_count: Number(a.officerCount || 0),
    staff_count: Number(a.staffCount || 0),
    amount: Number(a.totalAnnualAmount || 0),
    total_basic: Number(a.totalBasic || 0),
    due: Number(a.dueAmount || 0),
  }))

  // Office type name
  const officeTypeName: string = submission?.office?.officeType?.name || ''

  // Grade → category, read from the reference table so the boundary between
  // officers and staff is never guessed from the grade number here.
  const categoryByGradeNo = new Map(
    gradeCategories.map((g) => [g.gradeNo, g.category.categoryName])
  )
  const categoryOf = (gradeNo: number): 'officer' | 'staff' | null => {
    const name = categoryByGradeNo.get(gradeNo)
    return name === 'officer' || name === 'staff' ? name : null
  }

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
    type_name: u.utilityType?.name || '',
    annual_cost: Number(u.annualBill || 0),
  }))

  // Format Vehicles
  const formattedVehicles = vehiclesGovt.map((v) => {
    const fuelType = v.fuelType
    const fuelName = fuelType?.name || ''

    return {
      // The price is the office's declared fuel: the config names only the category, so
      // the exact fuel on the row is what tells অকটেন from ডিজেল.
      rate_key: fuelRateKey(fuelName),
      // The category the administrator picked on /admin/settings tab 4 decides which of
      // the two fuel codes the cost lands in. Read through the FK to ref_fuel_categories
      // rather than guessed from the fuel's name; the fuel's own category is the same
      // value, so a row whose config was reassigned still follows its config.
      fuel_category: (v.config?.fuelCategory?.categoryName || fuelType?.category?.categoryName) === 'gas' ? ('gas' as const) : ('oil' as const),
      count: Number(v.vehicleCount || 1),
      monthly_fuel_allowance: Number(v.config?.monthlyFuelQuotaLiter || 0),
      annual_lube_allowance: Number(v.config?.vehicleType?.allowanceConfig?.annualLubeAllowance || 0),
      annual_maintenance_allowance: Number(
        v.config?.vehicleType?.allowanceConfig?.annualMaintenanceAllowance || 0
      ),
      additional_expense: Number(v.additionalExpense || 0),
    }
  })

  // Format Vehicle Rent
  const formattedVehicleRent = vehicleRent.map((v) => ({
    count: Number(v.vehicleCount || 1),
    monthly_rent_allowance: Number(v.config?.monthlyRentRate || 0),
  }))

  // Format IT Equipment
  const formattedITEquipment = itEquipment.map((eq) => ({
    equipment_name: eq.config?.equipmentType?.name || '',
    existing_count: Number(eq.existingCount || 0),
    toner_cost: Number(eq.tonerCostMonthly || 0),
    new_demand_count: Number(eq.newDemandCount || 0),
    // The administrator's price is the global equipment type price; a
    // per-office-type override on admin_it_config wins when one is set.
    unit_price: Number(eq.config?.unitBudget || 0) || Number(eq.config?.equipmentType?.unitPrice || 0),
  }))

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
    rates,
    salary,
    allowances,
  }
}
