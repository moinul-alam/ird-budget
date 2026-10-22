-- ==============================================================================
-- Drop the UNIQUE constraint on (office_type_id, level_order)
-- to allow multiple office levels with the same level order (e.g., Level 1)
-- ==============================================================================

ALTER TABLE public.admin_office_levels 
  DROP CONSTRAINT IF EXISTS uq_office_type_level;

-- Ensure permissions remain intact
GRANT ALL ON TABLE public.admin_office_levels TO anon, authenticated, service_role;
