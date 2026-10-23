-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "core_ministries" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "core_ministries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_departments" (
    "id" BIGSERIAL NOT NULL,
    "ministry_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "core_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_office_types" (
    "id" BIGSERIAL NOT NULL,
    "department_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "is_group_budget" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "core_office_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_office_levels" (
    "id" BIGSERIAL NOT NULL,
    "office_type_id" BIGINT NOT NULL,
    "level_name" TEXT NOT NULL,
    "level_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "core_office_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_offices" (
    "id" BIGSERIAL NOT NULL,
    "budget_id" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "department_id" BIGINT NOT NULL,
    "office_type_id" BIGINT NOT NULL,
    "office_level_id" BIGINT,
    "parent_office_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "core_offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_budget_cycles" (
    "id" BIGSERIAL NOT NULL,
    "fiscal_year" VARCHAR(20) NOT NULL,
    "budget_type" VARCHAR(20) NOT NULL,
    "title" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'closed',
    "opened_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "core_budget_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_grades" (
    "id" SERIAL NOT NULL,
    "grade_no" INTEGER NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ref_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_economic_codes" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "category" VARCHAR(50),
    "is_manual" BOOLEAN NOT NULL DEFAULT true,
    "formula_key" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ref_economic_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_level_economic_code_mapping" (
    "id" BIGSERIAL NOT NULL,
    "office_level_id" BIGINT NOT NULL,
    "economic_code_id" BIGINT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_level_economic_code_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_allowance_types" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_calculated" BOOLEAN NOT NULL DEFAULT false,
    "formula_key" VARCHAR(100),
    "applicable_category" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ref_allowance_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_vehicle_types" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ref_vehicle_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_fuel_types" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ref_fuel_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_it_equipment_types" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "has_toner" BOOLEAN NOT NULL DEFAULT false,
    "is_lumpsum" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ref_it_equipment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_utility_types" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ref_utility_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_rates" (
    "id" BIGSERIAL NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'টাকা',
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_vehicle_config" (
    "id" BIGSERIAL NOT NULL,
    "office_type_id" BIGINT NOT NULL,
    "vehicle_type_id" BIGINT NOT NULL,
    "fuel_type_id" BIGINT NOT NULL,
    "monthly_fuel_quota_liter" DECIMAL(10,2) DEFAULT 0,
    "annual_lube_allowance" DECIMAL(14,2) DEFAULT 0,
    "annual_maintenance_allowance" DECIMAL(14,2) DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_vehicle_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_vehicle_rent_config" (
    "id" BIGSERIAL NOT NULL,
    "office_type_id" BIGINT NOT NULL,
    "vehicle_type_id" BIGINT NOT NULL,
    "monthly_rent_rate" DECIMAL(14,2) DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_vehicle_rent_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_it_config" (
    "id" BIGSERIAL NOT NULL,
    "office_type_id" BIGINT NOT NULL,
    "equipment_type_id" BIGINT NOT NULL,
    "unit_budget" DECIMAL(14,2) DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_it_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_users" (
    "id" BIGSERIAL NOT NULL,
    "office_id" BIGINT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_hint" TEXT DEFAULT '12345',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_submissions" (
    "id" BIGSERIAL NOT NULL,
    "office_id" BIGINT NOT NULL,
    "cycle_id" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMPTZ,
    "reviewed_by" BIGINT,
    "reviewed_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_basic" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "head_of_office" TEXT NOT NULL,
    "designation" TEXT,
    "phone" VARCHAR(30),
    "email" VARCHAR(100),
    "address" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_basic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_staff_working" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "staff_count" INTEGER NOT NULL DEFAULT 0,
    "monthly_basic" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "due_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_staff_working_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_staff_suspended" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "suspended_count" INTEGER NOT NULL DEFAULT 0,
    "suspended_monthly_basic" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "suspended_due_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_staff_suspended_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_staff_new_recruits" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "recruit_count" INTEGER NOT NULL DEFAULT 0,
    "monthly_basic" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "joining_date" DATE NOT NULL,
    "months_remaining" INTEGER NOT NULL DEFAULT 12,
    "total_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_staff_new_recruits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_allowances" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "allowance_type_id" BIGINT NOT NULL,
    "officer_count" INTEGER NOT NULL DEFAULT 0,
    "staff_count" INTEGER NOT NULL DEFAULT 0,
    "total_annual_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "effective_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_allowances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_leave_encashment" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "leave_encashment_officer_basic" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "leave_encashment_officer_due" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "leave_encashment_staff_basic" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "leave_encashment_staff_due" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rest_recreation_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rest_recreation_due" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_leave_encashment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_vehicles_govt" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "vehicle_config_id" BIGINT NOT NULL,
    "vehicle_count" INTEGER NOT NULL DEFAULT 0,
    "maintenance_due" DECIMAL(14,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_vehicles_govt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_vehicles_rent" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "vehicle_rent_config_id" BIGINT NOT NULL,
    "vehicle_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_vehicles_rent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_house_rent" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "monthly_rent" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vat_rate_id" BIGINT,
    "arrears_due" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "annual_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_house_rent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_it_equipment" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "it_config_id" BIGINT NOT NULL,
    "existing_count" INTEGER NOT NULL DEFAULT 0,
    "new_demand_count" INTEGER NOT NULL DEFAULT 0,
    "toner_cost_monthly" DECIMAL(14,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_it_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_utilities" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "utility_type_id" BIGINT NOT NULL,
    "annual_bill" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "arrears_due" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_utilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_form_return_info" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "return_submitted_count" INTEGER NOT NULL DEFAULT 0,
    "postal_rate_id" BIGINT,
    "total_postal_demand" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_form_return_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_budget_sheet" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "economic_code_id" BIGINT NOT NULL,
    "auto_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "manual_value" DECIMAL(14,2),
    "final_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "office_budget_sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_hint" TEXT,
    "role" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_group_budget_rules" (
    "id" BIGSERIAL NOT NULL,
    "office_type_id" BIGINT NOT NULL,
    "office_level_id" BIGINT,
    "is_group_budget" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_group_budget_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "core_ministries_code_key" ON "core_ministries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "core_departments_code_key" ON "core_departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "core_offices_budget_id_key" ON "core_offices"("budget_id");

-- CreateIndex
CREATE UNIQUE INDEX "core_budget_cycles_fiscal_year_budget_type_key" ON "core_budget_cycles"("fiscal_year", "budget_type");

-- CreateIndex
CREATE UNIQUE INDEX "ref_grades_grade_no_key" ON "ref_grades"("grade_no");

-- CreateIndex
CREATE UNIQUE INDEX "ref_economic_codes_code_key" ON "ref_economic_codes"("code");

-- CreateIndex
CREATE INDEX "office_level_economic_code_mapping_office_level_id_is_enabl_idx" ON "office_level_economic_code_mapping"("office_level_id", "is_enabled");

-- CreateIndex
CREATE INDEX "office_level_economic_code_mapping_economic_code_id_idx" ON "office_level_economic_code_mapping"("economic_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_level_economic_code_mapping_office_level_id_economic_key" ON "office_level_economic_code_mapping"("office_level_id", "economic_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "ref_allowance_types_name_key" ON "ref_allowance_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ref_vehicle_types_name_key" ON "ref_vehicle_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ref_fuel_types_name_key" ON "ref_fuel_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ref_it_equipment_types_name_key" ON "ref_it_equipment_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ref_utility_types_name_key" ON "ref_utility_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_rates_key_key" ON "admin_rates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "admin_vehicle_config_office_type_id_vehicle_type_id_fuel_ty_key" ON "admin_vehicle_config"("office_type_id", "vehicle_type_id", "fuel_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_vehicle_rent_config_office_type_id_vehicle_type_id_key" ON "admin_vehicle_rent_config"("office_type_id", "vehicle_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_it_config_office_type_id_equipment_type_id_key" ON "admin_it_config"("office_type_id", "equipment_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_users_office_id_key" ON "office_users"("office_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_submissions_office_id_cycle_id_key" ON "office_submissions"("office_id", "cycle_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_basic_submission_id_key" ON "office_form_basic"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_staff_working_submission_id_grade_id_key" ON "office_form_staff_working"("submission_id", "grade_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_staff_suspended_submission_id_grade_id_key" ON "office_form_staff_suspended"("submission_id", "grade_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_allowances_submission_id_allowance_type_id_key" ON "office_form_allowances"("submission_id", "allowance_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_leave_encashment_submission_id_key" ON "office_form_leave_encashment"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_vehicles_govt_submission_id_vehicle_config_id_key" ON "office_form_vehicles_govt"("submission_id", "vehicle_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_vehicles_rent_submission_id_vehicle_rent_config_key" ON "office_form_vehicles_rent"("submission_id", "vehicle_rent_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_house_rent_submission_id_key" ON "office_form_house_rent"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_it_equipment_submission_id_it_config_id_key" ON "office_form_it_equipment"("submission_id", "it_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_utilities_submission_id_utility_type_id_key" ON "office_form_utilities"("submission_id", "utility_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_form_return_info_submission_id_key" ON "office_form_return_info"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "office_budget_sheet_submission_id_economic_code_id_key" ON "office_budget_sheet"("submission_id", "economic_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_group_budget_rules_office_type_id_office_level_id_key" ON "admin_group_budget_rules"("office_type_id", "office_level_id");

-- AddForeignKey
ALTER TABLE "core_departments" ADD CONSTRAINT "core_departments_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "core_ministries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_office_types" ADD CONSTRAINT "core_office_types_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "core_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_office_levels" ADD CONSTRAINT "core_office_levels_office_type_id_fkey" FOREIGN KEY ("office_type_id") REFERENCES "core_office_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_offices" ADD CONSTRAINT "core_offices_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "core_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_offices" ADD CONSTRAINT "core_offices_office_type_id_fkey" FOREIGN KEY ("office_type_id") REFERENCES "core_office_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_offices" ADD CONSTRAINT "core_offices_office_level_id_fkey" FOREIGN KEY ("office_level_id") REFERENCES "core_office_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_offices" ADD CONSTRAINT "core_offices_parent_office_id_fkey" FOREIGN KEY ("parent_office_id") REFERENCES "core_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_level_economic_code_mapping" ADD CONSTRAINT "office_level_economic_code_mapping_office_level_id_fkey" FOREIGN KEY ("office_level_id") REFERENCES "core_office_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_level_economic_code_mapping" ADD CONSTRAINT "office_level_economic_code_mapping_economic_code_id_fkey" FOREIGN KEY ("economic_code_id") REFERENCES "ref_economic_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_vehicle_config" ADD CONSTRAINT "admin_vehicle_config_office_type_id_fkey" FOREIGN KEY ("office_type_id") REFERENCES "core_office_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_vehicle_config" ADD CONSTRAINT "admin_vehicle_config_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "ref_vehicle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_vehicle_config" ADD CONSTRAINT "admin_vehicle_config_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "ref_fuel_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_vehicle_rent_config" ADD CONSTRAINT "admin_vehicle_rent_config_office_type_id_fkey" FOREIGN KEY ("office_type_id") REFERENCES "core_office_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_vehicle_rent_config" ADD CONSTRAINT "admin_vehicle_rent_config_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "ref_vehicle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_it_config" ADD CONSTRAINT "admin_it_config_office_type_id_fkey" FOREIGN KEY ("office_type_id") REFERENCES "core_office_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_it_config" ADD CONSTRAINT "admin_it_config_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "ref_it_equipment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_users" ADD CONSTRAINT "office_users_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "core_offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_submissions" ADD CONSTRAINT "office_submissions_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "core_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_submissions" ADD CONSTRAINT "office_submissions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "core_budget_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_submissions" ADD CONSTRAINT "office_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_basic" ADD CONSTRAINT "office_form_basic_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_staff_working" ADD CONSTRAINT "office_form_staff_working_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_staff_working" ADD CONSTRAINT "office_form_staff_working_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "ref_grades"("grade_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_staff_suspended" ADD CONSTRAINT "office_form_staff_suspended_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_staff_suspended" ADD CONSTRAINT "office_form_staff_suspended_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "ref_grades"("grade_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_staff_new_recruits" ADD CONSTRAINT "office_form_staff_new_recruits_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_staff_new_recruits" ADD CONSTRAINT "office_form_staff_new_recruits_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "ref_grades"("grade_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_allowances" ADD CONSTRAINT "office_form_allowances_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_allowances" ADD CONSTRAINT "office_form_allowances_allowance_type_id_fkey" FOREIGN KEY ("allowance_type_id") REFERENCES "ref_allowance_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_leave_encashment" ADD CONSTRAINT "office_form_leave_encashment_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_vehicles_govt" ADD CONSTRAINT "office_form_vehicles_govt_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_vehicles_govt" ADD CONSTRAINT "office_form_vehicles_govt_vehicle_config_id_fkey" FOREIGN KEY ("vehicle_config_id") REFERENCES "admin_vehicle_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_vehicles_rent" ADD CONSTRAINT "office_form_vehicles_rent_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_vehicles_rent" ADD CONSTRAINT "office_form_vehicles_rent_vehicle_rent_config_id_fkey" FOREIGN KEY ("vehicle_rent_config_id") REFERENCES "admin_vehicle_rent_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_house_rent" ADD CONSTRAINT "office_form_house_rent_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_house_rent" ADD CONSTRAINT "office_form_house_rent_vat_rate_id_fkey" FOREIGN KEY ("vat_rate_id") REFERENCES "admin_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_it_equipment" ADD CONSTRAINT "office_form_it_equipment_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_it_equipment" ADD CONSTRAINT "office_form_it_equipment_it_config_id_fkey" FOREIGN KEY ("it_config_id") REFERENCES "admin_it_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_utilities" ADD CONSTRAINT "office_form_utilities_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_utilities" ADD CONSTRAINT "office_form_utilities_utility_type_id_fkey" FOREIGN KEY ("utility_type_id") REFERENCES "ref_utility_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_return_info" ADD CONSTRAINT "office_form_return_info_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_form_return_info" ADD CONSTRAINT "office_form_return_info_postal_rate_id_fkey" FOREIGN KEY ("postal_rate_id") REFERENCES "admin_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_budget_sheet" ADD CONSTRAINT "office_budget_sheet_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "office_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_budget_sheet" ADD CONSTRAINT "office_budget_sheet_economic_code_id_fkey" FOREIGN KEY ("economic_code_id") REFERENCES "ref_economic_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_group_budget_rules" ADD CONSTRAINT "admin_group_budget_rules_office_type_id_fkey" FOREIGN KEY ("office_type_id") REFERENCES "core_office_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_group_budget_rules" ADD CONSTRAINT "admin_group_budget_rules_office_level_id_fkey" FOREIGN KEY ("office_level_id") REFERENCES "core_office_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
