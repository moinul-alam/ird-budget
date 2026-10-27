-- Office hierarchy integrity, enforced by the database.
--
-- Every office write already funnels through `assertOfficePlacement`
-- (src/lib/office/placement.ts), but the schema's own invariants used to live only in
-- comments, and four independent writers (admin head office, admin field office, office
-- self-service, public registration) each enforced a different subset of them. The
-- constraints, trigger and unique indexes below make the hierarchy un-corruptible even when a
-- write bypasses that module.
--
-- Prisma does not model CHECK constraints, triggers or partial unique indexes, and its drift
-- diff ignores them, so they live in a raw migration and stay invisible to `prisma migrate dev`.
--
--   মন্ত্রণালয় → দপ্তর/সংস্থা → অফিসের ধরণ → স্তর → অফিস (হেড → মাঠ পর্যায়)

-- 1. A level belongs to exactly one owner: a ministry, a department, or an office type.
ALTER TABLE "core_office_levels"
  ADD CONSTRAINT "core_office_levels_single_owner_check" CHECK (
    (CASE WHEN "office_type_id" IS NOT NULL THEN 1 ELSE 0 END
   + CASE WHEN "ministry_id"    IS NOT NULL THEN 1 ELSE 0 END
   + CASE WHEN "department_id"  IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

-- 2. Ownership shape of an office: a ministry office is neither a department nor a typed office,
--    a typed office always carries its department, and no row is its own parent.
ALTER TABLE "core_offices"
  ADD CONSTRAINT "core_offices_ownership_shape_check" CHECK (
    NOT ("ministry_id" IS NOT NULL AND ("department_id" IS NOT NULL OR "office_type_id" IS NOT NULL))
  );

ALTER TABLE "core_offices"
  ADD CONSTRAINT "core_offices_type_department_check" CHECK (
    "office_type_id" IS NULL OR "department_id" IS NOT NULL
  );

ALTER TABLE "core_offices"
  ADD CONSTRAINT "core_offices_no_self_parent_check" CHECK (
    "parent_office_id" IS NULL OR "parent_office_id" <> "id"
  );

-- 3. The cross-row rules a CHECK cannot express: an office's department follows its office type
--    (so the two can never drift), its level belongs to that same type, and its parent is a head
--    office of the same type and department sitting on a higher tier.
CREATE OR REPLACE FUNCTION "core_offices_placement_check"() RETURNS trigger AS $$
DECLARE
  type_department   BIGINT;
  level_owner_type  BIGINT;
  parent_parent     BIGINT;
  parent_department BIGINT;
  parent_type       BIGINT;
  parent_order      INT;
  child_order       INT;
BEGIN
  IF NEW."office_type_id" IS NOT NULL THEN
    SELECT "department_id" INTO type_department
      FROM "core_office_types" WHERE "id" = NEW."office_type_id";
    IF type_department IS NULL THEN
      RAISE EXCEPTION 'অফিসের ধরণটি সঠিক নয়';
    END IF;
    IF NEW."department_id" IS DISTINCT FROM type_department THEN
      RAISE EXCEPTION 'অফিসের দপ্তর/সংস্থা অবশ্যই তার অফিসের ধরণের সাথে মিলতে হবে';
    END IF;

    IF NEW."office_level_id" IS NOT NULL THEN
      SELECT "office_type_id" INTO level_owner_type
        FROM "core_office_levels" WHERE "id" = NEW."office_level_id";
      IF level_owner_type IS DISTINCT FROM NEW."office_type_id" THEN
        RAISE EXCEPTION 'নির্বাচিত স্তরটি এই অফিসের ধরণের অন্তর্ভুক্ত নয়';
      END IF;
    END IF;
  END IF;

  IF NEW."parent_office_id" IS NOT NULL THEN
    SELECT p."parent_office_id", p."department_id", p."office_type_id"
      INTO parent_parent, parent_department, parent_type
      FROM "core_offices" p WHERE p."id" = NEW."parent_office_id";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'নির্বাচিত হেড অফিসটি পাওয়া যায়নি';
    END IF;
    IF parent_parent IS NOT NULL THEN
      RAISE EXCEPTION 'শুধুমাত্র হেড অফিসকে অভিভাবক হিসেবে নির্বাচন করা যায়';
    END IF;
    IF parent_type IS DISTINCT FROM NEW."office_type_id" THEN
      RAISE EXCEPTION 'হেড অফিসটি অবশ্যই একই অফিসের ধরণের হতে হবে';
    END IF;
    IF parent_department IS DISTINCT FROM NEW."department_id" THEN
      RAISE EXCEPTION 'হেড অফিসটি অবশ্যই একই দপ্তর/সংস্থার হতে হবে';
    END IF;

    SELECT "level_order" INTO child_order
      FROM "core_office_levels" WHERE "id" = NEW."office_level_id";
    SELECT "level_order" INTO parent_order
      FROM "core_office_levels"
      WHERE "id" = (SELECT "office_level_id" FROM "core_offices" WHERE "id" = NEW."parent_office_id");
    IF child_order IS NOT NULL AND parent_order IS NOT NULL AND child_order < parent_order THEN
      RAISE EXCEPTION 'নির্বাচিত স্তরটি হেড অফিসের স্তরের অধীনস্থ হতে হবে';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "core_offices_placement_trigger"
  BEFORE INSERT OR UPDATE ON "core_offices"
  FOR EACH ROW EXECUTE FUNCTION "core_offices_placement_check"();

-- 4. Exactly one login/root office per ministry, one per department, and one head office per
--    office type — the shape every screen already assumes.
CREATE UNIQUE INDEX "core_offices_ministry_root_key"
  ON "core_offices" ("ministry_id") WHERE "ministry_id" IS NOT NULL;

CREATE UNIQUE INDEX "core_offices_department_root_key"
  ON "core_offices" ("department_id") WHERE "office_type_id" IS NULL AND "department_id" IS NOT NULL;

CREATE UNIQUE INDEX "core_offices_head_office_key"
  ON "core_offices" ("office_type_id") WHERE "parent_office_id" IS NULL AND "office_type_id" IS NOT NULL;
