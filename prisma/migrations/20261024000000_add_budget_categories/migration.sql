-- Categories become real, editable reference data instead of a free-text tag on
-- each economic code. Data-preserving: existing "category" values are lifted into
-- the new table (keyed by the 4-digit code prefix) before the old column is dropped.

-- CreateTable
CREATE TABLE "ref_budget_categories" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ref_budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ref_budget_categories_code_key" ON "ref_budget_categories"("code");

-- Backfill one category per distinct 4-digit prefix already present on the codes.
INSERT INTO "ref_budget_categories" ("code", "title", "sort_order", "updated_at")
SELECT
    left(e."code", 4),
    min(e."category"),
    (row_number() OVER (ORDER BY left(e."code", 4)))::int,
    CURRENT_TIMESTAMP
FROM "ref_economic_codes" e
WHERE e."category" IS NOT NULL AND length(e."code") >= 4
GROUP BY left(e."code", 4)
ON CONFLICT ("code") DO NOTHING;

-- AlterTable
ALTER TABLE "ref_economic_codes" ADD COLUMN "category_id" BIGINT;

-- Link every existing code to its category by prefix.
UPDATE "ref_economic_codes" e
SET "category_id" = c."id"
FROM "ref_budget_categories" c
WHERE left(e."code", 4) = c."code";

-- AlterTable
ALTER TABLE "ref_economic_codes" DROP COLUMN "category";

-- CreateIndex
CREATE INDEX "ref_economic_codes_category_id_idx" ON "ref_economic_codes"("category_id");

-- AddForeignKey
ALTER TABLE "ref_economic_codes" ADD CONSTRAINT "ref_economic_codes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ref_budget_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
