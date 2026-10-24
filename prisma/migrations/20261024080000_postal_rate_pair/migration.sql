-- The ডাক figure is a rate × quantity pair: a per-notice cost multiplied by how many
-- notices a non-filer is served. Only the cost was configurable; the "two notices" lived
-- as a constant in calculate.ts, which the project's "nothing the admin can change is
-- hardcoded" rule forbids. The quantity becomes the card's second field.
--
-- A card is a pair when `secondary_label_bn` is set; it then renders and saves a second
-- input. Cards without it are unchanged, so the tab still shows sixteen cards in four rows.

ALTER TABLE "admin_salary_config"
    ADD COLUMN "secondary_label_bn" TEXT,
    ADD COLUMN "secondary_unit_bn" VARCHAR(30) NOT NULL DEFAULT '',
    ADD COLUMN "secondary_value" DECIMAL(14, 2) NOT NULL DEFAULT 0;

-- ডাক = per-notice cost (টাকা/ডাক) × notices served per non-filer.
UPDATE "admin_salary_config"
SET "label_bn" = 'ডাক ব্যয়',
    "description_bn" = 'প্রতি ডাকের ব্যয় × নন-ফাইলার প্রতি ডাকের সংখ্যা',
    "unit_bn" = 'টাকা/ডাক',
    "secondary_label_bn" = 'ডাকের সংখ্যা',
    "secondary_unit_bn" = 'টি',
    "secondary_value" = 2,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "key" = 'postal_rate';
