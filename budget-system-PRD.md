# Budget Management System — Full Project Specification

## Overview

A web-based budget estimation and submission tool for government/corporate offices. Each office fills a series of data forms once or twice per fiscal year. The system auto-calculates a 150-code budget sheet from the entered data, which can be reviewed and submitted. Admins and SuperAdmins manage the process and generate reports.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro (static-first, minimal JS) |
| Styling | TailwindCSS |
| Frontend Logic | Vanilla JavaScript (no framework) |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (admin/superadmin only) |
| PDF Generation | jsPDF + jsPDF-AutoTable |
| Hosting | Vercel |
| Repository | GitHub |

---

## User Roles

### 1. Office User
- No account, no password
- Identified by **Office ID** (entered manually on the public URL)
- Can access only their own office's data
- Can fill forms, save drafts, view their budget sheet, download their PDF
- Cannot submit after the cycle is closed

### 2. Admin
- Username + password login (Supabase Auth)
- Can view and review offices assigned to their group(s)
- Cannot edit office data
- Can generate group and code-wise reports
- Cannot manage master data

### 3. SuperAdmin
- Username + password login (Supabase Auth)
- Full access to everything
- Manages: expense codes, office groups, code-group mapping, formula rates, cycles, admin accounts, admin group assignments

---

## Application Structure

```
/                        → Public landing (enter office ID)
/office/[id]             → Office dashboard (form progress)
/office/[id]/form/[n]    → Individual form pages (1–8)
/office/[id]/budget      → Budget sheet (read-only calculated + editable manual codes)
/office/[id]/submit      → Final review and submit
/admin/login             → Admin/SuperAdmin login
/admin/dashboard         → Admin overview
/admin/offices           → Browse offices (filtered by assigned groups)
/admin/reports           → Generate reports
/superadmin/dashboard    → SuperAdmin overview
/superadmin/codes        → Manage expense codes
/superadmin/groups       → Manage office groups + code-group mapping
/superadmin/rates        → Manage formula rates
/superadmin/cycles       → Manage submission cycles
/superadmin/admins       → Manage admin accounts + group assignments
```

---

## Database Schema

> Complete SQL is in `schema.sql`. Run it in Supabase SQL Editor before starting development.

### Design Decisions
- **ID Strategy:** `BIGINT GENERATED ALWAYS AS IDENTITY` across all tables
- **Timestamps:** Every table has `created_at` and `updated_at` (auto-updated via trigger)
- **No hardcoded values:** All rates and config live in database tables managed by SuperAdmin

---

### 1. Office Domain

**`departments`**
id, name, created_at, updated_at

**`parent_offices`**
id, name, department_id → departments, created_at, updated_at

**`office_types`**
id, name, department_id → departments, is_group_budget, created_at, updated_at

**`offices`**
id, budget_id (govt assigned), name, parent_office_id → parent_offices, office_type_id → office_types, created_at, updated_at

> Note: department is derived via office_type join — not stored directly on offices to avoid redundancy.

---

### 2. Cycle Domain

**`cycles`**
id, fiscal_year, budget_type (new/revised), status (open/closed), opened_at, closed_at, created_at, updated_at
UNIQUE(fiscal_year, budget_type)

**`submissions`**
id, office_id → offices, cycle_id → cycles, status (draft/submitted/needs_resubmit), submitted_at, created_at, updated_at
UNIQUE(office_id, cycle_id)

> `needs_resubmit` status is set when an office edits any form after submission. Clears when they resubmit.

---

### 3. Rates (Global)

**`rates`**
id, key, value, description, created_at, updated_at

Seeded values:
- medical_allowance_monthly = 1500
- house_rent_percent = 50
- festival_bonus_multiplier = 2
- provident_fund_percent = 10
- fuel_price_octane = 130
- fuel_price_diesel = 110
- fuel_price_cng = 45
- vat_percentage = 15
- postal_expense_rate = 50

> SuperAdmin edits rates before opening each cycle. Rates are locked during open cycle to avoid discrepancy.

---

### 4. Staff Domain

**`grades`**
id, grade_no (1-20), category (officer: 1-9 / staff: 10-20), created_at, updated_at

**`form_staff`**
id, submission_id, grade_id → grades, count, total_basic, due_salary, suspended_count, suspended_total_basic, suspended_due_salary, created_at, updated_at
UNIQUE(submission_id, grade_id)

> Only non-zero grade rows are inserted. Missing row = zero for that grade.

**`allowance_types`**
id, name, is_calculated, has_basic, is_grade_based, applicable_category (officer/staff/both), created_at, updated_at

Seeded values: overtime, duty, dress, risk, hill

**`form_allowances`**
id, submission_id, allowance_type_id → allowance_types, count, total_basic (nullable), amount, due, created_at, updated_at
UNIQUE(submission_id, allowance_type_id)

**`form_leave`**
id, submission_id (UNIQUE), leave_encashment_officer_basic, leave_encashment_officer_due, leave_encashment_staff_basic, leave_encashment_staff_due, rest_recreation_amount, rest_recreation_due, created_at, updated_at

---

### 5. Vehicle Domain

**`car_types`**
id, name, created_at, updated_at

**`fuel_types`**
id, name, created_at, updated_at

**`vehicle_fuel_config`** (SA managed)
id, car_type_id → car_types, fuel_type_id → fuel_types, monthly_fuel_allowance, rate_key → rates.key, annual_lube_allowance, annual_maintenance_allowance (nullable), created_at, updated_at
UNIQUE(car_type_id, fuel_type_id)

**`vehicle_rent_config`** (SA managed)
id, car_type_id → car_types (UNIQUE), monthly_rent_allowance, created_at, updated_at

**`form_vehicles`**
id, submission_id, vehicle_fuel_config_id → vehicle_fuel_config, count, maintenance_cost (nullable — user enters if not defined in config), additional_expense (nullable), created_at, updated_at
UNIQUE(submission_id, vehicle_fuel_config_id)

**`form_vehicle_rent`**
id, submission_id, vehicle_rent_config_id → vehicle_rent_config, count, created_at, updated_at
UNIQUE(submission_id, vehicle_rent_config_id)

---

### 6. IT Domain

**`it_items`** (SA managed)
id, name, allotted_budget (nullable), has_toner, is_lumpsum, created_at, updated_at

Seeded: Computer, Printer (has_toner=true), Scanner, Accessories (is_lumpsum=true)

**`form_it_inventory`**
id, submission_id, item_id → it_items, count, damaged, toner_price (nullable), created_at, updated_at
UNIQUE(submission_id, item_id)

**`form_it_requirement`**
id, submission_id, item_id → it_items, required_quantity (nullable — null for lumpsum), total_amount, created_at, updated_at
UNIQUE(submission_id, item_id)

---

### 7. Utility Domain

**`utility_types`** (SA managed)
id, name, created_at, updated_at

Seeded: বিদ্যুৎ, পানি, ইন্টারনেট

**`form_utility`**
id, submission_id, utility_type_id → utility_types, annual_cost, due, created_at, updated_at
UNIQUE(submission_id, utility_type_id)

---

### 8. House Rent Domain

**`form_house_rent`**
id, submission_id (UNIQUE), monthly_bill, due, contract_start_date, contract_end_date, created_at, updated_at

> VAT pulled from rates table at calculation time: total = monthly_bill × 12 × (1 + vat_percentage/100)

---

### 9. Return Info Domain

**`form_return_info`**
id, submission_id (UNIQUE), tin_count, return_submitted_count, created_at, updated_at

> Used to calculate postal expense: return_submitted_count × postal_expense_rate

---

### 10. Expense Code Domain

**`expense_codes`**
id, code, name, formula_key (nullable), is_manual, sort_order, active, created_at, updated_at

**`code_type_mapping`**
id, code_id → expense_codes, office_type_id → office_types, created_at, updated_at
UNIQUE(code_id, office_type_id)

**`budget_sheet`**
id, submission_id, code_id → expense_codes, auto_value, manual_value (nullable — only for is_manual codes), created_at, updated_at
UNIQUE(submission_id, code_id)

---

### 11. Auth & Admin Domain

**`admin_profiles`**
id, auth_id → auth.users (Supabase Auth), username, role (admin/superadmin), active, created_at, updated_at

**`admin_group_mapping`**
id, admin_id → admin_profiles, office_type_id → office_types, created_at, updated_at
UNIQUE(admin_id, office_type_id)

## Formula Engine

All formulas live in a single JavaScript file: `src/lib/formulas.js`

Formulas are keyed by `formula_key` from the `expense_codes` table. Each function receives the full submission data and the rates object. Returns the calculated annual amount in BDT.

```javascript
// src/lib/formulas.js

export const formulaEngine = {

  // Code 0001: Salary (Officers) — Grades 1–9
  salary_officers: ({ staff, rates }) => {
    let total = 0;
    const officerGrades = staff.filter(s => s.grade_no <= 9);
    for (const g of officerGrades) {
      const annual_basic    = g.avg_basic * g.count * 12;
      const house_rent      = g.avg_basic * (rates.house_rent_percent / 100) * g.count * 12;
      const medical         = rates.medical_allowance_monthly * g.count * 12;
      total += annual_basic + house_rent + medical;
      // Add other allowances here as needed
    }
    return Math.round(total);
  },

  // Code 0002: Salary (Staff) — Grades 10–20
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

  // Code 0005: Festival Bonus
  festival_bonus: ({ staff, rates }) => {
    let total = 0;
    for (const g of staff) {
      total += g.avg_basic * g.count * rates.festival_bonus_multiplier;
    }
    return Math.round(total);
  },

  // Code 0007: Provident Fund
  provident_fund: ({ staff, rates }) => {
    let total = 0;
    for (const g of staff) {
      total += g.avg_basic * g.count * 12 * (rates.provident_fund_percent / 100);
    }
    return Math.round(total);
  },

  // Code 0011: Vehicle Fuel / Oil
  fuel: ({ fuel, rates }) => {
    let total = 0;
    for (const f of fuel) {
      total += f.monthly_liters * (f.price_per_liter || rates.fuel_price_per_liter) * 12;
    }
    return Math.round(total);
  },

  // Code 0013: Electricity
  electricity: ({ utility }) => Math.round((utility.electricity_monthly || 0) * 12),

  // Code 0014: Water
  water: ({ utility }) => Math.round((utility.water_monthly || 0) * 12),

  // Code 0015: Gas
  gas: ({ utility }) => Math.round((utility.gas_monthly || 0) * 12),

  // Code 0016: Internet / Telephone
  internet: ({ utility }) => Math.round((utility.internet_monthly || 0) * 12),

  // Code 0010: Office Rent
  office_rent: ({ rent }) =>
    Math.round(((rent.office_rent_monthly || 0) + (rent.garage_rent_monthly || 0)) * 12),

  // Code 0017: Stationery
  stationery: ({ misc }) => Math.round(misc.stationery_annual || 0),

  // Code 0018: Printing
  printing: ({ misc }) => Math.round(misc.printing_annual || 0),

  // Code 0019: Hospitality
  hospitality: ({ misc }) => Math.round(misc.hospitality_annual || 0),

  // Code 0020: Training
  training: ({ misc }) => Math.round(misc.training_annual || 0),

  // Add more formula keys here as codes are finalized
};

// Main calculation function — call this after any form save
export function calculateBudget(submissionData, expenseCodes, rates) {
  const results = [];
  for (const code of expenseCodes) {
    if (code.is_manual) continue; // skip manual codes
    const fn = formulaEngine[code.formula_key];
    if (!fn) continue;
    const value = fn(submissionData, rates);
    results.push({ code_id: code.id, auto_value: value });
  }
  return results;
}
```

**Rule:** When a formula rate changes in the `rates` table, recalculate all draft submissions for the active cycle. Do NOT recalculate submitted entries.

---

## Office User Flow

### Step 1: Landing Page (`/`)
- Input field: "Enter your Office ID"
- On submit: query `offices` table
  - **Found** → show office name, ask "Is this your office?" → confirm → go to dashboard
  - **Not found** → show registration form (office name, group selection) → create office → go to dashboard

### Step 2: Office Dashboard (`/office/[id]`)
- Shows active cycle (if any)
- Shows 8 form cards with completion status (✓ complete / ⚠ incomplete / ○ not started)
- Shows overall progress bar
- "View Budget Sheet" button (available after at least Form 2 is saved)
- "Submit" button (active only when all required forms complete + cycle is open)
- Previous year budget shown as read-only reference panel

### Step 3: Forms (saved as draft on every field blur or "Save" button)

| Form | Route | Key Fields |
|---|---|---|
| 1 — Office Info | `/office/[id]/form/1` | Head of office, designation, phone, email, address |
| 2 — Staff Details | `/office/[id]/form/2` | Per grade: count, avg basic salary |
| 3 — Vehicles | `/office/[id]/form/3` | Vehicle type, count |
| 4 — Equipment | `/office/[id]/form/4` | Equipment type, count, unit cost |
| 5 — Utility | `/office/[id]/form/5` | Monthly electricity, water, gas, internet |
| 6 — Fuel | `/office/[id]/form/6` | Per vehicle type: monthly liters, price per liter |
| 7 — Rent | `/office/[id]/form/7` | Office rent, garage rent, other rent (monthly) |
| 8 — Miscellaneous | `/office/[id]/form/8` | Stationery, printing, hospitality, training (annual) |

**On every form save:**
1. Save form data to Supabase
2. Run `calculateBudget()` in the browser
3. Upsert results into `budget_sheet` table
4. Update form completion status

### Step 4: Budget Sheet (`/office/[id]/budget`)
- Table: Code | Name | Calculated Amount | Previous Year (ref)
- Auto-calculated rows: read-only, grayed out
- Manual code rows: editable input field
- Grand total at bottom
- "Download PDF" button

### Step 5: Submit (`/office/[id]/submit`)
- Final review of all form data + budget sheet
- "Confirm and Submit" button
- On submit: set `submissions.status = 'submitted'`, lock all forms
- Submitted offices cannot edit anything

---

## Admin Flow

### Login (`/admin/login`)
- Username + password via Supabase Auth
- Role detected from `admin_profiles` table
- Redirect to `/admin/dashboard` or `/superadmin/dashboard`

### Admin Dashboard (`/admin/dashboard`)
- Summary cards: total offices, submitted, draft, pending
- Filtered to assigned groups only
- Office list with submission status

### Admin Reports (`/admin/reports`)
- Select: cycle + group
- Generate:
  1. **Per office PDF** — individual budget sheet for any office
  2. **Group consolidated** — list of groups with total budget per group
  3. **Code-wise consolidated** — all 150 codes with sum across all offices in selected group

---

## SuperAdmin Features

### Cycle Management (`/superadmin/cycles`)
- Create cycle (fiscal year + type: estimated/revised)
- Open cycle → offices can submit
- Close cycle → submissions locked
- Only one cycle can be open at a time

### Expense Codes (`/superadmin/codes`)
- View all 150 codes
- Edit: code number, name, formula_key, is_manual, sort_order, active
- Add new codes
- Assign codes to groups

### Rates (`/superadmin/rates`)
- Table of all rates with current values
- Inline edit each rate
- Save triggers recalculation of all draft budget sheets for the open cycle

### Office Groups (`/superadmin/groups`)
- Create / edit / delete groups
- Assign expense codes to each group

### Admin Management (`/superadmin/admins`)
- Create admin accounts (triggers Supabase Auth invite)
- Assign role: admin / superadmin
- Assign groups to admins
- Deactivate admins

---

## PDF Report Spec

### Per Office Budget Sheet (jsPDF + AutoTable)

```
Header:
  [Office Name] — [Office ID]
  Budget Type: Estimated / Revised | Fiscal Year: 2024-25
  Generated: [date]

Table columns:
  Code | Expense Head | Amount (BDT)

Footer:
  Grand Total: [sum]
  Status: Draft / Submitted | Submitted on: [date]
```

### Group Consolidated Report

```
Header:
  Group: [Group Name]
  Budget Type | Fiscal Year

Table columns:
  Office ID | Office Name | Total Budget (BDT) | Status

Footer:
  Group Total: [sum]
```

### Code-wise Consolidated Report

```
Header:
  Group: [Group Name] — Code-wise Budget Summary
  Budget Type | Fiscal Year

Table columns:
  Code | Expense Head | [Office 1] | [Office 2] | ... | Total

Footer:
  Grand Total per office + overall grand total
```

---

## Keep-Alive Strategy (Supabase Free Tier)

Set up a free Uptime Robot monitor pinging the Supabase project URL every 5 minutes. This prevents the 7-day inactivity pause. Setup takes 5 minutes, no code required.

Alternatively, use a GitHub Actions scheduled workflow:

```yaml
# .github/workflows/keep-alive.yml
name: Supabase Keep Alive
on:
  schedule:
    - cron: '0 */6 * * *'  # every 6 hours
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: curl -s ${{ secrets.SUPABASE_URL }}/rest/v1/ -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" > /dev/null
```

---

## Environment Variables

```env
# .env (Astro / Vercel)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

SuperAdmin operations that require elevated access should use Supabase Row Level Security (RLS) policies, not the service role key on the client.

---

## Row Level Security (RLS) Policy Summary

| Table | Office User | Admin | SuperAdmin |
|---|---|---|---|
| offices | Own row only | Read (assigned groups) | Full |
| submissions | Own row only | Read (assigned groups) | Full |
| form_* | Own submission only | Read (assigned groups) | Full |
| budget_sheet | Own submission only | Read (assigned groups) | Full |
| expense_codes | Read | Read | Full |
| rates | Read | Read | Full |
| office_groups | Read | Read | Full |
| cycles | Read (active only) | Read | Full |
| admin_profiles | None | Own row | Full |

---

## Build Order (Phases)

### Phase 1 — Foundation
- [ ] Astro project setup with TailwindCSS
- [ ] Supabase project creation + schema migration
- [ ] Seed data (grades, placeholder codes, rates)
- [ ] Environment variables configured on Vercel
- [ ] GitHub → Vercel auto-deploy connected

### Phase 2 — Office Entry
- [ ] Landing page with Office ID entry
- [ ] Office search (found / not found)
- [ ] Office registration form
- [ ] Office dashboard with form progress tracker
- [ ] Session management (store office_id in sessionStorage)

### Phase 3 — Forms
- [ ] Form 1: Office basic info
- [ ] Form 2: Staff details (grade-wise table)
- [ ] Form 3: Vehicles
- [ ] Form 4: Equipment
- [ ] Form 5: Utility
- [ ] Form 6: Fuel
- [ ] Form 7: Rent
- [ ] Form 8: Miscellaneous
- [ ] Auto-save on blur (debounced, 500ms)
- [ ] Form completion status tracker

### Phase 4 — Budget Sheet + Formula Engine
- [ ] Formula engine (`src/lib/formulas.js`)
- [ ] Budget sheet page (auto + manual rows)
- [ ] Recalculation trigger on form save
- [ ] Previous year reference column

### Phase 5 — Submit Flow
- [ ] Final review page
- [ ] Submit action (lock submission)
- [ ] Confirmation screen

### Phase 6 — Admin Panel
- [ ] Admin login (Supabase Auth)
- [ ] Admin dashboard
- [ ] Office list with filters
- [ ] Per office budget view

### Phase 7 — SuperAdmin Panel
- [ ] Cycle management (open/close)
- [ ] Expense code management
- [ ] Rates management (with recalculate trigger)
- [ ] Group management + code-group mapping
- [ ] Admin account management

### Phase 8 — Reports
- [ ] Per office PDF
- [ ] Group consolidated PDF
- [ ] Code-wise consolidated PDF/Excel

---

## Language & Localisation

### General Rule
The entire application UI is in **Bangla**. No English text visible to users anywhere — not labels, not buttons, not error messages, not placeholders, not headings. English may be added in a future phase but is out of scope now.

### Font
Use **Kalpurush** throughout the entire app — forms, dashboard, admin panel, reports, PDFs, everything.

Load via a locally hosted or CDN-hosted copy. If unavailable on Google Fonts, download and serve from `/public/fonts/Kalpurush.ttf`.

```css
@font-face {
  font-family: 'Kalpurush';
  src: url('/fonts/Kalpurush.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

* {
  font-family: 'Kalpurush', sans-serif;
}
```

### Numeral Rules

| Context | Numeral Type | Example |
|---|---|---|
| Input fields (user types) | English (0–9) | `1500` |
| All placeholders | Bangla (০–৯) | `যেমন: ১৫০০` |
| All display/read-only values | Bangla (০–৯) | `১,৫০,০০০` |
| Reports (all numbers) | Bangla (০–৯) | `১,৫০,০০০` |
| Budget sheet amounts | Bangla (০–৯) | `১,৫০,০০০` |

### Number Conversion Utility

Create a single utility function used everywhere numbers are displayed:

```javascript
// src/lib/bangla.js

// Convert English numerals to Bangla
export function toBanglaNumber(number) {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(number).replace(/[0-9]/g, d => banglaDigits[d]);
}

// Format currency in Bangla (BD style: 1,50,000)
export function toBanglaCurrency(number) {
  if (!number && number !== 0) return '—';
  const n = Math.round(Number(number));
  // BD grouping: last 3 digits, then groups of 2
  const str = n.toString();
  let result = '';
  if (str.length <= 3) {
    result = str;
  } else {
    result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    result = remaining + ',' + result;
  }
  return toBanglaNumber(result) + ' টাকা';
}

// Bangla month names
export const banglaMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
  'মে', 'জুন', 'জুলাই', 'আগস্ট',
  'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// Format date in Bangla
export function toBanglaDate(dateStr) {
  const d = new Date(dateStr);
  return `${toBanglaNumber(d.getDate())} ${banglaMonths[d.getMonth()]} ${toBanglaNumber(d.getFullYear())}`;
}
```

**Rule:** Never display raw English numbers to the user. Always pass display values through `toBanglaNumber()` or `toBanglaCurrency()`.

### Common UI Strings (Bangla)

```javascript
// src/lib/strings.js — all UI text in one place
export const strings = {
  // Landing
  enterOfficeId: 'আপনার অফিস কোড লিখুন',
  searchOffice: 'অফিস খুঁজুন',
  officeNotFound: 'এই কোডে কোনো অফিস পাওয়া যায়নি। নতুন অফিস নিবন্ধন করুন।',
  registerOffice: 'অফিস নিবন্ধন',
  confirmOffice: 'এটি কি আপনার অফিস?',
  yes: 'হ্যাঁ',
  no: 'না',

  // Dashboard
  dashboard: 'ড্যাশবোর্ড',
  formProgress: 'ফর্মের অগ্রগতি',
  budgetSheet: 'বাজেট শিট',
  submit: 'দাখিল করুন',
  submitFinal: 'চূড়ান্তভাবে দাখিল করুন',
  draft: 'খসড়া',
  submitted: 'দাখিলকৃত',
  noCycleOpen: 'বর্তমানে কোনো দাখিলের চক্র খোলা নেই।',

  // Forms
  save: 'সংরক্ষণ করুন',
  saved: 'সংরক্ষিত হয়েছে',
  saving: 'সংরক্ষণ হচ্ছে...',
  required: 'এই তথ্যটি আবশ্যক',
  form1: 'অফিসের মূল তথ্য',
  form2: 'কর্মকর্তা ও কর্মচারীর তথ্য',
  form3: 'যানবাহনের তথ্য',
  form4: 'যন্ত্রপাতি ও সরঞ্জামের তথ্য',
  form5: 'ইউটিলিটি খরচের তথ্য',
  form6: 'জ্বালানি তেলের তথ্য',
  form7: 'ভাড়ার তথ্য',
  form8: 'বিবিধ তথ্য',

  // Budget sheet
  code: 'কোড',
  expenseHead: 'ব্যয় খাত',
  amount: 'পরিমাণ (টাকা)',
  prevYear: 'পূর্ববর্তী বছর (টাকা)',
  autoCalculated: 'স্বয়ংক্রিয়ভাবে গণনাকৃত',
  grandTotal: 'মোট',

  // Reports
  budgetReport: 'বাজেট প্রতিবেদন',
  estimatedBudget: 'প্রাক্কলিত বাজেট',
  revisedBudget: 'সংশোধিত বাজেট',
  fiscalYear: 'অর্থবছর',
  generatedOn: 'তৈরির তারিখ',
  officeName: 'অফিসের নাম',
  officeCode: 'অফিস কোড',

  // Errors
  errorLoading: 'তথ্য লোড করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।',
  errorSaving: 'সংরক্ষণ করতে সমস্যা হয়েছে।',
  sessionExpired: 'সেশন শেষ হয়ে গেছে। পুনরায় লগইন করুন।',
};
```

### Report Generation (HTML → Print → PDF)

Do **not** use jsPDF. Generate reports as styled HTML pages and use the browser's native print dialog.

```javascript
// src/lib/report.js
export function printReport(htmlContent) {
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @font-face {
          font-family: 'Kalpurush';
          src: url('/fonts/Kalpurush.ttf') format('truetype');
        }
        * { font-family: 'Kalpurush', sans-serif; }
        body { margin: 2cm; font-size: 12pt; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 6px 10px; }
        th { background: #f0f0f0; }
        @media print {
          @page { size: A4; margin: 2cm; }
        }
      </style>
    </head>
    <body>${htmlContent}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}
```

Each report page calls `printReport()` with its generated HTML. The browser handles pagination, margins, and PDF export (via "Save as PDF" in the print dialog). No additional library needed.

---

## Notes for AI IDE

1. **Do not hardcode any rate values** (medical allowance, house rent %, etc.). Always read from the `rates` table.

2. **Formula engine is the single source of truth** for all auto-calculated budget values. No calculation logic should exist outside `src/lib/formulas.js`.

3. **Office session** is managed via `sessionStorage` (office_id only — no sensitive data). On every page load, verify the office_id exists in Supabase before showing any data.

4. **Draft saving** must be silent (no disruptive UI). Show a small "Saved" indicator. Never block the user.

5. **Submitted submissions are fully locked.** Once `submissions.status = 'submitted'`, all form inputs must render as read-only. The submit action is irreversible from the office side.

6. **Cycle awareness.** If no cycle is open, offices can view their past submissions but cannot edit or submit. Show a clear "No active submission cycle" message.

7. **Expense codes are placeholder** for now. The system must work with the seeded codes and the SuperAdmin will update names, add more codes, and map them to groups before go-live. The formula engine should gracefully skip codes with no `formula_key`.

8. **Code-wise consolidated report** may have many columns if a group has many offices. Use landscape PDF orientation for this report.

9. **All monetary values** are in BDT (Bangladeshi Taka). Use BD grouping format (১,৫০,০০০ — last 3 digits then groups of 2). Always use `toBanglaCurrency()` from `src/lib/bangla.js` for display. Never show raw English numbers in the UI.

10. **Previous year data** is shown as a reference column in the budget sheet. For the first cycle, this column will be empty. Import mechanism for previous year actuals to be added in a future phase.

11. **All UI text lives in `src/lib/strings.js`**. Never hardcode UI strings inline in components. Always reference `strings.xyz`. This makes future English translation a one-file job.

12. **Input fields accept English numerals only** (standard keyboard input). On display/read-only, convert to Bangla using `toBanglaNumber()`. Do not attempt to intercept keystrokes to show Bangla numerals while typing — it breaks mobile keyboards.

13. **Kalpurush font** must be loaded before any content renders. Add it to the Astro layout base so it applies globally. If the font fails to load, fall back to `sans-serif` — never fall back to a Latin font that breaks Bangla rendering.

14. **Reports are HTML → browser print → PDF**. No jsPDF. Each report is a separate HTML page opened in a new tab with print triggered automatically. The Kalpurush font must be embedded in the report HTML so it renders correctly even when printed to PDF.## Seed Data

> Run `seed_data.sql` in Supabase SQL Editor after `schema.sql`. All data below is real production data from the Excel file provided.

---

### Departments (2)

| ID | Name |
|---|---|
| 1 | কর বিভাগ |
| 2 | কাস্টমস ও ভ্যাট বিভাগ |

---

### Office Types (13)

**Tax Related (department_id = 1)**

| Name | is_group_budget |
|---|---|
| Tax Headquarter | FALSE |
| Taxes Range | FALSE |
| Taxes Appellate Range | FALSE |
| Taxes Departmental Representative | FALSE |
| Taxes Survey Range | FALSE |
| Taxes Circle | **TRUE** |
| Taxes Survey Circle | **TRUE** |

**Customs & VAT Related (department_id = 2)**

| Name | is_group_budget |
|---|---|
| Customs Headquarter | FALSE |
| VAT Divisions | FALSE |
| VAT Circles | **TRUE** |
| Customs Intelligence Regional Offices | FALSE |
| Customs Intelligence Circles | **TRUE** |
| LC Stations | FALSE |

---

### Column Abbreviations (from Excel)

| Abbreviation | Full Name |
|---|---|
| THQ | Tax Headquarter |
| CHQ | Customs Headquarter |
| TDR | Taxes Departmental Representative |
| VD | VAT Divisions |
| TR | Taxes Range |
| TAR | Taxes Appellate Range |
| TSR | Taxes Survey Range |
| TCR | Taxes Circle |
| TSCR | Taxes Survey Circle |
| VCR | VAT Circles |
| CIR | Customs Intelligence Regional Offices |
| CICR | Customs Intelligence Circles |
| LCS | LC Stations |

---

### Parent Offices (98 total)

**কর বিভাগ (66 offices)**
জাতীয় রাজস্ব বোর্ড, ট্যাকসেস আপীলাত ট্রাইব্যুনাল, বিসিএস (কর) একাডেমি ঢাকা, আয়কর গোয়েন্দা ও তদন্ত ইউনিট, ই-ট্যাক্স ম্যানেজমেন্ট ইউনিট, কর পরিদর্শন পরিদপ্তর ঢাকা, উৎসে কর ব্যবস্থাপনা ইউনিট, কেন্দ্রীয় কর জরীপ অঞ্চল ঢাকা, বৃহৎ করদাতা ইউনিট-কর, কর অঞ্চল-১ থেকে ২৫ ঢাকা, কর অঞ্চল-গাজীপুর/ময়মনসিংহ/রাজশাহী/রংপুর/সিলেট/বগুড়া/খুলনা/যশোর/কুষ্টিয়া/ফরিদপুর/পাবনা/বরিশাল/নোয়াখালী/দিনাজপুর/নরসিংদী/কক্সবাজার/কুমিল্লা/নারায়নগঞ্জ, কর অঞ্চল ১-৬ চট্টগ্রাম, কর আপীল অঞ্চল ১-৪ ঢাকা, কর আপীল অঞ্চল-খুলনা/চট্টগ্রাম/রাজশাহী

**কাস্টমস ও ভ্যাট বিভাগ (32 offices)**
অভ্যন্তরীণ সম্পদ বিভাগ, কাস্টমস এক্সাইজ ও ভ্যাট আপীলাত ট্রাইব্যুনাল, কাস্টমস ট্রেনিং একাডেমি চট্টগ্রাম, বৃহৎ করদাতা ইউনিট ভ্যাট, শুল্ক রেয়াত ও প্রত্যর্পণ পরিদপ্তর, কাস্টমস গোয়েন্দা ও তদন্ত, কাস্টমস রিস্ক ম্যানেজমেন্ট ইউনিট, কাস্টমস মূল্যায়ন ও নিরীক্ষা কমিশনারেট, কাস্টম হাউস (চট্টগ্রাম/বেনাপোল/কমলাপুর/ঢাকা/মোংলা/পানগাঁও), কাস্টমস এক্সাইজ ভ্যাট কমিশনারেট ঢাকা (পূর্ব/পশ্চিম/উত্তর/দক্ষিণ), কমিশনারেট (সিলেট/রাজশাহী/খুলনা/রংপুর/যশোর/চট্টগ্রাম/কুমিল্লা), কাস্টমস বন্ড কমিশনারেট (ঢাকা পূর্ব/উত্তর/দক্ষিণ/চট্টগ্রাম), আপীল কমিশনারেট (ঢাকা-১/ঢাকা-২/চট্টগ্রাম)

---

### Expense Codes (139 codes)

All 139 codes seeded from Excel. All initially set as `is_manual = TRUE` and `formula_key = NULL`. SuperAdmin and developer will update formula_key for auto-calculated codes during development.

**Categories:**
- নগদ মজুরি ও বেতন-৩১১১ (28 codes) — salary, allowances
- প্রশাসনিক ব্যয়-৩২১১ (27 codes) — administrative expenses
- ফি, চার্জ ও কমিশন-৩২২১ (11 codes) — fees and charges
- প্রশিক্ষণ-৩২৩১ (1 code) — training
- পেট্রোল, অয়েল ও লুব্রিকেন্ট-৩২৪৩ (2 codes) — fuel
- ভ্রমণ ও বদলি-৩২৪৪ (2 codes) — travel and transfer
- চিকিৎসা ও শল্য চিকিৎসা-৩২৫২ (3 codes) — medical
- জনশৃঙ্খলা ও নিরাপত্তা-৩২৫৩ (2 codes) — security
- মুদ্রণ ও মনিহারি-৩২৫৫ (4 codes) — printing and stationery
- সাধারণ সরবরাহ-৩২৫৬ (4 codes) — general supply
- পেশাগত সেবা-৩২৫৭ (9 codes) — professional services
- মেরামত ও সংরক্ষণ-৩২৫৮ (19 codes) — repair and maintenance
- আবর্তক স্থানান্তর-৩৮২১ (3 codes) — recurring transfers
- সাধারণ সরবরাহ-৩৯১১ (2 codes) — general allocation
- ভবন ও স্থাপনা-৪১১১ (4 codes) — buildings
- যন্ত্রপাতি ও সরঞ্জামাদি-৪১১২ (14 codes) — machinery and equipment
- অন্যান্য স্থায়ী সম্পদ-৪১১৩ (2 codes) — other fixed assets

---

## Formula Engine

All formulas live in a single JavaScript file: `src/lib/formulas.js`

Formulas are keyed by `formula_key` from the `expense_codes` table. Each function receives the full submission data and the rates object. Returns the calculated annual amount in BDT.

```javascript
// src/lib/formulas.js

export const formulaEngine = {

  // Code 0001: Salary (Officers) — Grades 1–9
  salary_officers: ({ staff, rates }) => {
    let total = 0;
    const officerGrades = staff.filter(s => s.grade_no <= 9);
    for (const g of officerGrades) {
      const annual_basic    = g.avg_basic * g.count * 12;
      const house_rent      = g.avg_basic * (rates.house_rent_percent / 100) * g.count * 12;
      const medical         = rates.medical_allowance_monthly * g.count * 12;
      total += annual_basic + house_rent + medical;
      // Add other allowances here as needed
    }
    return Math.round(total);
  },

  // Code 0002: Salary (Staff) — Grades 10–20
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

  // Code 0005: Festival Bonus
  festival_bonus: ({ staff, rates }) => {
    let total = 0;
    for (const g of staff) {
      total += g.avg_basic * g.count * rates.festival_bonus_multiplier;
    }
    return Math.round(total);
  },

  // Code 0007: Provident Fund
  provident_fund: ({ staff, rates }) => {
    let total = 0;
    for (const g of staff) {
      total += g.avg_basic * g.count * 12 * (rates.provident_fund_percent / 100);
    }
    return Math.round(total);
  },

  // Code 0011: Vehicle Fuel / Oil
  fuel: ({ fuel, rates }) => {
    let total = 0;
    for (const f of fuel) {
      total += f.monthly_liters * (f.price_per_liter || rates.fuel_price_per_liter) * 12;
    }
    return Math.round(total);
  },

  // Code 0013: Electricity
  electricity: ({ utility }) => Math.round((utility.electricity_monthly || 0) * 12),

  // Code 0014: Water
  water: ({ utility }) => Math.round((utility.water_monthly || 0) * 12),

  // Code 0015: Gas
  gas: ({ utility }) => Math.round((utility.gas_monthly || 0) * 12),

  // Code 0016: Internet / Telephone
  internet: ({ utility }) => Math.round((utility.internet_monthly || 0) * 12),

  // Code 0010: Office Rent
  office_rent: ({ rent }) =>
    Math.round(((rent.office_rent_monthly || 0) + (rent.garage_rent_monthly || 0)) * 12),

  // Code 0017: Stationery
  stationery: ({ misc }) => Math.round(misc.stationery_annual || 0),

  // Code 0018: Printing
  printing: ({ misc }) => Math.round(misc.printing_annual || 0),

  // Code 0019: Hospitality
  hospitality: ({ misc }) => Math.round(misc.hospitality_annual || 0),

  // Code 0020: Training
  training: ({ misc }) => Math.round(misc.training_annual || 0),

  // Add more formula keys here as codes are finalized
};

// Main calculation function — call this after any form save
export function calculateBudget(submissionData, expenseCodes, rates) {
  const results = [];
  for (const code of expenseCodes) {
    if (code.is_manual) continue; // skip manual codes
    const fn = formulaEngine[code.formula_key];
    if (!fn) continue;
    const value = fn(submissionData, rates);
    results.push({ code_id: code.id, auto_value: value });
  }
  return results;
}
```

**Rule:** When a formula rate changes in the `rates` table, recalculate all draft submissions for the active cycle. Do NOT recalculate submitted entries.

---

## Office User Flow

### Step 1: Landing Page (`/`)
- Input field: "Enter your Office ID"
- On submit: query `offices` table
  - **Found** → show office name, ask "Is this your office?" → confirm → go to dashboard
  - **Not found** → show registration form (office name, group selection) → create office → go to dashboard

### Step 2: Office Dashboard (`/office/[id]`)
- Shows active cycle (if any)
- Shows 8 form cards with completion status (✓ complete / ⚠ incomplete / ○ not started)
- Shows overall progress bar
- "View Budget Sheet" button (available after at least Form 2 is saved)
- "Submit" button (active only when all required forms complete + cycle is open)
- Previous year budget shown as read-only reference panel

### Step 3: Forms (saved as draft on every field blur or "Save" button)

| Form | Route | Key Fields |
|---|---|---|
| 1 — Office Info | `/office/[id]/form/1` | Head of office, designation, phone, email, address |
| 2 — Staff Details | `/office/[id]/form/2` | Per grade: count, avg basic salary |
| 3 — Vehicles | `/office/[id]/form/3` | Vehicle type, count |
| 4 — Equipment | `/office/[id]/form/4` | Equipment type, count, unit cost |
| 5 — Utility | `/office/[id]/form/5` | Monthly electricity, water, gas, internet |
| 6 — Fuel | `/office/[id]/form/6` | Per vehicle type: monthly liters, price per liter |
| 7 — Rent | `/office/[id]/form/7` | Office rent, garage rent, other rent (monthly) |
| 8 — Miscellaneous | `/office/[id]/form/8` | Stationery, printing, hospitality, training (annual) |

**On every form save:**
1. Save form data to Supabase
2. Run `calculateBudget()` in the browser
3. Upsert results into `budget_sheet` table
4. Update form completion status

### Step 4: Budget Sheet (`/office/[id]/budget`)
- Table: Code | Name | Calculated Amount | Previous Year (ref)
- Auto-calculated rows: read-only, grayed out
- Manual code rows: editable input field
- Grand total at bottom
- "Download PDF" button

### Step 5: Submit (`/office/[id]/submit`)
- Final review of all form data + budget sheet
- "Confirm and Submit" button
- On submit: set `submissions.status = 'submitted'`, lock all forms
- Submitted offices cannot edit anything

---

## Admin Flow

### Login (`/admin/login`)
- Username + password via Supabase Auth
- Role detected from `admin_profiles` table
- Redirect to `/admin/dashboard` or `/superadmin/dashboard`

### Admin Dashboard (`/admin/dashboard`)
- Summary cards: total offices, submitted, draft, pending
- Filtered to assigned groups only
- Office list with submission status

### Admin Reports (`/admin/reports`)
- Select: cycle + group
- Generate:
  1. **Per office PDF** — individual budget sheet for any office
  2. **Group consolidated** — list of groups with total budget per group
  3. **Code-wise consolidated** — all 150 codes with sum across all offices in selected group

---

## SuperAdmin Features

### Cycle Management (`/superadmin/cycles`)
- Create cycle (fiscal year + type: estimated/revised)
- Open cycle → offices can submit
- Close cycle → submissions locked
- Only one cycle can be open at a time

### Expense Codes (`/superadmin/codes`)
- View all 150 codes
- Edit: code number, name, formula_key, is_manual, sort_order, active
- Add new codes
- Assign codes to groups

### Rates (`/superadmin/rates`)
- Table of all rates with current values
- Inline edit each rate
- Save triggers recalculation of all draft budget sheets for the open cycle

### Office Groups (`/superadmin/groups`)
- Create / edit / delete groups
- Assign expense codes to each group

### Admin Management (`/superadmin/admins`)
- Create admin accounts (triggers Supabase Auth invite)
- Assign role: admin / superadmin
- Assign groups to admins
- Deactivate admins

---

## PDF Report Spec

### Per Office Budget Sheet (jsPDF + AutoTable)

```
Header:
  [Office Name] — [Office ID]
  Budget Type: Estimated / Revised | Fiscal Year: 2024-25
  Generated: [date]

Table columns:
  Code | Expense Head | Amount (BDT)

Footer:
  Grand Total: [sum]
  Status: Draft / Submitted | Submitted on: [date]
```

### Group Consolidated Report

```
Header:
  Group: [Group Name]
  Budget Type | Fiscal Year

Table columns:
  Office ID | Office Name | Total Budget (BDT) | Status

Footer:
  Group Total: [sum]
```

### Code-wise Consolidated Report

```
Header:
  Group: [Group Name] — Code-wise Budget Summary
  Budget Type | Fiscal Year

Table columns:
  Code | Expense Head | [Office 1] | [Office 2] | ... | Total

Footer:
  Grand Total per office + overall grand total
```

---

## Keep-Alive Strategy (Supabase Free Tier)

Set up a free Uptime Robot monitor pinging the Supabase project URL every 5 minutes. This prevents the 7-day inactivity pause. Setup takes 5 minutes, no code required.

Alternatively, use a GitHub Actions scheduled workflow:

```yaml
# .github/workflows/keep-alive.yml
name: Supabase Keep Alive
on:
  schedule:
    - cron: '0 */6 * * *'  # every 6 hours
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: curl -s ${{ secrets.SUPABASE_URL }}/rest/v1/ -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" > /dev/null
```

---

## Environment Variables

```env
# .env (Astro / Vercel)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

SuperAdmin operations that require elevated access should use Supabase Row Level Security (RLS) policies, not the service role key on the client.

---

## Row Level Security (RLS) Policy Summary

| Table | Office User | Admin | SuperAdmin |
|---|---|---|---|
| offices | Own row only | Read (assigned groups) | Full |
| submissions | Own row only | Read (assigned groups) | Full |
| form_* | Own submission only | Read (assigned groups) | Full |
| budget_sheet | Own submission only | Read (assigned groups) | Full |
| expense_codes | Read | Read | Full |
| rates | Read | Read | Full |
| office_groups | Read | Read | Full |
| cycles | Read (active only) | Read | Full |
| admin_profiles | None | Own row | Full |

---

## Build Order (Phases)

### Phase 1 — Foundation
- [ ] Astro project setup with TailwindCSS
- [ ] Supabase project creation + schema migration
- [ ] Seed data (grades, placeholder codes, rates)
- [ ] Environment variables configured on Vercel
- [ ] GitHub → Vercel auto-deploy connected

### Phase 2 — Office Entry
- [ ] Landing page with Office ID entry
- [ ] Office search (found / not found)
- [ ] Office registration form
- [ ] Office dashboard with form progress tracker
- [ ] Session management (store office_id in sessionStorage)

### Phase 3 — Forms
- [ ] Form 1: Office basic info
- [ ] Form 2: Staff details (grade-wise table)
- [ ] Form 3: Vehicles
- [ ] Form 4: Equipment
- [ ] Form 5: Utility
- [ ] Form 6: Fuel
- [ ] Form 7: Rent
- [ ] Form 8: Miscellaneous
- [ ] Auto-save on blur (debounced, 500ms)
- [ ] Form completion status tracker

### Phase 4 — Budget Sheet + Formula Engine
- [ ] Formula engine (`src/lib/formulas.js`)
- [ ] Budget sheet page (auto + manual rows)
- [ ] Recalculation trigger on form save
- [ ] Previous year reference column

### Phase 5 — Submit Flow
- [ ] Final review page
- [ ] Submit action (lock submission)
- [ ] Confirmation screen

### Phase 6 — Admin Panel
- [ ] Admin login (Supabase Auth)
- [ ] Admin dashboard
- [ ] Office list with filters
- [ ] Per office budget view

### Phase 7 — SuperAdmin Panel
- [ ] Cycle management (open/close)
- [ ] Expense code management
- [ ] Rates management (with recalculate trigger)
- [ ] Group management + code-group mapping
- [ ] Admin account management

### Phase 8 — Reports
- [ ] Per office PDF
- [ ] Group consolidated PDF
- [ ] Code-wise consolidated PDF/Excel

---

## Language & Localisation

### General Rule
The entire application UI is in **Bangla**. No English text visible to users anywhere — not labels, not buttons, not error messages, not placeholders, not headings. English may be added in a future phase but is out of scope now.

### Font
Use **Kalpurush** throughout the entire app — forms, dashboard, admin panel, reports, PDFs, everything.

Load via a locally hosted or CDN-hosted copy. If unavailable on Google Fonts, download and serve from `/public/fonts/Kalpurush.ttf`.

```css
@font-face {
  font-family: 'Kalpurush';
  src: url('/fonts/Kalpurush.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

* {
  font-family: 'Kalpurush', sans-serif;
}
```

### Numeral Rules

| Context | Numeral Type | Example |
|---|---|---|
| Input fields (user types) | English (0–9) | `1500` |
| All placeholders | Bangla (০–৯) | `যেমন: ১৫০০` |
| All display/read-only values | Bangla (০–৯) | `১,৫০,০০০` |
| Reports (all numbers) | Bangla (০–৯) | `১,৫০,০০০` |
| Budget sheet amounts | Bangla (০–৯) | `১,৫০,০০০` |

### Number Conversion Utility

Create a single utility function used everywhere numbers are displayed:

```javascript
// src/lib/bangla.js

// Convert English numerals to Bangla
export function toBanglaNumber(number) {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(number).replace(/[0-9]/g, d => banglaDigits[d]);
}

// Format currency in Bangla (BD style: 1,50,000)
export function toBanglaCurrency(number) {
  if (!number && number !== 0) return '—';
  const n = Math.round(Number(number));
  // BD grouping: last 3 digits, then groups of 2
  const str = n.toString();
  let result = '';
  if (str.length <= 3) {
    result = str;
  } else {
    result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    result = remaining + ',' + result;
  }
  return toBanglaNumber(result) + ' টাকা';
}

// Bangla month names
export const banglaMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
  'মে', 'জুন', 'জুলাই', 'আগস্ট',
  'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// Format date in Bangla
export function toBanglaDate(dateStr) {
  const d = new Date(dateStr);
  return `${toBanglaNumber(d.getDate())} ${banglaMonths[d.getMonth()]} ${toBanglaNumber(d.getFullYear())}`;
}
```

**Rule:** Never display raw English numbers to the user. Always pass display values through `toBanglaNumber()` or `toBanglaCurrency()`.

### Common UI Strings (Bangla)

```javascript
// src/lib/strings.js — all UI text in one place
export const strings = {
  // Landing
  enterOfficeId: 'আপনার অফিস কোড লিখুন',
  searchOffice: 'অফিস খুঁজুন',
  officeNotFound: 'এই কোডে কোনো অফিস পাওয়া যায়নি। নতুন অফিস নিবন্ধন করুন।',
  registerOffice: 'অফিস নিবন্ধন',
  confirmOffice: 'এটি কি আপনার অফিস?',
  yes: 'হ্যাঁ',
  no: 'না',

  // Dashboard
  dashboard: 'ড্যাশবোর্ড',
  formProgress: 'ফর্মের অগ্রগতি',
  budgetSheet: 'বাজেট শিট',
  submit: 'দাখিল করুন',
  submitFinal: 'চূড়ান্তভাবে দাখিল করুন',
  draft: 'খসড়া',
  submitted: 'দাখিলকৃত',
  noCycleOpen: 'বর্তমানে কোনো দাখিলের চক্র খোলা নেই।',

  // Forms
  save: 'সংরক্ষণ করুন',
  saved: 'সংরক্ষিত হয়েছে',
  saving: 'সংরক্ষণ হচ্ছে...',
  required: 'এই তথ্যটি আবশ্যক',
  form1: 'অফিসের মূল তথ্য',
  form2: 'কর্মকর্তা ও কর্মচারীর তথ্য',
  form3: 'যানবাহনের তথ্য',
  form4: 'যন্ত্রপাতি ও সরঞ্জামের তথ্য',
  form5: 'ইউটিলিটি খরচের তথ্য',
  form6: 'জ্বালানি তেলের তথ্য',
  form7: 'ভাড়ার তথ্য',
  form8: 'বিবিধ তথ্য',

  // Budget sheet
  code: 'কোড',
  expenseHead: 'ব্যয় খাত',
  amount: 'পরিমাণ (টাকা)',
  prevYear: 'পূর্ববর্তী বছর (টাকা)',
  autoCalculated: 'স্বয়ংক্রিয়ভাবে গণনাকৃত',
  grandTotal: 'মোট',

  // Reports
  budgetReport: 'বাজেট প্রতিবেদন',
  estimatedBudget: 'প্রাক্কলিত বাজেট',
  revisedBudget: 'সংশোধিত বাজেট',
  fiscalYear: 'অর্থবছর',
  generatedOn: 'তৈরির তারিখ',
  officeName: 'অফিসের নাম',
  officeCode: 'অফিস কোড',

  // Errors
  errorLoading: 'তথ্য লোড করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।',
  errorSaving: 'সংরক্ষণ করতে সমস্যা হয়েছে।',
  sessionExpired: 'সেশন শেষ হয়ে গেছে। পুনরায় লগইন করুন।',
};
```

### Report Generation (HTML → Print → PDF)

Do **not** use jsPDF. Generate reports as styled HTML pages and use the browser's native print dialog.

```javascript
// src/lib/report.js
export function printReport(htmlContent) {
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @font-face {
          font-family: 'Kalpurush';
          src: url('/fonts/Kalpurush.ttf') format('truetype');
        }
        * { font-family: 'Kalpurush', sans-serif; }
        body { margin: 2cm; font-size: 12pt; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 6px 10px; }
        th { background: #f0f0f0; }
        @media print {
          @page { size: A4; margin: 2cm; }
        }
      </style>
    </head>
    <body>${htmlContent}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}
```

Each report page calls `printReport()` with its generated HTML. The browser handles pagination, margins, and PDF export (via "Save as PDF" in the print dialog). No additional library needed.

---

## Notes for AI IDE

1. **Do not hardcode any rate values** (medical allowance, house rent %, etc.). Always read from the `rates` table.

2. **Formula engine is the single source of truth** for all auto-calculated budget values. No calculation logic should exist outside `src/lib/formulas.js`.

3. **Office session** is managed via `sessionStorage` (office_id only — no sensitive data). On every page load, verify the office_id exists in Supabase before showing any data.

4. **Draft saving** must be silent (no disruptive UI). Show a small "Saved" indicator. Never block the user.

5. **Submitted submissions are fully locked.** Once `submissions.status = 'submitted'`, all form inputs must render as read-only. The submit action is irreversible from the office side.

6. **Cycle awareness.** If no cycle is open, offices can view their past submissions but cannot edit or submit. Show a clear "No active submission cycle" message.

7. **Expense codes are placeholder** for now. The system must work with the seeded codes and the SuperAdmin will update names, add more codes, and map them to groups before go-live. The formula engine should gracefully skip codes with no `formula_key`.

8. **Code-wise consolidated report** may have many columns if a group has many offices. Use landscape PDF orientation for this report.

9. **All monetary values** are in BDT (Bangladeshi Taka). Use BD grouping format (১,৫০,০০০ — last 3 digits then groups of 2). Always use `toBanglaCurrency()` from `src/lib/bangla.js` for display. Never show raw English numbers in the UI.

10. **Previous year data** is shown as a reference column in the budget sheet. For the first cycle, this column will be empty. Import mechanism for previous year actuals to be added in a future phase.

11. **All UI text lives in `src/lib/strings.js`**. Never hardcode UI strings inline in components. Always reference `strings.xyz`. This makes future English translation a one-file job.

12. **Input fields accept English numerals only** (standard keyboard input). On display/read-only, convert to Bangla using `toBanglaNumber()`. Do not attempt to intercept keystrokes to show Bangla numerals while typing — it breaks mobile keyboards.

13. **Kalpurush font** must be loaded before any content renders. Add it to the Astro layout base so it applies globally. If the font fails to load, fall back to `sans-serif` — never fall back to a Latin font that breaks Bangla rendering.

14. **Reports are HTML → browser print → PDF**. No jsPDF. Each report is a separate HTML page opened in a new tab with print triggered automatically. The Kalpurush font must be embedded in the report HTML so it renders correctly even when printed to PDF.
