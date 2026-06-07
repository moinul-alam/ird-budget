/**
 * Budget Calculation Engine
 * 
 * This engine computes auto_value for expense codes by pulling data
 * from all form tables (staff, leave, vehicles, utilities, house rent,
 * return info) and applying known formulas.
 * 
 * Codes without a computable formula get auto_value = 0 and rely on
 * manual_value entry in the budget sheet UI.
 */

// ── helpers ──────────────────────────────────────────────────────
const num = (v) => parseFloat(v) || 0;
const int = (v) => parseInt(v, 10) || 0;

const buildRateMap = (ratesArr) => {
  const m = {};
  (ratesArr || []).forEach(r => { m[r.key] = num(r.value); });
  return m;
};

// ── per-code calculators ────────────────────────────────────────
// Each key is an expense_code.code string.
// The function receives a context object { staff, leave, utilities,
//   houseRent, vehicles, vehicleRent, returnInfo, rates, utilityTypes }
// and returns a numeric auto_value.

export const codeFormulas = {

  // ─── SALARY ───────────────────────────────────────────────────
  // মূল বেতন (অফিসার) — annual officer basic (× 12)
  '3111101': (ctx) => {
    const officerRows = (ctx.staff || []).filter(s => s.grades?.category === 'officer');
    return officerRows.reduce((sum, r) => sum + num(r.total_basic) * 12, 0);
  },
  // মূল বেতন (কর্মচারী) — annual staff basic (× 12)
  '3111201': (ctx) => {
    const staffRows = (ctx.staff || []).filter(s => s.grades?.category === 'staff');
    return staffRows.reduce((sum, r) => sum + num(r.total_basic) * 12, 0);
  },

  // ─── LEAVE ENCASHMENT ─────────────────────────────────────────
  // ছুটি নগদায়ন বেতন (অফিসার)
  '3111110': (ctx) => num(ctx.leave?.leave_encashment_officer_basic),
  // ছুটি নগদায়ন বেতন (কর্মচারী)
  '3111209': (ctx) => num(ctx.leave?.leave_encashment_staff_basic),

  // ─── ALLOWANCES DERIVED FROM STAFF ────────────────────────────
  // যাতায়াত ভাতা — transport: often a fixed monthly amount per person
  // Since there's no specific rate, this stays manual (auto_value = 0)

  // বাড়ি ভাড়া ভাতা — house_rent_percent of total basic × 12
  '3111310': (ctx) => {
    const totalBasicAll = (ctx.staff || []).reduce((s, r) => s + num(r.total_basic), 0);
    return totalBasicAll * (ctx.rates.house_rent_percent || 0) / 100 * 12;
  },

  // চিকিৎসা ভাতা — medical_allowance_monthly × total count × 12
  '3111311': (ctx) => {
    const totalCount = (ctx.staff || []).reduce((s, r) => s + int(r.count), 0);
    return totalCount * (ctx.rates.medical_allowance_monthly || 0) * 12;
  },

  // উৎসব ভাতা — total basic (all) × festival_bonus_multiplier
  '3111325': (ctx) => {
    const totalBasicAll = (ctx.staff || []).reduce((s, r) => s + num(r.total_basic), 0);
    return totalBasicAll * (ctx.rates.festival_bonus_multiplier || 0);
  },

  // শ্রান্তি ও বিনোদন ভাতা
  '3111328': (ctx) => num(ctx.leave?.rest_recreation_amount),

  // ─── UTILITIES ────────────────────────────────────────────────
  // বিদ্যুৎ
  '3211113': (ctx) => {
    const row = (ctx.utilities || []).find(u => {
      const typeName = (ctx.utilityTypes || []).find(t => t.id === u.utility_type_id)?.name;
      return typeName === 'বিদ্যুৎ';
    });
    return num(row?.annual_cost);
  },
  // পানি
  '3211115': (ctx) => {
    const row = (ctx.utilities || []).find(u => {
      const typeName = (ctx.utilityTypes || []).find(t => t.id === u.utility_type_id)?.name;
      return typeName === 'পানি';
    });
    return num(row?.annual_cost);
  },
  // ইন্টারনেট/ফ্যাক্স/টেলেক্স
  '3211117': (ctx) => {
    const row = (ctx.utilities || []).find(u => {
      const typeName = (ctx.utilityTypes || []).find(t => t.id === u.utility_type_id)?.name;
      return typeName === 'ইন্টারনেট';
    });
    return num(row?.annual_cost);
  },

  // ─── POSTAL EXPENSE ───────────────────────────────────────────
  // ডাক — return_submitted_count × postal_expense_rate
  '3211119': (ctx) => {
    return int(ctx.returnInfo?.return_submitted_count) * (ctx.rates.postal_expense_rate || 0);
  },

  // ─── HOUSE RENT ───────────────────────────────────────────────
  // অফিস ভবন ভাড়া — monthly_bill × 12 × (1 + vat/100) + due
  '3211129': (ctx) => {
    const monthly = num(ctx.houseRent?.monthly_bill);
    const due = num(ctx.houseRent?.due);
    const vatPct = ctx.rates.vat_percentage || 0;
    return monthly * 12 * (1 + vatPct / 100) + due;
  },

  // ─── FUEL ─────────────────────────────────────────────────────
  // পেট্রোল, অয়েল ও লুব্রিকেন্ট
  // Sum fuel cost for vehicles whose rate_key is fuel_price_octane
  '3243301': (ctx) => {
    return (ctx.vehicles || [])
      .filter(v => v.vehicle_fuel_config?.rate_key === 'fuel_price_octane')
      .reduce((sum, v) => {
        const cfg = v.vehicle_fuel_config;
        const fuelRate = ctx.rates[cfg.rate_key] || 0;
        const monthlyFuel = num(cfg.monthly_fuel_allowance) * fuelRate;
        const annualFuel = monthlyFuel * 12 * int(v.count);
        const annualLube = num(cfg.annual_lube_allowance) * int(v.count);
        return sum + annualFuel + annualLube;
      }, 0);
  },

  // গ্যাস ও জ্বালানী
  // Sum fuel cost for vehicles whose rate_key is fuel_price_diesel or fuel_price_cng
  '3243302': (ctx) => {
    return (ctx.vehicles || [])
      .filter(v => ['fuel_price_diesel', 'fuel_price_cng'].includes(v.vehicle_fuel_config?.rate_key))
      .reduce((sum, v) => {
        const cfg = v.vehicle_fuel_config;
        const fuelRate = ctx.rates[cfg.rate_key] || 0;
        const monthlyFuel = num(cfg.monthly_fuel_allowance) * fuelRate;
        const annualFuel = monthlyFuel * 12 * int(v.count);
        const annualLube = num(cfg.annual_lube_allowance) * int(v.count);
        return sum + annualFuel + annualLube;
      }, 0);
  },

  // ─── VEHICLE RENT ─────────────────────────────────────────────
  // যানবাহন ব্যবহার (চুক্তিভিত্তিক) — SUM(count × monthly_rent × 12)
  '3211107': (ctx) => {
    return (ctx.vehicleRent || []).reduce((sum, vr) => {
      const monthlyRent = num(vr.vehicle_rent_config?.monthly_rent_allowance);
      return sum + int(vr.count) * monthlyRent * 12;
    }, 0);
  },

  // ─── VEHICLE MAINTENANCE ──────────────────────────────────────
  // মোটরযান রক্ষণারবক্ষণ ব্যয়
  '3258140': (ctx) => {
    return (ctx.vehicles || []).reduce((sum, v) => {
      const maint = num(v.vehicle_fuel_config?.annual_maintenance_allowance);
      return sum + maint * int(v.count) + num(v.maintenance_cost);
    }, 0);
  },
};


// ── main entry point ────────────────────────────────────────────

/**
 * Calculates budget values for all active expense codes for a given submission.
 * Fetches data from all form tables and applies known formulas.
 *
 * @param {string|number} submissionId
 * @param {object} supabase - Supabase client instance
 * @returns {Array<{submission_id: number, code_id: number, auto_value: number, manual_value: null}>}
 */
export const calculateAll = async (submissionId, supabase) => {
  if (!submissionId) return [];
  const sid = parseInt(submissionId);

  // ── 1. Fetch everything in parallel ───────────────────────────
  const [
    { data: codes },
    { data: staff },
    { data: leave },
    { data: utilities },
    { data: utilityTypes },
    { data: houseRent },
    { data: vehicles },
    { data: vehicleRent },
    { data: returnInfo },
    { data: ratesArr },
  ] = await Promise.all([
    supabase.from('expense_codes').select('*').eq('active', true),
    supabase.from('form_staff').select('*, grades(grade_no, category)').eq('submission_id', sid),
    supabase.from('form_leave').select('*').eq('submission_id', sid).maybeSingle(),
    supabase.from('form_utility').select('*').eq('submission_id', sid),
    supabase.from('utility_types').select('*'),
    supabase.from('form_house_rent').select('*').eq('submission_id', sid).maybeSingle(),
    supabase.from('form_vehicles').select('*, vehicle_fuel_config(*)').eq('submission_id', sid),
    supabase.from('form_vehicle_rent').select('*, vehicle_rent_config(*)').eq('submission_id', sid),
    supabase.from('form_return_info').select('*').eq('submission_id', sid).maybeSingle(),
    supabase.from('rates').select('*'),
  ]);

  if (!codes) {
    console.error('Could not fetch expense codes');
    return [];
  }

  const rates = buildRateMap(ratesArr);

  // ── 2. Build context for formula functions ────────────────────
  const ctx = {
    staff: staff || [],
    leave: leave || null,
    utilities: utilities || [],
    utilityTypes: utilityTypes || [],
    houseRent: houseRent || null,
    vehicles: vehicles || [],
    vehicleRent: vehicleRent || [],
    returnInfo: returnInfo || null,
    rates,
  };

  // ── 3. Generate rows ─────────────────────────────────────────
  const rows = codes.map(code => {
    let autoValue = 0;

    const formulaFn = codeFormulas[code.code];
    if (formulaFn) {
      try {
        autoValue = Math.round(formulaFn(ctx));
      } catch (e) {
        console.warn(`Formula error for code ${code.code}:`, e);
        autoValue = 0;
      }
    }

    return {
      submission_id: sid,
      code_id: code.id,
      auto_value: autoValue,
      manual_value: null,
    };
  });

  return rows;
};

// Legacy export kept for backward compatibility
export const calculateAllowance = (allowanceName, count, totalBasic) => {
  const safeCount = parseInt(count) || 0;
  const safeBasic = parseFloat(totalBasic) || 0;

  switch (allowanceName) {
    case 'overtime':
      return Math.round(safeBasic * 0.1 * safeCount);
    case 'duty':
      return safeCount * 500;
    default:
      return 0;
  }
};
