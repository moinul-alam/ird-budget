-- Budget types and fiscal years become real, editable reference data, and budget
-- cycles reference them by foreign key instead of duplicating their labels as
-- free text. Data-preserving: anything already referenced by a cycle is lifted
-- into the new tables before the old columns are dropped.

-- CreateTable
CREATE TABLE "ref_budget_types" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ref_budget_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_fiscal_years" (
    "id" BIGSERIAL NOT NULL,
    "year" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ref_fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ref_budget_types_name_key" ON "ref_budget_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ref_fiscal_years_year_key" ON "ref_fiscal_years"("year");

-- Lift any value already used by an existing cycle, so nothing is lost when the
-- free-text columns below are dropped. The starting rows for a brand-new
-- database come from prisma/seed.js, exactly like ref_budget_categories.
-- Historical rows appended a ":::name=..." suffix to the fiscal year to smuggle
-- the type label along, so strip that suffix on the way in.
INSERT INTO "ref_budget_types" ("name", "sort_order", "updated_at")
SELECT DISTINCT c."budget_type", 100, CURRENT_TIMESTAMP
FROM "core_budget_cycles" c
WHERE c."budget_type" IS NOT NULL AND c."budget_type" <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "ref_fiscal_years" ("year", "sort_order", "updated_at")
SELECT DISTINCT split_part(c."fiscal_year", ':::name=', 1), 100, CURRENT_TIMESTAMP
FROM "core_budget_cycles" c
WHERE c."fiscal_year" IS NOT NULL AND c."fiscal_year" <> ''
ON CONFLICT ("year") DO NOTHING;

-- DropIndex
DROP INDEX "core_budget_cycles_fiscal_year_budget_type_key";

-- AlterTable
ALTER TABLE "core_budget_cycles" ADD COLUMN "fiscal_year_id" BIGINT;
ALTER TABLE "core_budget_cycles" ADD COLUMN "budget_type_id" BIGINT;

-- Link every existing cycle to its reference rows.
UPDATE "core_budget_cycles" c
SET "fiscal_year_id" = fy."id"
FROM "ref_fiscal_years" fy
WHERE fy."year" = split_part(c."fiscal_year", ':::name=', 1);

UPDATE "core_budget_cycles" c
SET "budget_type_id" = bt."id"
FROM "ref_budget_types" bt
WHERE bt."name" = c."budget_type";

-- AlterTable
ALTER TABLE "core_budget_cycles" DROP COLUMN "fiscal_year";
ALTER TABLE "core_budget_cycles" DROP COLUMN "budget_type";

ALTER TABLE "core_budget_cycles" ALTER COLUMN "fiscal_year_id" SET NOT NULL;
ALTER TABLE "core_budget_cycles" ALTER COLUMN "budget_type_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "core_budget_cycles_fiscal_year_id_idx" ON "core_budget_cycles"("fiscal_year_id");

-- CreateIndex
CREATE INDEX "core_budget_cycles_budget_type_id_idx" ON "core_budget_cycles"("budget_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "core_budget_cycles_fiscal_year_id_budget_type_id_key" ON "core_budget_cycles"("fiscal_year_id", "budget_type_id");

-- AddForeignKey
ALTER TABLE "core_budget_cycles" ADD CONSTRAINT "core_budget_cycles_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "ref_fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_budget_cycles" ADD CONSTRAINT "core_budget_cycles_budget_type_id_fkey" FOREIGN KEY ("budget_type_id") REFERENCES "ref_budget_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
