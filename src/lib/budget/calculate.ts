/**
 * Budget Calculation Engine
 * Pure functions without React, Next.js, or database-specific imports.
 * Takes typed context and returns computed numeric values.
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
 * no meaning on `value` because its rates live in `slabs`.
 */
export interface SalaryTile {
  value: number;
  input_type: string;
  from_grade: number | null;
  to_grade: number | null;
}

export interface BudgetSalary {
  tiles: Record<string, SalaryTile>;
  slabs: Record<string, SalarySlab[]>;
}

/**
 * দায়িত্ব ভাতা is only payable for part of the year (six months), unlike every
 * other monthly allowance here which runs the full twelve.
 */
export const DUTY_ALLOWANCE_MONTHS = 6;

export interface BudgetContext {
  staff: Array<{
    category: 'officer' | 'staff' | null;
    total_basic: number;
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
    leave_encashment_staff_basic: number;
    rest_recreation_amount: number;
  } | null;
  utilities: Array<{
    type_name: string; // e.g., 'বিদ্যুৎ', 'পানি', 'ইন্টারনেট'
    annual_cost: number;
  }>;
  houseRent: {
    monthly_bill: number;
    due: number;
  } | null;
  officeTypeName?: string;
  vehicles: Array<{
    rate_key: string | null; // e.g., 'fuel_price_octane', 'fuel_price_diesel', 'fuel_price_cng'
    /** 'oil' বা 'gas' — /admin/settings এর জ্বালানির দর ট্যাবে সেট করা ধরন। */
    fuel_category: 'oil' | 'gas';
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
    equipment_name: string;
    existing_count: number;
    toner_cost: number;
    /** Form 10's requested new units and the administrator's price per unit. */
    new_demand_count: number;
    unit_price: number;
  }>;
  rates: Record<string, number>;
  /** Grade-scoped rates configured on /admin/settings tab 1. */
  salary?: BudgetSalary;
  /**
   * Form 5 allowance cards. The office counts who qualifies for these, so the
   * engine only supplies the rate.
   */
  allowances?: Array<{
    name: string;
    officer_count: number;
    staff_count: number;
  }>;
}

const num = (v: any) => parseFloat(v) || 0;
const int = (v: any) => parseInt(v, 10) || 0;

/**
 * Resolves a salary tile's rate for one grade. Slab tiles win because their bands
 * are the finer-grained configuration; otherwise a grade tile only applies inside
 * its own range and a plain number tile applies everywhere.
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
    const from = tile.from_grade ?? 1
    const to = tile.to_grade ?? 20
    return gradeId >= from && gradeId <= to ? num(tile.value) : 0
  }
  return num(tile.value)
}

/** Annual total of a per-head monthly rate: rate × headcount-in-grade × 12. */
const gradeMonthlyTotal = (ctx: BudgetContext, key: string) =>
  ctx.staff.reduce(
    (sum, r) => sum + gradeRate(ctx.salary, key, int(r.grade_id)) * int(r.count) * 12,
    0
  );

/** Annual total of a percentage-of-basic rate: grade basic × rate% × 12. */
const gradePercentTotal = (ctx: BudgetContext, key: string) =>
  ctx.staff.reduce(
    (sum, r) => sum + (num(r.total_basic) * gradeRate(ctx.salary, key, int(r.grade_id))) / 100 * 12,
    0
  );

export const codeFormulas: Record<string, (ctx: BudgetContext) => number> = {
  // মূল বেতন (অফিসার)
  '3111101': (ctx) => {
    const officerRows = ctx.staff.filter((s) => s.category === 'officer');
    const base = officerRows.reduce((sum, r) => sum + num(r.total_basic) * 12, 0);
    const newOfficer = (ctx.newStaff || [])
      .filter((s) => s.category === 'officer')
      .reduce((sum, r) => sum + num(r.total_salary), 0);
    return base + newOfficer;
  },
  
  // মূল বেতন (কর্মচারী)
  '3111201': (ctx) => {
    const staffRows = ctx.staff.filter((s) => s.category === 'staff');
    const base = staffRows.reduce((sum, r) => sum + num(r.total_basic) * 12, 0);
    const newStaffSum = (ctx.newStaff || [])
      .filter((s) => s.category === 'staff')
      .reduce((sum, r) => sum + num(r.total_salary), 0);
    return base + newStaffSum;
  },

  // ছুটি নগদায়ন বেতন (অফিসার)
  '3111110': (ctx) => num(ctx.leave?.leave_encashment_officer_basic),
  
  // ছুটি নগদায়ন বেতন (কর্মচারী)
  '3111209': (ctx) => num(ctx.leave?.leave_encashment_staff_basic),

  // দায়িত্ব ভাতা — form 5 asks the office how many staff receive it; the
  // administrator only supplies the monthly rate.
  '3111301': (ctx) => {
    const row = (ctx.allowances || []).find((a) => a.name === 'duty');
    const count = int(row?.officer_count) + int(row?.staff_count);
    const monthlyRate = num(ctx.salary?.tiles?.duty_allowance?.value);
    return count * monthlyRate * DUTY_ALLOWANCE_MONTHS;
  },

  // যাতায়াত ভাতা (per grade monthly rate × headcount in that grade × 12)
  '3111302': (ctx) => gradeMonthlyTotal(ctx, 'transport_allowance'),

  // শিক্ষা ভাতা (headcount * monthly rate * 12 months)
  // The rate is a flat amount per staff member: no form collects a child count,
  // so the office headcount is the only multiplier.
  '3111306': (ctx) => {
    const totalStaff = ctx.staff.reduce((s, r) => s + int(r.count), 0);
    return totalStaff * (ctx.rates.education_allowance || 0) * 12;
  },

  // বাড়ি ভাড়া ভাতা — the rate is a percentage of basic and the percentage is
  // banded per grade, so each grade row is matched to its own band.
  '3111310': (ctx) => gradePercentTotal(ctx, 'house_rent'),

  // চিকিৎসা ভাতা
  '3111311': (ctx) => {
    const totalCount = ctx.staff.reduce((s, r) => s + int(r.count), 0);
    return totalCount * (ctx.rates.medical_allowance_monthly || 0) * 12;
  },

  // মোবাইল/সেলফোন ভাতা (per grade slab × headcount in that grade × 12)
  '3111312': (ctx) => gradeMonthlyTotal(ctx, 'mobile_allowance'),

  // আবাসিক টেলিফোন নগদায়ন (per grade monthly rate × headcount × 12)
  '3111313': (ctx) => gradeMonthlyTotal(ctx, 'telephone_allowance'),

  // টিফিন ভাতা
  '3111314': (ctx) => gradeMonthlyTotal(ctx, 'tiffin_allowance'),

  // ধোলাই ভাতা
  '3111316': (ctx) => gradeMonthlyTotal(ctx, 'wash_allowance'),

  // উৎসব ভাতা
  '3111325': (ctx) => {
    const totalBasicAll = ctx.staff.reduce((s, r) => s + num(r.total_basic), 0);
    return totalBasicAll * (ctx.rates.festival_bonus_multiplier || 0);
  },

  // শ্রান্তি ও বিনোদন ভাতা (Manual entry from form - leave blank or direct form value)
  '3111328': (ctx) => num(ctx.leave?.rest_recreation_amount),

  // আপ্যায়ন ভাতা (per grade monthly rate × headcount in that grade × 12)
  '3111331': (ctx) => gradeMonthlyTotal(ctx, 'entertainment_allowance'),

  // বাংলা নববর্ষ ভাতা — a one-off payment, so the percentage is applied to one
  // month of basic and never multiplied by twelve.
  '3111335': (ctx) => {
    const totalBasicAll = ctx.staff.reduce((s, r) => s + num(r.total_basic), 0);
    return (totalBasicAll * num(ctx.salary?.tiles?.noboborsho_percent?.value)) / 100;
  },

  // বিশেষ সুবিধা — percentage of basic, banded per grade, paid monthly.
  '3111352': (ctx) => gradePercentTotal(ctx, 'special_benefit'),

  // বিদ্যুৎ (Manual entry)
  '3211113': (ctx) => {
    const row = ctx.utilities.find((u) => u.type_name === 'বিদ্যুৎ');
    return num(row?.annual_cost);
  },
  
  // পানি (Manual entry)
  '3211115': (ctx) => {
    const row = ctx.utilities.find((u) => u.type_name === 'পানি');
    return num(row?.annual_cost);
  },
  
  // ইন্টারনেট/ফ্যাক্স/টেলেক্স (Manual entry)
  '3211117': (ctx) => {
    const row = ctx.utilities.find((u) => u.type_name === 'ইন্টারনেট');
    return num(row?.annual_cost);
  },

  // ডাক — only কর সার্কেল raises a postal demand. The non-filer count (tin − returns) is
  // multiplied by the notices each non-filer is served and the cost of one notice; both
  // come from the ডাক card on /admin/settings. Every other office type keeps 0 and
  // overrides the line by hand (see `allow_manual_override` on the code).
  '3211119': (ctx) => {
    const isTaxCircle = ctx.officeTypeName?.includes('সার্কেল') || ctx.officeTypeName?.includes('কর সার্কেল');
    if (!isTaxCircle && ctx.officeTypeName) {
      return 0; // open for manual entry for other offices
    }
    const info = ctx.returnInfo;
    if (!info) return 0;
    const nonFilerCount = Math.max(0, int(info.tin_count) - int(info.return_submitted_count));
    // Both factors come from the ডাক card. There is no fallback quantity: if the card
    // is absent the demand is zero rather than a number this engine invented, and the
    // office can still fill the line in by hand.
    const notices = num(ctx.rates.postal_notice_count);
    return nonFilerCount * notices * (ctx.rates.postal_expense_rate || 0);
  },

  // অফিস ভবন ভাড়া
  '3211129': (ctx) => {
    const monthly = num(ctx.houseRent?.monthly_bill);
    const due = num(ctx.houseRent?.due);
    const vatPct = ctx.rates.vat_percentage || 0;
    return monthly * 12 * (1 + vatPct / 100) + due;
  },

  // পেট্রোল, অয়েল ও লুব্রিকেন্ট — every fuel the administrator classed as oil on
  // /admin/settings (জ্বালানির দর); the category decides, not the fuel's name.
  '3243301': (ctx) => {
    return ctx.vehicles
      .filter((v) => v.fuel_category === 'oil')
      .reduce((sum, v) => {
        const fuelRate = ctx.rates[v.rate_key!] || 0;
        const monthlyFuel = num(v.monthly_fuel_allowance) * fuelRate;
        const annualFuel = monthlyFuel * 12 * int(v.count);
        const annualLube = num(v.annual_lube_allowance) * int(v.count);
        // অতিরিক্ত ব্যয় is the office's own figure for this row, so it is added
        // as-is — no monthly or per-vehicle multiplication.
        return sum + annualFuel + annualLube + num(v.additional_expense);
      }, 0);
  },

  // গ্যাস ও জ্বালানী — every fuel the administrator classed as gas.
  '3243302': (ctx) => {
    return ctx.vehicles
      .filter((v) => v.fuel_category === 'gas')
      .reduce((sum, v) => {
        const fuelRate = ctx.rates[v.rate_key!] || 0;
        const monthlyFuel = num(v.monthly_fuel_allowance) * fuelRate;
        const annualFuel = monthlyFuel * 12 * int(v.count);
        const annualLube = num(v.annual_lube_allowance) * int(v.count);
        return sum + annualFuel + annualLube + num(v.additional_expense);
      }, 0);
  },

  // যানবাহন ব্যবহার (চুক্তিভিত্তিক)
  '3211107': (ctx) => {
    return ctx.vehicleRent.reduce((sum, vr) => {
      return sum + int(vr.count) * num(vr.monthly_rent_allowance) * 12;
    }, 0);
  },

  // কম্পিউটার সামগ্রী — প্রতি টোনারের দাম × প্রিন্টারের সংখ্যা × বেতন-ভাতা মাস
  // (/admin/settings)। মাসের সংখ্যা কোনো জায়গায় স্থির করা নয়; টাইলটি না থাকলে
  // গুণক শূন্য, অর্থাৎ বরাদ্দ শূন্য — কোনো সংখ্যা এই ইঞ্জিন বানিয়ে দেয় না।
  '3255101': (ctx) => {
    const months = num(ctx.salary?.tiles?.salary_months?.value);
    const printers = (ctx.itEquipment || []).filter((eq) =>
      eq.equipment_name.toLowerCase().includes('printer') || eq.equipment_name.includes('প্রিন্টার')
    );
    return printers.reduce((sum, p) => {
      return sum + int(p.existing_count) * num(p.toner_cost) * months;
    }, 0);
  },

  // কম্পিউটার ও আনুষঙ্গিক — চাহিদাকৃত সংখ্যা × প্রমিত সরকারি ক্রয়মূল্য
  // (/admin/settings?tab=equipment-এ অ্যাডমিনের নির্ধারিত মূল্য)।
  '4112202': (ctx) => {
    return (ctx.itEquipment || []).reduce(
      (sum, eq) => sum + int(eq.new_demand_count) * num(eq.unit_price),
      0
    );
  },

  // মোটরযান (per-vehicle yearly maintenance × number of vehicles)
  '3258101': (ctx) => {
    return ctx.vehicles.reduce((sum, v) => {
      return sum + num(v.annual_maintenance_allowance) * int(v.count);
    }, 0);
  },

  // মোটরযান রক্ষণাবেক্ষণ ব্যয় (alias for 3258101)
  '3258140': (ctx) => {
    return ctx.vehicles.reduce((sum, v) => {
      return sum + num(v.annual_maintenance_allowance) * int(v.count);
    }, 0);
  },
};

/**
 * Live preview for the calculated cards of form 5. `dutyMonthlyRate` is the
 * administrator's দায়িত্ব ভাতা tile; without it the card cannot be projected.
 */
export const calculateAllowance = (
  allowanceName: string,
  count: number,
  totalBasic: number,
  dutyMonthlyRate = 0
): number => {
  const safeCount = Math.max(0, Math.floor(count) || 0);
  const safeBasic = Math.max(0, Number(totalBasic) || 0);

  switch (allowanceName) {
    case 'overtime':
      return Math.round(safeBasic * 0.1 * safeCount);
    case 'duty':
      return Math.round(safeCount * Math.max(0, dutyMonthlyRate) * DUTY_ALLOWANCE_MONTHS);
    default:
      return 0;
  }
};

export const calculateAll = (codes: string[], ctx: BudgetContext): Record<string, number> => {
  const results: Record<string, number> = {};
  for (const code of codes) {
    const fn = codeFormulas[code];
    results[code] = fn ? Math.round(fn(ctx)) : 0;
  }
  return results;
};
