-- The vehicle-fuel config now names the fuel *category* (তেল / গ্যাস) instead of one fuel:
-- every oil lands on 3243301 and every gas on 3243302, so the administrator no longer has to
-- pick a specific fuel just to reach the right economic code. The price does not leave the
-- system — the office declares the exact fuel it buys on form 7 and that fuel prices the litres.
--
-- Data-preserving: each office row is first stamped with the fuel its config named, each
-- config's fuel is then lifted to that fuel's category, and only after that does the fuel
-- column go. A database with rows in flight keeps the price and the code it had.

-- AlterTable: the office row now carries the fuel it declares.
ALTER TABLE "office_form_vehicles_govt" ADD COLUMN "fuel_type_id" BIGINT;

UPDATE "office_form_vehicles_govt" v
SET "fuel_type_id" = c."fuel_type_id"
FROM "admin_vehicle_config" c
WHERE v."vehicle_config_id" = c."id";

ALTER TABLE "office_form_vehicles_govt" ALTER COLUMN "fuel_type_id" SET NOT NULL;

-- AlterTable: the config now carries the category.
ALTER TABLE "admin_vehicle_config" ADD COLUMN "fuel_category_id" BIGINT;

UPDATE "admin_vehicle_config" c
SET "fuel_category_id" = f."category_id"
FROM "ref_fuel_types" f
WHERE c."fuel_type_id" = f."id";

ALTER TABLE "admin_vehicle_config" ALTER COLUMN "fuel_category_id" SET NOT NULL;

-- DropForeignKey / DropIndex / DropColumn
ALTER TABLE "admin_vehicle_config" DROP CONSTRAINT "admin_vehicle_config_fuel_type_id_fkey";
DROP INDEX "admin_vehicle_config_vehicle_type_id_fuel_type_id_key";
ALTER TABLE "admin_vehicle_config" DROP COLUMN "fuel_type_id";

-- CreateIndex
CREATE UNIQUE INDEX "admin_vehicle_config_vehicle_type_id_fuel_category_id_key" ON "admin_vehicle_config"("vehicle_type_id", "fuel_category_id");
CREATE INDEX "admin_vehicle_config_fuel_category_id_idx" ON "admin_vehicle_config"("fuel_category_id");

-- AddForeignKey
ALTER TABLE "admin_vehicle_config" ADD CONSTRAINT "admin_vehicle_config_fuel_category_id_fkey" FOREIGN KEY ("fuel_category_id") REFERENCES "ref_fuel_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The declared fuel joins the office row's uniqueness, so a vehicle may be budgeted on two
-- fuels of the same category (ডিজেল and অকটেন are both oil) without one overwriting the other.
DROP INDEX "office_form_vehicles_govt_submission_id_vehicle_config_id_key";
CREATE UNIQUE INDEX "office_form_vehicles_govt_submission_config_fuel_key" ON "office_form_vehicles_govt"("submission_id", "vehicle_config_id", "fuel_type_id");
CREATE INDEX "office_form_vehicles_govt_fuel_type_id_idx" ON "office_form_vehicles_govt"("fuel_type_id");

-- AddForeignKey
ALTER TABLE "office_form_vehicles_govt" ADD CONSTRAINT "office_form_vehicles_govt_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "ref_fuel_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
