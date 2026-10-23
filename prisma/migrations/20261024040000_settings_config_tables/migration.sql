-- /admin/settings described several of its tiles from hardcoded arrays in the
-- client: eight "কনফিগারেশন প্রয়োজন" tiles with a disabled button, three slab
-- editors that were never saved anywhere, a hardcoded four-card equipment grid
-- with a fake price, and two tabs whose add/edit/delete buttons were disabled.
-- The salary figures also lived inside a JSON string on admin_rates rather than
-- in columns. Give every one of those a real home so the administration side is
-- the single source of truth and nothing is hardcoded in the UI.

-- ---------------------------------------------------------------------------
-- 1. Salary and allowance configuration
-- ---------------------------------------------------------------------------
-- One row per tile of the "বেতন-ভাতা" tab. `input_type` decides which editor
-- the tile opens ('number' = a single value, 'grade' = a value plus the grades
-- it applies to, 'slab' = a grade-banded table held in admin_salary_slabs).

CREATE TABLE "admin_salary_config" (
    "id" BIGSERIAL NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "label_bn" TEXT NOT NULL,
    "description_bn" TEXT,
    "unit_bn" VARCHAR(30) NOT NULL DEFAULT '',
    "input_type" VARCHAR(20) NOT NULL DEFAULT 'number',
    "value_format" VARCHAR(20) NOT NULL DEFAULT 'number',
    "value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "from_grade" INTEGER,
    "to_grade" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_salary_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_salary_slabs" (
    "id" BIGSERIAL NOT NULL,
    "config_key" VARCHAR(50) NOT NULL,
    "from_grade" INTEGER NOT NULL,
    "to_grade" INTEGER NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_salary_slabs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_salary_config_key_key" ON "admin_salary_config"("key");

ALTER TABLE "admin_salary_slabs"
    ADD CONSTRAINT "admin_salary_slabs_config_key_fkey"
    FOREIGN KEY ("config_key") REFERENCES "admin_salary_config"("key")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- The tiles, in the order the tab renders them.
INSERT INTO "admin_salary_config"
    ("key", "label_bn", "description_bn", "unit_bn", "input_type", "value_format", "value", "from_grade", "to_grade", "sort_order", "updated_at")
VALUES
    ('salary_months',              'বেতন-ভাতা মাস',        'বাজেট গুণক মাস সংখ্যা',            'মাস',       'number', 'number', 12,   NULL, NULL, 1,  CURRENT_TIMESTAMP),
    ('duty_allowance',             'দায়িত্ব ভাতা',         'মাসিক হার',                        'টাকা/মাস',  'number', 'amount', 1500, NULL, NULL, 2,  CURRENT_TIMESTAMP),
    ('transport_allowance',        'যাতায়াত ভাতা',         'গ্রেড অনুযায়ী মাসিক হার',          'টাকা/মাস',  'grade',  'amount', 0,    1,    20,   3,  CURRENT_TIMESTAMP),
    ('education_allowance',        'শিক্ষা ভাতা',          'সন্তান প্রতি মাসিক হার',            'টাকা/মাস',  'number', 'amount', 500,  NULL, NULL, 4,  CURRENT_TIMESTAMP),
    ('house_rent',                 'বাড়ি ভাড়া ভাতা',      'গ্রেড অনুযায়ী মূল বেতনের শতকরা হার', '% মূলবেতন', 'slab',   'percent', 0,   NULL, NULL, 5,  CURRENT_TIMESTAMP),
    ('medical_allowance',          'চিকিৎসা ভাতা',         'কর্মকর্তা/কর্মচারী মাসিক হার',       'টাকা/মাস',  'number', 'amount', 1500, NULL, NULL, 6,  CURRENT_TIMESTAMP),
    ('mobile_allowance',           'মোবাইল/সেলফোন ভাতা',   'গ্রেড অনুযায়ী মাসিক ভাতা',          'স্ল্যাব',    'slab',   'amount', 0,    NULL, NULL, 7,  CURRENT_TIMESTAMP),
    ('telephone_allowance',        'আবাসিক টেলিফোন নগদায়ন', 'গ্রেড অনুযায়ী মাসিক হার',         'টাকা/মাস',  'grade',  'amount', 0,    1,    20,   8,  CURRENT_TIMESTAMP),
    ('tiffin_allowance',           'টিফিন ভাতা',           'গ্রেড অনুযায়ী মাসিক হার',          'টাকা/মাস',  'grade',  'amount', 0,    1,    20,   9,  CURRENT_TIMESTAMP),
    ('wash_allowance',             'ধোলাই ভাতা',           'গ্রেড অনুযায়ী মাসিক হার',          'টাকা/মাস',  'grade',  'amount', 0,    1,    20,   10, CURRENT_TIMESTAMP),
    ('entertainment_allowance',    'আপ্যায়ন ভাতা',         'গ্রেড অনুযায়ী মাসিক হার',          'টাকা/মাস',  'grade',  'amount', 0,    1,    20,   11, CURRENT_TIMESTAMP),
    ('special_benefit',            'বিশেষ সুবিধা',         'গ্রেড অনুযায়ী মূল বেতনের শতকরা হার', '% মূলবেতন', 'slab',   'percent', 0,   NULL, NULL, 12, CURRENT_TIMESTAMP),
    ('noboborsho_percent',         'বাংলা নববর্ষ ভাতা',    'মূল বেতনের শতকরা হার',             'বেসিকের',   'number', 'percent', 20, NULL, NULL, 13, CURRENT_TIMESTAMP),
    ('festival_bonus_multiplier',  'উৎসব ভাতা',            'বাৎসরিক বোনাস সংখ্যা',             'টি বেসিক',  'number', 'number', 2,   NULL, NULL, 14, CURRENT_TIMESTAMP),
    ('office_rent_vat_percent',    'অফিস ভাড়ার ভ্যাট হার', 'ভাড়া বাবদ ভ্যাটের শতকরা হার',        'ভাড়ার ওপর', 'number', 'percent', 15, NULL, NULL, 15, CURRENT_TIMESTAMP);

-- The three grade-banded tables the tab used to hold in client state. These
-- carry over the defaults that state used to start from.
INSERT INTO "admin_salary_slabs" ("config_key", "from_grade", "to_grade", "value", "sort_order")
VALUES
    ('house_rent',       1,  20, 40,   1),
    ('special_benefit',  1,  20, 5,    1),
    ('mobile_allowance', 1,  9,  1500, 1),
    ('mobile_allowance', 10, 20, 1000, 2);

-- Carry over any value an administrator already saved into the old JSON blob.
UPDATE "admin_salary_config" SET "value" = COALESCE((SELECT (r."name"::jsonb ->> 'salary_months')::numeric             FROM "admin_rates" r WHERE r."key" = 'salary_config'), "value") WHERE "key" = 'salary_months';
UPDATE "admin_salary_config" SET "value" = COALESCE((SELECT (r."name"::jsonb ->> 'duty_allowance')::numeric            FROM "admin_rates" r WHERE r."key" = 'salary_config'), "value") WHERE "key" = 'duty_allowance';
UPDATE "admin_salary_config" SET "value" = COALESCE((SELECT (r."name"::jsonb ->> 'education_allowance')::numeric       FROM "admin_rates" r WHERE r."key" = 'salary_config'), "value") WHERE "key" = 'education_allowance';
UPDATE "admin_salary_config" SET "value" = COALESCE((SELECT (r."name"::jsonb ->> 'medical_allowance')::numeric         FROM "admin_rates" r WHERE r."key" = 'salary_config'), "value") WHERE "key" = 'medical_allowance';
UPDATE "admin_salary_config" SET "value" = COALESCE((SELECT (r."name"::jsonb ->> 'noboborsho_percent')::numeric        FROM "admin_rates" r WHERE r."key" = 'salary_config'), "value") WHERE "key" = 'noboborsho_percent';
UPDATE "admin_salary_config" SET "value" = COALESCE((SELECT (r."name"::jsonb ->> 'festival_bonus_multiplier')::numeric FROM "admin_rates" r WHERE r."key" = 'salary_config'), "value") WHERE "key" = 'festival_bonus_multiplier';
UPDATE "admin_salary_config" SET "value" = COALESCE((SELECT (r."name"::jsonb ->> 'office_rent_vat_percent')::numeric    FROM "admin_rates" r WHERE r."key" = 'salary_config'), "value") WHERE "key" = 'office_rent_vat_percent';

-- admin_salary_config now owns these figures.
DELETE FROM "admin_rates" WHERE "key" = 'salary_config';

-- ---------------------------------------------------------------------------
-- 2. Default unit prices for fuel and IT equipment
-- ---------------------------------------------------------------------------
-- The "জ্বালানির দর" tab had a price field that was discarded on save and always
-- rendered 0, and the equipment tab rendered a hardcoded 0. The prices the
-- budget engine already assumed are carried over as the defaults.

ALTER TABLE "ref_fuel_types"
    ADD COLUMN "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0;

UPDATE "ref_fuel_types" SET "unit_price" = 130 WHERE "name" = 'অকটেন';
UPDATE "ref_fuel_types" SET "unit_price" = 110 WHERE "name" = 'ডিজেল';
UPDATE "ref_fuel_types" SET "unit_price" = 45  WHERE "name" = 'সিএনজি';

ALTER TABLE "ref_it_equipment_types"
    ADD COLUMN "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 3. Global rows for the vehicle fuel / rent configuration
-- ---------------------------------------------------------------------------
-- Both tabs hardcoded office_type_id = 1. The configuration is a default for
-- every office type, so the column becomes nullable and a NULL means "applies
-- to all"; the uniqueness moves onto the vehicle/fuel pair alone.

ALTER TABLE "admin_vehicle_config" ALTER COLUMN "office_type_id" DROP NOT NULL;
DROP INDEX "admin_vehicle_config_office_type_id_vehicle_type_id_fuel_ty_key";
CREATE UNIQUE INDEX "admin_vehicle_config_vehicle_type_id_fuel_type_id_key" ON "admin_vehicle_config"("vehicle_type_id", "fuel_type_id");

ALTER TABLE "admin_vehicle_rent_config" ALTER COLUMN "office_type_id" DROP NOT NULL;
DROP INDEX "admin_vehicle_rent_config_office_type_id_vehicle_type_id_key";
CREATE UNIQUE INDEX "admin_vehicle_rent_config_vehicle_type_id_key" ON "admin_vehicle_rent_config"("vehicle_type_id");
