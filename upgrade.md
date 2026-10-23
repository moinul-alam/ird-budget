# IRD Budget System - Upgrade Plan

## Overview

This document outlines the complete upgrade process from the current (inconsistent) schema to a robust, well-structured schema. The process is divided into 3 phases:

- **Phase 1:** Admin UI verification + Report UI
- **Phase 2:** Office UI verification + Formula engine
- **Phase 3:** Reporting implementation

## Prerequisites

- A PostgreSQL connection string in `.env` as `DATABASE_URL` (any Postgres host — Supabase or otherwise)
- Development environment ready
- Understanding that this is a clean slate - existing data will be backed up and re-seeded

---

## Step 0: Database Setup (authoritative)

**`prisma/schema.prisma` is the single source of truth for the schema.** The database is
created by Prisma migrations — do not paste DDL by hand. Hand-running SQL is what produced
the drift this plan exists to remove.

```bash
npm run db:generate   # regenerate the Prisma client after a schema change
npm run db:deploy     # apply committed migrations to the database
npm run db:seed       # idempotent: admin user + reference data
npm run db:reset      # DESTRUCTIVE: drop everything, re-apply migrations, re-seed
npm run db:drift      # report schema drift; exits non-zero if DB and schema.prisma disagree
npm run db:studio     # browse data
```

Authoring a schema change:

```bash
# 1. edit prisma/schema.prisma
# 2. generate the migration
npx prisma migrate dev --name <description>
# 3. commit BOTH prisma/schema.prisma and prisma/migrations/<timestamp>_<description>/
```

Rebuilding from nothing is `npm run db:reset` — it drops every table, re-applies
`prisma/migrations/`, and runs the seed, so a wiped database returns to a working state
(including a login) in one command.

### Connection notes

- `DATABASE_URL` **must include `connect_timeout=30`**. Prisma's 5s default is exceeded by the
  TLS handshake when the host resolves over a NAT64/IPv6 path, and the failure surfaces as a
  misleading `P1001 Can't reach database server` — which looks like a TLS or credential problem
  but is only a timeout.
- Use `sslmode=verify-full` for real certificate and hostname verification. Prisma trusts the
  OS certificate store; Node's bundled CA list may not contain the host's CA, so a
  `pg`/node script can fail to verify a connection that Prisma handles fine.
- Prisma connects over TCP as the role named in `DATABASE_URL`. On Supabase that is `postgres`
  (`rolbypassrls = true`), so RLS is already bypassed for all app queries and
  `SUPABASE_SERVICE_ROLE_KEY` plays no part in them — those are PostgREST credentials, not
  database credentials.
- Because the connection is a plain Postgres connection, moving to another Postgres host is a
  one-line `DATABASE_URL` change. Nothing in `prisma/migrations/` is Supabase-specific.

### Seeding

Seeding lives in [prisma/seed.js](prisma/seed.js) and is idempotent (upserts keyed on natural
unique columns). Add new reference data there rather than in ad-hoc SQL files.

Current contents: the `superadmin` admin user and the 139 economic codes. `ADMIN_USERNAME`,
`ADMIN_PASSWORD`, and `ADMIN_PASSWORD_HINT` environment variables override the default
`superadmin` / `123` credentials.

⚠️ The seed only sets the admin password when creating the row, so re-running it will never
overwrite a password you have since changed.

---

## Step 0 (LEGACY): Manual Backup & Wipe — superseded

> ⚠️ **Do not run the SQL in this section.** It is kept only as a record of the old process.
> Use the Prisma workflow in Step 0 above.
>
> Two parts are actively harmful if executed:
> - The wipe list is out of date — it names legacy tables (`office_user_logins`,
>   `budget_sheet`, `form_basic`, `expense_codes`, `office_types`, `code_type_mapping`,
>   `parent_offices`, …) that no longer exist, and omits tables that do.
> - The RLS block at the end of Step 0.3 creates a `USING (true)` policy on **every** table,
>   granting full read/write to the Supabase `anon` role over PostgREST — i.e. to anyone
>   holding the public anon key. See "Row Level Security" in the Notes section.

### 0.1 Backup Existing Data

Run this script to export your existing data:

```sql
-- ==============================================================================
-- BACKUP SCRIPT - Export existing data for re-seeding
-- ==============================================================================

-- Export Offices (100 offices)
SELECT 'INSERT INTO core_offices_backup (budget_id, name, department_id, office_type_id, office_level_id, parent_office_id, is_active, created_at, updated_at) VALUES' as backup_step;
SELECT 
  '(''' || budget_id || ''', ''' || name || ''', ' || 
  COALESCE(department_id::text, 'NULL') || ', ' ||
  COALESCE(office_type_id::text, 'NULL') || ', ' ||
  COALESCE(office_level_id::text, 'NULL') || ', ' ||
  COALESCE(parent_office_id::text, 'NULL') || ', ' ||
  is_active::text || ', ''' || created_at || ''', ''' || updated_at || '''),'
FROM core_offices
ORDER BY id;

-- Export Economic Codes (140 codes)
SELECT 'INSERT INTO economic_codes_backup (code, name, is_manual, formula_key, sort_order, is_active, created_at, updated_at) VALUES' as backup_step;
SELECT 
  '(''' || code || ''', ''' || name || ''', ' || 
  is_manual::text || ', ' ||
  COALESCE('''' || formula_key || '''', 'NULL') || ', ' ||
  sort_order::text || ', ' ||
  is_active::text || ', ''' || created_at || ''', ''' || updated_at || '''),'
FROM core_expense_codes
ORDER BY sort_order;

-- Export Code-Type Mapping (if exists)
SELECT 'INSERT INTO code_type_mapping_backup (code_id, office_type_id) VALUES' as backup_step;
SELECT 
  '(' || code_id || ', ' || office_type_id || '),'
FROM code_type_mapping
ORDER BY code_id, office_type_id;

-- Export Office Types (for reference)
SELECT 'INSERT INTO office_types_backup (id, name, department_id, is_group_budget, sort_order, created_at, updated_at) VALUES' as backup_step;
SELECT 
  '(' || id || ', ''' || name || ''', ' || 
  department_id || ', ' || is_group_budget::text || ', ' ||
  sort_order::text || ', ''' || created_at || ''', ''' || updated_at || '''),'
FROM office_types
ORDER BY id;

-- Export Departments (for reference)
SELECT 'INSERT INTO departments_backup (id, name, ministry_id, code, created_at, updated_at) VALUES' as backup_step;
SELECT 
  '(' || id || ', ''' || name || ''', ' || 
  COALESCE(ministry_id::text, 'NULL') || ', ' ||
  COALESCE('''' || code || '''', 'NULL') || ', ''' || created_at || ''', ''' || updated_at || '''),'
FROM departments
ORDER BY id;

-- Export Ministries (for reference)
SELECT 'INSERT INTO ministries_backup (id, code, name, created_at, updated_at) VALUES' as backup_step;
SELECT 
  '(' || id || ', ''' || code || ''', ''' || name || ''', ''' || created_at || ''', ''' || updated_at || '''),'
FROM ministries
ORDER BY id;
```

**Instructions:**
1. Run the backup script above
2. Copy the output to a file named `backup_data.sql`
3. Save this file securely - you'll need it for re-seeding

### 0.2 Wipe Database

⚠️ **WARNING: This will delete ALL data. Ensure you have completed the backup step above.**

```sql
-- ==============================================================================
-- WIPE DATABASE - Drop all tables and start fresh
-- ==============================================================================

-- Drop all tables in dependency order (child tables first)
DROP TABLE IF EXISTS office_budget_sheet CASCADE;
DROP TABLE IF EXISTS office_form_return_info CASCADE;
DROP TABLE IF EXISTS office_form_utilities CASCADE;
DROP TABLE IF EXISTS office_form_it_equipment CASCADE;
DROP TABLE IF EXISTS office_form_house_rent CASCADE;
DROP TABLE IF EXISTS office_form_vehicles_rent CASCADE;
DROP TABLE IF EXISTS office_form_vehicles_govt CASCADE;
DROP TABLE IF EXISTS office_form_leave_encashment CASCADE;
DROP TABLE IF EXISTS office_form_allowances CASCADE;
DROP TABLE IF EXISTS office_form_staff_new_recruits CASCADE;
DROP TABLE IF EXISTS office_form_staff_suspended CASCADE;
DROP TABLE IF EXISTS office_form_staff_working CASCADE;
DROP TABLE IF EXISTS office_form_basic CASCADE;
DROP TABLE IF EXISTS office_submissions CASCADE;
DROP TABLE IF EXISTS office_user_logins CASCADE;
DROP TABLE IF EXISTS admin_group_budget_rules CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS admin_it_config CASCADE;
DROP TABLE IF EXISTS admin_vehicle_rent_config CASCADE;
DROP TABLE IF EXISTS admin_vehicle_config CASCADE;
DROP TABLE IF EXISTS admin_rates CASCADE;
DROP TABLE IF EXISTS office_level_economic_code_mapping CASCADE;
DROP TABLE IF EXISTS ref_utility_types CASCADE;
DROP TABLE IF EXISTS ref_it_equipment_types CASCADE;
DROP TABLE IF EXISTS ref_fuel_types CASCADE;
DROP TABLE IF EXISTS ref_vehicle_types CASCADE;
DROP TABLE IF EXISTS ref_allowance_types CASCADE;
DROP TABLE IF EXISTS ref_grades CASCADE;
DROP TABLE IF EXISTS ref_economic_codes CASCADE;
DROP TABLE IF EXISTS core_budget_cycles CASCADE;
DROP TABLE IF EXISTS core_offices CASCADE;
DROP TABLE IF EXISTS core_office_levels CASCADE;
DROP TABLE IF EXISTS core_office_types CASCADE;
DROP TABLE IF EXISTS core_departments CASCADE;
DROP TABLE IF EXISTS core_ministries CASCADE;

-- Drop old/legacy tables if they exist
DROP TABLE IF EXISTS public.budget_sheet CASCADE;
DROP TABLE IF EXISTS public.form_it_equipment CASCADE;
DROP TABLE IF EXISTS public.form_return_info CASCADE;
DROP TABLE IF EXISTS public.form_house_rent CASCADE;
DROP TABLE IF EXISTS public.form_utility CASCADE;
DROP TABLE IF EXISTS public.form_vehicle_rent CASCADE;
DROP TABLE IF EXISTS public.form_vehicles CASCADE;
DROP TABLE IF EXISTS public.form_leave CASCADE;
DROP TABLE IF EXISTS public.form_allowances CASCADE;
DROP TABLE IF EXISTS public.form_staff CASCADE;
DROP TABLE IF EXISTS public.form_basic CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.offices CASCADE;
DROP TABLE IF EXISTS public.office_types CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.cycles CASCADE;
DROP TABLE IF EXISTS public.expense_codes CASCADE;
DROP TABLE IF EXISTS public.admin_profiles CASCADE;
DROP TABLE IF EXISTS public.rates CASCADE;
DROP TABLE IF EXISTS public.code_type_mapping CASCADE;
DROP TABLE IF EXISTS public.parent_offices CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.allowance_types CASCADE;
DROP TABLE IF EXISTS public.car_types CASCADE;
DROP TABLE IF EXISTS public.fuel_types CASCADE;
DROP TABLE IF EXISTS public.vehicle_fuel_config CASCADE;
DROP TABLE IF EXISTS public.vehicle_rent_config CASCADE;
DROP TABLE IF EXISTS public.it_items CASCADE;
DROP TABLE IF EXISTS public.utility_types CASCADE;
```

**Instructions:**
1. Run the wipe script above in Supabase SQL Editor
2. Verify all tables are dropped
3. Proceed to Step 0.3

### 0.3 Create New Schema

Run this complete schema creation script:

```sql
-- ==============================================================================
-- IRD BUDGET SYSTEM - COMPLETE SCHEMA V2
-- Domain Prefixes: core_, ref_, admin_, office_
-- ==============================================================================

-- ============================================================
-- DOMAIN 1: CORE STRUCTURE (Admin manages)
-- ============================================================

-- 1.1 Ministries
CREATE TABLE core_ministries (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Departments
CREATE TABLE core_departments (
  id BIGSERIAL PRIMARY KEY,
  ministry_id BIGINT NOT NULL REFERENCES core_ministries(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Office Types
CREATE TABLE core_office_types (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES core_departments(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_group_budget BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.4 Office Levels
CREATE TABLE core_office_levels (
  id BIGSERIAL PRIMARY KEY,
  office_type_id BIGINT NOT NULL REFERENCES core_office_types(id) ON DELETE CASCADE,
  level_name TEXT NOT NULL,
  level_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.5 Offices
CREATE TABLE core_offices (
  id BIGSERIAL PRIMARY KEY,
  budget_id VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department_id BIGINT NOT NULL REFERENCES core_departments(id) ON DELETE RESTRICT,
  office_type_id BIGINT NOT NULL REFERENCES core_office_types(id) ON DELETE RESTRICT,
  office_level_id BIGINT REFERENCES core_office_levels(id) ON DELETE SET NULL,
  parent_office_id BIGINT REFERENCES core_offices(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_no_self_parent CHECK (parent_office_id IS NULL OR parent_office_id != id)
);

-- 1.6 Budget Cycles
CREATE TABLE core_budget_cycles (
  id BIGSERIAL PRIMARY KEY,
  fiscal_year VARCHAR(20) NOT NULL CHECK (fiscal_year ~ '^\d{4}-\d{2}$'),
  budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('estimated', 'revised')),
  title TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fiscal_year, budget_type)
);

-- Ensure only one cycle can be open at a time
CREATE UNIQUE INDEX idx_one_open_cycle ON core_budget_cycles(status) WHERE status = 'open';

-- ============================================================
-- DOMAIN 2: REFERENCE DATA (Admin configures)
-- ============================================================

-- 2.1 Grades
CREATE TABLE ref_grades (
  id SERIAL PRIMARY KEY,
  grade_no INT NOT NULL UNIQUE CHECK (grade_no BETWEEN 1 AND 20),
  category VARCHAR(20) NOT NULL CHECK (category IN ('officer', 'staff')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 Economic Codes
CREATE TABLE ref_economic_codes (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category VARCHAR(50),
  is_manual BOOLEAN NOT NULL DEFAULT true,
  formula_key VARCHAR(100),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3 Office Level - Economic Code Mapping
CREATE TABLE office_level_economic_code_mapping (
  id BIGSERIAL PRIMARY KEY,
  office_level_id BIGINT NOT NULL REFERENCES core_office_levels(id) ON DELETE CASCADE,
  economic_code_id BIGINT NOT NULL REFERENCES ref_economic_codes(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(office_level_id, economic_code_id)
);

CREATE INDEX idx_mapping_level_code ON office_level_economic_code_mapping(office_level_id, is_enabled);
CREATE INDEX idx_mapping_code_level ON office_level_economic_code_mapping(economic_code_id);

-- 2.4 Allowance Types
CREATE TABLE ref_allowance_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_calculated BOOLEAN DEFAULT false,
  formula_key VARCHAR(100),
  applicable_category VARCHAR(20) CHECK (applicable_category IN ('officer', 'staff', 'both')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.5 Vehicle Types
CREATE TABLE ref_vehicle_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.6 Fuel Types
CREATE TABLE ref_fuel_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.7 IT Equipment Types
CREATE TABLE ref_it_equipment_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  has_toner BOOLEAN DEFAULT false,
  is_lumpsum BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.8 Utility Types
CREATE TABLE ref_utility_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DOMAIN 3: ADMIN CONFIGURATION (Rates & Defaults)
-- ============================================================

-- 3.1 Global Rates
CREATE TABLE admin_rates (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC(14, 2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'টাকা',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.2 Vehicle Configuration
CREATE TABLE admin_vehicle_config (
  id BIGSERIAL PRIMARY KEY,
  office_type_id BIGINT NOT NULL REFERENCES core_office_types(id) ON DELETE CASCADE,
  vehicle_type_id BIGINT NOT NULL REFERENCES ref_vehicle_types(id) ON DELETE CASCADE,
  fuel_type_id BIGINT NOT NULL REFERENCES ref_fuel_types(id) ON DELETE CASCADE,
  monthly_fuel_quota_liter NUMERIC(10, 2) DEFAULT 0,
  annual_lube_allowance NUMERIC(14, 2) DEFAULT 0,
  annual_maintenance_allowance NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(office_type_id, vehicle_type_id, fuel_type_id)
);

-- 3.3 Vehicle Rent Configuration
CREATE TABLE admin_vehicle_rent_config (
  id BIGSERIAL PRIMARY KEY,
  office_type_id BIGINT NOT NULL REFERENCES core_office_types(id) ON DELETE CASCADE,
  vehicle_type_id BIGINT NOT NULL REFERENCES ref_vehicle_types(id) ON DELETE CASCADE,
  monthly_rent_rate NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(office_type_id, vehicle_type_id)
);

-- 3.4 IT Equipment Configuration
CREATE TABLE admin_it_config (
  id BIGSERIAL PRIMARY KEY,
  office_type_id BIGINT NOT NULL REFERENCES core_office_types(id) ON DELETE CASCADE,
  equipment_type_id BIGINT NOT NULL REFERENCES ref_it_equipment_types(id) ON DELETE CASCADE,
  unit_budget NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(office_type_id, equipment_type_id)
);

-- ============================================================
-- DOMAIN 4: OFFICE DATA (Offices fill forms)
-- ============================================================

-- 4.1 Office Users
CREATE TABLE office_users (
  id BIGSERIAL PRIMARY KEY,
  office_id BIGINT UNIQUE NOT NULL REFERENCES core_offices(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_hint TEXT DEFAULT '12345',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.2 Office Submissions
CREATE TABLE office_submissions (
  id BIGSERIAL PRIMARY KEY,
  office_id BIGINT NOT NULL REFERENCES core_offices(id) ON DELETE RESTRICT,
  cycle_id BIGINT NOT NULL REFERENCES core_budget_cycles(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_by BIGINT REFERENCES admin_users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(office_id, cycle_id)
);

-- 4.3 Form 1: Basic Info
CREATE TABLE office_form_basic (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT UNIQUE NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  head_of_office TEXT NOT NULL,
  designation TEXT,
  phone VARCHAR(30),
  email VARCHAR(100),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.4 Form 2: Staff - Working
CREATE TABLE office_form_staff_working (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  grade_id INT NOT NULL REFERENCES ref_grades(grade_no),
  staff_count INT NOT NULL DEFAULT 0,
  monthly_basic NUMERIC(14, 2) NOT NULL DEFAULT 0,
  due_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, grade_id)
);

-- 4.5 Form 3: Staff - Suspended
CREATE TABLE office_form_staff_suspended (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  grade_id INT NOT NULL REFERENCES ref_grades(grade_no),
  suspended_count INT NOT NULL DEFAULT 0,
  suspended_monthly_basic NUMERIC(14, 2) NOT NULL DEFAULT 0,
  suspended_due_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, grade_id)
);

-- 4.6 Form 4: Staff - New Recruits
CREATE TABLE office_form_staff_new_recruits (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  grade_id INT NOT NULL REFERENCES ref_grades(grade_no),
  recruit_count INT NOT NULL DEFAULT 0,
  monthly_basic NUMERIC(14, 2) NOT NULL DEFAULT 0,
  joining_date DATE NOT NULL,
  months_remaining INT DEFAULT 12,
  total_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, grade_id)
);

-- 4.7 Form 5: Allowances
CREATE TABLE office_form_allowances (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  allowance_type_id BIGINT NOT NULL REFERENCES ref_allowance_types(id),
  officer_count INT DEFAULT 0,
  staff_count INT DEFAULT 0,
  total_annual_amount NUMERIC(14, 2) DEFAULT 0,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, allowance_type_id)
);

-- 4.8 Form 6: Leave Encashment
CREATE TABLE office_form_leave_encashment (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT UNIQUE NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  leave_encashment_officer_basic NUMERIC(14, 2) DEFAULT 0,
  leave_encashment_officer_due NUMERIC(14, 2) DEFAULT 0,
  leave_encashment_staff_basic NUMERIC(14, 2) DEFAULT 0,
  leave_encashment_staff_due NUMERIC(14, 2) DEFAULT 0,
  rest_recreation_amount NUMERIC(14, 2) DEFAULT 0,
  rest_recreation_due NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.9 Form 7: Vehicles - Govt Owned
CREATE TABLE office_form_vehicles_govt (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  vehicle_config_id BIGINT NOT NULL REFERENCES admin_vehicle_config(id),
  vehicle_count INT NOT NULL DEFAULT 0,
  maintenance_due NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, vehicle_config_id)
);

-- 4.10 Form 8: Vehicles - Rented
CREATE TABLE office_form_vehicles_rent (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  vehicle_rent_config_id BIGINT NOT NULL REFERENCES admin_vehicle_rent_config(id),
  vehicle_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, vehicle_rent_config_id)
);

-- 4.11 Form 9: House Rent
CREATE TABLE office_form_house_rent (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT UNIQUE NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  monthly_rent NUMERIC(14, 2) DEFAULT 0,
  vat_rate_id BIGINT REFERENCES admin_rates(id),
  arrears_due NUMERIC(14, 2) DEFAULT 0,
  annual_total NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.12 Form 10: IT Equipment
CREATE TABLE office_form_it_equipment (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  it_config_id BIGINT NOT NULL REFERENCES admin_it_config(id),
  existing_count INT DEFAULT 0,
  new_demand_count INT DEFAULT 0,
  toner_cost_monthly NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, it_config_id)
);

-- 4.13 Form 11: Utilities
CREATE TABLE office_form_utilities (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  utility_type_id BIGINT NOT NULL REFERENCES ref_utility_types(id),
  annual_bill NUMERIC(14, 2) DEFAULT 0,
  arrears_due NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, utility_type_id)
);

-- 4.14 Form 12: Return Info
CREATE TABLE office_form_return_info (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT UNIQUE NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  return_submitted_count INT DEFAULT 0,
  postal_rate_id BIGINT REFERENCES admin_rates(id),
  total_postal_demand NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.15 Budget Sheet (Final Output)
CREATE TABLE office_budget_sheet (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES office_submissions(id) ON DELETE CASCADE,
  economic_code_id BIGINT NOT NULL REFERENCES ref_economic_codes(id) ON DELETE RESTRICT,
  auto_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  manual_value NUMERIC(14, 2),
  final_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, economic_code_id)
);

-- ============================================================
-- DOMAIN 5: ADMIN USERS
-- ============================================================

-- 5.1 Admin Users
CREATE TABLE admin_users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5.2 Group Budget Rules
CREATE TABLE admin_group_budget_rules (
  id BIGSERIAL PRIMARY KEY,
  office_type_id BIGINT NOT NULL REFERENCES core_office_types(id) ON DELETE CASCADE,
  office_level_id BIGINT REFERENCES core_office_levels(id) ON DELETE CASCADE,
  is_group_budget BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(office_type_id, office_level_id)
);

-- ============================================================
-- RLS & GRANTS -- REMOVED. DO NOT REINTRODUCE.
-- ============================================================
-- This block used to ENABLE ROW LEVEL SECURITY on all 35 tables and then create a
-- permissive "Allow all" policy on each one:
--
--   CREATE POLICY "Allow all on %s" ON public.%I FOR ALL TO authenticated
--     USING (true) WITH CHECK (true);
--
-- A policy whose expression is `true` permits *everything*, so this did not restrict
-- access -- it granted full read/write on every table to any client presenting a valid
-- JWT. Combined with the default Supabase grants to `anon`/`authenticated`, anyone
-- holding the public anon key could read and modify all data over PostgREST.
--
-- The correct default is the opposite: RLS enabled with *no* permissive policy, which
-- denies by default. Supabase's `ensure_rls` event trigger already enables RLS on every
-- new table in `public`, so the rebuilt database needs no policies at all and PostgREST
-- clients get nothing.
--
-- The app does not need RLS: it talks to Postgres over TCP via Prisma as the `postgres`
-- role, which has `rolbypassrls = true`. Policies would therefore never affect app
-- queries -- they only govern the PostgREST/anon surface.
--
-- If you later expose data over PostgREST, write narrow, explicit policies for the
-- specific tables and operations you intend to expose. Never write `USING (true)`.
--
-- These grants are only meaningful on Supabase (the `authenticated`/`service_role` roles
-- are Supabase-specific) and are unrelated to the Prisma connection. See
-- resources/grant_permissions.sql if you specifically need to re-grant on Supabase.
```

**Instructions:**
1. Prefer the Prisma workflow in Step 0 — `prisma/migrations/20261023000000_init/migration.sql` already contains this schema, version-controlled and applied.
2. If you do run the DDL manually, verify all **35** tables are created.
3. Skip the RLS/grants block (it has been replaced with a comment explaining why).
4. Proceed to Phase 1

---

## Phase 1: Admin UI Verification + Report UI

### Goal
Verify all admin features work correctly with the new schema. Test data integrity and ensure proper table relationships.

### Sequence (Dependency Order)

#### 1.1 Organizational Structure

- [ ] **1.1.1 Ministry Management**
  - [ ] Test: Create ministry
  - [ ] Test: Update ministry
  - [ ] Test: Delete ministry
  - [ ] Verify: Data saves to `core_ministries` correctly
  - [ ] Verify: `code` field is unique
  - [ ] Verify: `created_at` and `updated_at` are set

- [ ] **1.1.2 Department Management**
  - [ ] Test: Create department linked to ministry
  - [ ] Test: Update department
  - [ ] Test: Delete department (should fail if offices exist - RESTRICT)
  - [ ] Verify: `ministry_id` FK works correctly
  - [ ] Verify: `code` field is unique
  - [ ] Verify: Cannot create department without valid ministry

- [ ] **1.1.3 Office Type Management**
  - [ ] Test: Create office type linked to department
  - [ ] Test: Update office type
  - [ ] Test: Toggle `is_group_budget` flag
  - [ ] Test: Delete office type (should fail if offices exist - RESTRICT)
  - [ ] Verify: `department_id` FK works correctly
  - [ ] Verify: `sort_order` works for display ordering

- [ ] **1.1.4 Office Level Management**
  - [ ] Test: Create office level linked to office type
  - [ ] Test: Update level name and order
  - [ ] Test: Delete office level (CASCADE - should remove references)
  - [ ] Verify: `office_type_id` FK works correctly
  - [ ] Verify: Multiple levels can exist for same office type
  - [ ] Verify: `level_order` works for hierarchy

- [ ] **1.1.5 Office Creation**
  - [ ] Test: Create office with all fields
  - [ ] Test: Link to department, office type, office level
  - [ ] Test: Set parent office (self-reference)
  - [ ] Test: Toggle `is_active` status
  - [ ] Test: Update office details
  - [ ] Verify: `budget_id` is unique
  - [ ] Verify: `parent_office_id` self-reference works
  - [ ] Verify: Cannot set parent to itself (constraint check)
  - [ ] Verify: All FKs are correctly linked
  - [ ] **Seed existing 100 offices** from backup data
  - [ ] Verify: All 100 offices imported correctly
  - [ ] Verify: Office hierarchies (parent-child) are preserved

#### 1.2 Budget Settings

- [ ] **1.2.1 Budget Cycle Management**
  - [ ] Test: Create budget cycle (fiscal_year, budget_type, title)
  - [ ] Test: Set status to 'open'
  - [ ] Test: Verify only one cycle can be 'open' at a time (index constraint)
  - [ ] Test: Close cycle (set status to 'closed', set `closed_at`)
  - [ ] Test: Update cycle details
  - [ ] Verify: `fiscal_year` format validation (YYYY-YY)
  - [ ] Verify: `budget_type` check constraint (estimated/revised)
  - [ ] Verify: `opened_at` and `closed_at` timestamps work

- [ ] **1.2.2 Economic Code Management**
  - [ ] Test: Create economic code
  - [ ] Test: Set category
  - [ ] Test: Toggle `is_manual` flag
  - [ ] Test: Set `formula_key`
  - [ ] Test: Set `sort_order`
  - [ ] Test: Toggle `is_active`
  - [ ] Test: Update code details
  - [ ] Test: Delete code
  - [ ] Verify: `code` is unique
  - [ ] Verify: `sort_order` works for display
  - [ ] **Seed existing 140 economic codes** from backup data
  - [ ] Verify: All 140 codes imported correctly
  - [ ] Verify: Categorize codes (add category field manually if needed)

- [ ] **1.2.3 Office Level - Economic Code Mapping**
  - [ ] Test: Map economic code to office level
  - [ ] Test: Enable/disable code for level (`is_enabled` flag)
  - [ ] Test: Bulk assign codes to level
  - [ ] Test: Remove mapping
  - [ ] Verify: Cannot map invalid office level
  - [ ] Verify: Cannot map invalid economic code
  - [ ] Verify: Unique constraint on (office_level_id, economic_code_id)
  - [ ] Verify: Cascade delete works (delete level → remove mappings)
  - [ ] **Create mappings based on old code_type_mapping**
  - [ ] Verify: Mappings correctly transform from old structure

#### 1.3 Reference Data Configuration

- [ ] **1.3.1 Grades**
  - [ ] Test: View grades (already seeded)
  - [ ] Test: Update grade description
  - [ ] Verify: Grades 1-10 are officers
  - [ ] Verify: Grades 11-20 are staff
  - [ ] Verify: `grade_no` is unique
  - [ ] Verify: Category check constraint works

- [ ] **1.3.2 Allowance Types**
  - [ ] Test: Create allowance type
  - [ ] Test: Set `is_calculated` flag
  - [ ] Test: Set `formula_key`
  - [ ] Test: Set `applicable_category` (officer/staff/both)
  - [ ] Test: Update allowance type
  - [ ] Test: Delete allowance type
  - [ ] Verify: `name` is unique
  - [ ] Verify: Category check constraint works
  - [ ] Seed: overtime, duty, dress, risk, hill

- [ ] **1.3.3 Vehicle Types**
  - [ ] Test: Create vehicle type
  - [ ] Test: Update vehicle type
  - [ ] Test: Delete vehicle type
  - [ ] Verify: `name` is unique
  - [ ] Seed: Car, Jeep, Microbus, Pickup, Truck, Motorcycle, Ambulance

- [ ] **1.3.4 Fuel Types**
  - [ ] Test: Create fuel type
  - [ ] Test: Update fuel type
  - [ ] Test: Delete fuel type
  - [ ] Verify: `name` is unique
  - [ ] Seed: Octane, Diesel, CNG, Petrol

- [ ] **1.3.5 IT Equipment Types**
  - [ ] Test: Create IT equipment type
  - [ ] Test: Set `has_toner` flag
  - [ ] Test: Set `is_lumpsum` flag
  - [ ] Test: Update equipment type
  - [ ] Test: Delete equipment type
  - [ ] Verify: `name` is unique
  - [ ] Seed: Computer, Printer, Scanner, Accessories

- [ ] **1.3.6 Utility Types**
  - [ ] Test: Create utility type
  - [ ] Test: Update utility type
  - [ ] Test: Delete utility type
  - [ ] Verify: `name` is unique
  - [ ] Seed: বিদ্যুৎ, পানি, ইন্টারনেট

#### 1.4 Admin Configuration

- [ ] **1.4.1 Global Rates**
  - [ ] Test: Create rate (key, name, value, unit, description)
  - [ ] Test: Update rate value
  - [ ] Test: Delete rate
  - [ ] Verify: `key` is unique
  - [ ] Verify: Numeric precision (14, 2)
  - [ ] Seed: medical_allowance_monthly, house_rent_percent, festival_bonus_multiplier, provident_fund_percent, fuel_price_octane, fuel_price_diesel, fuel_price_cng, vat_percentage, postal_expense_rate, education_allowance

- [ ] **1.4.2 Vehicle Configuration**
  - [ ] Test: Create vehicle config (office_type + vehicle_type + fuel_type → quotas)
  - [ ] Test: Set monthly fuel quota
  - [ ] Test: Set annual lube allowance
  - [ ] Test: Set annual maintenance allowance
  - [ ] Test: Update config values
  - [ ] Test: Delete config
  - [ ] Verify: Unique constraint on (office_type_id, vehicle_type_id, fuel_type_id)
  - [ ] Verify: All FKs work correctly
  - [ ] Verify: Cannot create config for invalid office type/vehicle/fuel

- [ ] **1.4.3 Vehicle Rent Configuration**
  - [ ] Test: Create vehicle rent config (office_type + vehicle_type → rent rate)
  - [ ] Test: Set monthly rent rate
  - [ ] Test: Update rent rate
  - [ ] Test: Delete config
  - [ ] Verify: Unique constraint on (office_type_id, vehicle_type_id)
  - [ ] Verify: All FKs work correctly

- [ ] **1.4.4 IT Equipment Configuration**
  - [ ] Test: Create IT config (office_type + equipment_type → unit budget)
  - [ ] Test: Set unit budget
  - [ ] Test: Update unit budget
  - [ ] Test: Delete config
  - [ ] Verify: Unique constraint on (office_type_id, equipment_type_id)
  - [ ] Verify: All FKs work correctly

#### 1.5 User Management

- [ ] **1.5.1 Admin User Management**
  - [ ] Test: Create admin user
  - [ ] Test: Set role (superadmin/admin)
  - [ ] Test: Toggle `is_active`
  - [ ] Test: Update admin user
  - [ ] Test: Delete admin user
  - [ ] Verify: `username` is unique
  - [ ] Verify: Role check constraint works
  - [ ] Seed: superadmin (username: superadmin, password: superadmin123)

- [ ] **1.5.2 Group Budget Rules**
  - [ ] Test: Create group budget rule (office_type + office_level → is_group_budget)
  - [ ] Test: Toggle `is_group_budget` flag
  - [ ] Test: Update rule
  - [ ] Test: Delete rule
  - [ ] Verify: Unique constraint on (office_type_id, office_level_id)
  - [ ] Verify: Correctly identifies which levels are group budgets

#### 1.6 Basic Reports (Data Integrity Verification)

- [ ] **1.6.1 Report: Office List by Level**
  - [ ] Test: Query offices grouped by office level
  - [ ] Verify: `office_level_id` FK correctly links offices to levels
  - [ ] Verify: Grouping works for hierarchy display
  - [ ] Verify: Count of offices per level is accurate

- [ ] **1.6.2 Report: Economic Codes by Level**
  - [ ] Test: Query economic codes available for each office level
  - [ ] Verify: `office_level_economic_code_mapping` works correctly
  - [ ] Verify: `is_enabled` flag filters correctly
  - [ ] Verify: Only enabled codes show for each level

- [ ] **1.6.3 Report: Office Count by Type**
  - [ ] Test: Query office count grouped by office type
  - [ ] Verify: `office_type_id` FK correctly links offices to types
  - [ ] Verify: Counts are accurate
  - [ ] Verify: Group budget offices are correctly identified

- [ ] **1.6.4 Report: Configuration Summary**
  - [ ] Test: Show all configured rates
  - [ ] Test: Show all vehicle configs
  - [ ] Test: Show all IT configs
  - [ ] Verify: All admin configurations are accessible and display correctly

---

## Phase 2: Office UI Verification + Formula Engine

### Goal
Fix all 12 office forms, standardize design patterns, ensure all forms save correctly, implement formula calculation engine.

### Sequence

#### 2.1 Office Authentication

- [ ] **2.1.1 Office Login**
  - [ ] Test: Login with budget_id + password (default: budget_id)
  - [ ] Test: Auto-create `office_users` record if not exists
  - [ ] Test: Update `last_login_at` timestamp
  - [ ] Test: Handle inactive office (is_active = false)
  - [ ] Verify: Password hashing works
  - [ ] Verify: Session management works

- [ ] **2.1.2 Auto-create Submission**
  - [ ] Test: On login, auto-create submission for active cycle
  - [ ] Test: Use existing submission if already created
  - [ ] Test: Handle case when no cycle is open
  - [ ] Verify: `office_submissions` record created correctly
  - [ ] Verify: Unique constraint on (office_id, cycle_id) works

#### 2.2 Form 1: Basic Info

- [ ] **2.2.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: All fields render correctly
  - [ ] Test: Validation (head_of_office required)
  - [ ] Test: Save button disabled until valid

- [ ] **2.2.2 Form Save**
  - [ ] Test: Save to `office_form_basic`
  - [ ] Test: Update existing record
  - [ ] Verify: `submission_id` FK works
  - [ ] Verify: UNIQUE constraint on submission_id works
  - [ ] Verify: All fields save correctly

#### 2.3 Form 2: Staff Working

- [ ] **2.3.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: Grade dropdown (1-20) populated from `ref_grades`
  - [ ] Test: Show officer grades (1-10) vs staff grades (11-20)
  - [ ] Test: Validation (staff_count >= 0, monthly_basic >= 0)
  - [ ] Test: Add multiple grade rows dynamically

- [ ] **2.3.2 Form Save**
  - [ ] Test: Save multiple grade records to `office_form_staff_working`
  - [ ] Test: Update existing records
  - [ ] Test: Delete grade record
  - [ ] Verify: `grade_id` FK to `ref_grades(grade_no)` works
  - [ ] Verify: UNIQUE constraint on (submission_id, grade_id) works
  - [ ] Verify: Non-negative value constraints work

#### 2.4 Form 3: Staff Suspended

- [ ] **2.4.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: Grade dropdown populated from `ref_grades`
  - [ ] Test: Validation (suspended_count >= 0)
  - [ ] Test: Add multiple grade rows dynamically

- [ ] **2.4.2 Form Save**
  - [ ] Test: Save to `office_form_staff_suspended`
  - [ ] Test: Update existing records
  - [ ] Verify: `grade_id` FK works
  - [ ] Verify: UNIQUE constraint on (submission_id, grade_id) works
  - [ ] Verify: Non-negative value constraints work

#### 2.5 Form 4: Staff New Recruits

- [ ] **2.5.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: Grade dropdown populated from `ref_grades`
  - [ ] Test: Date picker for `joining_date`
  - [ ] Test: Validation (recruit_count >= 0, joining_date required)
  - [ ] Test: Auto-calculate months_remaining based on joining_date

- [ ] **2.5.2 Form Save**
  - [ ] Test: Save to `office_form_staff_new_recruits`
  - [ ] Test: Update existing records
  - [ ] Verify: `grade_id` FK works
  - [ ] Verify: `joining_date` NOT NULL constraint works
  - [ ] Verify: `months_remaining` check constraint (0-12) works

#### 2.6 Form 5: Allowances

- [ ] **2.6.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: Allowance type dropdown populated from `ref_allowance_types`
  - [ ] Test: Filter by applicable_category (officer/staff/both)
  - [ ] Test: Validation (officer_count >= 0, staff_count >= 0)
  - [ ] Test: Add multiple allowance rows dynamically

- [ ] **2.6.2 Form Save**
  - [ ] Test: Save to `office_form_allowances`
  - [ ] Test: Update existing records
  - [ ] Verify: `allowance_type_id` FK to `ref_allowance_types` works
  - [ ] Verify: UNIQUE constraint on (submission_id, allowance_type_id) works
  - [ ] Verify: Non-negative value constraints work

#### 2.7 Form 6: Leave Encashment

- [ ] **2.7.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: All 6 numeric fields render
  - [ ] Test: Validation (all values >= 0)
  - [ ] Test: Separate officer vs staff sections

- [ ] **2.7.2 Form Save**
  - [ ] Test: Save to `office_form_leave_encashment`
  - [ ] Test: Update existing record
  - [ ] Verify: UNIQUE constraint on submission_id works
  - [ ] Verify: Non-negative value constraints work

#### 2.8 Form 7: Vehicles (Govt Owned)

- [ ] **2.8.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: Vehicle config dropdown (based on office type)
  - [ ] Test: Show vehicle_type, fuel_type, quotas from config
  - [ ] Test: Only show configs for this office's type
  - [ ] Test: Validation (vehicle_count >= 0)
  - [ ] Test: Add multiple vehicle rows dynamically

- [ ] **2.8.2 Form Save**
  - [ ] Test: Save to `office_form_vehicles_govt`
  - [ ] Test: Update existing records
  - [ ] Verify: `vehicle_config_id` FK to `admin_vehicle_config` works
  - [ ] Verify: UNIQUE constraint on (submission_id, vehicle_config_id) works
  - [ ] Verify: Only office's configs are selectable

#### 2.9 Form 8: Vehicles (Rented)

- [ ] **2.9.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: Vehicle rent config dropdown (based on office type)
  - [ ] Test: Show vehicle_type and rent rate from config
  - [ ] Test: Validation (vehicle_count >= 0)
  - [ ] Test: Add multiple vehicle rows dynamically

- [ ] **2.9.2 Form Save**
  - [ ] Test: Save to `office_form_vehicles_rent`
  - [ ] Test: Update existing records
  - [ ] Verify: `vehicle_rent_config_id` FK to `admin_vehicle_rent_config` works
  - [ ] Verify: UNIQUE constraint on (submission_id, vehicle_rent_config_id) works

#### 2.10 Form 9: House Rent

- [ ] **2.10.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: VAT rate dropdown (from `admin_rates`)
  - [ ] Test: Auto-select VAT rate from config
  - [ ] Test: Validation (monthly_rent >= 0)
  - [ ] Test: Show VAT percentage from selected rate

- [ ] **2.10.2 Form Save**
  - [ ] Test: Save to `office_form_house_rent`
  - [ ] Test: Update existing record
  - [ ] Verify: `vat_rate_id` FK to `admin_rates` works
  - [ ] Verify: UNIQUE constraint on submission_id works
  - [ ] Verify: Non-negative value constraints work

#### 2.11 Form 10: IT Equipment

- [ ] **2.11.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: IT config dropdown (based on office type)
  - [ ] Test: Show equipment_type, unit_budget, has_toner from config
  - [ ] Test: Validation (existing_count >= 0, new_demand_count >= 0)
  - [ ] Test: Show toner field only if has_toner = true
  - [ ] Test: Add multiple equipment rows dynamically

- [ ] **2.11.2 Form Save**
  - [ ] Test: Save to `office_form_it_equipment`
  - [ ] Test: Update existing records
  - [ ] Verify: `it_config_id` FK to `admin_it_config` works
  - [ ] Verify: UNIQUE constraint on (submission_id, it_config_id) works
  - [ ] Verify: Toner field only shows if has_toner = true

#### 2.12 Form 11: Utilities

- [ ] **2.12.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: Utility type dropdown populated from `ref_utility_types`
  - [ ] Test: Validation (annual_bill >= 0)
  - [ ] Test: Add multiple utility rows dynamically

- [ ] **2.12.2 Form Save**
  - [ ] Test: Save to `office_form_utilities`
  - [ ] Test: Update existing records
  - [ ] Verify: `utility_type_id` FK to `ref_utility_types` works
  - [ ] Verify: UNIQUE constraint on (submission_id, utility_type_id) works
  - [ ] Verify: Non-negative value constraints work

#### 2.13 Form 12: Return Info

- [ ] **2.13.1 Form UI**
  - [ ] Standardize: Use common modal pattern
  - [ ] Test: Postal rate dropdown (from `admin_rates`)
  - [ ] Test: Auto-select postal rate from config
  - [ ] Test: Validation (return_submitted_count >= 0)
  - [ ] Test: Show postal rate value from selected rate

- [ ] **2.13.2 Form Save**
  - [ ] Test: Save to `office_form_return_info`
  - [ ] Test: Update existing record
  - [ ] Verify: `postal_rate_id` FK to `admin_rates` works
  - [ ] Verify: UNIQUE constraint on submission_id works
  - [ ] Verify: Non-negative value constraints work

#### 2.14 Formula Engine Implementation

- [ ] **2.14.1 Formula Registry Design**
  - [ ] Create `lib/budget/formulas.ts` file
  - [ ] Define formula interface (input: FormData, output: number)
  - [ ] Implement formula registry (key → function mapping)
  - [ ] Add versioning strategy (formula_key_v1, formula_key_v2, etc.)

- [ ] **2.14.2 Core Formulas**
  - [ ] Implement: basic_salary_officer (staff_working * monthly_basic * 12)
  - [ ] Implement: basic_salary_staff (staff_working * monthly_basic * 12)
  - [ ] Implement: leave_encashment_officer
  - [ ] Implement: leave_encashment_staff
  - [ ] Implement: fuel_cost (vehicle_count * fuel_quota * fuel_rate * 12)
  - [ ] Implement: house_rent (monthly_rent * 12 + VAT)
  - [ ] Implement: medical_allowance (staff_count * monthly_rate * 12)
  - [ ] Implement: festival_bonus (total_basic * multiplier)
  - [ ] Implement: provident_fund (total_basic * percentage)
  - [ ] Test: Each formula individually with sample data

- [ ] **2.14.3 Budget Calculation Engine**
  - [ ] Create `lib/budget/calculator.ts` file
  - [ ] Implement: Get all economic codes for office level
  - [ ] Implement: Fetch form data for submission
  - [ ] Implement: Fetch admin rates
  - [ ] Implement: Execute formulas for auto-calculated codes
  - [ ] Implement: Calculate final_value (auto_value + manual_value)
  - [ ] Implement: Save to `office_budget_sheet`
  - [ ] Test: Full calculation with sample submission

- [ ] **2.14.4 Budget Form UI**
  - [ ] Test: "Calculate Budget" button triggers calculation
  - [ ] Test: "Recalculate" button clears and recalculates
  - [ ] Test: Auto-calculation on form save
  - [ ] Test: Display auto_value, manual_value, final_value columns
  - [ ] Test: Edit manual_value for manual codes
  - [ ] Test: final_value updates when manual_value changes
  - [ ] Test: Group by economic code category
  - [ ] Test: Sort by code or amount

#### 2.15 Submission Workflow

- [ ] **2.15.1 Submit Budget**
  - [ ] Test: "Submit" button changes status to 'submitted'
  - [ ] Test: Set `submitted_at` timestamp
  - [ ] Test: Prevent form edits after submission
  - [ ] Test: Show success message

- [ ] **2.15.2 Submission Status Display**
  - [ ] Test: Show current status in UI
  - [ ] Test: Show submitted_at date if submitted
  - [ ] Test: Disable all forms if status != 'draft'

---

## Phase 3: Reporting Implementation

### Goal
Build comprehensive reporting features for admin users to view and analyze submitted budgets.

### Sequence

#### 3.1 Individual Office Reports

- [ ] **3.1.1 Office Budget Summary**
  - [ ] Test: Select office from dropdown
  - [ ] Test: Show office details (name, type, level)
  - [ ] Test: Show submission status
  - [ ] Test: Show total budget amount
  - [ ] Test: Show breakdown by economic code category
  - [ ] Verify: Query joins office, submission, budget_sheet correctly

- [ ] **3.1.2 Detailed Code-wise Report**
  - [ ] Test: Show all economic codes for office
  - [ ] Test: Show auto_value, manual_value, final_value per code
  - [ ] Test: Group by category
  - [ ] Test: Sort by code or amount
  - [ ] Test: Filter by category
  - [ ] Test: Export to CSV
  - [ ] Verify: All codes for office level are shown

- [ ] **3.1.3 Form Data Breakdown**
  - [ ] Test: Show data from each form (staff, vehicles, IT, etc.)
  - [ ] Test: Link to original form entries
  - [ ] Test: Show calculated vs entered values
  - [ ] Verify: Joins to all form tables work correctly

#### 3.2 Consolidated Reports

- [ ] **3.2.1 Group Budget Consolidation**
  - [ ] Test: Select group budget office type/level
  - [ ] Test: Fetch all child office submissions
  - [ ] Test: Sum final_value by economic code across all children
  - [ ] Test: Show consolidated budget sheet
  - [ ] Test: Show list of child offices with their totals
  - [ ] Verify: `admin_group_budget_rules` correctly identifies group offices
  - [ ] Verify: Parent-child relationships work

- [ ] **3.2.2 Office Type-wise Summary**
  - [ ] Test: Select office type
  - [ ] Test: Sum budgets across all offices of that type
  - [ ] Test: Show average budget per office
  - [ ] Test: Show min/max budgets
  - [ ] Test: Compare across office types
  - [ ] Verify: Grouping by office_type_id works

- [ ] **3.2.3 Department-wise Summary**
  - [ ] Test: Select department
  - [ ] Test: Sum budgets across all offices in department
  - [ ] Test: Break down by office type within department
  - [ ] Test: Show hierarchy (department → office types → offices)
  - [ ] Verify: Joins through department work correctly

- [ ] **3.2.4 Ministry-wise Summary**
  - [ ] Test: Select ministry
  - [ ] Test: Sum budgets across all departments in ministry
  - [ ] Test: Show full hierarchy (ministry → departments → office types → offices)
  - [ ] Verify: Multi-level joins work correctly

#### 3.3 Comparison Reports

- [ ] **3.3.1 Year-over-Year Comparison**
  - [ ] Test: Select office and compare across cycles
  - [ ] Test: Show budget growth percentage
  - [ ] Test: Highlight significant changes
  - [ ] Verify: Comparison across cycles works

- [ ] **3.3.2 Office Comparison**
  - [ ] Test: Select multiple offices to compare
  - [ ] Test: Show side-by-side budget sheets
  - [ ] Test: Show variance analysis
  - [ ] Verify: Multiple office queries work

#### 3.4 PDF Export

- [ ] **3.4.1 Individual Budget PDF**
  - [ ] Test: Generate PDF for office budget
  - [ ] Test: Include office details
  - [ ] Test: Include code-wise breakdown
  - [ ] Test: Include totals
  - [ ] Test: Format with tables and headers
  - [ ] Test: Download PDF file

- [ ] **3.4.2 Consolidated Budget PDF**
  - [ ] Test: Generate PDF for group budget
  - [ ] Test: Include list of child offices
  - [ ] Test: Include consolidated totals
  - [ ] Test: Format with hierarchy
  - [ ] Test: Download PDF file

#### 3.5 Admin Dashboard

- [ ] **3.5.1 Overview Dashboard**
  - [ ] Test: Show total offices
  - [ ] Test: Show submitted vs pending submissions
  - [ ] Test: Show total budget across all offices
  - [ ] Test: Show recent submissions
  - [ ] Test: Show budget cycle status
  - [ ] Verify: Aggregation queries work

- [ ] **3.5.2 Submission Status Report**
  - [ ] Test: List all submissions with status
  - [ ] Test: Filter by status (draft, submitted, etc.)
  - [ ] Test: Filter by office type/level
  - [ ] Test: Show progress (submitted count / total count)
  - [ ] Verify: Status filtering works

---

## Completion Checklist

### Pre-Upgrade
- [ ] Backup existing data (offices, codes, mappings)
- [ ] Save backup to secure location
- [ ] Verify backup file is complete

### Database Wipe & Recreate
- [ ] Run wipe script
- [ ] Verify all tables dropped
- [ ] Run schema creation script
- [ ] Verify all 30 tables created
- [ ] Verify all FKs created
- [ ] Verify all constraints created
- [ ] Verify all indexes created
- [ ] Verify RLS enabled
- [ ] Verify permissions granted

### Phase 1: Admin Verification
- [ ] All 1.1 tasks completed (Organizational Structure)
- [ ] All 1.2 tasks completed (Budget Settings)
- [ ] All 1.3 tasks completed (Reference Data)
- [ ] All 1.4 tasks completed (Admin Configuration)
- [ ] All 1.5 tasks completed (User Management)
- [ ] All 1.6 tasks completed (Basic Reports)
- [ ] 100 offices re-seeded successfully
- [ ] 140 economic codes re-seeded successfully
- [ ] All mappings created correctly

### Phase 2: Office Verification
- [ ] All 2.1 tasks completed (Authentication)
- [ ] All 2.2-2.13 tasks completed (12 Forms)
- [ ] All forms standardized with common modal
- [ ] All forms save correctly
- [ ] All 2.14 tasks completed (Formula Engine)
- [ ] All 2.15 tasks completed (Submission Workflow)

### Phase 3: Reporting
- [ ] All 3.1 tasks completed (Individual Reports)
- [ ] All 3.2 tasks completed (Consolidated Reports)
- [ ] All 3.3 tasks completed (Comparison Reports)
- [ ] All 3.4 tasks completed (PDF Export)
- [ ] All 3.5 tasks completed (Admin Dashboard)

---

## Notes

### Re-seeding Data
Use `npm run db:seed` (see [prisma/seed.js](prisma/seed.js)). It is idempotent and currently seeds
the `superadmin` admin user plus the 139 economic codes.

To add more reference data, extend `prisma/seed.js` — do not add new ad-hoc `*.sql` seed files.
The existing ones are stale: `resources/seed_data.sql` targets the pre-rename schema
(`departments`, `office_types`, `expense_codes`, `code_type_mapping`, `parent_offices`), and
`scripts/create-superadmin.sql` predates the seed script.

**Not yet seeded:** the office hierarchy (ministries, departments, office types, office levels,
offices). Those tables are intentionally empty and are meant to be populated through the admin
UI. `resources/offices_backup_91.json` contains 91 real offices but references `office_type_id`
values that do not exist in the rebuilt database, so it cannot be replayed as-is.

### Row Level Security
RLS is enabled on every table with **zero policies**, which denies all access by default. This is
the correct state — leave it as is.

- The app is unaffected: Prisma connects over TCP as the `postgres` role (`rolbypassrls = true`),
  so policies never apply to application queries.
- RLS only governs Supabase's PostgREST surface. Enabled with no policy, the public `anon` key
  can read and write nothing.
- **Never create a `USING (true)` policy.** That is equivalent to turning security off, and it is
  exactly what the removed block in Step 0.3 used to do.

### Formula Key Convention
Use descriptive keys for formulas:
- `basic_salary_officer`
- `basic_salary_staff`
- `fuel_cost`
- `house_rent`
- `medical_allowance`
- etc.

When formula logic changes, append version:
- `basic_salary_officer_v2`
- Update `ref_economic_codes.formula_key` accordingly
- Keep old formulas in code for historical budgets

### Common Modal Pattern
Standardize form UI with:
- Consistent layout
- Reusable modal component
- Consistent validation
- Consistent error handling
- Consistent save/cancel flow

### Index Strategy
Key indexes already created:
- `idx_one_open_cycle` on core_budget_cycles
- `idx_mapping_level_code` on office_level_economic_code_mapping
- `idx_mapping_code_level` on office_level_economic_code_mapping

Additional indexes may be added based on query patterns discovered during Phase 3.

---

## End of Upgrade Plan
