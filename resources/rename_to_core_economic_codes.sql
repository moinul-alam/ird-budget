-- ==============================================================================
-- Rename core_expense_codes to core_economic_codes
-- Add parent_code and parent_title columns for hierarchical category display
-- ==============================================================================

-- 1. Rename table
ALTER TABLE IF EXISTS public.core_expense_codes RENAME TO core_economic_codes;

-- 2. Add category fields if missing
ALTER TABLE public.core_economic_codes 
  ADD COLUMN IF NOT EXISTS parent_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parent_title TEXT;

-- 3. Update category information based on the 4-digit prefix
UPDATE public.core_economic_codes
SET 
  parent_code = SUBSTRING(code FROM 1 FOR 4),
  parent_title = CASE 
    WHEN SUBSTRING(code FROM 1 FOR 4) = '3111' THEN 'নগদ মজুরি ও বেতন'
    WHEN SUBSTRING(code FROM 1 FOR 4) = '3211' THEN 'প্রশাসনিক ব্যয়'
    WHEN SUBSTRING(code FROM 1 FOR 4) = '3243' THEN 'পেট্রোল, অয়েল ও লুব্রিকেন্ট'
    WHEN SUBSTRING(code FROM 1 FOR 4) = '3244' THEN 'ভ্রমণ ও বদলি'
    WHEN SUBSTRING(code FROM 1 FOR 4) = '3255' THEN 'মুদ্রণ ও মনিহারি'
    WHEN SUBSTRING(code FROM 1 FOR 4) = '3256' THEN 'সাধারণ সরবরাহ ও কাঁচামাল'
    WHEN SUBSTRING(code FROM 1 FOR 4) = '3258' THEN 'মেরামত ও সংরক্ষণ'
    WHEN SUBSTRING(code FROM 1 FOR 4) = '3821' THEN 'আবর্তক স্থানান্তর'
    WHEN SUBSTRING(code FROM 1 FOR 4) = '4112' THEN 'যন্ত্রপাতি ও সরঞ্জামাদি'
    ELSE 'অন্যান্য ব্যয়'
  END
WHERE parent_code IS NULL;

-- 4. Enable RLS and grant permissions
ALTER TABLE public.core_economic_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "core_economic_codes_all" ON public.core_economic_codes;
CREATE POLICY "core_economic_codes_all" ON public.core_economic_codes FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.core_economic_codes TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
