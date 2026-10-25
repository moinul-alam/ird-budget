-- The office default password is now read from the OFFICE_DEFAULT_PASSWORD environment
-- variable (see src/lib/office/defaults.ts). A column DEFAULT cannot read an environment
-- variable — DDL is fixed when the migration is applied — so the baked-in literal is removed
-- instead of being kept in sync by hand. Every insert path already sets password_hint from
-- the application, and an office with no hint falls back to OFFICE_DEFAULT_PASSWORD for
-- display (see getFieldOffices / getAllOfficeUsersList).
--
-- The column itself stays: it is what lets a superadmin see each office's current password.
ALTER TABLE "office_users" ALTER COLUMN "password_hint" DROP DEFAULT;
