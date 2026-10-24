-- Lubricant and maintenance are facts about a *vehicle type*, not about a fuel. A jeep that
-- runs on both oil and gas gets one lubricant allowance and one maintenance allowance, not
-- one per category — storing them on the per-(type × category) row said the opposite and
-- invited two divergent copies of the same number.
--
-- Data-preserving: one row per vehicle type is lifted out of the existing per-category rows
-- before the columns go, so a configured database keeps the allowance it had.

-- CreateTable
CREATE TABLE "admin_vehicle_allowance_config" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_type_id" BIGINT NOT NULL,
    "annual_lube_allowance" DECIMAL(14,2) DEFAULT 0,
    "annual_maintenance_allowance" DECIMAL(14,2) DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_vehicle_allowance_config_pkey" PRIMARY KEY ("id")
);

-- Lift the allowances: the lowest-id row per vehicle type wins, so a database that already
-- held two copies collapses to one instead of failing.
INSERT INTO "admin_vehicle_allowance_config" (
    "vehicle_type_id", "annual_lube_allowance", "annual_maintenance_allowance", "updated_at"
)
SELECT DISTINCT ON ("vehicle_type_id")
    "vehicle_type_id", "annual_lube_allowance", "annual_maintenance_allowance", CURRENT_TIMESTAMP
FROM "admin_vehicle_config"
ORDER BY "vehicle_type_id", "id";

-- DropColumn
ALTER TABLE "admin_vehicle_config" DROP COLUMN "annual_lube_allowance";
ALTER TABLE "admin_vehicle_config" DROP COLUMN "annual_maintenance_allowance";

-- CreateIndex
CREATE UNIQUE INDEX "admin_vehicle_allowance_config_vehicle_type_id_key" ON "admin_vehicle_allowance_config"("vehicle_type_id");

-- AddForeignKey
ALTER TABLE "admin_vehicle_allowance_config" ADD CONSTRAINT "admin_vehicle_allowance_config_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "ref_vehicle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
