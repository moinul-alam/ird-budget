-- Purge the duplicate / unreachable sources of truth found in RELEASE-AUDIT.md.
--
-- Four objects each answered a question that a table already answers, and the code has been
-- repointed at the surviving source, so they are dropped here:
--
--   * core_office_types.is_group_budget       → superseded by admin_group_budget_rules (F2)
--   * admin_rates + its two FK columns        → superseded by admin_salary_config tiles (F3)
--   * admin_vehicle_config.office_type_id     → unreachable per-type override (F11)
--   * admin_vehicle_rent_config.office_type_id → same (F11)
--
-- Plus two DB-level guards the schema cannot express (Prisma does not model CHECKs, and its
-- drift diff ignores them), mirroring 20261027110000_office_hierarchy_constraints:
--
--   * core_offices.office_level_id  SET NULL → RESTRICT (F7): deleting a level an office sits
--     on must not silently blank that office's sheet.
--   * core_budget_cycles.salary_months CHECK 1..12 (F10): the annualising multiplier was
--     validated in code only.

-- ---------------------------------------------------------------------------
-- F3: drop the admin_rates fallback chain (columns first, then the table)
-- ---------------------------------------------------------------------------
-- DropForeignKey
ALTER TABLE "admin_vehicle_config" DROP CONSTRAINT "admin_vehicle_config_office_type_id_fkey";

-- DropForeignKey
ALTER TABLE "admin_vehicle_rent_config" DROP CONSTRAINT "admin_vehicle_rent_config_office_type_id_fkey";

-- DropForeignKey
ALTER TABLE "office_form_house_rent" DROP CONSTRAINT "office_form_house_rent_vat_rate_id_fkey";

-- DropForeignKey
ALTER TABLE "office_form_return_info" DROP CONSTRAINT "office_form_return_info_postal_rate_id_fkey";

-- AlterTable
ALTER TABLE "admin_vehicle_config" DROP COLUMN "office_type_id";

-- AlterTable
ALTER TABLE "admin_vehicle_rent_config" DROP COLUMN "office_type_id";

-- AlterTable
ALTER TABLE "core_office_types" DROP COLUMN "is_group_budget";

-- AlterTable
ALTER TABLE "office_form_house_rent" DROP COLUMN "vat_rate_id";

-- AlterTable
ALTER TABLE "office_form_return_info" DROP COLUMN "postal_rate_id";

-- DropTable
DROP TABLE "admin_rates";

-- ---------------------------------------------------------------------------
-- F7: an office must never be orphaned by deleting its level
-- ---------------------------------------------------------------------------
ALTER TABLE "core_offices" DROP CONSTRAINT "core_offices_office_level_id_fkey";

ALTER TABLE "core_offices"
  ADD CONSTRAINT "core_offices_office_level_id_fkey"
  FOREIGN KEY ("office_level_id") REFERENCES "core_office_levels"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- F10: বেতন-মাস must stay in 1..12 — the sheet annualises every monthly figure with it
-- ---------------------------------------------------------------------------
ALTER TABLE "core_budget_cycles"
  ADD CONSTRAINT "core_budget_cycles_salary_months_check"
  CHECK ("salary_months" BETWEEN 1 AND 12);
