export const formulaEngine = {
  salary_officers: ({ staff, rates }) => {
    let total = 0;
    const officerGrades = staff.filter(s => s.grade_no <= 9);
    for (const g of officerGrades) {
      const annual_basic    = g.avg_basic * g.count * 12;
      const house_rent      = g.avg_basic * (rates.house_rent_percent / 100) * g.count * 12;
      const medical         = rates.medical_allowance_monthly * g.count * 12;
      total += annual_basic + house_rent + medical;
    }
    return Math.round(total);
  },

  salary_staff: ({ staff, rates }) => {
    let total = 0;
    const staffGrades = staff.filter(s => s.grade_no >= 10);
    for (const g of staffGrades) {
      const annual_basic = g.avg_basic * g.count * 12;
      const house_rent   = g.avg_basic * (rates.house_rent_percent / 100) * g.count * 12;
      const medical      = rates.medical_allowance_monthly * g.count * 12;
      total += annual_basic + house_rent + medical;
    }
    return Math.round(total);
  },

  festival_bonus: ({ staff, rates }) => {
    let total = 0;
    for (const g of staff) {
      total += g.avg_basic * g.count * rates.festival_bonus_multiplier;
    }
    return Math.round(total);
  },

  provident_fund: ({ staff, rates }) => {
    let total = 0;
    for (const g of staff) {
      total += g.avg_basic * g.count * 12 * (rates.provident_fund_percent / 100);
    }
    return Math.round(total);
  },

  fuel: ({ fuel, rates }) => {
    let total = 0;
    for (const f of fuel) {
      total += f.monthly_liters * (f.price_per_liter || rates.fuel_price_per_liter) * 12;
    }
    return Math.round(total);
  },

  electricity: ({ utility }) => Math.round((utility.electricity_monthly || 0) * 12),
  water: ({ utility }) => Math.round((utility.water_monthly || 0) * 12),
  gas: ({ utility }) => Math.round((utility.gas_monthly || 0) * 12),
  internet: ({ utility }) => Math.round((utility.internet_monthly || 0) * 12),
  office_rent: ({ rent }) =>
    Math.round(((rent.office_rent_monthly || 0) + (rent.garage_rent_monthly || 0)) * 12),
  stationery: ({ misc }) => Math.round(misc.stationery_annual || 0),
  printing: ({ misc }) => Math.round(misc.printing_annual || 0),
  hospitality: ({ misc }) => Math.round(misc.hospitality_annual || 0),
  training: ({ misc }) => Math.round(misc.training_annual || 0),
};

export function calculateBudget(submissionData, expenseCodes, rates) {
  const results = [];
  for (const code of expenseCodes) {
    if (code.is_manual) continue;
    const fn = formulaEngine[code.formula_key];
    if (!fn) continue;
    const value = fn(submissionData, rates);
    results.push({ code_id: code.id, auto_value: value });
  }
  return results;
}
