-- ref_fuel_types gains the fuel category so the two fuel economic codes can be split
-- without guessing from the fuel's name: 3243301 পেট্রোল, অয়েল ও লুব্রিকেন্ট (oil) and
-- 3243302 গ্যাস ও জ্বালানী (gas). The engine used to match substrings of the fuel name
-- ("gas" / "সিএনজি"), which sent a fuel whose name it did not recognise to the oil code.
--
-- Existing rows are backfilled by name; anything that is not gas stays 'oil', the column
-- default, so a database that predates this migration keeps charging petrol and diesel
-- exactly where it did before.

ALTER TABLE "ref_fuel_types"
    ADD COLUMN "category" VARCHAR(20) NOT NULL DEFAULT 'oil';

UPDATE "ref_fuel_types"
SET "category" = 'gas'
WHERE lower("name") LIKE '%cng%'
   OR lower("name") LIKE '%gas%'
   OR "name" LIKE '%গ্যাস%'
   OR "name" LIKE '%সিএনজি%';
