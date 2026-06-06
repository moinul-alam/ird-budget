CREATE TABLE office_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  formula_key TEXT,
  is_manual BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE code_group_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES expense_codes(id) ON DELETE CASCADE,
  group_id UUID REFERENCES office_groups(id) ON DELETE CASCADE,
  UNIQUE(code_id, group_id)
);

CREATE TABLE rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value NUMERIC NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_no INTEGER NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('officer', 'staff')),
  label TEXT
);

CREATE TABLE offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_id UUID REFERENCES office_groups(id),
  parent_office TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('estimated', 'revised')),
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fiscal_year, type)
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES cycles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(office_id, cycle_id)
);

CREATE TABLE form_basic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  phone TEXT,
  email TEXT,
  head_of_office TEXT,
  designation TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE form_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  grade_id UUID REFERENCES grades(id),
  count INTEGER DEFAULT 0,
  avg_basic NUMERIC DEFAULT 0,
  UNIQUE(submission_id, grade_id)
);

CREATE TABLE form_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  monthly_fuel_liters NUMERIC DEFAULT 0,
  UNIQUE(submission_id, vehicle_type)
);

CREATE TABLE form_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  UNIQUE(submission_id, equipment_type)
);

CREATE TABLE form_utility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  electricity_monthly NUMERIC DEFAULT 0,
  water_monthly NUMERIC DEFAULT 0,
  gas_monthly NUMERIC DEFAULT 0,
  internet_monthly NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE form_fuel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  monthly_liters NUMERIC DEFAULT 0,
  price_per_liter NUMERIC DEFAULT 0,
  UNIQUE(submission_id, vehicle_type)
);

CREATE TABLE form_rent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  office_rent_monthly NUMERIC DEFAULT 0,
  garage_rent_monthly NUMERIC DEFAULT 0,
  other_rent_monthly NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE budget_sheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  code_id UUID REFERENCES expense_codes(id),
  auto_value NUMERIC DEFAULT 0,
  manual_value NUMERIC,
  final_value NUMERIC GENERATED ALWAYS AS (
    COALESCE(manual_value, auto_value)
  ) STORED,
  prev_year_actual NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, code_id)
);

CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'superadmin')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_group_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES office_groups(id) ON DELETE CASCADE,
  UNIQUE(admin_id, group_id)
);

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

INSERT INTO rates (key, value, description) VALUES
('medical_allowance_monthly', 1500, 'Monthly medical allowance per staff (BDT)'),
('house_rent_percent', 50, 'House rent as % of basic salary'),
('festival_bonus_multiplier', 2, 'Number of festival bonuses per year'),
('provident_fund_percent', 10, 'Provident fund as % of basic salary'),
('fuel_price_per_liter', 110, 'Fuel price per liter (BDT)');

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

INSERT INTO office_groups (name, description) VALUES
('ট্যাক্স', 'ট্যাক্স অফিস'),
('ভ্যাট', 'ভ্যাট অফিস'),
('কাস্টমস', 'কাস্টমস অফিস');

INSERT INTO cycles (fiscal_year, type, status) VALUES
('2024-25', 'estimated', 'open');
