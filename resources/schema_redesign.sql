-- ==============================================================================
-- IRD Budget Management System - Complete Clean Schema Redesign DDL
-- Domain Prefixes: core_, admin_, office_
-- Includes RLS enable + permissive policies for app auth + Superadmin seed (123)
-- ==============================================================================

-- 1. CLEANUP (Drop old legacy tables if existing)
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

-- Drop newly redesigned tables if re-running
DROP TABLE IF EXISTS public.office_budget_sheet CASCADE;
DROP TABLE IF EXISTS public.office_form_return_info CASCADE;
DROP TABLE IF EXISTS public.office_form_utilities CASCADE;
DROP TABLE IF EXISTS public.office_form_it_equipment CASCADE;
DROP TABLE IF EXISTS public.office_form_house_rent CASCADE;
DROP TABLE IF EXISTS public.office_form_vehicles_rent CASCADE;
DROP TABLE IF EXISTS public.office_form_vehicles_govt CASCADE;
DROP TABLE IF EXISTS public.office_form_leave_encashment CASCADE;
DROP TABLE IF EXISTS public.office_form_allowances CASCADE;
DROP TABLE IF EXISTS public.office_form_staff_new_recruits CASCADE;
DROP TABLE IF EXISTS public.office_form_staff_suspended CASCADE;
DROP TABLE IF EXISTS public.office_form_staff_working CASCADE;
DROP TABLE IF EXISTS public.office_form_basic CASCADE;
DROP TABLE IF EXISTS public.office_submissions CASCADE;
DROP TABLE IF EXISTS public.office_user_logins CASCADE;
DROP TABLE IF EXISTS public.admin_group_budget_rules CASCADE;
DROP TABLE IF EXISTS public.admin_rates CASCADE;
DROP TABLE IF EXISTS public.admin_office_levels CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.core_expense_codes CASCADE;
DROP TABLE IF EXISTS public.core_offices CASCADE;
DROP TABLE IF EXISTS public.core_budget_cycles CASCADE;
DROP TABLE IF EXISTS public.core_office_types CASCADE;
DROP TABLE IF EXISTS public.core_departments CASCADE;
DROP TABLE IF EXISTS public.core_ministries CASCADE;

-- ==============================================================================
-- 2. CORE MASTER TABLES (core_)
-- ==============================================================================

CREATE TABLE public.core_ministries (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.core_departments (
  id BIGSERIAL PRIMARY KEY,
  ministry_id BIGINT NOT NULL REFERENCES public.core_ministries(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code VARCHAR(50) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.core_office_types (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES public.core_departments(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_group_budget BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.core_budget_cycles (
  id BIGSERIAL PRIMARY KEY,
  fiscal_year VARCHAR(20) NOT NULL,
  budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('estimated', 'revised')),
  title TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.admin_office_levels (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT NOT NULL REFERENCES public.core_departments(id) ON DELETE CASCADE,
  office_type_id BIGINT NOT NULL REFERENCES public.core_office_types(id) ON DELETE CASCADE,
  level_name TEXT NOT NULL,
  level_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_office_type_level UNIQUE (office_type_id, level_order)
);

CREATE TABLE public.core_offices (
  id BIGSERIAL PRIMARY KEY,
  budget_id VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department_id BIGINT NOT NULL REFERENCES public.core_departments(id) ON DELETE RESTRICT,
  office_type_id BIGINT NOT NULL REFERENCES public.core_office_types(id) ON DELETE RESTRICT,
  office_level_id BIGINT REFERENCES public.admin_office_levels(id) ON DELETE SET NULL,
  parent_office_id BIGINT REFERENCES public.core_offices(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.core_expense_codes (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_manual BOOLEAN NOT NULL DEFAULT true,
  formula_key VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. ADMINISTRATIVE TABLES (admin_)
-- ==============================================================================

CREATE TABLE public.admin_users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_hint TEXT,
  role VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.admin_rates (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC(14, 2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'টাকা',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.admin_group_budget_rules (
  id BIGSERIAL PRIMARY KEY,
  parent_office_type_id BIGINT REFERENCES public.core_office_types(id) ON DELETE CASCADE,
  child_office_type_id BIGINT REFERENCES public.core_office_types(id) ON DELETE CASCADE,
  can_view_child_submissions BOOLEAN DEFAULT true,
  can_consolidate_budget BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 4. OFFICE USERS & SUBMISSIONS (office_)
-- ==============================================================================

CREATE TABLE public.office_user_logins (
  id BIGSERIAL PRIMARY KEY,
  office_id BIGINT UNIQUE NOT NULL REFERENCES public.core_offices(id) ON DELETE CASCADE,
  budget_id VARCHAR(50) UNIQUE NOT NULL REFERENCES public.core_offices(budget_id) ON UPDATE CASCADE ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_hint TEXT NOT NULL DEFAULT '12345',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.office_submissions (
  id BIGSERIAL PRIMARY KEY,
  office_id BIGINT NOT NULL REFERENCES public.core_offices(id) ON DELETE RESTRICT,
  cycle_id BIGINT NOT NULL REFERENCES public.core_budget_cycles(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_office_cycle UNIQUE (office_id, cycle_id)
);

-- ==============================================================================
-- 5. 12 NORMALIZED FORM TABLES (office_form_)
-- ==============================================================================

-- Form 1
CREATE TABLE public.office_form_basic (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT UNIQUE NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  head_of_office TEXT,
  designation TEXT,
  phone VARCHAR(30),
  email VARCHAR(100),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form 2
CREATE TABLE public.office_form_staff_working (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  grade_id INT NOT NULL CHECK (grade_id BETWEEN 1 AND 20),
  staff_count INT NOT NULL DEFAULT 0,
  monthly_basic NUMERIC(14, 2) NOT NULL DEFAULT 0,
  due_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_staff_working_grade UNIQUE (submission_id, grade_id)
);

-- Form 3
CREATE TABLE public.office_form_staff_suspended (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  grade_id INT NOT NULL CHECK (grade_id BETWEEN 1 AND 20),
  suspended_count INT NOT NULL DEFAULT 0,
  suspended_monthly_basic NUMERIC(14, 2) NOT NULL DEFAULT 0,
  suspended_due_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_staff_suspended_grade UNIQUE (submission_id, grade_id)
);

-- Form 4
CREATE TABLE public.office_form_staff_new_recruits (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  grade_id INT NOT NULL CHECK (grade_id BETWEEN 1 AND 20),
  recruit_count INT NOT NULL DEFAULT 0,
  monthly_basic NUMERIC(14, 2) NOT NULL DEFAULT 0,
  joining_date DATE,
  months_remaining INT DEFAULT 12,
  total_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form 5
CREATE TABLE public.office_form_allowances (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  allowance_name TEXT NOT NULL,
  officer_count INT DEFAULT 0,
  staff_count INT DEFAULT 0,
  total_annual_amount NUMERIC(14, 2) DEFAULT 0,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form 6
CREATE TABLE public.office_form_leave_encashment (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT UNIQUE NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  leave_encashment_officer_basic NUMERIC(14, 2) DEFAULT 0,
  leave_encashment_officer_due NUMERIC(14, 2) DEFAULT 0,
  leave_encashment_staff_basic NUMERIC(14, 2) DEFAULT 0,
  leave_encashment_staff_due NUMERIC(14, 2) DEFAULT 0,
  rest_recreation_amount NUMERIC(14, 2) DEFAULT 0,
  rest_recreation_due NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form 7
CREATE TABLE public.office_form_vehicles_govt (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  vehicle_count INT NOT NULL DEFAULT 1,
  monthly_fuel_quota_liter NUMERIC(10, 2) DEFAULT 0,
  annual_lube_allowance NUMERIC(14, 2) DEFAULT 0,
  annual_maintenance_allowance NUMERIC(14, 2) DEFAULT 0,
  maintenance_due NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form 8
CREATE TABLE public.office_form_vehicles_rent (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  vehicle_count INT NOT NULL DEFAULT 1,
  monthly_rent_rate NUMERIC(14, 2) DEFAULT 0,
  annual_total_rent NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form 9
CREATE TABLE public.office_form_house_rent (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT UNIQUE NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  monthly_rent NUMERIC(14, 2) DEFAULT 0,
  vat_percentage NUMERIC(5, 2) DEFAULT 15,
  arrears_due NUMERIC(14, 2) DEFAULT 0,
  annual_total NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form 10
CREATE TABLE public.office_form_it_equipment (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  existing_count INT DEFAULT 0,
  new_demand_count INT DEFAULT 0,
  toner_cost_monthly NUMERIC(14, 2) DEFAULT 0,
  annual_total_cost NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form 11
CREATE TABLE public.office_form_utilities (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  utility_name VARCHAR(50) NOT NULL,
  annual_bill NUMERIC(14, 2) DEFAULT 0,
  arrears_due NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_utility_submission UNIQUE (submission_id, utility_name)
);

-- Form 12
CREATE TABLE public.office_form_return_info (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT UNIQUE NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  return_submitted_count INT DEFAULT 0,
  postal_rate_per_return NUMERIC(10, 2) DEFAULT 50,
  total_postal_demand NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Final Budget Sheet
CREATE TABLE public.office_budget_sheet (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES public.office_submissions(id) ON DELETE CASCADE,
  code_id BIGINT NOT NULL REFERENCES public.core_expense_codes(id) ON DELETE RESTRICT,
  auto_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  manual_value NUMERIC(14, 2),
  final_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_budget_sheet_code UNIQUE (submission_id, code_id)
);

-- ==============================================================================
-- 6. ROW-LEVEL SECURITY (RLS) FOR ALL TABLES
-- Permissive policies for anon & authenticated so app actions perform CRUD cleanly
-- ==============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'core_ministries', 'core_departments', 'core_office_types', 'core_budget_cycles',
    'admin_office_levels', 'core_offices', 'core_expense_codes',
    'admin_users', 'admin_rates', 'admin_group_budget_rules',
    'office_user_logins', 'office_submissions',
    'office_form_basic', 'office_form_staff_working', 'office_form_staff_suspended',
    'office_form_staff_new_recruits', 'office_form_allowances', 'office_form_leave_encashment',
    'office_form_vehicles_govt', 'office_form_vehicles_rent', 'office_form_house_rent',
    'office_form_it_equipment', 'office_form_utilities', 'office_form_return_info',
    'office_budget_sheet'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all on %s" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Allow all on %s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- ==============================================================================
-- 7. INITIAL SUPERADMIN SEED (Username: superadmin, Password: 123)
-- SHA-256 hash of '123' = a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
-- ==============================================================================

INSERT INTO public.admin_users (id, username, password_hash, password_hint, role, is_active)
VALUES (
  1,
  'superadmin',
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
  '123',
  'superadmin',
  true
)
ON CONFLICT (id) DO UPDATE
SET 
  username = 'superadmin',
  password_hash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
  password_hint = '123',
  role = 'superadmin',
  is_active = true;

-- Default Cycle (2026-2027)
INSERT INTO public.core_budget_cycles (id, fiscal_year, budget_type, title, status)
VALUES (1, '2026-2027', 'estimated', '২০২৬-২৭ প্রাক্কলিত বাজেট', 'open')
ON CONFLICT (id) DO NOTHING;

-- Default Standard Rates
INSERT INTO public.admin_rates (key, name, value, unit) VALUES
  ('medical_allowance_monthly', 'চিকিৎসা ভাতা (মাসিক)', 1500, 'টাকা'),
  ('house_rent_percent', 'বাড়ি ভাড়া ভাতা শতকরা হার', 50, '%'),
  ('festival_bonus_multiplier', 'উৎসব বোনাস গুণক (মাসিক মূল বেতন)', 2, 'গুণ'),
  ('provident_fund_percent', 'ভবিষ্য তহবিল কর্তন', 10, '%'),
  ('fuel_price_octane', 'অকটেন প্রতি লিটার মূল্য', 130, 'টাকা'),
  ('fuel_price_diesel', 'ডিজেল প্রতি লিটার মূল্য', 110, 'টাকা'),
  ('fuel_price_cng', 'সিএনজি প্রতি ঘনমিটার মূল্য', 45, 'টাকা'),
  ('vat_percentage', 'ভ্যাট শতকরা হার', 15, '%'),
  ('postal_expense_rate', 'ডাক ব্যয় প্রতি রিটার্ন', 50, 'টাকা'),
  ('education_allowance', 'শিক্ষা ভাতা প্রতি সন্তান (মাসিক)', 500, 'টাকা')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;

-- ==============================================================================
-- 8. SEED: 139 Standard Economic Expense Codes
-- ==============================================================================

INSERT INTO public.core_expense_codes (code, name, is_manual, sort_order) VALUES
  ('3111101', 'মূল বেতন (অফিসার)', false, 1),
  ('3111110', 'ছুটি নগদায়ন বেতন (অফিসার)', false, 2),
  ('3111201', 'মূল বেতন (কর্মচারী)', false, 3),
  ('3111209', 'ছুটি নগদায়ন বেতন (কর্মচারী)', false, 4),
  ('3111301', 'দায়িত্ব ভাতা', true, 5),
  ('3111302', 'যাতায়াত ভাতা', true, 6),
  ('3111303', 'দৈনিক খোরাকি ভাতা', true, 7),
  ('3111306', 'শিক্ষা ভাতা', false, 8),
  ('3111308', 'ঝুঁকি ভাতা', true, 9),
  ('3111309', 'পাহাড়ী ভাতা', true, 10),
  ('3111310', 'বাড়ি ভাড়া ভাতা', false, 11),
  ('3111311', 'চিকিৎসা ভাতা', false, 12),
  ('3111312', 'মোবাইল/সেলফোন ভাতা', true, 13),
  ('3111313', 'আবাসিক টেলিফোন নগদায়ন ভাতা', true, 14),
  ('3111314', 'টিফিন ভাতা', true, 15),
  ('3111315', 'পোশাক ভাতা', true, 16),
  ('3111316', 'ধোলাই ভাতা', true, 17),
  ('3111325', 'উৎসব ভাতা', false, 18),
  ('3111327', 'অধিকাল ভাতা', true, 19),
  ('3111328', 'শ্রান্তি ও বিনোদন ভাতা', false, 20),
  ('3111329', 'প্রশিক্ষণ ভাতা', true, 21),
  ('3111331', 'আপ্যায়ন ভাতা', true, 22),
  ('3111332', 'সম্যানী ভাতা', true, 23),
  ('3111334', 'পদক ভাতা', true, 24),
  ('3111335', 'বাংলা নববর্ষ ভাতা', true, 25),
  ('3111341', 'বিচারিক ভাতা', true, 26),
  ('3111344', 'খোরপোষ ভাতা (সাসপেনসন)', true, 27),
  ('3111352', 'বিশেষ সুবিধা', true, 28),
  ('3211101', 'পুরস্কার', true, 29),
  ('3211102', 'পরিষ্কার পরিচ্ছন্নতা সামগ্রী', true, 30),
  ('3211103', 'ক্ষতিপূরণ', true, 31),
  ('3211104', 'আনুষঙ্গিক কর্মচারী ও প্রতিষ্ঠান', true, 32),
  ('3211106', 'আপ্যায়ন ব্যয়', true, 33),
  ('3211107', 'যানবাহন ব্যবহার (চুক্তিভিত্তিক)', false, 34),
  ('3211110', 'আইন সংক্রান্ত ব্যয়', true, 35),
  ('3211111', 'সেমিনার/কনফারেন্স ব্যয়', true, 36),
  ('3211113', 'বিদ্যুৎ', false, 37),
  ('3211115', 'পানি', false, 38),
  ('3211116', 'কুরিয়ার', true, 39),
  ('3211117', 'ইন্টারনেট/ফ্যাক্স/টেলেক্স', false, 40),
  ('3211119', 'ডাক', false, 41),
  ('3211120', 'টেলিফোন', true, 42),
  ('3211121', 'মেশিন ও সরঞ্জমাদির ভাড়া', true, 43),
  ('3211123', 'অন্যান্য সম্পদের ভাড়া', true, 44),
  ('3211125', 'প্রচার ও বিজ্ঞাপন ব্যয়', true, 45),
  ('3211127', 'বইপত্র ও সাময়িকী', true, 46),
  ('3211128', 'প্রকাশনা', true, 47),
  ('3211129', 'অফিস ভবন ভাড়া', false, 48),
  ('3211130', 'যাতায়াত ব্যয়', true, 49),
  ('3211131', 'আউটসোর্সিং', true, 50),
  ('3211134', 'শ্রমিক (অনিয়মিত) মজুরি', true, 51),
  ('3211135', 'নিয়োগ পরীক্ষা', true, 52),
  ('3211136', 'সংবাদ/তথ্য সংগ্রহ', true, 53),
  ('3211138', 'ডাটা এন্ট্রি', true, 54),
  ('3211139', 'এস.এম.এস', true, 55),
  ('3221101', 'নিরীক্ষা/সমীক্ষা ফি', true, 56),
  ('3221102', 'লাইসেন্স ফি', true, 57),
  ('3221104', 'নিবন্ধন ফি', true, 58),
  ('3221105', 'টেস্টিং ফি', true, 59),
  ('3221106', 'পরিবহণ ব্যয়', true, 60),
  ('3221107', 'অনুলিপি ব্যায়', true, 61),
  ('3221110', 'কমিশন', true, 62),
  ('3221112', 'চাঁদা', true, 63),
  ('3221116', 'নকশা (অবকাঠামো অনুমোদন ফি)', true, 64),
  ('3221118', 'ফিটনেস ফি', true, 65),
  ('3221119', 'পারমিট ফি', true, 66),
  ('3221120', 'ডাটা ব্যবহার ব্যয়', true, 67),
  ('3231301', 'প্রশিক্ষণ', true, 68),
  ('3243301', 'পেট্রোল, অয়েল ও লুব্রিকেন্ট', false, 69),
  ('3243302', 'গ্যাস ও জ্বালানী', false, 70),
  ('3244101', 'ভ্রমণ ব্যয়', true, 71),
  ('3244102', 'বদলি ব্যয়', true, 72),
  ('3252101', 'বিছানপত্র', true, 73),
  ('3252103', 'ভর্তুকী', true, 74),
  ('3252109', 'ঔষধ', true, 75),
  ('3253101', 'নিরাপত্তা সামগ্রী', true, 76),
  ('3253103', 'নিরাপত্তা সেবা (ভাড়া ভিত্তিক)', true, 77),
  ('3255101', 'কম্পিউটার সামগ্রী', false, 78),
  ('3255102', 'মুদ্রণ ও বাঁধাই', true, 79),
  ('3255104', 'স্ট্যাম্প ও সিল', true, 80),
  ('3255105', 'অন্যান্য মনিহারি', true, 81),
  ('3256102', 'রাসায়নিক', true, 82),
  ('3256103', 'ব্যবহার্য সামগ্রী', true, 83),
  ('3256106', 'পোশাক', true, 84),
  ('3256107', 'ক্রিড়া সামগ্রী', true, 85),
  ('3257101', 'কনসালটেন্সি', true, 86),
  ('3257102', 'গোয়েন্দা', true, 87),
  ('3257103', 'গবেষণা', true, 88),
  ('3257105', 'উদ্ভাবন', true, 89),
  ('3257106', 'শুদ্ধাচার', true, 90),
  ('3257206', 'সম্মানী', true, 91),
  ('3257301', 'অনুষ্ঠান উৎসবাদি', true, 92),
  ('3257304', 'বাগান পরিচর্যা', true, 93),
  ('3257305', 'তদন্ত', true, 94),
  ('3257306', 'ডাটা সংক্ষণ ব্যায়', true, 95),
  ('3258101', 'মোটরযান', false, 96),
  ('3258102', 'আসবাবপত্র', true, 97),
  ('3258103', 'কম্পিউটার', true, 98),
  ('3258104', 'অফিস সরঞ্জামাদি', true, 99),
  ('3258105', 'অন্যান্য যন্ত্রপাতি ও সরঞ্জামাদি', true, 100),
  ('3258106', 'আবাসিক ভবন', true, 101),
  ('3258107', 'অনাবাসিক ভবন', true, 102),
  ('3258108', 'অন্যান্য ভবন ও স্থাপনা', true, 103),
  ('3258115', 'স্বাস্থ্য বিধান ও পানি সরবরাহ', true, 104),
  ('3258117', 'লাইন ও তার', true, 105),
  ('3258119', 'বৈদ্যুতিক স্থাপনা', true, 106),
  ('3258126', 'টেলিযোগাযোগ সরঞ্জমাদি', true, 107),
  ('3258127', 'ফিটিং ও ফিক্সার', true, 108),
  ('3258128', 'জলযান', true, 109),
  ('3258134', 'যন্ত্রপাতি ও সরঞ্জামাদি', true, 110),
  ('3258136', 'খেলা/প্রশিক্ষণ মাঠ', true, 111),
  ('3258139', 'পাশ হাউস', true, 112),
  ('3258140', 'মোটরযান রক্ষণারবক্ষণ ব্যয়', false, 113),
  ('3258141', 'অভ্যন্তরীণ শোভাবর্ধন', true, 114),
  ('3258143', 'সফট্ওয়্যার ও ড্যাটাবেজ রক্ষণাবেক্ষণ', true, 115),
  ('3258144', 'ওয়েবসাইট রক্ষণাবেক্ষণ', true, 116),
  ('3821102', 'ভূমি উন্নয়ন কর', true, 117),
  ('3821103', 'পৌর কর', true, 118),
  ('3821129', 'ধ্বংসযোগ্য মালামাল বিনষ্টকরণ', true, 119),
  ('3911111', 'সাধারণ থোক বরাদ্দ', true, 120),
  ('3911112', 'অপ্রত্যাশিত ব্যায়', true, 121),
  ('4111101', 'ভূমি অধিগ্রহণ/ক্রয়', true, 122),
  ('4111201', 'অনাবাসিক ভবন', true, 123),
  ('4111317', 'অন্যান্য ভবন ও স্থাপনা', true, 124),
  ('4111325', 'অভ্যন্তরীণ শোভাবর্ধন', true, 125),
  ('4112101', 'মোটরযান', true, 126),
  ('4112102', 'জলযান', true, 127),
  ('4112201', 'তথ্য যোগাযোগ প্রযুক্তি সরঞ্জামাদি', true, 128),
  ('4112202', 'কম্পিউটার ও আনুষঙ্গিক', true, 129),
  ('4112204', 'টেলিযোগাযোগ সরঞ্জাম', true, 130),
  ('4112303', 'বৈদ্যুতিক সরঞ্জমাদি', true, 131),
  ('4112305', 'অগ্নিনির্বাপক সরঞ্জমাদি', true, 132),
  ('4112306', 'গবেষণা সরঞ্জমাদি', true, 133),
  ('4112310', 'অফিস সরঞ্জামাদি', true, 134),
  ('4112312', 'শিক্ষা ও শিক্ষণ উপকরণ', true, 135),
  ('4112314', 'আসবাবপত্র', true, 136),
  ('4112316', 'অন্যান্য যন্ত্রপাতি ও সরঞ্জামাদি', true, 137),
  ('4113301', 'কম্পিউটার সফটওয়ার', true, 138),
  ('4113303', 'ওয়েবসাইট ডেভেলপমেন্ট', true, 139)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_manual = EXCLUDED.is_manual, sort_order = EXCLUDED.sort_order;
