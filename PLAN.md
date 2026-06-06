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

## Database Schema (Supabase / Postgres)

### Master Tables

```sql
-- Office groups (tax, VAT, customs, etc.)
CREATE TABLE office_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 150 expense codes (permanent, never deleted)
CREATE TABLE expense_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,       -- e.g. '0001'
  name TEXT NOT NULL,              -- e.g. 'Salary (Officers)'
  formula_key TEXT,                -- e.g. 'salary_officers' — links to formula engine
  is_manual BOOLEAN DEFAULT FALSE, -- TRUE = user enters value directly in budget sheet
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Which codes belong to which group
CREATE TABLE code_group_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES expense_codes(id) ON DELETE CASCADE,
  group_id UUID REFERENCES office_groups(id) ON DELETE CASCADE,
  UNIQUE(code_id, group_id)
);

-- Formula rates (editable by SuperAdmin — never hardcoded)
CREATE TABLE rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,        -- e.g. 'medical_allowance_monthly'
  value NUMERIC NOT NULL,          -- e.g. 1500
  description TEXT,                -- e.g. 'Monthly medical allowance per staff'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff grades
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_no INTEGER NOT NULL UNIQUE, -- 1 to 20
  category TEXT NOT NULL CHECK (category IN ('officer', 'staff')),
  -- officer: grades 1–9, staff: grades 10–20
  label TEXT                        -- e.g. 'Grade 1 (Officer)'
);
```

### Office Tables

```sql
-- Offices (self-registered on first visit)
CREATE TABLE offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id TEXT NOT NULL UNIQUE,  -- user-entered code e.g. 'DHK-001'
  name TEXT NOT NULL,
  group_id UUID REFERENCES office_groups(id),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Cycle Tables

```sql
-- Submission cycles (opened/closed by SuperAdmin)
CREATE TABLE cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year TEXT NOT NULL,       -- e.g. '2024-25'
  type TEXT NOT NULL CHECK (type IN ('estimated', 'revised')),
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fiscal_year, type)
);

-- One submission per office per cycle
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES cycles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(office_id, cycle_id)
);

-- Form 1: Office basic info (supplementary fields beyond offices table)
CREATE TABLE form_basic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  phone TEXT,
  email TEXT,
  head_of_office TEXT,
  designation TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form 2: Staff details (one row per grade per submission)
CREATE TABLE form_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  grade_id UUID REFERENCES grades(id),
  count INTEGER DEFAULT 0,
  avg_basic NUMERIC DEFAULT 0,     -- average basic salary per person per month
  UNIQUE(submission_id, grade_id)
);

-- Form 3: Vehicles
CREATE TABLE form_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,      -- e.g. 'Jeep', 'Microbus', 'Motorcycle'
  count INTEGER DEFAULT 0,
  monthly_fuel_liters NUMERIC DEFAULT 0,
  UNIQUE(submission_id, vehicle_type)
);

-- Form 4: Equipment
CREATE TABLE form_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,    -- e.g. 'Computer', 'Printer', 'AC'
  count INTEGER DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  UNIQUE(submission_id, equipment_type)
);

-- Form 5: Utility expenses
CREATE TABLE form_utility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  electricity_monthly NUMERIC DEFAULT 0,
  water_monthly NUMERIC DEFAULT 0,
  gas_monthly NUMERIC DEFAULT 0,
  internet_monthly NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form 6: Fuel/oil requirement
CREATE TABLE form_fuel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  monthly_liters NUMERIC DEFAULT 0,
  price_per_liter NUMERIC DEFAULT 0,
  UNIQUE(submission_id, vehicle_type)
);

-- Form 7: Rent and other fixed costs
CREATE TABLE form_rent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  office_rent_monthly NUMERIC DEFAULT 0,
  garage_rent_monthly NUMERIC DEFAULT 0,
  other_rent_monthly NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form 8: Other miscellaneous operational data
CREATE TABLE form_misc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  stationery_annual NUMERIC DEFAULT 0,
  printing_annual NUMERIC DEFAULT 0,
  hospitality_annual NUMERIC DEFAULT 0,
  training_annual NUMERIC DEFAULT 0,
  other_annual NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget sheet (auto-calculated + manual override rows)
CREATE TABLE budget_sheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  code_id UUID REFERENCES expense_codes(id),
  auto_value NUMERIC DEFAULT 0,    -- formula result (system writes this)
  manual_value NUMERIC,            -- user-entered (only for is_manual codes)
  final_value NUMERIC GENERATED ALWAYS AS (
    COALESCE(manual_value, auto_value)
  ) STORED,
  prev_year_actual NUMERIC,        -- reference only (read-only, imported or entered)
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, code_id)
);
```

### Auth / Admin Tables

```sql
-- Admin users (SuperAdmin manages this)
-- Uses Supabase Auth for actual auth — this table extends it
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'superadmin')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin to group mapping (admin can have multiple groups)
CREATE TABLE admin_group_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES office_groups(id) ON DELETE CASCADE,
  UNIQUE(admin_id, group_id)
);
```

---

## Seed Data (Placeholder — to be replaced by SuperAdmin later)

```sql
-- Placeholder expense codes (SuperAdmin will update names and formulas later)
INSERT INTO expense_codes (code, name, formula_key, is_manual, sort_order) VALUES
('0001', 'Salary (Officers)', 'salary_officers', FALSE, 1),
('0002', 'Salary (Staff)', 'salary_staff', FALSE, 2),
('0003', 'Allowances (Officers)', 'allowances_officers', FALSE, 3),
('0004', 'Allowances (Staff)', 'allowances_staff', FALSE, 4),
('0005', 'Festival Bonus', 'festival_bonus', FALSE, 5),
('0006', 'Pension / Gratuity', NULL, TRUE, 6),
('0007', 'Provident Fund', 'provident_fund', FALSE, 7),
('0008', 'Medical Expenses', 'medical', FALSE, 8),
('0009', 'Travel Allowance', NULL, TRUE, 9),
('0010', 'Office Rent', 'office_rent', FALSE, 10),
('0011', 'Vehicle Fuel / Oil', 'fuel', FALSE, 11),
('0012', 'Vehicle Maintenance', NULL, TRUE, 12),
('0013', 'Electricity Bill', 'electricity', FALSE, 13),
('0014', 'Water Bill', 'water', FALSE, 14),
('0015', 'Gas Bill', 'gas', FALSE, 15),
('0016', 'Internet / Telephone', 'internet', FALSE, 16),
('0017', 'Stationery', 'stationery', FALSE, 17),
('0018', 'Printing & Publication', 'printing', FALSE, 18),
('0019', 'Hospitality', 'hospitality', FALSE, 19),
('0020', 'Training & Workshop', 'training', FALSE, 20),
('10010041', 'Computers and Others', NULL, TRUE, 21),
('10010042', 'Furniture and Fixtures', NULL, TRUE, 22),
('10010043', 'Office Equipment', NULL, TRUE, 23);
-- SuperAdmin will add remaining codes up to 150 via the UI

-- Placeholder rates
INSERT INTO rates (key, value, description) VALUES
('medical_allowance_monthly', 1500, 'Monthly medical allowance per staff (BDT)'),
('house_rent_percent', 50, 'House rent as % of basic salary'),
('festival_bonus_multiplier', 2, 'Number of festival bonuses per year'),
('provident_fund_percent', 10, 'Provident fund as % of basic salary'),
('fuel_price_per_liter', 110, 'Fuel price per liter (BDT) — update each cycle');

-- Placeholder grades
INSERT INTO grades (grade_no, category, label) VALUES
(1, 'officer', 'Grade 1 (Officer)'),
(2, 'officer', 'Grade 2 (Officer)'),
(3, 'officer', 'Grade 3 (Officer)'),
(4, 'officer', 'Grade 4 (Officer)'),
(5, 'officer', 'Grade 5 (Officer)'),
(6, 'officer', 'Grade 6 (Officer)'),
(7, 'officer', 'Grade 7 (Officer)'),
(8, 'officer', 'Grade 8 (Officer)'),
(9, 'officer', 'Grade 9 (Officer)'),
(10, 'staff', 'Grade 10 (Staff)'),
(11, 'staff', 'Grade 11 (Staff)'),
(12, 'staff', 'Grade 12 (Staff)'),
(13, 'staff', 'Grade 13 (Staff)'),
(14, 'staff', 'Grade 14 (Staff)'),
(15, 'staff', 'Grade 15 (Staff)'),
(16, 'staff', 'Grade 16 (Staff)'),
(17, 'staff', 'Grade 17 (Staff)'),
(18, 'staff', 'Grade 18 (Staff)'),
(19, 'staff', 'Grade 19 (Staff)'),
(20, 'staff', 'Grade 20 (Staff)');
```

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
