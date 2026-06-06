# Database Architecture — Budget Management System

## Overview

PostgreSQL database hosted on Supabase. The system manages budget submissions from ~1,500 government offices, twice yearly. Each office fills a series of forms; the system auto-calculates a budget sheet from the entered data.

---

## Key Concepts

- **Office** — a government office that submits budget data
- **Cycle** — a submission window (fiscal year + budget type). SuperAdmin opens and closes it.
- **Submission** — one office's data for one cycle. Everything links to this.
- **Budget Sheet** — auto-calculated from form data. One row per applicable expense code per submission.
- **Rates** — global formula values (e.g. medical allowance, VAT %). Never hardcoded.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Primary keys | `BIGINT GENERATED ALWAYS AS IDENTITY` | Simple, sequential, readable in reports |
| Timestamps | `created_at` + `updated_at` on every table | Full audit trail |
| `updated_at` | Auto-updated via trigger | Never manually set |
| Rates | Stored in `rates` table, keyed by string | SA editable, never hardcoded |
| Auth | Supabase Auth for admin/superadmin | offices use budget_id, no password |
| RLS | Enabled on all tables | Access controlled per role |

---

## Entity Relationship Overview

```
departments
├── parent_offices
└── office_types
        └── offices
                └── submissions ──────────────────────────────────────────┐
                        ├── form_staff                                     │
                        ├── form_allowances                                │
                        ├── form_leave                                     │
                        ├── form_vehicles                                  │
                        ├── form_vehicle_rent                              │
                        ├── form_it_inventory                              │
                        ├── form_it_requirement                            │
                        ├── form_utility                                   │
                        ├── form_house_rent                                │
                        ├── form_return_info                               │
                        └── budget_sheet ── expense_codes                 │
                                                └── code_type_mapping ────┘
                                                        └── office_types

cycles ──── submissions (above)

rates ──── vehicle_fuel_config (via rate_key)

admin_profiles
        └── admin_group_mapping ── office_types
```

---

## Domain 1 — Office

Defines the organisational structure of all offices.

### `departments`
Top-level classification of offices.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | Auto-generated |
| name | TEXT UNIQUE | e.g. Tax, Customs & VAT, Savings |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-updated |

---

### `parent_offices`
Administrative parent of an office (e.g. Taxes Zone-1, Dhaka). Used for scrutiny and drill-down reporting. Not used for consolidation logic.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| name | TEXT | Editable by SuperAdmin |
| department_id | BIGINT FK → departments | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `office_types`
Defines the category of an office (e.g. Tax Circle, VAT Circle, Commissionerate). Controls whether offices of this type get consolidated budget reports.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| name | TEXT | e.g. Tax Circle, VAT Circle |
| department_id | BIGINT FK → departments | |
| is_group_budget | BOOLEAN | TRUE = offices of this type are consolidated |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

> **is_group_budget:** When TRUE, all offices of this type appear in consolidated code-wise reports. When FALSE, office budget is independent — individual report only.

---

### `offices`
Each registered office. Created on first visit by the office user.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | System generated |
| budget_id | TEXT UNIQUE | Government assigned, entered by user |
| name | TEXT | Entered by user |
| parent_office_id | BIGINT FK → parent_offices | Selected by user, nullable |
| office_type_id | BIGINT FK → office_types | Selected by user |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

> **Department** is not stored on offices directly. Derive via: `offices → office_types → departments`

---

## Domain 2 — Cycle

Controls submission windows. SuperAdmin opens and closes cycles.

### `cycles`
A submission window defined by fiscal year and budget type.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| fiscal_year | TEXT | e.g. 2026-27 |
| budget_type | TEXT | `new` or `revised` |
| status | TEXT | `open` or `closed` |
| opened_at | TIMESTAMPTZ | When SA opened it |
| closed_at | TIMESTAMPTZ | When SA closed it |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(fiscal_year, budget_type)

> Multiple cycles can be open simultaneously if SA decides. Most common case: one open at a time.

---

### `submissions`
One row per office per cycle. The central anchor — every form table references this.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| office_id | BIGINT FK → offices | |
| cycle_id | BIGINT FK → cycles | |
| status | TEXT | `draft`, `submitted`, `needs_resubmit` |
| submitted_at | TIMESTAMPTZ | Set on final submit |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(office_id, cycle_id)

**Status flow:**
```
draft → submitted → needs_resubmit → submitted
```

> `needs_resubmit` is set automatically when any form is edited after submission. Office must review budget sheet and resubmit to clear it.

---

## Domain 3 — Rates (Global)

Single key-value table for all formula rates. SuperAdmin edits before opening each cycle. Never hardcoded in application code.

### `rates`

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| key | TEXT UNIQUE | Referenced by formula engine and vehicle_fuel_config |
| value | NUMERIC | Current rate value |
| description | TEXT | Human readable explanation |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Seeded values:**

| key | value | description |
|---|---|---|
| medical_allowance_monthly | 1500 | Monthly medical allowance per person (BDT) |
| house_rent_percent | 50 | House rent as % of basic salary |
| festival_bonus_multiplier | 2 | Number of festival bonuses per year |
| provident_fund_percent | 10 | Provident fund as % of basic salary |
| fuel_price_octane | 130 | Octane price per liter (BDT) |
| fuel_price_diesel | 110 | Diesel price per liter (BDT) |
| fuel_price_cng | 45 | CNG price per m3 (BDT) |
| vat_percentage | 15 | VAT on office rent (%) |
| postal_expense_rate | 50 | Postal expense per return submitted (BDT) |

> **Rule:** Rates are locked during an open cycle. SA updates rates before opening the next cycle to avoid mid-cycle discrepancy.

---

## Domain 4 — Staff

Captures all staff and salary related inputs.

### `grades`
Government pay grades 1–20. Static reference table.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| grade_no | INTEGER UNIQUE | 1 to 20 |
| category | TEXT | `officer` (1-9) or `staff` (10-20) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `form_staff`
Grade-wise staff count and salary data per submission.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK → submissions | |
| grade_id | BIGINT FK → grades | |
| count | INTEGER | Number of persons in this grade |
| total_basic | NUMERIC | Sum of all basics for one month |
| due_salary | NUMERIC | Salary arrears (manual entry) |
| suspended_count | INTEGER | Number of suspended staff in this grade |
| suspended_total_basic | NUMERIC | Sum of basics of suspended staff |
| suspended_due_salary | NUMERIC | Arrears for suspended staff |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(submission_id, grade_id)

> Only non-zero grade rows are inserted. A missing row means zero for that grade. Query using LEFT JOIN with grades table to show all 20 grades in UI.

**Formula inputs from this table:**
```
annual_basic       = total_basic × 12
house_rent         = total_basic × house_rent_percent/100 × 12
medical            = count × medical_allowance_monthly × 12
festival_bonus     = total_basic × festival_bonus_multiplier
provident_fund     = total_basic × provident_fund_percent/100 × 12
due_salary         = due_salary (direct)
```

---

### `allowance_types`
SA managed list of allowance categories.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| name | TEXT UNIQUE | e.g. overtime, duty, dress |
| is_calculated | BOOLEAN | TRUE = amount calculated by formula |
| has_basic | BOOLEAN | TRUE = needs total_basic input (overtime only) |
| is_grade_based | BOOLEAN | TRUE = allowance varies by grade |
| applicable_category | TEXT | `officer`, `staff`, or `both` |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Seeded values:**

| name | is_calculated | has_basic | applicable_category |
|---|---|---|---|
| overtime | TRUE | TRUE | staff |
| duty | TRUE | FALSE | both |
| dress | FALSE | FALSE | both |
| risk | FALSE | FALSE | both |
| hill | FALSE | FALSE | both |

---

### `form_allowances`
Allowance inputs per submission.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK → submissions | |
| allowance_type_id | BIGINT FK → allowance_types | |
| count | INTEGER | Number of persons |
| total_basic | NUMERIC nullable | Only for overtime |
| amount | NUMERIC | Calculated (readonly) or manual entry |
| due | NUMERIC | Arrears |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(submission_id, allowance_type_id)

---

### `form_leave`
Leave encashment and rest & recreation inputs.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK UNIQUE | One row per submission |
| leave_encashment_officer_basic | NUMERIC | Total basic of officers taking encashment |
| leave_encashment_officer_due | NUMERIC | Arrears |
| leave_encashment_staff_basic | NUMERIC | Total basic of staff taking encashment |
| leave_encashment_staff_due | NUMERIC | Arrears |
| rest_recreation_amount | NUMERIC | Manual entry |
| rest_recreation_due | NUMERIC | Arrears |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Formula:**
```
leave_encashment = (officer_basic + staff_basic) × 12
```

---

## Domain 5 — Vehicle

### `car_types`
SA managed list of vehicle types.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| name | TEXT UNIQUE | e.g. Jeep, Microbus, Motorcycle |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `fuel_types`
SA managed list of fuel types.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| name | TEXT UNIQUE | e.g. Octane, Diesel, CNG |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `vehicle_fuel_config`
SA managed configuration per car type + fuel type combination.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| car_type_id | BIGINT FK → car_types | |
| fuel_type_id | BIGINT FK → fuel_types | |
| monthly_fuel_allowance | NUMERIC | Max fuel per month (liters or m3) |
| rate_key | TEXT FK → rates.key | References applicable fuel price |
| annual_lube_allowance | NUMERIC | Fixed annual lube cost |
| annual_maintenance_allowance | NUMERIC nullable | Fixed annual maintenance, if defined |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(car_type_id, fuel_type_id)

> `rate_key` links to `rates` table (e.g. `fuel_price_octane`, `fuel_price_diesel`). Fuel price is never stored here directly.

**Formula:**
```
annual_fuel_cost        = monthly_fuel_allowance × fuel_rate × 12 × count
annual_lube_cost        = annual_lube_allowance × count
annual_maintenance_cost = annual_maintenance_allowance × count
                          (or user entered if null in config)
```

---

### `vehicle_rent_config`
SA managed rent allowance per vehicle type.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| car_type_id | BIGINT FK → car_types UNIQUE | |
| monthly_rent_allowance | NUMERIC | Per vehicle per month |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Formula:**
```
annual_rent = monthly_rent_allowance × count × 12
```

---

### `form_vehicles`
User entered vehicle data (government owned vehicles).

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK → submissions | |
| vehicle_fuel_config_id | BIGINT FK → vehicle_fuel_config | |
| count | INTEGER | Number of this vehicle type |
| maintenance_cost | NUMERIC nullable | User enters only if not defined in config |
| additional_expense | NUMERIC nullable | Any extra cost |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(submission_id, vehicle_fuel_config_id)

> If `vehicle_fuel_config.annual_maintenance_allowance` is set → `maintenance_cost` field is readonly in UI. If null → user can enter freely.

---

### `form_vehicle_rent`
User entered rented vehicle data.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK → submissions | |
| vehicle_rent_config_id | BIGINT FK → vehicle_rent_config | |
| count | INTEGER | Number of rented vehicles |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(submission_id, vehicle_rent_config_id)

---

## Domain 6 — IT Equipment

### `it_items`
SA managed list of IT items.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| name | TEXT UNIQUE | e.g. Computer, Printer, Scanner, Accessories |
| allotted_budget | NUMERIC nullable | Per unit budget. Null for lumpsum items. |
| has_toner | BOOLEAN | TRUE for printers |
| is_lumpsum | BOOLEAN | TRUE for Accessories — user enters total amount directly |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `form_it_inventory`
Existing IT inventory per submission.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK → submissions | |
| item_id | BIGINT FK → it_items | |
| count | INTEGER | Total units owned |
| damaged | INTEGER | Number of damaged units |
| toner_price | NUMERIC nullable | Monthly toner price (printers only) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(submission_id, item_id)

**Formula:**
```
toner_annual_cost = toner_price × count × 12  (printers only)
```

---

### `form_it_requirement`
IT purchase requirement per submission.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK → submissions | |
| item_id | BIGINT FK → it_items | |
| required_quantity | INTEGER nullable | Null for lumpsum items |
| total_amount | NUMERIC | Calculated (readonly) or manual for lumpsum |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(submission_id, item_id)

**Formula:**
```
-- For countable items (is_lumpsum = FALSE):
new_needed   = required_quantity - (count - damaged)
total_amount = new_needed × allotted_budget  (readonly)

-- For lumpsum items (is_lumpsum = TRUE):
total_amount = user enters directly
```

---

## Domain 7 — Utility

### `utility_types`
SA managed list of utility categories. Designed to support allowance fields in future.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| name | TEXT UNIQUE | e.g. বিদ্যুৎ, পানি, ইন্টারনেট |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `form_utility`
Utility expense inputs per submission.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK → submissions | |
| utility_type_id | BIGINT FK → utility_types | |
| annual_cost | NUMERIC | Office enters annual figure directly |
| due | NUMERIC | Arrears |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(submission_id, utility_type_id)

---

## Domain 8 — House Rent

### `form_house_rent`
Office rent inputs. One row per submission.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK UNIQUE | |
| monthly_bill | NUMERIC | Total monthly rent (all properties combined) |
| due | NUMERIC | Arrears |
| contract_start_date | DATE | Reference only |
| contract_end_date | DATE | Reference only |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Formula:**
```
annual_rent  = monthly_bill × 12
vat_amount   = monthly_bill × vat_percentage/100 × 12
total        = annual_rent + vat_amount
```

> VAT rate pulled from `rates` table at calculation time (`key = 'vat_percentage'`).

---

## Domain 9 — Return Info

### `form_return_info`
Tax return statistics. Used to calculate postal expenses.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK UNIQUE | |
| tin_count | INTEGER | Total TIN holders under this office |
| return_submitted_count | INTEGER | Number of returns submitted |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Formula:**
```
postal_expense = return_submitted_count × postal_expense_rate
```

> `postal_expense_rate` from `rates` table.

---

## Domain 10 — Expense Codes & Budget Sheet

### `expense_codes`
Universal list of 150 expense codes. Same for all offices.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| code | TEXT UNIQUE | e.g. 0001, 10010041 |
| name | TEXT | e.g. Salary (Officers) |
| formula_key | TEXT nullable | Links to formula engine function |
| is_manual | BOOLEAN | TRUE = user enters value directly in budget sheet |
| sort_order | INTEGER | Display order |
| active | BOOLEAN | FALSE = hidden from all offices |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

> If `formula_key` is NULL and `is_manual` is FALSE — code exists but has no calculation yet. Formula engine skips it gracefully.

---

### `code_type_mapping`
Maps which expense codes are applicable to which office type.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| code_id | BIGINT FK → expense_codes | |
| office_type_id | BIGINT FK → office_types | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(code_id, office_type_id)

> SA reviews and confirms this mapping before each cycle opens. Rarely changes but must be verified.

---

### `budget_sheet`
Auto-calculated budget per expense code per submission.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| submission_id | BIGINT FK → submissions | |
| code_id | BIGINT FK → expense_codes | |
| auto_value | NUMERIC | Calculated by formula engine |
| manual_value | NUMERIC nullable | Only for is_manual codes — user enters |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(submission_id, code_id)

> **Final value logic:** `COALESCE(manual_value, auto_value)` — if manual_value is set, use it; otherwise use auto_value. Computed in application, not stored.

> **Recalculation:** Triggered every time any form is saved. All draft budget_sheet rows for the submission are upserted. Submitted submissions are NOT recalculated unless status changes to `needs_resubmit`.

---

## Domain 11 — Auth & Admin

### `admin_profiles`
Extends Supabase Auth users with role information.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| auth_id | UUID FK → auth.users UNIQUE | Supabase Auth reference |
| username | TEXT UNIQUE | Display name |
| role | TEXT | `admin` or `superadmin` |
| active | BOOLEAN | FALSE = account disabled |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `admin_group_mapping`
Defines which office types an admin can access.

| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| admin_id | BIGINT FK → admin_profiles | |
| office_type_id | BIGINT FK → office_types | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

UNIQUE(admin_id, office_type_id)

> **SuperAdmin** has no entries here — full access is granted by role check alone.
> **Admin** access is filtered by their assigned office_type_ids from this table.

---

## Query Patterns

### Get all forms data for a submission
```sql
SELECT s.*, o.name as office_name, o.budget_id,
       c.fiscal_year, c.budget_type
FROM submissions s
JOIN offices o ON o.id = s.office_id
JOIN cycles c ON c.id = s.cycle_id
WHERE s.id = $submission_id;
```

### Get staff data for formula engine
```sql
SELECT g.grade_no, g.category,
       COALESCE(fs.count, 0) as count,
       COALESCE(fs.total_basic, 0) as total_basic,
       COALESCE(fs.due_salary, 0) as due_salary,
       COALESCE(fs.suspended_count, 0) as suspended_count,
       COALESCE(fs.suspended_total_basic, 0) as suspended_total_basic,
       COALESCE(fs.suspended_due_salary, 0) as suspended_due_salary
FROM grades g
LEFT JOIN form_staff fs ON fs.grade_id = g.id
  AND fs.submission_id = $submission_id
ORDER BY g.grade_no;
```

### Get applicable expense codes for an office
```sql
SELECT ec.*
FROM expense_codes ec
JOIN code_type_mapping ctm ON ctm.code_id = ec.id
JOIN offices o ON o.office_type_id = ctm.office_type_id
WHERE o.id = $office_id
  AND ec.active = TRUE
ORDER BY ec.sort_order;
```

### Get consolidated budget for an office type (group report)
```sql
SELECT ec.code, ec.name,
       SUM(COALESCE(bs.manual_value, bs.auto_value)) as total_amount
FROM budget_sheet bs
JOIN submissions s ON s.id = bs.submission_id
JOIN offices o ON o.id = s.office_id
JOIN expense_codes ec ON ec.id = bs.code_id
WHERE o.office_type_id = $office_type_id
  AND s.cycle_id = $cycle_id
  AND s.status IN ('submitted', 'needs_resubmit')
GROUP BY ec.code, ec.name
ORDER BY ec.sort_order;
```

### Get all rates as a key-value object (for formula engine)
```sql
SELECT key, value FROM rates;
-- In JS: const rates = Object.fromEntries(rows.map(r => [r.key, r.value]))
```

---

## Important Rules for Developers

1. **Never hardcode any rate value.** Always fetch from `rates` table. Use the key-value pattern shown above.

2. **Formula engine is the single source of truth** for all auto-calculated budget values. No calculation logic outside `src/lib/formulas.js`.

3. **Budget sheet recalculates on every form save.** Upsert all applicable code rows for the submission after any form data changes.

4. **Submitted submissions are locked.** Once `status = submitted`, all form inputs render as readonly. Set `status = needs_resubmit` only when office explicitly chooses to edit.

5. **Missing form_staff row = zero** for that grade. Always LEFT JOIN with grades table.

6. **Cycle must be open** for any write operation from office users. Check `cycles.status = open` before allowing form saves or submission.

7. **Admin access filter:** Always filter office queries through `admin_group_mapping` for admin role. SuperAdmin bypasses this filter.

8. **budget_id is government assigned** — user enters it. `offices.id` is our system ID — never expose to users.

9. **`rate_key` on `vehicle_fuel_config`** references `rates.key` — not a foreign key constraint in DB, but treated as one in application logic. Always validate the key exists in rates before saving config.

10. **Bangla in DB:** Utility type names are seeded in Bangla. All other master data names are in Bangla as entered by SuperAdmin. No translation layer needed.
