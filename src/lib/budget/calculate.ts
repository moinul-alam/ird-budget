/**
 * Budget Calculation Engine
 * Pure functions without React, Next.js, or Supabase imports.
 * Takes typed context and returns computed numeric values.
 */

export interface BudgetContext {
  staff: Array<{
    category: 'officer' | 'staff' | null;
    total_basic: number;
    count: number;
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
  vehicles: Array<{
    rate_key: string | null; // e.g., 'fuel_price_octane', 'fuel_price_diesel', 'fuel_price_cng'
    count: number;
    monthly_fuel_allowance: number;
    annual_lube_allowance: number;
    annual_maintenance_allowance: number;
    maintenance_cost: number;
  }>;
  vehicleRent: Array<{
    count: number;
    monthly_rent_allowance: number;
  }>;
  returnInfo: {
    return_submitted_count: number;
  } | null;
  rates: Record<string, number>;
}

const num = (v: any) => parseFloat(v) || 0;
const int = (v: any) => parseInt(v, 10) || 0;

export const codeFormulas: Record<string, (ctx: BudgetContext) => number> = {
  // মূল বেতন (অফিসার)
  '3111101': (ctx) => {
    const officerRows = ctx.staff.filter((s) => s.category === 'officer');
    return officerRows.reduce((sum, r) => sum + num(r.total_basic) * 12, 0);
  },
  
  // মূল বেতন (কর্মচারী)
  '3111201': (ctx) => {
    const staffRows = ctx.staff.filter((s) => s.category === 'staff');
    return staffRows.reduce((sum, r) => sum + num(r.total_basic) * 12, 0);
  },

  // ছুটি নগদায়ন বেতন (অফিসার)
  '3111110': (ctx) => num(ctx.leave?.leave_encashment_officer_basic),
  
  // ছুটি নগদায়ন বেতন (কর্মচারী)
  '3111209': (ctx) => num(ctx.leave?.leave_encashment_staff_basic),

  // বাড়ি ভাড়া ভাতা
  '3111310': (ctx) => {
    const totalBasicAll = ctx.staff.reduce((s, r) => s + num(r.total_basic), 0);
    return (totalBasicAll * (ctx.rates.house_rent_percent || 0)) / 100 * 12;
  },

  // চিকিৎসা ভাতা
  '3111311': (ctx) => {
    const totalCount = ctx.staff.reduce((s, r) => s + int(r.count), 0);
    return totalCount * (ctx.rates.medical_allowance_monthly || 0) * 12;
  },

  // উৎসব ভাতা
  '3111325': (ctx) => {
    const totalBasicAll = ctx.staff.reduce((s, r) => s + num(r.total_basic), 0);
    return totalBasicAll * (ctx.rates.festival_bonus_multiplier || 0);
  },

  // শ্রান্তি ও বিনোদন ভাতা
  '3111328': (ctx) => num(ctx.leave?.rest_recreation_amount),

  // বিদ্যুৎ
  '3211113': (ctx) => {
    const row = ctx.utilities.find((u) => u.type_name === 'বিদ্যুৎ');
    return num(row?.annual_cost);
  },
  
  // পানি
  '3211115': (ctx) => {
    const row = ctx.utilities.find((u) => u.type_name === 'পানি');
    return num(row?.annual_cost);
  },
  
  // ইন্টারনেট/ফ্যাক্স/টেলেক্স
  '3211117': (ctx) => {
    const row = ctx.utilities.find((u) => u.type_name === 'ইন্টারনেট');
    return num(row?.annual_cost);
  },

  // ডাক
  '3211119': (ctx) => {
    return int(ctx.returnInfo?.return_submitted_count) * (ctx.rates.postal_expense_rate || 0);
  },

  // অফিস ভবন ভাড়া
  '3211129': (ctx) => {
    const monthly = num(ctx.houseRent?.monthly_bill);
    const due = num(ctx.houseRent?.due);
    const vatPct = ctx.rates.vat_percentage || 0;
    return monthly * 12 * (1 + vatPct / 100) + due;
  },

  // পেট্রোল, অয়েল ও লুব্রিকেন্ট
  '3243301': (ctx) => {
    return ctx.vehicles
      .filter((v) => v.rate_key === 'fuel_price_octane')
      .reduce((sum, v) => {
        const fuelRate = ctx.rates[v.rate_key!] || 0;
        const monthlyFuel = num(v.monthly_fuel_allowance) * fuelRate;
        const annualFuel = monthlyFuel * 12 * int(v.count);
        const annualLube = num(v.annual_lube_allowance) * int(v.count);
        return sum + annualFuel + annualLube;
      }, 0);
  },

  // গ্যাস ও জ্বালানী
  '3243302': (ctx) => {
    return ctx.vehicles
      .filter((v) => v.rate_key === 'fuel_price_diesel' || v.rate_key === 'fuel_price_cng')
      .reduce((sum, v) => {
        const fuelRate = ctx.rates[v.rate_key!] || 0;
        const monthlyFuel = num(v.monthly_fuel_allowance) * fuelRate;
        const annualFuel = monthlyFuel * 12 * int(v.count);
        const annualLube = num(v.annual_lube_allowance) * int(v.count);
        return sum + annualFuel + annualLube;
      }, 0);
  },

  // যানবাহন ব্যবহার (চুক্তিভিত্তিক)
  '3211107': (ctx) => {
    return ctx.vehicleRent.reduce((sum, vr) => {
      return sum + int(vr.count) * num(vr.monthly_rent_allowance) * 12;
    }, 0);
  },

  // মোটরযান রক্ষণারবক্ষণ ব্যয়
  '3258140': (ctx) => {
    return ctx.vehicles.reduce((sum, v) => {
      const maint = num(v.annual_maintenance_allowance);
      return sum + maint * int(v.count) + num(v.maintenance_cost);
    }, 0);
  },
};

export const calculateAllowance = (allowanceName: string, count: number, totalBasic: number): number => {
  const safeCount = Math.max(0, Math.floor(count) || 0);
  const safeBasic = Math.max(0, Number(totalBasic) || 0);

  switch (allowanceName) {
    case 'overtime':
      return Math.round(safeBasic * 0.1 * safeCount);
    case 'duty':
      return safeCount * 500;
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
