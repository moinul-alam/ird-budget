-- Add password_hint column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_users' AND column_name = 'password_hint'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN password_hint TEXT;
    END IF;
END $$;

-- Insert or update superadmin user
INSERT INTO admin_users (username, password_hash, password_hint, role, is_active, created_at, updated_at)
VALUES ('superadmin', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '123', 'superadmin', true, NOW(), NOW())
ON CONFLICT (username)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  password_hint = EXCLUDED.password_hint,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
