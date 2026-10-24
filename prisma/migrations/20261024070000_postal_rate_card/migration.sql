-- The ডাক line (3211119) was computed from a rate that lived on admin_rates, but
-- /admin/settings had no card for it, so no administrator could see or change it.
-- At the same time admin_rates still carried two rows nothing reads any more:
-- `house_rent_percent` (the tab-1 house_rent slab replaced it) and `postal_rate`
-- (a duplicate of `postal_expense_rate`, which is the key the engine uses).
--
-- The ডাক figure also needed a manual escape hatch: it depends on the number of
-- TIN holders who did not file, which only the office can confirm.

-- ---------------------------------------------------------------------------
-- 1. Per-code "computed but overridable" flag
-- ---------------------------------------------------------------------------
-- An auto code normally shows its computed amount with no input box. Setting this
-- flag keeps the computed amount but also renders an override field, so the office
-- can correct a figure the engine can only estimate.

ALTER TABLE "ref_economic_codes"
    ADD COLUMN "allow_manual_override" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "ref_economic_codes"
SET "allow_manual_override" = TRUE, "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = '3211119';

-- ---------------------------------------------------------------------------
-- 2. ডাক ব্যয়ের হার card
-- ---------------------------------------------------------------------------
-- Sixteenth tile of the "বেতন-ভাতা" tab. The engine multiplies it by two notices
-- per non-filer, then by the non-filer count (form 12: tin − returns).

INSERT INTO "admin_salary_config"
    ("key", "label_bn", "description_bn", "unit_bn", "input_type", "value_format", "value", "from_grade", "to_grade", "sort_order", "updated_at")
VALUES
    ('postal_rate', 'ডাক ব্যয়ের হার', 'প্রতি নন-ফাইলার প্রতি ডাক ব্যয় (২টি নোটিশ)', 'টাকা', 'number', 'amount', 50, NULL, NULL, 16, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Carry over whatever the legacy row held, so an edit made there is not lost.
UPDATE "admin_salary_config"
SET "value" = COALESCE((SELECT r."value" FROM "admin_rates" r WHERE r."key" = 'postal_expense_rate'), "value")
WHERE "key" = 'postal_rate';

-- ---------------------------------------------------------------------------
-- 3. Drop the two superseded rate rows
-- ---------------------------------------------------------------------------
-- Repoint the return-info FK first, so deleting the duplicate row cannot orphan a
-- stored reference (both rows hold the same value).

UPDATE "office_form_return_info"
SET "postal_rate_id" = (SELECT "id" FROM "admin_rates" WHERE "key" = 'postal_expense_rate')
WHERE "postal_rate_id" IN (SELECT "id" FROM "admin_rates" WHERE "key" = 'postal_rate');

DELETE FROM "admin_rates" WHERE "key" IN ('house_rent_percent', 'postal_rate');
