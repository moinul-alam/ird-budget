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
    fuel_name?: string; // e.g., 'অকটেন', 'পেট্রোল', 'ডিজেল', 'সিএনজি'
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
  itEquipment?: Array<{
    equipment_name: string;
    existing_count: number;
    toner_cost: number;
  }>;
  rates: Record<string, number>;
}

const num = (v: any) => parseFloat(v) || 0;
const int = (v: any) => parseInt(v, 10) || 0;

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

  // শিক্ষা ভাতা (total staff * 2 (max number of child) * default rate * 12 months)
  '3111306': (ctx) => {
    const totalStaff = ctx.staff.reduce((s, r) => s + int(r.count), 0);
    const childRate = ctx.rates.education_allowance || 500;
    return totalStaff * 2 * childRate * 12;
  },

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

  // শ্রান্তি ও বিনোদন ভাতা (Manual entry from form - leave blank or direct form value)
  '3111328': (ctx) => num(ctx.leave?.rest_recreation_amount),

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

  // ডাক (valid only for কর সার্কেল, kept open/0 for other offices)
  '3211119': (ctx) => {
    const isTaxCircle = ctx.officeTypeName?.includes('সার্কেল') || ctx.officeTypeName?.includes('কর সার্কেল');
    if (!isTaxCircle && ctx.officeTypeName) {
      return 0; // open for manual entry for other offices
    }
    return int(ctx.returnInfo?.return_submitted_count) * (ctx.rates.postal_expense_rate || 0);
  },

  // অফিস ভবন ভাড়া
  '3211129': (ctx) => {
    const monthly = num(ctx.houseRent?.monthly_bill);
    const due = num(ctx.houseRent?.due);
    const vatPct = ctx.rates.vat_percentage || 0;
    return monthly * 12 * (1 + vatPct / 100) + due;
  },

  // পেট্রোল, অয়েল ও লুব্রিকেন্ট (any oil: petrol, octane, diesel - anything other than gas)
  '3243301': (ctx) => {
    return ctx.vehicles
      .filter((v) => {
        const key = (v.rate_key || '').toLowerCase();
        const fname = (v.fuel_name || '').toLowerCase();
        const isGas = key.includes('cng') || key.includes('gas') || fname.includes('সিএনজি') || fname.includes('গ্যাস');
        return !isGas; // All oil vehicles (octane, petrol, diesel)
      })
      .reduce((sum, v) => {
        const fuelRate = ctx.rates[v.rate_key!] || 0;
        const monthlyFuel = num(v.monthly_fuel_allowance) * fuelRate;
        const annualFuel = monthlyFuel * 12 * int(v.count);
        const annualLube = num(v.annual_lube_allowance) * int(v.count);
        return sum + annualFuel + annualLube;
      }, 0);
  },

  // গ্যাস ও জ্বালানী (only gas, no oil)
  '3243302': (ctx) => {
    return ctx.vehicles
      .filter((v) => {
        const key = (v.rate_key || '').toLowerCase();
        const fname = (v.fuel_name || '').toLowerCase();
        return key.includes('cng') || key.includes('gas') || fname.includes('সিএনজি') || fname.includes('গ্যাস');
      })
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

  // কম্পিউটার সামগ্রী (number of printers * toner price * 12)
  '3255101': (ctx) => {
    const printers = (ctx.itEquipment || []).filter((eq) =>
      eq.equipment_name.toLowerCase().includes('printer') || eq.equipment_name.includes('প্রিন্টার')
    );
    return printers.reduce((sum, p) => {
      return sum + int(p.existing_count) * num(p.toner_cost) * 12;
    }, 0);
  },

  // মোটরযান (number of vehicle * yearly maintenance)
  '3258101': (ctx) => {
    return ctx.vehicles.reduce((sum, v) => {
      const maint = num(v.annual_maintenance_allowance);
      return sum + maint * int(v.count) + num(v.maintenance_cost);
    }, 0);
  },

  // মোটরযান রক্ষণারবক্ষণ ব্যয় (alias for 3258101)
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
