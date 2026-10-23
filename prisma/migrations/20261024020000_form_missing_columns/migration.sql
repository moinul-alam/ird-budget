-- Forms 7, 9, 10 and 12 collected these values in the UI but the tables had no
-- column for them, so the data was silently discarded on save. Add the columns
-- the forms already render. They are nullable or defaulted so that rows written
-- before this migration stay valid.

ALTER TABLE "office_form_vehicles_govt"
    ADD COLUMN "additional_expense" DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE "office_form_house_rent"
    ADD COLUMN "contract_start_date" DATE,
    ADD COLUMN "contract_end_date" DATE;

ALTER TABLE "office_form_it_equipment"
    ADD COLUMN "damaged_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "office_form_return_info"
    ADD COLUMN "tin_count" INTEGER NOT NULL DEFAULT 0;
