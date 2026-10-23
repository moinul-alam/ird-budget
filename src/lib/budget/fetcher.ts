import { prisma } from '@/lib/db/client'
import type { BudgetContext } from './calculate'

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
    }),
    prisma.officeFormHouseRent.findUnique({
      where: { submissionId: BigInt(submissionId) },
    }),
    prisma.officeFormVehicleGovt.findMany({
      where: { submissionId: BigInt(submissionId) },
      include: {
        config: {
          include: {
            fuelType: true,
          },
        },
      },
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
  ])

  // Get rates
  const defaultRates: Record<string, number> = {
    medical_allowance_monthly: 1500,
    house_rent_percent: 50,
    festival_bonus_multiplier: 2,
    provident_fund_percent: 10,
    fuel_price_octane: 130,
    fuel_price_diesel: 110,
    fuel_price_cng: 45,
    vat_percentage: 15,
    postal_expense_rate: 50,
    education_allowance: 500,
  }
  const rates: Record<string, number> = { ...defaultRates }
  if (ratesData && ratesData.length > 0) {
    for (const r of ratesData) {
      rates[r.key] = Number(r.value)
    }
  }

  // Office type name
  const officeTypeName: string = submission?.office?.officeType?.name || ''

  // Format Staff Working
  const formattedStaff = staffWorking.map((s) => ({
    category: s.gradeId <= 9 ? ('officer' as const) : ('staff' as const),
    total_basic: Number(s.monthlyBasic || 0),
    count: Number(s.staffCount || 0),
  }))

  // Format New Recruits
  const formattedNewStaff = staffNewRecruits.map((p) => ({
    category: p.gradeId <= 9 ? ('officer' as const) : ('staff' as const),
    total_salary: Number(p.totalSalary || 0),
  }))

  // Format Utilities
  const formattedUtilities = utilities.map((u) => ({
    type_name: u.utilityType?.name || '',
    annual_cost: Number(u.annualBill || 0),
  }))

  // Format Vehicles
  const formattedVehicles = vehiclesGovt.map((v) => {
    const fType = v.config?.fuelType?.name || ''
    let rateKey = 'fuel_price_octane'
    if (fType.toLowerCase().includes('diesel') || fType.includes('ডিজেল')) rateKey = 'fuel_price_diesel'
    if (fType.toLowerCase().includes('cng') || fType.includes('gas') || fType.includes('গ্যাস') || fType.includes('সিএনজি')) rateKey = 'fuel_price_cng'

    return {
      rate_key: rateKey,
      fuel_name: fType,
      count: Number(v.vehicleCount || 1),
      monthly_fuel_allowance: Number(v.config?.monthlyFuelQuotaLiter || 0),
      annual_lube_allowance: Number(v.config?.annualLubeAllowance || 0),
      annual_maintenance_allowance: Number(v.config?.annualMaintenanceAllowance || 0),
      maintenance_cost: Number(v.maintenanceDue || 0),
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
  }))

  return {
    officeTypeName,
    staff: formattedStaff,
    newStaff: formattedNewStaff,
    leave: leave ? {
      leave_encashment_officer_basic: Number(leave.leaveEncashmentOfficerBasic || 0),
      leave_encashment_staff_basic: Number(leave.leaveEncashmentStaffBasic || 0),
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
      return_submitted_count: Number(returnInfo.returnSubmittedCount || 0),
    } : null,
    itEquipment: formattedITEquipment,
    rates,
  }
}
