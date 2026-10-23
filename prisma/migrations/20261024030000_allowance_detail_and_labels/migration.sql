-- Form 5 (ভাতা) collected a per-allowance basic amount, an amount, a due amount
-- and an effective date, but only the amount (total_annual_amount) and the date
-- (effective_date) had columns. Add the two missing ones so the form round-trips
-- exactly what it asks for. Defaulted, so pre-existing rows stay valid.

ALTER TABLE "office_form_allowances"
    ADD COLUMN "total_basic" DECIMAL(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN "due_amount"  DECIMAL(14,2) NOT NULL DEFAULT 0;

-- Form 5 used to describe its cards from a hardcoded array in the client: a
-- Bengali label, a count label and which inputs each card shows. Move that
-- description into the reference table so the administration side owns it.

ALTER TABLE "ref_allowance_types"
    ADD COLUMN "label_bn"       TEXT,
    ADD COLUMN "count_label_bn" TEXT,
    ADD COLUMN "has_basic"      BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "has_amount"     BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "has_due"        BOOLEAN NOT NULL DEFAULT false;

UPDATE "ref_allowance_types" SET "label_bn" = 'অধিকাল ভাতা (চালক)', "count_label_bn" = 'গাড়ীচালকের সংখ্যা', "has_basic" = true,  "has_amount" = false, "has_due" = true  WHERE "name" = 'overtime';
UPDATE "ref_allowance_types" SET "label_bn" = 'দায়িত্ব ভাতা',       "count_label_bn" = 'কর্মকর্তার সংখ্যা',   "has_basic" = false, "has_amount" = false, "has_due" = false WHERE "name" = 'duty';
UPDATE "ref_allowance_types" SET "label_bn" = 'পোশাক ভাতা',         "count_label_bn" = 'কর্মচারীর সংখ্যা',    "has_basic" = false, "has_amount" = true,  "has_due" = true  WHERE "name" = 'dress';
UPDATE "ref_allowance_types" SET "label_bn" = 'ঝুঁকি ভাতা',         "count_label_bn" = 'কর্মচারীর সংখ্যা',    "has_basic" = false, "has_amount" = true,  "has_due" = true  WHERE "name" = 'risk';
UPDATE "ref_allowance_types" SET "label_bn" = 'পাহাড়ী ভাতা',        "count_label_bn" = 'কর্মচারীর সংখ্যা',    "has_basic" = false, "has_amount" = true,  "has_due" = true  WHERE "name" = 'hill';
UPDATE "ref_allowance_types" SET "label_bn" = 'শ্রান্তি ও বিনোদন ভাতা', "count_label_bn" = 'কর্মকর্তা/কর্মচারীর সংখ্যা', "has_basic" = false, "has_amount" = true, "has_due" = true WHERE "name" = 'restRecreation';
