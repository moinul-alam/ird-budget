/**
 * Budget Calculation Engine
 * Pure functions without React, Next.js, or database-specific imports.
 * Takes typed context and returns computed numeric values.
 *
 * The engine is a registry of named formulas (`formulaRegistry`), not a map of
 * economic codes. Which formula a code uses — and which formula an allowance
 * card feeds — is administrator-owned data (`ref_economic_codes.formula_key`,
 * `ref_allowance_types.formula_key`), so adding a code that reuses an existing
 * formula is an admin row rather than a code change. A key with no function here
 * computes 0: this engine never invents an amount.
 */

/** One grade band of a "slab" tile (see AdminSalarySlab). */
export interface SalarySlab {
  from_grade: number;
  to_grade: number;
  value: number;
}

/**
 * A tile of /admin/settings tab 1. `input_type` decides how `value` is scoped:
 * `number` applies to every grade, `grade` only inside from/to, and `slab` has
 * no meaning on `value` because its rates live in `slabs`. A paired card (ডাক)
 * carries its second field in `secondary_value`.
 */
export interface SalaryTile {
  value: number;
  secondary_value: number;
  input_type: string;
  from_grade: number | null;
  to_grade: number | null;
}

export interface BudgetSalary {
  tiles: Record<string, SalaryTile>;
  /** A "slab" tile keeps one band per grade range, so its value is a list. */
  slabs: Record<string, SalarySlab[]>;
}

export interface BudgetContext {
  staff: Array<{
    category: 'officer' | 'staff' | null;
    total_basic: number;
    /** বকেয়া বেতন — a lump-sum arrears figure, added once rather than scaled by months. */
    due_basic: number;
    count: number;
    /** Grade number (1-20) of this row, used to resolve grade-scoped rates. */
    grade_id: number;
  }>;
  newStaff?: Array<{
    category: 'officer' | 'staff' | null;
    total_salary: number;
  }>;
  leave: {
    leave_encashment_officer_basic: number;
    leave_encashment_officer_due: number;
    leave_encashment_staff_basic: number;
    leave_encashment_staff_due: number;
    rest_recreation_amount: number;
  } | null;
  /**
   * Form 11's bills, each carrying the economic code its utility type is bound to
   * (`ref_utility_types.economic_code_id`). The engine sums a bill into whichever
   * code its type names — never by matching the utility's Bengali name.
   */
  utilities: Array<{
    economic_code: string | null;
    annual_cost: number;
  }>;
  houseRent: {
    monthly_bill: number;
    due: number;
  } | null;
  /** True for a কর সার্কেল, which is the only office type that raises a postal demand. */
  officeTypeIsTaxCircle: boolean;
  /**
   * Form 7 / 8 vehicles. The purchased fuel's own price comes straight off
   * `ref_fuel_types.unit_price`, and its category names the economic code the cost
   * lands in — so two fuel categories never share a cost by name guesswork.
   */
  vehicles: Array<{
    fuel_economic_code: string | null;
    fuel_unit_price: number;
    count: number;
    monthly_fuel_allowance: number;
    annual_lube_allowance: number;
    annual_maintenance_allowance: number;
    /** ফর্ম ৭-এ অফিসের লেখা অতিরিক্ত ব্যয় — জ্বালানির ধরন অনুযায়ী সরাসরি যোগ হয়। */
    additional_expense: number;
  }>;
  vehicleRent: Array<{
    count: number;
    monthly_rent_allowance: number;
  }>;
  returnInfo: {
    /** TIN holders in the circle (form 12). */
    tin_count: number;
    return_submitted_count: number;
  } | null;
  itEquipment?: Array<{
    /** `ref_it_equipment_types.has_toner` — a toner-fed device, not a name match. */
    has_toner: boolean;
    existing_count: number;
    toner_cost: number;
    /** Form 10's requested new units and the administrator's price per unit. */
    new_demand_count: number;
    unit_price: number;
  }>;
  /** Grade-scoped rates configured on /admin/settings tab 1. */
  salary?: BudgetSalary;
  /**
   * বেতন-মাস of the submission's budget cycle — the annualising multiplier for
   * every monthly figure. It is set per cycle on /admin/budgets, so two cycles
   * with different year lengths never share one value.
   */
  salary_months: number;
  /**
   * Form 5 allowance cards, each naming the engine formula that consumes it
   * (`ref_allowance_types.formula_key`). For দায়িত্ব ভাতা the office supplies only
   * the count and the engine the rate; the rest are the office's own figures — a
   * monthly rate, a lump sum or a total basic — which the engine scales by the
   * budget months where the card describes a monthly amount.
   */
  allowances?: Array<{
    formula_key: string | null;
    /** কর্মকর্তা + কর্মচারী count on the card. */
    count: number;
    /** The card's figure: মাসিক হার or এককালীন টাকা, whichever the form collected. */
    amount: number;
    /** ফর্মে লেখা মাসিক মোট মূল বেতন — অধিকাল ভাতার ভিত্তি। */
    total_basic: number;
    /** বকেয়া — একবার যোগ হয়, মাস দিয়ে গুণ হয় না। */
    due: number;
  }>;
}

const num = (v: any) => parseFloat(v) || 0;
const int = (v: any) => parseInt(v, 10) || 0;

/**
 * Resolves a salary tile's rate for one grade. Slab tiles win because their bands
 * are the finer-grained configuration; otherwise a grade tile only applies inside
 * its own range and a plain number tile applies everywhere. A null bound is open —
 * "no lower/upper limit" — rather than a grade number this file invented.
 */
export function gradeRate(salary: BudgetSalary | undefined, key: string, gradeId: number): number {
  if (!salary) return 0

  const bands = salary.slabs[key]
  if (bands && bands.length > 0) {
    const band = bands.find((b) => gradeId >= b.from_grade && gradeId <= b.to_grade)
    return band ? num(band.value) : 0
  }

  const tile = salary.tiles[key]
  if (!tile) return 0
  if (tile.input_type === 'grade') {
    const aboveFrom = tile.from_grade === null || gradeId >= tile.from_grade
    const belowTo = tile.to_grade === null || gradeId <= tile.to_grade
    return aboveFrom && belowTo ? num(tile.value) : 0
  }
  return num(tile.value)
}

/**
 * Months in the budget year, set by the administrator as বেতন-মাস on the cycle
 * itself (/admin/budgets). Every monthly figure is annualised with this — never a
 * compiled-in 12 — so a shorter or longer budget year scales the whole sheet.
 */
const budgetMonths = (ctx: BudgetContext) => num(ctx.salary_months)

/** A /admin/settings tab-1 card's value (0 when the card is missing). */
const tileValue = (ctx: BudgetContext, key: string) => num(ctx.salary?.tiles?.[key]?.value)

/** A paired card's second field, e.g. the notices-per-non-filer on the ডাক card. */
const tileSecondary = (ctx: BudgetContext, key: string) =>
  num(ctx.salary?.tiles?.[key]?.secondary_value)

/** The form-5 cards that feed a given engine formula. */
const allowanceCards = (ctx: BudgetContext, key: string) =>
  (ctx.allowances || []).filter((a) => a.formula_key === key)

/** Annual total of a per-head monthly rate: rate × headcount-in-grade × budget months. */
const gradeMonthlyTotal = (ctx: BudgetContext, key: string) => {
  const months = budgetMonths(ctx)
  return ctx.staff.reduce(
    (sum, r) => sum + gradeRate(ctx.salary, key, int(r.grade_id)) * int(r.count) * months,
    0
  )
}

/** Annual total of a percentage-of-basic rate: grade basic × rate% × budget months. */
const gradePercentTotal = (ctx: BudgetContext, key: string) => {
  const months = budgetMonths(ctx)
  return ctx.staff.reduce(
    (sum, r) => sum + (num(r.total_basic) * gradeRate(ctx.salary, key, int(r.grade_id))) / 100 * months,
    0
  )
}

/**
 * The formulas every computed economic code names in `ref_economic_codes.formula_key`.
 * A formula receives the code it is computing so one formula can serve several codes
 * whose differences are data (a utility bill lands in whichever code its type names;
 * a fuel cost in whichever code its category names). Unknown key → 0.
 */
export const formulaRegistry: Record<string, (ctx: BudgetContext, code: string) => number> = {
  // মূল বেতন (অফিসার) — বার্ষিক মূল বেতন (মাসিক মোট × বেতন-ভাতা মাস) + বকেয়া বেতন।
  // Form 4 is নবনিয়োগপ্রাপ্ত কর্মচারী, so it never feeds an officer code.
  salary_officer: (ctx) => {
    const months = budgetMonths(ctx)
    return ctx.staff
      .filter((s) => s.category === 'officer')
      .reduce((sum, r) => sum + num(r.total_basic) * months + num(r.due_basic), 0)
  },

  // মূল বেতন (কর্মচারী) — বার্ষিক মূল বেতন + বকেয়া ও নবনিয়োগপ্রাপ্তদের বার্ষিক বেতন।
  salary_staff: (ctx) => {
    const months = budgetMonths(ctx)
    const base = ctx.staff
      .filter((s) => s.category === 'staff')
      .reduce((sum, r) => sum + num(r.total_basic) * months + num(r.due_basic), 0)
    const newStaffSum = (ctx.newStaff || [])
      .filter((s) => s.category === 'staff')
      .reduce((sum, r) => sum + num(r.total_salary), 0)
    return base + newStaffSum
  },

  // ছুটি নগদায়ন বেতন (অফিসার) — মাসিক মূল বেতন × ছুটির মাস সংখ্যা (/admin/settings) + বকেয়া।
  leave_encashment_officer: (ctx) =>
    num(ctx.leave?.leave_encashment_officer_basic) * tileValue(ctx, 'leave_encashment_months') +
    num(ctx.leave?.leave_encashment_officer_due),

  // ছুটি নগদায়ন বেতন (কর্মচারী) — মাসিক মূল বেতন × ছুটির মাস সংখ্যা + বকেয়া।
  leave_encashment_staff: (ctx) =>
    num(ctx.leave?.leave_encashment_staff_basic) * tileValue(ctx, 'leave_encashment_months') +
    num(ctx.leave?.leave_encashment_staff_due),

  // দায়িত্ব ভাতা — form 5 asks how many staff receive it; the administrator supplies
  // the monthly rate and the months paid as the two fields of one /admin/settings card.
  duty_allowance: (ctx) => {
    const count = allowanceCards(ctx, 'duty_allowance').reduce((s, a) => s + int(a.count), 0)
    return count * tileValue(ctx, 'duty_allowance') * tileSecondary(ctx, 'duty_allowance')
  },

  // যাতায়াত ভাতা (per grade monthly rate × headcount in that grade × বেতন-ভাতা মাস)
  transport_allowance: (ctx) => gradeMonthlyTotal(ctx, 'transport_allowance'),

  // শিক্ষা ভাতা (headcount × monthly rate × বেতন-ভাতা মাস)
  // The rate is a flat amount per staff member: no form collects a child count,
  // so the office headcount is the only multiplier.
  education_allowance: (ctx) => {
    const totalStaff = ctx.staff.reduce((s, r) => s + int(r.count), 0)
    return totalStaff * tileValue(ctx, 'education_allowance') * budgetMonths(ctx)
  },

  // ঝুঁকি ভাতা — form 5-এ অফিসের লেখা মাসিক হার × বেতন-ভাতা মাস + বকেয়া।
  risk_allowance: (ctx) =>
    allowanceCards(ctx, 'risk_allowance').reduce(
      (sum, a) => sum + num(a.amount) * budgetMonths(ctx) + num(a.due),
      0
    ),

  // পাহাড়ী ভাতা — form 5-এ অফিসের লেখা মাসিক হার × বেতন-ভাতা মাস + বকেয়া।
  hill_allowance: (ctx) =>
    allowanceCards(ctx, 'hill_allowance').reduce(
      (sum, a) => sum + num(a.amount) * budgetMonths(ctx) + num(a.due),
      0
    ),

  // বাড়ি ভাড়া ভাতা — the rate is a percentage of basic and the percentage is
  // banded per grade, so each grade row is matched to its own band.
  house_rent_allowance: (ctx) => gradePercentTotal(ctx, 'house_rent'),

  // চিকিৎসা ভাতা
  medical_allowance: (ctx) => {
    const totalCount = ctx.staff.reduce((s, r) => s + int(r.count), 0)
    return totalCount * tileValue(ctx, 'medical_allowance') * budgetMonths(ctx)
  },

  // মোবাইল/সেলফোন ভাতা (per grade slab × headcount in that grade × বেতন-ভাতা মাস)
  mobile_allowance: (ctx) => gradeMonthlyTotal(ctx, 'mobile_allowance'),

  // আবাসিক টেলিফোন নগদায়ন (per grade monthly rate × headcount × বেতন-ভাতা মাস)
  telephone_allowance: (ctx) => gradeMonthlyTotal(ctx, 'telephone_allowance'),

  // টিফিন ভাতা
  tiffin_allowance: (ctx) => gradeMonthlyTotal(ctx, 'tiffin_allowance'),

  // পোশাক ভাতা — form 5-এ অফিস যা লিখেছে তাই, মাস দিয়ে গুণ হয় না; বকেয়া যোগ হয়।
  dress_allowance: (ctx) =>
    allowanceCards(ctx, 'dress_allowance').reduce((sum, a) => sum + num(a.amount) + num(a.due), 0),

  // ধোলাই ভাতা
  wash_allowance: (ctx) => gradeMonthlyTotal(ctx, 'wash_allowance'),

  // উৎসব ভাতা
  festival_bonus: (ctx) => {
    const totalBasicAll = ctx.staff.reduce((s, r) => s + num(r.total_basic), 0)
    return totalBasicAll * tileValue(ctx, 'festival_bonus_multiplier')
  },

  // অধিকাল ভাতা (চালক) — form 5-এ অফিসের লেখা মাসিক মোট মূল বেতন × বেতন-ভাতা মাস + বকেয়া।
  overtime_allowance: (ctx) =>
    allowanceCards(ctx, 'overtime_allowance').reduce(
      (sum, a) => sum + num(a.total_basic) * budgetMonths(ctx) + num(a.due),
      0
    ),

  // শ্রান্তি ও বিনোদন ভাতা (form 5 / form 6-এ অফিসের লেখা পরিমাণ)
  rest_recreation: (ctx) => num(ctx.leave?.rest_recreation_amount),

  // আপ্যায়ন ভাতা (per grade monthly rate × headcount in that grade × বেতন-ভাতা মাস)
  entertainment_allowance: (ctx) => gradeMonthlyTotal(ctx, 'entertainment_allowance'),

  // বাংলা নববর্ষ ভাতা — a one-off payment, so the percentage is applied to one
  // month of basic and never multiplied by the budget months.
  noboborsho_allowance: (ctx) => {
    const totalBasicAll = ctx.staff.reduce((s, r) => s + num(r.total_basic), 0)
    return (totalBasicAll * tileValue(ctx, 'noboborsho_percent')) / 100
  },

  // বিশেষ সুবিধা — percentage of basic, banded per grade, paid monthly.
  special_benefit: (ctx) => gradePercentTotal(ctx, 'special_benefit'),

  // ইউটিলিটি বিল (ফরম ১১) — বিদ্যুৎ / পানি / ইন্টারনেট / টেলিফোন সব একই সূত্রে,
  // কেবল কোডটি আলাদা। প্রতিটি ইউটিলিটির ধরন তার নিজের অর্থনৈতিক কোডে যোগ হয়
  // (`ref_utility_types.economic_code_id`), নাম মিলিয়ে নয়।
  utility_bill: (ctx, code) =>
    ctx.utilities
      .filter((u) => u.economic_code === code)
      .reduce((sum, u) => sum + num(u.annual_cost), 0),

  // ডাক — only a কর সার্কেল raises a postal demand (the flag on the office type). The
  // non-filer count (tin − returns) is multiplied by the notices each non-filer is
  // served and the cost of one notice; both come from the ডাক card on /admin/settings.
  // Every other office type keeps 0 and overrides the line by hand (see
  // `allow_manual_override` on the code).
  postal_demand: (ctx) => {
    if (!ctx.officeTypeIsTaxCircle) return 0
    const info = ctx.returnInfo
    if (!info) return 0
    const nonFilerCount = Math.max(0, int(info.tin_count) - int(info.return_submitted_count))
    return nonFilerCount * tileSecondary(ctx, 'postal_rate') * tileValue(ctx, 'postal_rate')
  },

  // অফিস ভবন ভাড়া
  office_rent: (ctx) => {
    const monthly = num(ctx.houseRent?.monthly_bill)
    const due = num(ctx.houseRent?.due)
    const vatPct = tileValue(ctx, 'office_rent_vat_percent')
    return monthly * budgetMonths(ctx) * (1 + vatPct / 100) + due
  },

  // পেট্রোল, অয়েল ও লুব্রিকেন্ট / গ্যাস ও জ্বালানী — one formula, two codes. A fuel
  // category names the code its cost lands in, so the engine sums each vehicle into
  // whichever code its fuel's category points at.
  fuel_by_category: (ctx, code) => {
    const months = budgetMonths(ctx)
    return ctx.vehicles
      .filter((v) => v.fuel_economic_code === code)
      .reduce((sum, v) => {
        const monthlyFuel = num(v.monthly_fuel_allowance) * num(v.fuel_unit_price)
        const annualFuel = monthlyFuel * months * int(v.count)
        const annualLube = num(v.annual_lube_allowance) * int(v.count)
        return sum + annualFuel + annualLube + num(v.additional_expense)
      }, 0)
  },

  // যানবাহন ব্যবহার (চুক্তিভিত্তিক)
  vehicle_rent: (ctx) => {
    const months = budgetMonths(ctx)
    return ctx.vehicleRent.reduce(
      (sum, vr) => sum + int(vr.count) * num(vr.monthly_rent_allowance) * months,
      0
    )
  },

  // মোটরযান রক্ষণাবেক্ষণ — per-vehicle yearly maintenance × number of vehicles.
  // Two codes name this formula; both share the administrator's per-type allowance.
  vehicle_maintenance: (ctx) =>
    ctx.vehicles.reduce((sum, v) => sum + num(v.annual_maintenance_allowance) * int(v.count), 0),

  // কম্পিউটার সামগ্রী — প্রতি টোনারের দাম × টোনার-চালিত যন্ত্রের সংখ্যা × বেতন-ভাতা মাস
  // (/admin/settings)। কোন যন্ত্র টোনার নেয় তা `has_toner` বলে, নাম নয়; মাসের সংখ্যা
  // কোনো জায়গায় স্থির নয় — দুটির একটি না থাকলে গুণক শূন্য।
  it_toner: (ctx) => {
    const months = budgetMonths(ctx)
    return (ctx.itEquipment || [])
      .filter((eq) => eq.has_toner)
      .reduce((sum, eq) => sum + int(eq.existing_count) * num(eq.toner_cost) * months, 0)
  },

  // কম্পিউটার ও আনুষঙ্গিক — চাহিদাকৃত সংখ্যা × প্রমিত সরকারি ক্রয়মূল্য
  // (/admin/settings?tab=equipment-এ অ্যাডমিনের নির্ধারিত মূল্য)।
  it_purchase: (ctx) =>
    (ctx.itEquipment || []).reduce(
      (sum, eq) => sum + int(eq.new_demand_count) * num(eq.unit_price),
      0
    ),
}

/**
 * Live preview for the calculated cards of form 5, dispatched by the card's
 * `formula_key` so the preview and the sheet can never disagree. `rates` carries
 * the administrator's দায়িত্ব ভাতা rate and months and the cycle's বেতন-মাস; a card
 * whose formula has no preview (or no key at all) previews 0 rather than a number
 * this file invented.
 */
export interface AllowancePreviewRow {
  count: number
  total_basic: number
  amount: number
  due: number
}

export interface AllowancePreviewRates {
  /** The দায়িত্ব ভাতা monthly rate (the card's own value). */
  dutyMonthlyRate: number
  /** The দায়িত্ব ভাতা months (the card's second field). */
  dutyMonths: number
  /** The submission's budget-cycle বেতন-মাস. */
  salaryMonths: number
}

export const calculateAllowance = (
  formulaKey: string | null | undefined,
  row: AllowancePreviewRow,
  rates: AllowancePreviewRates
): number => {
  const count = Math.max(0, Math.floor(row.count) || 0)
  const basic = Math.max(0, Number(row.total_basic) || 0)
  const amount = Math.max(0, Number(row.amount) || 0)
  const due = Math.max(0, Number(row.due) || 0)
  const salaryMonths = Math.max(0, Number(rates.salaryMonths) || 0)

  switch (formulaKey) {
    case 'duty_allowance':
      return Math.round(
        count * Math.max(0, rates.dutyMonthlyRate) * Math.max(0, rates.dutyMonths)
      )
    case 'overtime_allowance':
      return Math.round(basic * salaryMonths + due)
    case 'risk_allowance':
    case 'hill_allowance':
      return Math.round(amount * salaryMonths + due)
    case 'dress_allowance':
      return Math.round(amount + due)
    default:
      return 0
  }
}

/**
 * Computes every code the caller passes, dispatching each to the formula its
 * `formula_key` names. A code with no key — or a key with no formula — is 0.
 */
export const calculateAll = (
  codes: Array<{ code: string; formula_key: string | null }>,
  ctx: BudgetContext
): Record<string, number> => {
  const results: Record<string, number> = {}
  for (const c of codes) {
    const fn = c.formula_key ? formulaRegistry[c.formula_key] : undefined
    results[c.code] = fn ? Math.round(fn(ctx, c.code)) : 0
  }
  return results
}
