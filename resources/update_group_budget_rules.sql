-- ==============================================================================
-- Redesign admin_group_budget_rules for Office Type & Office Level Group Budgeting
-- ==============================================================================

DROP TABLE IF EXISTS public.admin_group_budget_rules CASCADE;

CREATE TABLE public.admin_group_budget_rules (
  id BIGSERIAL PRIMARY KEY,
  department_id BIGINT REFERENCES public.core_departments(id) ON DELETE CASCADE,
  office_type_id BIGINT NOT NULL REFERENCES public.core_office_types(id) ON DELETE CASCADE,
  office_level_id BIGINT REFERENCES public.admin_office_levels(id) ON DELETE CASCADE,
  is_group_budget BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_group_rule UNIQUE (office_type_id, office_level_id)
);

-- Enable RLS and grant full permissions to application roles
ALTER TABLE public.admin_group_budget_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_group_budget_rules_all" ON public.admin_group_budget_rules;
CREATE POLICY "admin_group_budget_rules_all" ON public.admin_group_budget_rules FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.admin_group_budget_rules TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
