-- ============================================================
-- Budget Management System — Complete Database Schema
-- Supabase / PostgreSQL
-- ID Strategy: BIGINT GENERATED ALWAYS AS IDENTITY
-- All tables have created_at and updated_at
-- ============================================================

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper macro to apply trigger (called after each table)
-- Usage: SELECT apply_updated_at('table_name');
CREATE OR REPLACE FUNCTION apply_updated_at(tbl TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%s_updated_at
     BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
    tbl, tbl
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 1. OFFICE DOMAIN
-- ============================================================

CREATE TABLE departments (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('departments');

CREATE TABLE parent_offices (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  department_id BIGINT NOT NULL REFERENCES departments(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('parent_offices');

CREATE TABLE office_types (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL,
  department_id   BIGINT NOT NULL REFERENCES departments(id),
  is_group_budget BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('office_types');

CREATE TABLE offices (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  budget_id        TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  parent_office_id BIGINT REFERENCES parent_offices(id),
  office_type_id   BIGINT NOT NULL REFERENCES office_types(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('offices');


-- ============================================================
-- 2. CYCLE DOMAIN
-- ============================================================

CREATE TABLE cycles (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fiscal_year TEXT NOT NULL,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('new', 'revised')),
  status      TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
  opened_at   TIMESTAMPTZ,
  closed_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fiscal_year, budget_type)
);
SELECT apply_updated_at('cycles');

CREATE TABLE submissions (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  office_id    BIGINT NOT NULL REFERENCES offices(id),
  cycle_id     BIGINT NOT NULL REFERENCES cycles(id),
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'needs_resubmit')),
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(office_id, cycle_id)
);
SELECT apply_updated_at('submissions');


-- ============================================================
-- 3. RATES (GLOBAL)
-- ============================================================

CREATE TABLE rates (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  value       NUMERIC NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('rates');

-- Seed rates
INSERT INTO rates (key, value, description) VALUES
('medical_allowance_monthly',  1500, 'Monthly medical allowance per person (BDT)'),
('house_rent_percent',         50,   'House rent as % of basic salary'),
('festival_bonus_multiplier',  2,    'Number of festival bonuses per year'),
('provident_fund_percent',     10,   'Provident fund as % of basic salary'),
('fuel_price_octane',          130,  'Octane price per liter (BDT)'),
('fuel_price_diesel',          110,  'Diesel price per liter (BDT)'),
('fuel_price_cng',             45,   'CNG price per m3 (BDT)'),
('vat_percentage',             15,   'VAT on office rent (%)'),
('postal_expense_rate',        50,   'Postal expense per return submitted (BDT)');


-- ============================================================
-- 4. STAFF DOMAIN
-- ============================================================

CREATE TABLE grades (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grade_no   INTEGER NOT NULL UNIQUE CHECK (grade_no BETWEEN 1 AND 20),
  category   TEXT NOT NULL CHECK (category IN ('officer', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('grades');

-- Seed grades
INSERT INTO grades (grade_no, category) VALUES
(1,'officer'),(2,'officer'),(3,'officer'),(4,'officer'),(5,'officer'),
(6,'officer'),(7,'officer'),(8,'officer'),(9,'officer'),
(10,'staff'),(11,'staff'),(12,'staff'),(13,'staff'),(14,'staff'),
(15,'staff'),(16,'staff'),(17,'staff'),(18,'staff'),(19,'staff'),(20,'staff');

CREATE TABLE form_staff (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id           BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  grade_id                BIGINT NOT NULL REFERENCES grades(id),
  count                   INTEGER NOT NULL DEFAULT 0,
  total_basic             NUMERIC NOT NULL DEFAULT 0,
  due_salary              NUMERIC NOT NULL DEFAULT 0,
  suspended_count         INTEGER NOT NULL DEFAULT 0,
  suspended_total_basic   NUMERIC NOT NULL DEFAULT 0,
  suspended_due_salary    NUMERIC NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, grade_id)
);
SELECT apply_updated_at('form_staff');

CREATE TABLE allowance_types (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                 TEXT NOT NULL UNIQUE,
  is_calculated        BOOLEAN NOT NULL DEFAULT FALSE,
  has_basic            BOOLEAN NOT NULL DEFAULT FALSE,
  is_grade_based       BOOLEAN NOT NULL DEFAULT FALSE,
  applicable_category  TEXT CHECK (applicable_category IN ('officer', 'staff', 'both')) DEFAULT 'both',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('allowance_types');

-- Seed allowance types
INSERT INTO allowance_types (name, is_calculated, has_basic, is_grade_based, applicable_category) VALUES
('overtime',  TRUE,  TRUE,  FALSE, 'staff'),
('duty',      TRUE,  FALSE, FALSE, 'both'),
('dress',     FALSE, FALSE, TRUE,  'both'),
('risk',      FALSE, FALSE, FALSE, 'both'),
('hill',      FALSE, FALSE, FALSE, 'both');

CREATE TABLE form_allowances (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id      BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  allowance_type_id  BIGINT NOT NULL REFERENCES allowance_types(id),
  count              INTEGER NOT NULL DEFAULT 0,
  total_basic        NUMERIC,
  amount             NUMERIC NOT NULL DEFAULT 0,
  due                NUMERIC NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, allowance_type_id)
);
SELECT apply_updated_at('form_allowances');

CREATE TABLE form_leave (
  id                              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id                   BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  leave_encashment_officer_basic  NUMERIC NOT NULL DEFAULT 0,
  leave_encashment_officer_due    NUMERIC NOT NULL DEFAULT 0,
  leave_encashment_staff_basic    NUMERIC NOT NULL DEFAULT 0,
  leave_encashment_staff_due      NUMERIC NOT NULL DEFAULT 0,
  rest_recreation_amount          NUMERIC NOT NULL DEFAULT 0,
  rest_recreation_due             NUMERIC NOT NULL DEFAULT 0,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('form_leave');


-- ============================================================
-- 5. VEHICLE DOMAIN
-- ============================================================

CREATE TABLE car_types (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('car_types');

CREATE TABLE fuel_types (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('fuel_types');

CREATE TABLE vehicle_fuel_config (
  id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  car_type_id                 BIGINT NOT NULL REFERENCES car_types(id),
  fuel_type_id                BIGINT NOT NULL REFERENCES fuel_types(id),
  monthly_fuel_allowance      NUMERIC NOT NULL DEFAULT 0,
  rate_key                    TEXT NOT NULL REFERENCES rates(key),
  annual_lube_allowance       NUMERIC NOT NULL DEFAULT 0,
  annual_maintenance_allowance NUMERIC,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(car_type_id, fuel_type_id)
);
SELECT apply_updated_at('vehicle_fuel_config');

CREATE TABLE vehicle_rent_config (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  car_type_id            BIGINT NOT NULL REFERENCES car_types(id) UNIQUE,
  monthly_rent_allowance NUMERIC NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('vehicle_rent_config');

CREATE TABLE form_vehicles (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id         BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  vehicle_fuel_config_id BIGINT NOT NULL REFERENCES vehicle_fuel_config(id),
  count                 INTEGER NOT NULL DEFAULT 0,
  maintenance_cost      NUMERIC,
  additional_expense    NUMERIC,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, vehicle_fuel_config_id)
);
SELECT apply_updated_at('form_vehicles');

CREATE TABLE form_vehicle_rent (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id         BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  vehicle_rent_config_id BIGINT NOT NULL REFERENCES vehicle_rent_config(id),
  count                 INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, vehicle_rent_config_id)
);
SELECT apply_updated_at('form_vehicle_rent');


-- ============================================================
-- 6. IT DOMAIN
-- ============================================================

CREATE TABLE it_items (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  allotted_budget NUMERIC,
  has_toner       BOOLEAN NOT NULL DEFAULT FALSE,
  is_lumpsum      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('it_items');

-- Seed IT items
INSERT INTO it_items (name, allotted_budget, has_toner, is_lumpsum) VALUES
('Computer',     50000, FALSE, FALSE),
('Printer',      30000, TRUE,  FALSE),
('Scanner',      20000, FALSE, FALSE),
('Accessories',  NULL,  FALSE, TRUE);

CREATE TABLE form_it_inventory (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  item_id       BIGINT NOT NULL REFERENCES it_items(id),
  count         INTEGER NOT NULL DEFAULT 0,
  damaged       INTEGER NOT NULL DEFAULT 0,
  toner_price   NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, item_id)
);
SELECT apply_updated_at('form_it_inventory');

CREATE TABLE form_it_requirement (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id     BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  item_id           BIGINT NOT NULL REFERENCES it_items(id),
  required_quantity INTEGER,
  total_amount      NUMERIC NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, item_id)
);
SELECT apply_updated_at('form_it_requirement');


-- ============================================================
-- 7. UTILITY DOMAIN
-- ============================================================

CREATE TABLE utility_types (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('utility_types');

-- Seed utility types
INSERT INTO utility_types (name) VALUES
('বিদ্যুৎ'),
('পানি'),
('ইন্টারনেট');

CREATE TABLE form_utility (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id    BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  utility_type_id  BIGINT NOT NULL REFERENCES utility_types(id),
  annual_cost      NUMERIC NOT NULL DEFAULT 0,
  due              NUMERIC NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, utility_type_id)
);
SELECT apply_updated_at('form_utility');


-- ============================================================
-- 8. HOUSE RENT DOMAIN
-- ============================================================

CREATE TABLE form_house_rent (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id       BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  monthly_bill        NUMERIC NOT NULL DEFAULT 0,
  due                 NUMERIC NOT NULL DEFAULT 0,
  contract_start_date DATE,
  contract_end_date   DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('form_house_rent');


-- ============================================================
-- 9. RETURN INFO DOMAIN
-- ============================================================

CREATE TABLE form_return_info (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id           BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  tin_count               INTEGER NOT NULL DEFAULT 0,
  return_submitted_count  INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('form_return_info');


-- ============================================================
-- 10. EXPENSE CODE DOMAIN
-- ============================================================

CREATE TABLE expense_codes (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  formula_key TEXT,
  is_manual   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('expense_codes');

CREATE TABLE code_type_mapping (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code_id        BIGINT NOT NULL REFERENCES expense_codes(id) ON DELETE CASCADE,
  office_type_id BIGINT NOT NULL REFERENCES office_types(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code_id, office_type_id)
);
SELECT apply_updated_at('code_type_mapping');

CREATE TABLE budget_sheet (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  code_id       BIGINT NOT NULL REFERENCES expense_codes(id),
  auto_value    NUMERIC NOT NULL DEFAULT 0,
  manual_value  NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, code_id)
);
SELECT apply_updated_at('budget_sheet');


-- ============================================================
-- 11. AUTH & ADMIN DOMAIN
-- ============================================================

CREATE TABLE admin_profiles (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'superadmin')),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
SELECT apply_updated_at('admin_profiles');

CREATE TABLE admin_group_mapping (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id       BIGINT NOT NULL REFERENCES admin_profiles(id) ON DELETE CASCADE,
  office_type_id BIGINT NOT NULL REFERENCES office_types(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_id, office_type_id)
);
SELECT apply_updated_at('admin_group_mapping');

