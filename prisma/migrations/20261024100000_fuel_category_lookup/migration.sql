-- The fuel category becomes real reference data instead of the free-text 'oil' / 'gas' tag
-- the previous migration added. Data-preserving: the tag on each fuel is lifted into
-- ref_fuel_categories and re-pointed through category_id before the old column is dropped,
-- so the two fuel economic codes (3243301 / 3243302) keep splitting exactly as they did.

-- CreateTable
CREATE TABLE "ref_fuel_categories" (
    "id" BIGSERIAL NOT NULL,
    "category_name" VARCHAR(20) NOT NULL,
    "category_name_bn" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ref_fuel_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ref_fuel_categories_category_name_key" ON "ref_fuel_categories"("category_name");

-- The two categories the budget knows about. `category_name` is the stable key the engine
-- matches on; `category_name_bn` is what the administrator reads on /admin/settings.
INSERT INTO "ref_fuel_categories" ("category_name", "category_name_bn") VALUES
    ('oil', 'তেল'),
    ('gas', 'গ্যাস')
ON CONFLICT ("category_name") DO NOTHING;

-- AlterTable
ALTER TABLE "ref_fuel_types" ADD COLUMN "category_id" BIGINT;

-- Link every existing fuel to its category by the tag the previous migration set.
UPDATE "ref_fuel_types" f
SET "category_id" = c."id"
FROM "ref_fuel_categories" c
WHERE f."category" = c."category_name";

-- A fuel that somehow carried neither tag falls back to the oil code it was charged to before.
UPDATE "ref_fuel_types" f
SET "category_id" = c."id"
FROM "ref_fuel_categories" c
WHERE f."category_id" IS NULL AND c."category_name" = 'oil';

-- AlterTable
ALTER TABLE "ref_fuel_types" ALTER COLUMN "category_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "ref_fuel_types" DROP COLUMN "category";

-- CreateIndex
CREATE INDEX "ref_fuel_types_category_id_idx" ON "ref_fuel_types"("category_id");

-- AddForeignKey
ALTER TABLE "ref_fuel_types" ADD CONSTRAINT "ref_fuel_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ref_fuel_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
