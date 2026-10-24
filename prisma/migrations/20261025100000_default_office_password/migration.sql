-- The office login default password is budget26 (see src/lib/office/defaults.ts).
-- The column default still said 12345, so any row created without an explicit hint
-- surfaced the wrong password on /admin/offices-users.
ALTER TABLE "office_users" ALTER COLUMN "password_hint" SET DEFAULT 'budget26';
