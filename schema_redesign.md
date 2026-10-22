# Database Redesign Plan (`schema_redesign.md`)
**Project:** Internal Resources Division (IRD) Budget Management System  
**Architecture:** Normalized PostgreSQL Schema with Domain Prefixes (`core_`, `admin_`, `office_`)  
**Authentication Model:** Direct Application Auth via Custom Tables (No Supabase Auth overhead)  
**Security / Access:** RLS Enabled with Seamless CRUD Permissive Policies for App Access  
**Superadmin Seed:** Username `superadmin`, Password `123`

---

## 1. Domain Prefix Architecture

The database is divided into three distinct namespaces:
1. **`core_`**: Master reference data shared throughout the entire system (Ministries, Departments, Offices, Cycles, Economic Codes).
2. **`admin_`**: Administrative user profiles, RBAC mappings, office hierarchy levels ("মাঠ অফিসের স্তর"), group budget rules, rates, and ceilings.
3. **`office_`**: Office user logins and all 12 budget submission forms + final budget sheets, each in dedicated normalized tables.

```
                              ┌─────────────────────────┐
                              │     core_ministries     │
                              └────────────┬────────────┘
                                           │ 1:N
                              ┌────────────▼────────────┐
                              │    core_departments     │
                              └────────────┬────────────┘
                                           │ 1:N
       ┌───────────────────────────────────┼───────────────────────────────────┐
       │ 1:N                               │ 1:N                               │ 1:N
┌──────▼──────────────┐             ┌──────▼──────────────┐             ┌──────▼──────────────┐
│  core_office_types  │             │ admin_office_levels │             │  core_budget_cycles │
└──────┬──────────────┘             └──────┬──────────────┘             └──────┬──────────────┘
       │ 1:N                               │ 1:N (optional)                    │ 1:N
       └───────────────────┬───────────────┘                                   │
                           │                                                   │
                ┌──────────▼──────────┐                                        │
                │     core_offices    │◄─────────────────┐ (parent_office_id) │
                └──────────┬──────────┘                  │ 1:N                 │
                           │ 1:1                         └─────────────────────┘
                ┌──────────▼──────────┐
                │  office_user_logins │
                └─────────────────────┘
                           │
                           │ 1:N
                ┌──────────▼──────────┐
                │  office_submissions │◄───────────────────────────────────────┘
                └──────────┬──────────┘
                           │ 1:1 or 1:N
          ┌────────────────┼────────────────┬────────────────┬────────────────┐
          │                │                │                │                │
┌─────────▼────────┐ ┌─────▼───────┐ ┌──────▼──────┐ ┌───────▼──────┐ ┌───────▼────────┐
│ office_form_basic│ │form_staff_2 │ │form_staff_3 │ │form_staff_4  │ │...forms 5-12 & │
│ (Form 1)         │ │(Working)    │ │(Suspended)  │ │(New Recruit) │ │budget_sheet    │
└──────────────────┘ └─────────────┘ └─────────────┘ └──────────────┘ └────────────────┘
```

---

## 2. Table Specifications

### A. Core Master Tables (`core_`)

#### 1. `core_ministries`
*Ministry / Division level entity (e.g., অভ্যন্তরীণ সম্পদ বিভাগ).*
- `id` (BIGSERIAL, PRIMARY KEY)
- `code` (VARCHAR(50), UNIQUE, NOT NULL)
- `name` (TEXT, NOT NULL)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 2. `core_departments`
*Agencies / Directorates under ministries (NBR, National Savings Directorate, Taxes Tribunal, Customs Tribunal).*
- `id` (BIGSERIAL, PRIMARY KEY)
- `ministry_id` (BIGINT NOT NULL REFERENCES `core_ministries(id)` ON DELETE RESTRICT)
- `name` (TEXT, NOT NULL)
- `code` (VARCHAR(50), UNIQUE)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 3. `core_office_types`
*Classifications of offices under departments (e.g., কর অঞ্চল, কাস্টমস কমিশনারেট, সঞ্চয় অফিস).*
- `id` (BIGSERIAL, PRIMARY KEY)
- `department_id` (BIGINT NOT NULL REFERENCES `core_departments(id)` ON DELETE RESTRICT)
- `name` (TEXT, NOT NULL)
- `is_group_budget` (BOOLEAN DEFAULT false)
- `sort_order` (INT DEFAULT 1)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 4. `core_offices`
*Physical field offices and head offices with reporting hierarchy.*
- `id` (BIGSERIAL, PRIMARY KEY)
- `budget_id` (VARCHAR(50) UNIQUE NOT NULL) — *Acts as primary office budget code & login ID*
- `name` (TEXT NOT NULL) — *Clean office name (no tags!)*
- `department_id` (BIGINT NOT NULL REFERENCES `core_departments(id)` ON DELETE RESTRICT)
- `office_type_id` (BIGINT NOT NULL REFERENCES `core_office_types(id)` ON DELETE RESTRICT)
- `office_level_id` (BIGINT REFERENCES `admin_office_levels(id)` ON DELETE SET NULL)
- `parent_office_id` (BIGINT REFERENCES `core_offices(id)` ON DELETE SET NULL)
- `is_active` (BOOLEAN DEFAULT true)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 5. `core_budget_cycles`
*Fiscal years and active submission windows.*
- `id` (BIGSERIAL, PRIMARY KEY)
- `fiscal_year` (VARCHAR(20) NOT NULL) — e.g. "2026-2027"
- `budget_type` (VARCHAR(20) NOT NULL CHECK (`budget_type` IN ('estimated', 'revised')))
- `title` (TEXT NOT NULL) — e.g. "২০২৬-২৭ প্রাক্কলিত বাজেট"
- `status` (VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (`status` IN ('open', 'closed')))
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 6. `core_expense_codes`
*139 Government Chart of Accounts (COA) Economic Codes.*
- `id` (BIGSERIAL, PRIMARY KEY)
- `code` (VARCHAR(20) UNIQUE NOT NULL) — e.g. "3111101"
- `name` (TEXT NOT NULL) — Bengali economic title
- `is_manual` (BOOLEAN NOT NULL DEFAULT true)
- `formula_key` (VARCHAR(50)) — nullable link for calculate.ts
- `sort_order` (INT DEFAULT 0)
- `is_active` (BOOLEAN DEFAULT true)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

---

### B. Administrative Tables (`admin_`)

#### 1. `admin_users`
*System administrators and sub-admins.*
- `id` (BIGSERIAL, PRIMARY KEY)
- `username` (VARCHAR(50) UNIQUE NOT NULL)
- `password_hash` (TEXT NOT NULL) — Argon2 or SHA-256 hash
- `password_hint` (TEXT) — plain text copy visible to Superadmin in settings UI
- `role` (VARCHAR(20) NOT NULL CHECK (`role` IN ('superadmin', 'admin')))
- `is_active` (BOOLEAN DEFAULT true)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 2. `admin_office_levels`
*Direct relational storage for "মাঠ অফিসের স্তর" (Field Office Hierarchy Levels).*
- `id` (BIGSERIAL, PRIMARY KEY)
- `department_id` (BIGINT NOT NULL REFERENCES `core_departments(id)` ON DELETE CASCADE)
- `office_type_id` (BIGINT NOT NULL REFERENCES `core_office_types(id)` ON DELETE CASCADE)
- `level_name` (TEXT NOT NULL) — e.g. "সার্কেল অফিস", "রেঞ্জ", "কমিশনারেট", "শীর্ষ কর অঞ্চল"
- `level_order` (INT NOT NULL DEFAULT 1)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())
- `UNIQUE(office_type_id, level_order)`

#### 3. `admin_rates`
*Calculation constants and rates.*
- `id` (BIGSERIAL, PRIMARY KEY)
- `key` (VARCHAR(50) UNIQUE NOT NULL) — e.g. `medical_allowance_monthly`, `fuel_price_octane`
- `name` (TEXT NOT NULL)
- `value` (NUMERIC(14, 2) NOT NULL)
- `unit` (VARCHAR(20) DEFAULT 'টাকা')
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 4. `admin_group_budget_rules`
*Rules governing group budget aggregation.*
- `id` (BIGSERIAL, PRIMARY KEY)
- `parent_office_type_id` (BIGINT REFERENCES `core_office_types(id)` ON DELETE CASCADE)
- `child_office_type_id` (BIGINT REFERENCES `core_office_types(id)` ON DELETE CASCADE)
- `can_view_child_submissions` (BOOLEAN DEFAULT true)
- `can_consolidate_budget` (BOOLEAN DEFAULT true)
- `created_at` (TIMESTAMPTZ DEFAULT now())

---

### C. Office User & Submission Master (`office_`)

#### 1. `office_user_logins`
*Direct 1-to-1 office login account mapped to budget ID.*
- `id` (BIGSERIAL, PRIMARY KEY)
- `office_id` (BIGINT UNIQUE NOT NULL REFERENCES `core_offices(id)` ON DELETE CASCADE)
- `budget_id` (VARCHAR(50) UNIQUE NOT NULL REFERENCES `core_offices(budget_id)` ON UPDATE CASCADE ON DELETE CASCADE)
- `password_hash` (TEXT NOT NULL)
- `password_hint` (TEXT NOT NULL DEFAULT '12345') — *Visible to Superadmin for password support*
- `is_active` (BOOLEAN DEFAULT true)
- `last_login_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 2. `office_submissions`
*Master submission container for an office in an active budget cycle.*
- `id` (BIGSERIAL, PRIMARY KEY)
- `office_id` (BIGINT NOT NULL REFERENCES `core_offices(id)` ON DELETE RESTRICT)
- `cycle_id` (BIGINT NOT NULL REFERENCES `core_budget_cycles(id)` ON DELETE RESTRICT)
- `status` (VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (`status` IN ('draft', 'submitted')))
- `submitted_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())
- `UNIQUE(office_id, cycle_id)`

---

### D. 12 Normalized Form Tables (`office_form_`)

#### 1. `office_form_basic` (Form 1: Basic Office Information)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT UNIQUE NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `head_of_office` (TEXT)
- `designation` (TEXT)
- `phone` (VARCHAR(30))
- `email` (VARCHAR(100))
- `address` (TEXT) — *Clean physical address only*
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 2. `office_form_staff_working` (Form 2: Working Staff Salaries)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `grade_id` (INT NOT NULL CHECK (`grade_id` BETWEEN 1 AND 20))
- `staff_count` (INT NOT NULL DEFAULT 0)
- `monthly_basic` (NUMERIC(14, 2) NOT NULL DEFAULT 0)
- `due_salary` (NUMERIC(14, 2) NOT NULL DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())
- `UNIQUE(submission_id, grade_id)`

#### 3. `office_form_staff_suspended` (Form 3: Suspended Staff Salaries)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `grade_id` (INT NOT NULL CHECK (`grade_id` BETWEEN 1 AND 20))
- `suspended_count` (INT NOT NULL DEFAULT 0)
- `suspended_monthly_basic` (NUMERIC(14, 2) NOT NULL DEFAULT 0)
- `suspended_due_salary` (NUMERIC(14, 2) NOT NULL DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())
- `UNIQUE(submission_id, grade_id)`

#### 4. `office_form_staff_new_recruits` (Form 4: Newly Appointed Staff)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `grade_id` (INT NOT NULL CHECK (`grade_id` BETWEEN 1 AND 20))
- `recruit_count` (INT NOT NULL DEFAULT 0)
- `monthly_basic` (NUMERIC(14, 2) NOT NULL DEFAULT 0)
- `joining_date` (DATE) — *Specific joining date from Form 4 modal*
- `months_remaining` (INT DEFAULT 12)
- `total_salary` (NUMERIC(14, 2) NOT NULL DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 5. `office_form_allowances` (Form 5: Special Allowances)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `allowance_name` (TEXT NOT NULL)
- `officer_count` (INT DEFAULT 0)
- `staff_count` (INT DEFAULT 0)
- `total_annual_amount` (NUMERIC(14, 2) DEFAULT 0)
- `effective_date` (DATE)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 6. `office_form_leave_encashment` (Form 6: Leave & Recreation)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT UNIQUE NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `leave_encashment_officer_basic` (NUMERIC(14, 2) DEFAULT 0)
- `leave_encashment_officer_due` (NUMERIC(14, 2) DEFAULT 0)
- `leave_encashment_staff_basic` (NUMERIC(14, 2) DEFAULT 0)
- `leave_encashment_staff_due` (NUMERIC(14, 2) DEFAULT 0)
- `rest_recreation_amount` (NUMERIC(14, 2) DEFAULT 0)
- `rest_recreation_due` (NUMERIC(14, 2) DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 7. `office_form_vehicles_govt` (Form 7: Government Vehicles)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `vehicle_type` (TEXT NOT NULL)
- `fuel_type` (VARCHAR(50) NOT NULL) — e.g. 'octane', 'diesel', 'cng'
- `vehicle_count` (INT NOT NULL DEFAULT 1)
- `monthly_fuel_quota_liter` (NUMERIC(10, 2) DEFAULT 0)
- `annual_lube_allowance` (NUMERIC(14, 2) DEFAULT 0)
- `annual_maintenance_allowance` (NUMERIC(14, 2) DEFAULT 0)
- `maintenance_due` (NUMERIC(14, 2) DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 8. `office_form_vehicles_rent` (Form 8: Rented Vehicles)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `vehicle_type` (TEXT NOT NULL)
- `vehicle_count` (INT NOT NULL DEFAULT 1)
- `monthly_rent_rate` (NUMERIC(14, 2) DEFAULT 0)
- `annual_total_rent` (NUMERIC(14, 2) DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 9. `office_form_house_rent` (Form 9: Office Building Rent)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT UNIQUE NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `monthly_rent` (NUMERIC(14, 2) DEFAULT 0)
- `vat_percentage` (NUMERIC(5, 2) DEFAULT 15)
- `arrears_due` (NUMERIC(14, 2) DEFAULT 0)
- `annual_total` (NUMERIC(14, 2) DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 10. `office_form_it_equipment` (Form 10: IT & Computer Equipment)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `equipment_type` (TEXT NOT NULL) — Computer, Printer, Scanner, Photocopier
- `existing_count` (INT DEFAULT 0)
- `new_demand_count` (INT DEFAULT 0)
- `toner_cost_monthly` (NUMERIC(14, 2) DEFAULT 0)
- `annual_total_cost` (NUMERIC(14, 2) DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 11. `office_form_utilities` (Form 11: Utilities & Bills)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `utility_name` (VARCHAR(50) NOT NULL) — বিদ্যুৎ, পানি, গ্যাস, ইন্টারনেট, টেলিফোন
- `annual_bill` (NUMERIC(14, 2) DEFAULT 0)
- `arrears_due` (NUMERIC(14, 2) DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())
- `UNIQUE(submission_id, utility_name)`

#### 12. `office_form_return_info` (Form 12: Tax Return Statistics)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT UNIQUE NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `return_submitted_count` (INT DEFAULT 0)
- `postal_rate_per_return` (NUMERIC(10, 2) DEFAULT 50)
- `total_postal_demand` (NUMERIC(14, 2) DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())

#### 13. `office_budget_sheet` (Final Calculated & Manual Budget Sheet)
- `id` (BIGSERIAL, PRIMARY KEY)
- `submission_id` (BIGINT NOT NULL REFERENCES `office_submissions(id)` ON DELETE CASCADE)
- `code_id` (BIGINT NOT NULL REFERENCES `core_expense_codes(id)` ON DELETE RESTRICT)
- `auto_value` (NUMERIC(14, 2) NOT NULL DEFAULT 0)
- `manual_value` (NUMERIC(14, 2)) — *Nullable, holds manual user inputs*
- `final_value` (NUMERIC(14, 2) NOT NULL DEFAULT 0)
- `created_at` (TIMESTAMPTZ DEFAULT now())
- `updated_at` (TIMESTAMPTZ DEFAULT now())
- `UNIQUE(submission_id, code_id)`

---

## 3. Row-Level Security (RLS) Policy Architecture

To ensure your server actions and client queries never encounter RLS blocking error `42501`, every table has RLS enabled with a clean, fully permissive policy for `anon` and `authenticated`:

```sql
-- Pattern applied to every single table:
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on <table_name>"
ON public.<table_name>
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
```

Security is enforced at the application boundary using tamper-proof signed session cookies (`getAdminSession()` and `getOfficeSession()`).

---

## 4. Initial Seed Data (Superadmin)

The script guarantees the system starts with an operational root user:
- **Table**: `admin_users`
- **Username**: `superadmin`
- **Password**: `123` (hashed with SHA-256 for secure comparison, plus hint `123` for the UI)
- **Role**: `superadmin`
- **Active**: `true`

---

## 5. Migration Execution Steps

1. **Safety Backup**: Verify [`resources/offices_backup_91.json`](file:///c:/App/ird-budget/resources/offices_backup_91.json) exists.
2. **Execute Full DDL Script**: Run the consolidated SQL file in Supabase SQL Editor.
3. **Seeding**:
   - Seed `core_ministries`, `core_departments`, `core_office_types`, and the 91 offices from `resources/offices_backup_91.json`.
   - Seed the 139 standard economic codes from `src/lib/budget/default-codes.json` into `core_expense_codes`.
   - Seed standard default rates into `admin_rates`.
4. **Codebase Adaptation**: Update TypeScript models and queries in `src/app/actions/` to match the clean table names.
