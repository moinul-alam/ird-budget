# Database Schema Report

## Executive Summary

This report documents the database schema for the IRD Budget Management System. The system uses PostgreSQL via Supabase and manages budget submissions from various tax and customs offices in Bangladesh. The schema has undergone a redesign to better organize tables by domain using naming prefixes.

## Database Technology

- **Database**: PostgreSQL (via Supabase)
- **Identity Strategy**: BIGSERIAL (auto-incrementing big integers)
- **Timestamps**: TIMESTAMPTZ (timezone-aware timestamps)
- **Security**: Row Level Security (RLS) enabled on all tables

## Schema Versions

### 1. Original Schema (`resources/schema.sql`)

The original schema uses plain table names without prefixes and includes:
- Automatic `updated_at` triggers via a helper function
- Domains: Office, Cycle, Rates, Staff, Vehicle, IT, Utility, House Rent, Return Info, Expense Code, Auth
- 20+ tables with foreign key relationships
- Seeded data for grades, allowance types, utility types, IT items, and rates

### 2. Redesigned Schema (`resources/schema_redesign.sql`)

The redesigned schema introduces domain prefixes for better organization:

#### Domain Prefixes

| Prefix | Purpose | Table Count |
|--------|---------|-------------|
| `core_` | Master/reference data | 7 tables |
| `admin_` | Administrative configuration | 3 tables |
| `office_` | Office-specific data and forms | 14 tables |

**Total Tables**: 24 tables

## Detailed Schema Structure

### Core Domain (`core_`)

Master data tables that are relatively static and shared across the system.

#### `core_ministries`
```sql
- id: BIGSERIAL PRIMARY KEY
- code: VARCHAR(50) UNIQUE
- name: TEXT NOT NULL
- created_at, updated_at: TIMESTAMPTZ
```
Stores ministry/department information at the highest organizational level.

#### `core_departments`
```sql
- id: BIGSERIAL PRIMARY KEY
- ministry_id: BIGINT → core_ministries(id)
- name: TEXT NOT NULL
- code: VARCHAR(50) UNIQUE
- created_at, updated_at: TIMESTAMPTZ
```
Departments belong to ministries. Foreign key has RESTRICT on delete.

#### `core_office_types`
```sql
- id: BIGSERIAL PRIMARY KEY
- department_id: BIGINT → core_departments(id)
- name: TEXT NOT NULL
- is_group_budget: BOOLEAN DEFAULT false
- sort_order: INT DEFAULT 1
- created_at, updated_at: TIMESTAMPTZ
```
Defines types of offices (e.g., Tax Headquarter, VAT Circles). `is_group_budget` indicates if this office type consolidates budgets from child offices.

#### `core_budget_cycles`
```sql
- id: BIGSERIAL PRIMARY KEY
- fiscal_year: VARCHAR(20) NOT NULL
- budget_type: VARCHAR(20) CHECK IN ('estimated', 'revised')
- title: TEXT NOT NULL
- status: VARCHAR(20) CHECK IN ('open', 'closed') DEFAULT 'open'
- created_at, updated_at: TIMESTAMPTZ
```
Manages budget cycles (fiscal years and budget types). Only one cycle should be 'open' at a time.

#### `admin_office_levels`
```sql
- id: BIGSERIAL PRIMARY KEY
- department_id: BIGINT → core_departments(id)
- office_type_id: BIGINT → core_office_types(id)
- level_name: TEXT NOT NULL
- level_order: INT DEFAULT 1
- created_at, updated_at: TIMESTAMPTZ
- UNIQUE(office_type_id, level_order) [DROPPED via migration]
```
Defines hierarchical levels within office types. The unique constraint on (office_type_id, level_order) was dropped to allow multiple offices at the same level.

#### `core_offices`
```sql
- id: BIGSERIAL PRIMARY KEY
- budget_id: VARCHAR(50) UNIQUE NOT NULL
- name: TEXT NOT NULL
- department_id: BIGINT → core_departments(id)
- office_type_id: BIGINT → core_office_types(id)
- office_level_id: BIGINT → admin_office_levels(id) [nullable]
- parent_office_id: BIGINT → core_offices(id) [nullable, self-reference]
- is_active: BOOLEAN DEFAULT true
- created_at, updated_at: TIMESTAMPTZ
```
Individual offices. Can have parent-child relationships and optional level assignment.

#### `core_expense_codes`
```sql
- id: BIGSERIAL PRIMARY KEY
- code: VARCHAR(20) UNIQUE NOT NULL
- name: TEXT NOT NULL
- is_manual: BOOLEAN DEFAULT true
- formula_key: VARCHAR(50) [nullable]
- sort_order: INT DEFAULT 0
- is_active: BOOLEAN DEFAULT true
- created_at, updated_at: TIMESTAMPTZ
```
139 economic expense codes for budget line items. Seeded with government-standard codes. `is_manual` indicates if the value is entered manually or calculated automatically.

### Admin Domain (`admin_`)

Administrative tables for system configuration and user management.

#### `admin_users`
```sql
- id: BIGSERIAL PRIMARY KEY
- username: VARCHAR(50) UNIQUE NOT NULL
- password_hash: TEXT NOT NULL
- password_hint: TEXT
- role: VARCHAR(20) CHECK IN ('superadmin', 'admin')
- is_active: BOOLEAN DEFAULT true
- created_at, updated_at: TIMESTAMPTZ
```
Admin users with SHA-256 password hashing. Contains seeded superadmin (username: superadmin, password: 123).

#### `admin_rates`
```sql
- id: BIGSERIAL PRIMARY KEY
- key: VARCHAR(50) UNIQUE NOT NULL
- name: TEXT NOT NULL
- value: NUMERIC(14, 2) NOT NULL
- unit: VARCHAR(20) DEFAULT 'টাকা'
- created_at, updated_at: TIMESTAMPTZ
```
Global rates used in budget calculations (fuel prices, percentages, allowances). Seeded with 10 standard rates.

#### `admin_group_budget_rules`
```sql
- id: BIGSERIAL PRIMARY KEY
- department_id: BIGINT → core_departments(id) [nullable]
- office_type_id: BIGINT → core_office_types(id)
- office_level_id: BIGINT → admin_office_levels(id) [nullable]
- is_group_budget: BOOLEAN DEFAULT true
- created_at, updated_at: TIMESTAMPTZ
- UNIQUE(office_type_id, office_level_id)
```
Defines which office types/levels are group budgets (consolidate child office budgets). Redesigned to support office-level-based grouping.

### Office Domain (`office_`)

Office-specific data including authentication, submissions, and 12 form tables.

#### `office_user_logins`
```sql
- id: BIGSERIAL PRIMARY KEY
- office_id: BIGINT UNIQUE → core_offices(id)
- budget_id: VARCHAR(50) UNIQUE → core_offices(budget_id)
- password_hash: TEXT NOT NULL
- password_hint: TEXT DEFAULT '12345'
- is_active: BOOLEAN DEFAULT true
- last_login_at: TIMESTAMPTZ
- created_at, updated_at: TIMESTAMPTZ
```
Office authentication credentials. Auto-created with default password '12345' if not exists.

#### `office_submissions`
```sql
- id: BIGSERIAL PRIMARY KEY
- office_id: BIGINT → core_offices(id)
- cycle_id: BIGINT → core_budget_cycles(id)
- status: VARCHAR(20) CHECK IN ('draft', 'submitted') DEFAULT 'draft'
- submitted_at: TIMESTAMPTZ
- created_at, updated_at: TIMESTAMPTZ
- UNIQUE(office_id, cycle_id)
```
Tracks budget submission status per office per cycle. One submission per office per cycle.

### 12 Form Tables

Each form table stores budget data for a specific category. All reference `office_submissions(id)` with CASCADE delete.

#### 1. `office_form_basic` (UNIQUE submission_id)
```sql
- submission_id: BIGINT UNIQUE → office_submissions(id)
- head_of_office: TEXT
- designation: TEXT
- phone: VARCHAR(30)
- email: VARCHAR(100)
- address: TEXT
- created_at, updated_at: TIMESTAMPTZ
```
Basic office information (head of office, contact details).

#### 2. `office_form_staff_working` (UNIQUE submission_id, grade_id)
```sql
- submission_id: BIGINT → office_submissions(id)
- grade_id: INT CHECK 1-20
- staff_count: INT DEFAULT 0
- monthly_basic: NUMERIC(14, 2) DEFAULT 0
- due_salary: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
Working staff data per grade (1-9 = officers, 10-20 = staff).

#### 3. `office_form_staff_suspended` (UNIQUE submission_id, grade_id)
```sql
- submission_id: BIGINT → office_submissions(id)
- grade_id: INT CHECK 1-20
- suspended_count: INT DEFAULT 0
- suspended_monthly_basic: NUMERIC(14, 2) DEFAULT 0
- suspended_due_salary: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
Suspended staff data per grade.

#### 4. `office_form_staff_new_recruits`
```sql
- submission_id: BIGINT → office_submissions(id)
- grade_id: INT CHECK 1-20
- recruit_count: INT DEFAULT 0
- monthly_basic: NUMERIC(14, 2) DEFAULT 0
- joining_date: DATE
- months_remaining: INT DEFAULT 12
- total_salary: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
New recruit data with pro-rated salary calculations.

#### 5. `office_form_allowances`
```sql
- submission_id: BIGINT → office_submissions(id)
- allowance_name: TEXT NOT NULL
- officer_count: INT DEFAULT 0
- staff_count: INT DEFAULT 0
- total_annual_amount: NUMERIC(14, 2) DEFAULT 0
- effective_date: DATE
- created_at, updated_at: TIMESTAMPTZ
```
Allowance data (overtime, duty, dress, risk, hill allowances).

#### 6. `office_form_leave_encashment` (UNIQUE submission_id)
```sql
- submission_id: BIGINT UNIQUE → office_submissions(id)
- leave_encashment_officer_basic: NUMERIC(14, 2) DEFAULT 0
- leave_encashment_officer_due: NUMERIC(14, 2) DEFAULT 0
- leave_encashment_staff_basic: NUMERIC(14, 2) DEFAULT 0
- leave_encashment_staff_due: NUMERIC(14, 2) DEFAULT 0
- rest_recreation_amount: NUMERIC(14, 2) DEFAULT 0
- rest_recreation_due: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
Leave encashment and rest & recreation allowances.

#### 7. `office_form_vehicles_govt`
```sql
- submission_id: BIGINT → office_submissions(id)
- vehicle_type: TEXT NOT NULL
- fuel_type: VARCHAR(50) NOT NULL
- vehicle_count: INT DEFAULT 1
- monthly_fuel_quota_liter: NUMERIC(10, 2) DEFAULT 0
- annual_lube_allowance: NUMERIC(14, 2) DEFAULT 0
- annual_maintenance_allowance: NUMERIC(14, 2) DEFAULT 0
- maintenance_due: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
Government-owned vehicle data (fuel, maintenance, lube allowances).

#### 8. `office_form_vehicles_rent`
```sql
- submission_id: BIGINT → office_submissions(id)
- vehicle_type: TEXT NOT NULL
- vehicle_count: INT DEFAULT 1
- monthly_rent_rate: NUMERIC(14, 2) DEFAULT 0
- annual_total_rent: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
Rented vehicle data.

#### 9. `office_form_house_rent` (UNIQUE submission_id)
```sql
- submission_id: BIGINT UNIQUE → office_submissions(id)
- monthly_rent: NUMERIC(14, 2) DEFAULT 0
- vat_percentage: NUMERIC(5, 2) DEFAULT 15
- arrears_due: NUMERIC(14, 2) DEFAULT 0
- annual_total: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
Office rent and VAT calculations.

#### 10. `office_form_it_equipment`
```sql
- submission_id: BIGINT → office_submissions(id)
- equipment_type: TEXT NOT NULL
- existing_count: INT DEFAULT 0
- new_demand_count: INT DEFAULT 0
- toner_cost_monthly: NUMERIC(14, 2) DEFAULT 0
- annual_total_cost: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
IT equipment inventory and requirements (computers, printers, scanners, accessories).

#### 11. `office_form_utilities` (UNIQUE submission_id, utility_name)
```sql
- submission_id: BIGINT → office_submissions(id)
- utility_name: VARCHAR(50) NOT NULL
- annual_bill: NUMERIC(14, 2) DEFAULT 0
- arrears_due: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
Utility bills (electricity, water, internet).

#### 12. `office_form_return_info` (UNIQUE submission_id)
```sql
- submission_id: BIGINT UNIQUE → office_submissions(id)
- return_submitted_count: INT DEFAULT 0
- postal_rate_per_return: NUMERIC(10, 2) DEFAULT 50
- total_postal_demand: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
Tax return submission counts and postal expenses.

#### Budget Sheet: `office_budget_sheet` (UNIQUE submission_id, code_id)
```sql
- id: BIGSERIAL PRIMARY KEY
- submission_id: BIGINT → office_submissions(id)
- code_id: BIGINT → core_expense_codes(id)
- auto_value: NUMERIC(14, 2) DEFAULT 0
- manual_value: NUMERIC(14, 2) [nullable]
- final_value: NUMERIC(14, 2) DEFAULT 0
- created_at, updated_at: TIMESTAMPTZ
```
Final budget sheet mapping expense codes to calculated or manual values per submission.

## Foreign Key Relationships

### Core Domain
- `core_departments.ministry_id` → `core_ministries.id` (RESTRICT)
- `core_office_types.department_id` → `core_departments.id` (RESTRICT)
- `admin_office_levels.department_id` → `core_departments.id` (CASCADE)
- `admin_office_levels.office_type_id` → `core_office_types.id` (CASCADE)
- `core_offices.department_id` → `core_departments.id` (RESTRICT)
- `core_offices.office_type_id` → `core_office_types.id` (RESTRICT)
- `core_offices.office_level_id` → `admin_office_levels.id` (SET NULL)
- `core_offices.parent_office_id` → `core_offices.id` (SET NULL) [self-reference]

### Admin Domain
- `admin_group_budget_rules.department_id` → `core_departments.id` (CASCADE)
- `admin_group_budget_rules.office_type_id` → `core_office_types.id` (CASCADE)
- `admin_group_budget_rules.office_level_id` → `admin_office_levels.id` (CASCADE)

### Office Domain
- `office_user_logins.office_id` → `core_offices.id` (CASCADE)
- `office_user_logins.budget_id` → `core_offices(budget_id)` (CASCADE, UPDATE CASCADE)
- `office_submissions.office_id` → `core_offices.id` (RESTRICT)
- `office_submissions.cycle_id` → `core_budget_cycles.id` (RESTRICT)
- All 12 form tables + budget sheet: `submission_id` → `office_submissions(id)` (CASCADE)
- `office_budget_sheet.code_id` → `core_expense_codes(id)` (RESTRICT)

## Unique Constraints

| Table | Constraint |
|-------|------------|
| `core_ministries` | `code` |
| `core_departments` | `code` |
| `core_office_types` | None (implicit via department_id + name) |
| `core_budget_cycles` | None (fiscal_year + budget_type should be unique in practice) |
| `core_offices` | `budget_id` |
| `core_expense_codes` | `code` |
| `admin_users` | `username` |
| `admin_rates` | `key` |
| `admin_group_budget_rules` | `(office_type_id, office_level_id)` |
| `office_user_logins` | `office_id`, `budget_id` |
| `office_submissions` | `(office_id, cycle_id)` |
| `office_form_basic` | `submission_id` |
| `office_form_staff_working` | `(submission_id, grade_id)` |
| `office_form_staff_suspended` | `(submission_id, grade_id)` |
| `office_form_leave_encashment` | `submission_id` |
| `office_form_house_rent` | `submission_id` |
| `office_form_return_info` | `submission_id` |
| `office_form_utilities` | `(submission_id, utility_name)` |
| `office_budget_sheet` | `(submission_id, code_id)` |

## Seeded Data

### Admin Users
- Default superadmin: username `superadmin`, password `12345` (SHA-256 hash)

### Budget Cycles
- Default cycle: fiscal_year `2026-2027`, budget_type `estimated`, status `open`

### Rates (10 entries)
- medical_allowance_monthly: 1500 টাকা
- house_rent_percent: 50%
- festival_bonus_multiplier: 2
- provident_fund_percent: 10%
- fuel_price_octane: 130 টাকা/liter
- fuel_price_diesel: 110 টাকা/liter
- fuel_price_cng: 45 টাকা/m³
- vat_percentage: 15%
- postal_expense_rate: 50 টাকা/return
- education_allowance: 500 টাকা

### Expense Codes (139 entries)
Standard government economic codes (3111101-4113303) covering:
- Salary and allowances (311xxxx)
- Office expenses (321xxxx)
- Fees and charges (322xxxx)
- Training and fuel (323xxxx, 324xxxx)
- Goods and services (325xxxx)
- Taxes and duties (382xxxx)
- Contingency (391xxxx)
- Capital expenditures (411xxxx)

## Security

### Row Level Security (RLS)
- RLS is **enabled on all tables**
- Current policy: Permissive policy allowing all operations for `anon` and `authenticated` roles
- Policy name: `"Allow all on {table_name}"`
- This is overly permissive for production and should be tightened

### Database Permissions
- Grants applied to: `postgres`, `anon`, `authenticated`, `service_role`
- Privileges: ALL on tables, sequences, and routines
- Default privileges set for future objects

## Missing Tables (from Original Schema)

The redesigned schema removed these tables from the original:
- `parent_offices` (now handled via `core_offices.parent_office_id`)
- `grades` (grade_id is now an INT 1-20, not a foreign key)
- `allowance_types` (allowances now use free-text `allowance_name`)
- `car_types` (vehicle types now free-text)
- `fuel_types` (fuel types now free-text)
- `vehicle_fuel_config` (fuel data now inline in form tables)
- `vehicle_rent_config` (rent data now inline in form tables)
- `it_items` (IT equipment types now free-text)
- `utility_types` (utility types now free-text, seeded with Bengali names)
- `code_type_mapping` (removed - expense codes now apply to all office types)
- `admin_profiles` (replaced by `admin_users`)
- `admin_group_mapping` (replaced by `admin_group_budget_rules`)

## Data Flow

1. **Office Login**: Office user authenticates via `office_user_logins` using budget_id + password
2. **Cycle Selection**: System selects active/open cycle from `core_budget_cycles`
3. **Submission Creation**: Auto-creates submission in `office_submissions` if not exists
4. **Form Data Entry**: User fills 12 forms (office_form_*) referencing the submission_id
5. **Budget Calculation**: System calculates auto_values in `office_budget_sheet` based on form data
6. **Manual Overrides**: Admin can enter manual_values for certain expense codes
7. **Final Value**: final_value = auto_value + manual_value (or manual_value if provided)
8. **Submission**: User marks submission as 'submitted', preventing further edits
9. **Consolidation**: Group budget offices consolidate child office submissions

## Migration Scripts

### `drop_level_unique_constraint.sql`
- Drops UNIQUE constraint on `(office_type_id, level_order)` from `admin_office_levels`
- Allows multiple offices at same level order
- Re-grants permissions after constraint drop

### `update_group_budget_rules.sql`
- Redesigns `admin_group_budget_rules` to support office-level-based grouping
- Adds `department_id`, `office_level_id` columns
- Changes unique constraint to `(office_type_id, office_level_id)`
- Re-enables RLS and permissive policies

### `grant_permissions.sql`
- Grants comprehensive permissions to Supabase roles
- Sets default privileges for future objects
- Ensures anon/authenticated/service_role can access all objects

## Observations

### Strengths
1. **Clear domain separation** with naming prefixes (core_, admin_, office_)
2. **Comprehensive coverage** of budget requirements with 12 specialized form tables
3. **Proper cascade deletes** for form data when submissions are deleted
4. **Unique constraints** prevent duplicate submissions per office per cycle
5. **Self-referencing hierarchy** in offices for parent-child relationships
6. **Standard government expense codes** integrated (139 codes)

### Concerns
1. **Overly permissive RLS policies** - all tables allow full access to anon/authenticated
2. **SHA-256 password hashing** - not suitable for passwords (should use bcrypt/argon2)
3. **Hardcoded default password** ('12345') in schema and office_user_logins
4. **Missing updated_at triggers** in redesigned schema (present in original)
5. **Denormalized lookup data** - vehicle types, fuel types, utility types are free-text instead of reference tables
6. **No audit trail** for sensitive operations (user changes, budget approvals)
7. **No validation** for fiscal_year format in core_budget_cycles
8. **grade_id as INT instead of FK** - loses referential integrity with grades table
9. **Missing NOT NULL constraints** on some fields that should be required
10. **No index strategy** documented for common query patterns

### Code-Schema Mismatch
- Original schema.sql still exists but appears unused
- Application code uses redesigned schema (core_, admin_, office_ prefixes)
- Need to determine if original schema should be removed or kept for reference

---

## Recommendations for Improvements

### 1. Security Enhancements

#### A. Tighten RLS Policies
**Current Issue**: All tables have permissive policies allowing full access to anon/authenticated roles.

**Recommendation**: Implement role-based RLS policies:
```sql
-- Example for core_expense_codes
CREATE POLICY "expense_codes_select_all" ON core_expense_codes
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "expense_codes_insert_admin" ON core_expense_codes
  FOR INSERT TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "expense_codes_update_admin" ON core_expense_codes
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );
```

**Priority**: HIGH

#### B. Improve Password Security
**Current Issue**: SHA-256 hashing is not suitable for passwords. Default password '12345' is hardcoded.

**Recommendation**:
- Use bcrypt or argon2 for password hashing (Supabase Auth already uses bcrypt)
- Remove hardcoded default passwords
- Implement password strength requirements
- Add password expiration and rotation policies
- Use Supabase Auth for admin users instead of custom admin_users table

**Priority**: CRITICAL

#### C. Implement Audit Logging
**Current Issue**: No audit trail for sensitive operations.

**Recommendation**: Create audit log table:
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  user_type VARCHAR(20) CHECK (user_type IN ('admin', 'office')),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id BIGINT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
```

**Priority**: MEDIUM

### 2. Data Integrity

#### A. Add NOT NULL Constraints
**Current Issue**: Some fields lack NOT NULL constraints that should be required.

**Recommendation**: Add NOT NULL to:
- `core_ministries.name`, `core_ministries.code`
- `core_departments.name`, `core_departments.department_id`
- `core_offices.name`, `core_offices.budget_id`, `core_offices.department_id`, `core_offices.office_type_id`
- `office_submissions.office_id`, `office_submissions.cycle_id`, `office_submissions.status`
- All form tables: `submission_id` should be NOT NULL

**Priority**: MEDIUM

#### B. Restore Reference Tables
**Current Issue**: Lookup data (vehicle types, fuel types, utility types) are free-text, losing referential integrity.

**Recommendation**: Create reference tables:
```sql
CREATE TABLE ref_vehicle_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ref_fuel_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ref_utility_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Update form tables to reference these instead of free-text.

**Priority**: MEDIUM

#### C. Add Fiscal Year Validation
**Current Issue**: No validation for fiscal_year format in core_budget_cycles.

**Recommendation**:
```sql
ALTER TABLE core_budget_cycles
  ADD CONSTRAINT chk_fiscal_year_format
  CHECK (fiscal_year ~ '^\d{4}-\d{2}$');
```

**Priority**: LOW

#### D. Add Grade Reference Table
**Current Issue**: grade_id is INT 1-20 instead of foreign key, losing referential integrity.

**Recommendation**: Restore grades table or use ENUM:
```sql
CREATE TYPE grade_category AS ENUM ('officer', 'staff');

CREATE TABLE ref_grades (
  id SERIAL PRIMARY KEY,
  grade_no INT NOT NULL UNIQUE CHECK (grade_no BETWEEN 1 AND 20),
  category grade_category NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Priority**: LOW

### 3. Performance Optimization

#### A. Add Indexes for Common Queries
**Current Issue**: No documented index strategy.

**Recommendation**: Add indexes:
```sql
-- Core tables
CREATE INDEX idx_core_offices_department ON core_offices(department_id);
CREATE INDEX idx_core_offices_type ON core_offices(office_type_id);
CREATE INDEX idx_core_offices_active ON core_offices(is_active) WHERE is_active = true;
CREATE INDEX idx_core_offices_parent ON core_offices(parent_office_id);

-- Submissions
CREATE INDEX idx_office_submissions_office ON office_submissions(office_id);
CREATE INDEX idx_office_submissions_cycle ON office_submissions(cycle_id);
CREATE INDEX idx_office_submissions_status ON office_submissions(status);
CREATE INDEX idx_office_submissions_office_cycle ON office_submissions(office_id, cycle_id);

-- Budget sheet
CREATE INDEX idx_office_budget_sheet_submission ON office_budget_sheet(submission_id);
CREATE INDEX idx_office_budget_sheet_code ON office_budget_sheet(code_id);

-- Forms
CREATE INDEX idx_form_staff_working_submission ON office_form_staff_working(submission_id);
CREATE INDEX idx_form_staff_working_grade ON office_form_staff_working(grade_id);
CREATE INDEX idx_form_allowances_submission ON office_form_allowances(submission_id);
CREATE INDEX idx_form_vehicles_submission ON office_form_vehicles_govt(submission_id);
CREATE INDEX idx_form_utilities_submission ON office_form_utilities(submission_id);
```

**Priority**: HIGH

#### B. Add Composite Indexes for Reports
**Recommendation**:
```sql
-- For budget consolidation queries
CREATE INDEX idx_budget_sheet_report ON office_budget_sheet(submission_id, code_id, final_value);

-- For office-level reporting
CREATE INDEX idx_submissions_office_cycle_status ON office_submissions(office_id, cycle_id, status);
```

**Priority**: MEDIUM

### 4. Schema Improvements

#### A. Add updated_at Triggers
**Current Issue**: Redesigned schema missing automatic updated_at triggers (present in original).

**Recommendation**: Restore trigger function:
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER trg_core_ministries_updated_at
  BEFORE UPDATE ON core_ministries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Repeat for all tables...
```

**Priority**: MEDIUM

#### B. Add Soft Delete Support
**Current Issue**: Hard deletes with CASCADE may lose important historical data.

**Recommendation**: Add `deleted_at` column instead of hard deletes:
```sql
ALTER TABLE core_offices ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE office_submissions ADD COLUMN deleted_at TIMESTAMPTZ;
-- Add to all relevant tables

-- Update RLS policies to filter out deleted records
USING (deleted_at IS NULL)
```

**Priority**: LOW

#### C. Add Check Constraints for Data Quality
**Recommendation**:
```sql
-- Ensure monetary values are non-negative
ALTER TABLE office_form_staff_working
  ADD CONSTRAINT chk_non_negative_staff_count CHECK (staff_count >= 0),
  ADD CONSTRAINT chk_non_negative_monthly_basic CHECK (monthly_basic >= 0);

-- Ensure dates are reasonable
ALTER TABLE office_form_staff_new_recruits
  ADD CONSTRAINT chk_joining_date_future CHECK (joining_date <= CURRENT_DATE + INTERVAL '1 year');

-- Ensure status transitions are valid (add trigger)
```

**Priority**: LOW

#### D. Normalize allowance_names
**Current Issue**: `office_form_allowances.allowance_name` is free-text, allowing typos and inconsistencies.

**Recommendation**: Create reference table:
```sql
CREATE TABLE ref_allowance_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_calculated BOOLEAN DEFAULT false,
  has_basic BOOLEAN DEFAULT false,
  is_grade_based BOOLEAN DEFAULT false,
  applicable_category VARCHAR(20) CHECK (applicable_category IN ('officer', 'staff', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Priority**: MEDIUM

### 5. Application-Specific Improvements

#### A. Add Submission Workflow States
**Current Issue**: Only 'draft' and 'submitted' states. Missing review/approval workflow.

**Recommendation**: Expand status enum:
```sql
ALTER TABLE office_submissions
  ALTER COLUMN status TYPE VARCHAR(20)
  CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'needs_revision'));

-- Add approval tracking columns
ALTER TABLE office_submissions
  ADD COLUMN reviewed_by BIGINT REFERENCES admin_users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN approval_notes TEXT;
```

**Priority**: MEDIUM

#### B. Add Budget Versioning
**Current Issue**: No way to track changes to budget submissions over time.

**Recommendation**: Implement versioning:
```sql
CREATE TABLE office_submission_versions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES office_submissions(id),
  version_number INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, version_number)
);

-- Snapshot form data for each version
CREATE TABLE office_form_staff_working_versions (
  id BIGSERIAL PRIMARY KEY,
  submission_version_id BIGINT NOT NULL REFERENCES office_submission_versions(id),
  grade_id INT NOT NULL,
  staff_count INT,
  monthly_basic NUMERIC(14, 2),
  due_salary NUMERIC(14, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Repeat for all form tables
```

**Priority**: LOW

#### C. Add Cycle Status Validation
**Current Issue**: Multiple cycles could be 'open' simultaneously.

**Recommendation**: Add constraint or trigger:
```sql
CREATE UNIQUE INDEX idx_one_open_cycle
  ON core_budget_cycles(status)
  WHERE status = 'open';
```

**Priority**: HIGH

#### D. Clean Up Original Schema
**Current Issue**: Original schema.sql exists but is unused, causing confusion.

**Recommendation**:
- Move `resources/schema.sql` to `resources/schema_legacy.sql` for reference
- Document migration path from legacy to redesigned schema
- Consider removing if fully migrated

**Priority**: LOW

### 6. Backup and Recovery

#### A. Add Backup Strategy Documentation
**Recommendation**: Document:
- Automated backup schedule (daily, weekly, monthly)
- Point-in-time recovery (PITR) configuration
- Backup retention policy
- Disaster recovery procedures

**Priority**: MEDIUM

#### B. Add Data Export/Import Tables
**Recommendation**: Create staging tables for bulk data operations:
```sql
CREATE TABLE staging_office_import (
  id BIGSERIAL PRIMARY KEY,
  import_batch_id UUID NOT NULL,
  budget_id VARCHAR(50),
  name TEXT,
  department_name TEXT,
  office_type_name TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Priority**: LOW

### 7. Monitoring and Maintenance

#### A. Add Health Check Table
**Recommendation**:
```sql
CREATE TABLE system_health (
  id BIGSERIAL PRIMARY KEY,
  check_name TEXT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL,
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  details JSONB
);
```

**Priority**: LOW

#### B. Add Statistics Table
**Recommendation**: Track usage statistics:
```sql
CREATE TABLE usage_statistics (
  id BIGSERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value BIGINT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Priority**: LOW

---

## Implementation Priority Summary

### Critical (Immediate Action Required)
1. Replace SHA-256 with bcrypt for password hashing
2. Implement proper RLS policies instead of permissive access

### High (Next Sprint)
1. Add indexes for common query patterns
2. Add constraint to ensure only one open cycle at a time
3. Tighten RLS policies for production

### Medium (Next 2-3 Sprints)
1. Add audit logging for sensitive operations
2. Add NOT NULL constraints where appropriate
3. Restore reference tables for lookup data
4. Add updated_at triggers
5. Implement submission workflow states
6. Add backup strategy documentation

### Low (Future Improvements)
1. Add soft delete support
2. Implement budget versioning
3. Add data quality check constraints
4. Clean up legacy schema
5. Add staging tables for bulk operations
6. Add monitoring and health check tables

---

## Conclusion

The IRD Budget Management System database schema is well-organized with clear domain separation and comprehensive coverage of budget requirements. The redesigned schema with domain prefixes (core_, admin_, office_) provides good structure.

However, there are significant security concerns (overly permissive RLS, weak password hashing) and data integrity issues (denormalized lookup data, missing constraints) that should be addressed before production deployment. Performance optimization through proper indexing is also critical given the expected query patterns.

The recommendations above prioritize security and data integrity first, followed by performance and schema improvements. Implementing these changes will result in a more secure, performant, and maintainable database system.
