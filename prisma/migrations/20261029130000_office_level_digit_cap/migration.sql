-- হাজার amount entry: how many digits a level's offices may type in one amount field.
-- Defaulted so every existing level keeps the same 3-digit cap the app falls back to.
ALTER TABLE "core_office_levels" ADD COLUMN "digit_cap" INTEGER NOT NULL DEFAULT 3;
