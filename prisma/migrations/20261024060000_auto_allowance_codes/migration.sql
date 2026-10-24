-- These allowances were flagged `is_manual`, so the rate an administrator sets on
-- /admin/settings tab 1 never reached the budget: the office had to retype every
-- figure by hand. They are all derivable from an administrator rate plus data the
-- office already enters (form 2 headcount per grade, form 5 duty count), so the
-- engine now computes them and the manual box disappears from the budget sheet.
--
--  3111301 দায়িত্ব ভাতা            form 5 officer count × duty_allowance × 6 months
--  3111302 যাতায়াত ভাতা            transport_allowance (per grade) × count × 12
--  3111312 মোবাইল/সেলফোন ভাতা      mobile_allowance (per grade slab) × count × 12
--  3111313 আবাসিক টেলিফোন নগদায়ন  telephone_allowance (per grade) × count × 12
--  3111314 টিফিন ভাতা              tiffin_allowance (per grade) × count × 12
--  3111316 ধোলাই ভাতা              wash_allowance (per grade) × count × 12
--  3111331 আপ্যায়ন ভাতা           entertainment_allowance (per grade) × count × 12
--  3111335 বাংলা নববর্ষ ভাতা       basic × noboborsho_percent (one-off)
--  3111352 বিশেষ সুবিধা            special_benefit (slab %) of basic × 12

UPDATE "ref_economic_codes"
SET "is_manual" = FALSE, "updated_at" = now()
WHERE "code" IN (
  '3111301', '3111302', '3111312', '3111313', '3111314',
  '3111316', '3111331', '3111335', '3111352'
);
