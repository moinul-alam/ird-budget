-- The employee category (কর্মকর্তা / কর্মচারী) becomes real reference data instead of the
-- free-text 'officer' / 'staff' tag on ref_grades. Data-preserving: the existing tag is
-- lifted into ref_employee_categories and re-pointed through category_id before the old
-- column is dropped.

-- CreateTable
CREATE TABLE "ref_employee_categories" (
    "id" BIGSERIAL NOT NULL,
    "category_name" VARCHAR(20) NOT NULL,
    "category_name_bn" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ref_employee_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ref_employee_categories_category_name_key" ON "ref_employee_categories"("category_name");

-- The two categories the budget knows about. `category_name` is the stable key the engine
-- matches on; `category_name_bn` is the Bengali label the forms show. Inserted in this
-- order so কর্মকর্তা (officer) sorts before কর্মচারী (staff).
INSERT INTO "ref_employee_categories" ("category_name", "category_name_bn") VALUES
    ('officer', 'কর্মকর্তা'),
    ('staff', 'কর্মচারী')
ON CONFLICT ("category_name") DO NOTHING;

-- AlterTable
ALTER TABLE "ref_grades" ADD COLUMN "category_id" BIGINT;

-- Lift the old tag first so nothing a grade already carried is lost.
UPDATE "ref_grades" g
SET "category_id" = c."id"
FROM "ref_employee_categories" c
WHERE g."category" = c."category_name";

-- Then apply the corrected boundary: grades 1–10 are officers and 11–20 are staff. The
-- previous seed split them at 9/10, which every officer-vs-staff budget total inherited.
UPDATE "ref_grades"
SET "category_id" = (SELECT "id" FROM "ref_employee_categories" WHERE "category_name" = 'officer')
WHERE "grade_no" <= 10;

UPDATE "ref_grades"
SET "category_id" = (SELECT "id" FROM "ref_employee_categories" WHERE "category_name" = 'staff')
WHERE "grade_no" > 10;

-- Any grade that still carries no category defaults to staff rather than blocking the
-- migration with a NOT NULL violation.
UPDATE "ref_grades"
SET "category_id" = (SELECT "id" FROM "ref_employee_categories" WHERE "category_name" = 'staff')
WHERE "category_id" IS NULL;

-- AlterTable
ALTER TABLE "ref_grades" ALTER COLUMN "category_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "ref_grades" DROP COLUMN "category";

-- CreateIndex
CREATE INDEX "ref_grades_category_id_idx" ON "ref_grades"("category_id");

-- AddForeignKey
ALTER TABLE "ref_grades" ADD CONSTRAINT "ref_grades_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ref_employee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
