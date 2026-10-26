-- Levels move from a per-owner scale to one global tier scale:
--   ministry = tier 1, department = tier 2, office-type levels = tier 3, 4, 5 …
--
-- Previously every owner's levels started at 1, so tier 1 meant both "the ministry" and "the
-- first field-office level". Only level_order is rewritten here; level ids are untouched, and
-- economic-code grants are keyed by level id, so no grant is affected.
--
-- There is no unique constraint on (owner, level_order), so a single shifting UPDATE is safe
-- (it cannot collide with a still-unshifted row mid-statement).

-- Office-type (field-office) levels shift up two tiers: 1→3, 2→4, 3→5 …
UPDATE "core_office_levels"
SET "level_order" = "level_order" + 2
WHERE "office_type_id" IS NOT NULL;

-- Department levels sit at tier 2 (were 1).
UPDATE "core_office_levels"
SET "level_order" = 2
WHERE "department_id" IS NOT NULL;

-- Ministry levels are tier 1; normalise any stray value.
UPDATE "core_office_levels"
SET "level_order" = 1
WHERE "ministry_id" IS NOT NULL;
