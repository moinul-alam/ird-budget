-- A ministry and a department are budget-owning entities in their own right: each already
-- holds a budget ID (core_ministries.code / core_departments.code). They were not core_offices
-- rows, so they never received a login, and core_office_levels.office_type_id was NOT NULL, so
-- they could not own a level either — and economic-code grants are keyed by level.
--
-- This migration widens the org model so a level and an office can hang off a ministry or a
-- department, then provisions one level and one office per existing ministry/department so they
-- can log in. Every column change is a relaxation or an additive nullable column; no existing
-- value is rewritten.

-- ---------------------------------------------------------------------------
-- 1. Relax the org model (non-destructive)
-- ---------------------------------------------------------------------------

-- A level now belongs to exactly one owner: {ministry, department, office type}.
ALTER TABLE "core_office_levels" ALTER COLUMN "office_type_id" DROP NOT NULL;
ALTER TABLE "core_office_levels" ADD COLUMN "ministry_id" BIGINT;
ALTER TABLE "core_office_levels" ADD COLUMN "department_id" BIGINT;

ALTER TABLE "core_office_levels"
  ADD CONSTRAINT "core_office_levels_ministry_id_fkey"
  FOREIGN KEY ("ministry_id") REFERENCES "core_ministries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core_office_levels"
  ADD CONSTRAINT "core_office_levels_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "core_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- An office either links to a department + office type (ordinary office) or straight to a
-- ministry. Both links become optional and a direct ministry link is added.
ALTER TABLE "core_offices" ALTER COLUMN "department_id" DROP NOT NULL;
ALTER TABLE "core_offices" ALTER COLUMN "office_type_id" DROP NOT NULL;
ALTER TABLE "core_offices" ADD COLUMN "ministry_id" BIGINT;

ALTER TABLE "core_offices"
  ADD CONSTRAINT "core_offices_ministry_id_fkey"
  FOREIGN KEY ("ministry_id") REFERENCES "core_ministries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Backfill: give every existing ministry and department a level + an office
-- ---------------------------------------------------------------------------

-- One level per ministry ("মন্ত্রণালয়") and per department ("দপ্তর"), unless it already has one.
INSERT INTO "core_office_levels" ("ministry_id", "level_name", "level_order", "created_at", "updated_at")
SELECT m."id", 'মন্ত্রণালয়', 1, now(), now()
FROM "core_ministries" m
WHERE NOT EXISTS (SELECT 1 FROM "core_office_levels" l WHERE l."ministry_id" = m."id");

INSERT INTO "core_office_levels" ("department_id", "level_name", "level_order", "created_at", "updated_at")
SELECT d."id", 'দপ্তর', 1, now(), now()
FROM "core_departments" d
WHERE NOT EXISTS (SELECT 1 FROM "core_office_levels" l WHERE l."department_id" = d."id");

-- The office row is what makes a login possible. Its budget_id is the ministry/department code,
-- so the admin keeps using the ID they already know. The guard skips any code already taken by
-- an existing office rather than failing the whole migration on the unique index.
INSERT INTO "core_offices" ("budget_id", "name", "ministry_id", "office_level_id", "is_active", "created_at", "updated_at")
SELECT m."code", m."name", m."id", l."id", true, now(), now()
FROM "core_ministries" m
JOIN "core_office_levels" l ON l."ministry_id" = m."id"
WHERE NOT EXISTS (SELECT 1 FROM "core_offices" o WHERE o."budget_id" = m."code");

INSERT INTO "core_offices" ("budget_id", "name", "department_id", "office_level_id", "is_active", "created_at", "updated_at")
SELECT d."code", d."name", d."id", l."id", true, now(), now()
FROM "core_departments" d
JOIN "core_office_levels" l ON l."department_id" = d."id"
WHERE NOT EXISTS (SELECT 1 FROM "core_offices" o WHERE o."budget_id" = d."code");
