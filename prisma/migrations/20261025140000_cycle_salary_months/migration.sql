-- বেতন-মাস moves from the global admin_salary_config tile to the budget cycle:
-- a cycle is exactly one fiscal year, so the annualising multiplier belongs to
-- the cycle rather than to the whole installation.
ALTER TABLE "core_budget_cycles" ADD COLUMN "salary_months" INTEGER NOT NULL DEFAULT 12;

-- Seed every existing cycle from the global tile so already-budgeted sheets keep
-- the multiplier they were prepared with, then retire the tile.
UPDATE "core_budget_cycles"
SET "salary_months" = COALESCE(
        (SELECT "value"::INTEGER FROM "admin_salary_config" WHERE "key" = 'salary_months'),
        12
    );

DELETE FROM "admin_salary_config" WHERE "key" = 'salary_months';
