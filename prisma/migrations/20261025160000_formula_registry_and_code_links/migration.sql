-- The budget engine carried its structure as code: a map from economic-code string
-- to formula, a map from code to "which form feeds me", a name-substring test for
-- জ্বালানি, a name test for সার্কেল, and a name test for প্রিন্টার. Every one of those
-- is a fact the administrator should own, not a constant beside the formula. This
-- migration turns all of them into data:
--
--   * ref_formula_types        — the formulas the engine can run, as rows
--   * ref_economic_codes.formula_key  — which formula computes a code (was unused)
--   * ref_economic_codes.source_forms — the forms whose data produced a code
--   * ref_utility_types.economic_code_id  — বিদ্যুৎ → 3211113 and so on
--   * ref_fuel_categories.economic_code_id — তেল → 3243301, গ্যাস → 3243302
--   * core_office_types.is_tax_circle     — the কর সার্কেল postal rule
--   * admin_salary_config duty_allowance_months — দায়িত্ব ভাতা's six months
--
-- Nothing here changes a computed amount: each row keeps the formula it already had.

-- ---------------------------------------------------------------------------
-- 1. The formula catalogue
-- ---------------------------------------------------------------------------
-- Only the *binding* is data. A formula's arithmetic stays in
-- src/lib/budget/calculate.ts (`formulaRegistry`), keyed by these strings; a key
-- with no function computes 0, so an administrator can never invent an amount.

CREATE TABLE "ref_formula_types" (
    "id" BIGSERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label_bn" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ref_formula_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ref_formula_types_key_key" ON "ref_formula_types"("key");

INSERT INTO "ref_formula_types" ("key", "label_bn", "sort_order") VALUES
    ('salary_officer',           'মূল বেতন (অফিসার)',              1),
    ('salary_staff',             'মূল বেতন (কর্মচারী)',             2),
    ('leave_encashment_officer', 'ছুটি নগদায়ন বেতন (অফিসার)',       3),
    ('leave_encashment_staff',   'ছুটি নগদায়ন বেতন (কর্মচারী)',     4),
    ('duty_allowance',           'দায়িত্ব ভাতা',                   5),
    ('transport_allowance',      'যাতায়াত ভাতা',                   6),
    ('education_allowance',      'শিক্ষা ভাতা',                     7),
    ('risk_allowance',           'ঝুঁকি ভাতা',                      8),
    ('hill_allowance',           'পাহাড়ী ভাতা',                    9),
    ('house_rent_allowance',     'বাড়ি ভাড়া ভাতা',                10),
    ('medical_allowance',        'চিকিৎসা ভাতা',                    11),
    ('mobile_allowance',         'মোবাইল/সেলফোন ভাতা',              12),
    ('telephone_allowance',      'আবাসিক টেলিফোন নগদায়ন',          13),
    ('tiffin_allowance',         'টিফিন ভাতা',                      14),
    ('dress_allowance',          'পোশাক ভাতা',                      15),
    ('wash_allowance',           'ধোলাই ভাতা',                      16),
    ('festival_bonus',           'উৎসব ভাতা',                       17),
    ('overtime_allowance',       'অধিকাল ভাতা',                     18),
    ('rest_recreation',          'শ্রান্তি ও বিনোদন ভাতা',          19),
    ('entertainment_allowance',  'আপ্যায়ন ভাতা',                   20),
    ('noboborsho_allowance',     'বাংলা নববর্ষ ভাতা',               21),
    ('special_benefit',          'বিশেষ সুবিধা',                    22),
    ('utility_bill',             'ইউটিলিটি বিল (ফরম ১১)',          23),
    ('postal_demand',            'ডাক ব্যয় (ফরম ১২)',               24),
    ('office_rent',              'অফিস ভবন ভাড়া (ফরম ৯)',          25),
    ('fuel_by_category',         'জ্বালানি ব্যয় (ফরম ৭)',           26),
    ('vehicle_rent',             'যানবাহন ভাড়া (ফরম ৮)',           27),
    ('vehicle_maintenance',      'মোটরযান রক্ষণাবেক্ষণ',            28),
    ('it_toner',                 'কম্পিউটার সামগ্রী — টোনার (ফরম ১০)', 29),
    ('it_purchase',              'কম্পিউটার ও আনুষঙ্গিক ক্রয় (ফরম ১০)', 30);

-- ---------------------------------------------------------------------------
-- 2. Bind each economic code to its formula and its source forms
-- ---------------------------------------------------------------------------
ALTER TABLE "ref_economic_codes"
    ADD COLUMN "source_forms" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- Any value left over from an earlier experiment must not break the new FK.
UPDATE "ref_economic_codes"
SET "formula_key" = NULL
WHERE "formula_key" IS NOT NULL
  AND "formula_key" NOT IN (SELECT "key" FROM "ref_formula_types");

ALTER TABLE "ref_economic_codes"
    ADD CONSTRAINT "ref_economic_codes_formula_key_fkey"
    FOREIGN KEY ("formula_key") REFERENCES "ref_formula_types"("key")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- A code that names a formula is by definition computed, so it is never manual.
UPDATE "ref_economic_codes" AS c
SET "formula_key"  = v.formula_key,
    "source_forms" = v.source_forms,
    "is_manual"    = FALSE,
    "updated_at"   = now()
FROM (VALUES
    ('3111101', 'salary_officer',            ARRAY[2]),
    ('3111110', 'leave_encashment_officer',  ARRAY[6]),
    ('3111201', 'salary_staff',              ARRAY[2, 4]),
    ('3111209', 'leave_encashment_staff',    ARRAY[6]),
    ('3111301', 'duty_allowance',            ARRAY[5]),
    ('3111302', 'transport_allowance',       ARRAY[2]),
    ('3111306', 'education_allowance',       ARRAY[2]),
    ('3111308', 'risk_allowance',            ARRAY[5]),
    ('3111309', 'hill_allowance',            ARRAY[5]),
    ('3111310', 'house_rent_allowance',      ARRAY[2]),
    ('3111311', 'medical_allowance',         ARRAY[2]),
    ('3111312', 'mobile_allowance',          ARRAY[2]),
    ('3111313', 'telephone_allowance',       ARRAY[2]),
    ('3111314', 'tiffin_allowance',          ARRAY[2]),
    ('3111315', 'dress_allowance',           ARRAY[5]),
    ('3111316', 'wash_allowance',            ARRAY[2]),
    ('3111325', 'festival_bonus',            ARRAY[2]),
    ('3111327', 'overtime_allowance',        ARRAY[5]),
    ('3111328', 'rest_recreation',           ARRAY[6]),
    ('3111331', 'entertainment_allowance',   ARRAY[2]),
    ('3111335', 'noboborsho_allowance',      ARRAY[2]),
    ('3111352', 'special_benefit',           ARRAY[2]),
    ('3211107', 'vehicle_rent',              ARRAY[8]),
    ('3211113', 'utility_bill',              ARRAY[11]),
    ('3211115', 'utility_bill',              ARRAY[11]),
    ('3211117', 'utility_bill',              ARRAY[11]),
    ('3211119', 'postal_demand',             ARRAY[12]),
    ('3211120', 'utility_bill',              ARRAY[11]),
    ('3211129', 'office_rent',               ARRAY[9]),
    ('3243301', 'fuel_by_category',          ARRAY[7]),
    ('3243302', 'fuel_by_category',          ARRAY[7]),
    ('3255101', 'it_toner',                  ARRAY[10]),
    ('3256106', 'dress_allowance',           ARRAY[5]),
    ('3258101', 'vehicle_maintenance',       ARRAY[7]),
    ('3258140', 'vehicle_maintenance',       ARRAY[7]),
    ('4112202', 'it_purchase',               ARRAY[10])
) AS v(code, formula_key, source_forms)
WHERE c."code" = v.code;

-- ---------------------------------------------------------------------------
-- 3. Bind each allowance card to the formula that consumes it
-- ---------------------------------------------------------------------------
UPDATE "ref_allowance_types"
SET "formula_key" = NULL
WHERE "formula_key" IS NOT NULL
  AND "formula_key" NOT IN (SELECT "key" FROM "ref_formula_types");

ALTER TABLE "ref_allowance_types"
    ADD CONSTRAINT "ref_allowance_types_formula_key_fkey"
    FOREIGN KEY ("formula_key") REFERENCES "ref_formula_types"("key")
    ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "ref_allowance_types"
SET "formula_key" = CASE "name"
        WHEN 'overtime'       THEN 'overtime_allowance'
        WHEN 'duty'           THEN 'duty_allowance'
        WHEN 'dress'          THEN 'dress_allowance'
        WHEN 'risk'           THEN 'risk_allowance'
        WHEN 'hill'           THEN 'hill_allowance'
        WHEN 'restRecreation' THEN 'rest_recreation'
    END
WHERE "name" IN ('overtime', 'duty', 'dress', 'risk', 'hill', 'restRecreation');

-- ---------------------------------------------------------------------------
-- 4. Utility types point at the code their bill lands in
-- ---------------------------------------------------------------------------
ALTER TABLE "ref_utility_types"
    ADD COLUMN "economic_code_id" BIGINT;

ALTER TABLE "ref_utility_types"
    ADD CONSTRAINT "ref_utility_types_economic_code_id_fkey"
    FOREIGN KEY ("economic_code_id") REFERENCES "ref_economic_codes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ref_utility_types_economic_code_id_idx"
    ON "ref_utility_types"("economic_code_id");

-- গ্যাস is offered on form 11 but no budget code consumes it, so it is left unset.
UPDATE "ref_utility_types" AS u
SET "economic_code_id" = c."id"
FROM (VALUES
    ('বিদ্যুৎ',   '3211113'),
    ('পানি',      '3211115'),
    ('ইন্টারনেট', '3211117'),
    ('টেলিফোন',   '3211120')
) AS m(uname, code)
JOIN "ref_economic_codes" c ON c."code" = m.code
WHERE u."name" = m.uname;

-- ---------------------------------------------------------------------------
-- 5. Fuel categories point at the code their cost lands in
-- ---------------------------------------------------------------------------
ALTER TABLE "ref_fuel_categories"
    ADD COLUMN "economic_code_id" BIGINT;

ALTER TABLE "ref_fuel_categories"
    ADD CONSTRAINT "ref_fuel_categories_economic_code_id_fkey"
    FOREIGN KEY ("economic_code_id") REFERENCES "ref_economic_codes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ref_fuel_categories_economic_code_id_idx"
    ON "ref_fuel_categories"("economic_code_id");

UPDATE "ref_fuel_categories" AS f
SET "economic_code_id" = c."id"
FROM (VALUES
    ('oil', '3243301'),
    ('gas', '3243302')
) AS m(cat, code)
JOIN "ref_economic_codes" c ON c."code" = m.code
WHERE f."category_name" = m.cat;

-- ---------------------------------------------------------------------------
-- 6. The কর সার্কেল flag replaces the engine's name test
-- ---------------------------------------------------------------------------
ALTER TABLE "core_office_types"
    ADD COLUMN "is_tax_circle" BOOLEAN NOT NULL DEFAULT false;

-- Carry the rule forward: the office types the old name test matched are the ones
-- that raise a postal demand today.
UPDATE "core_office_types"
SET "is_tax_circle" = TRUE, "updated_at" = now()
WHERE "name" LIKE '%সার্কেল%';

-- ---------------------------------------------------------------------------
-- 7. দায়িত্ব ভাতা months become a configurable tile
-- ---------------------------------------------------------------------------
-- The engine paid this allowance for exactly six months. Make it a card beside
-- the monthly rate so the administrator owns the multiplier too.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "admin_salary_config" WHERE "key" = 'duty_allowance_months') THEN
        UPDATE "admin_salary_config"
        SET "sort_order" = "sort_order" + 1
        WHERE "sort_order" >= 3;

        INSERT INTO "admin_salary_config"
            ("key", "label_bn", "description_bn", "unit_bn", "input_type", "value_format", "value", "sort_order", "updated_at")
        VALUES
            ('duty_allowance_months', 'দায়িত্ব ভাতা', 'প্রদেয় মাসের সংখ্যা', 'মাস', 'number', 'number', 6, 3, CURRENT_TIMESTAMP);
    END IF;
END $$;
