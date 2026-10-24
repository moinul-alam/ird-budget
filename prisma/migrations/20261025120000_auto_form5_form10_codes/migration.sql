-- Both codes are produced by the engine, so they must not render as manual inputs:
--   3256106 পোশাক — form 5-এর পোশাক ভাতা কার্ড (পরিমাণ + বকেয়া)
--   4112202 কম্পিউটার ও আনুষঙ্গিক — form 10-এর চাহিদাকৃত সংখ্যা × প্রমিত ক্রয়মূল্য
UPDATE "ref_economic_codes"
SET "is_manual" = FALSE, "updated_at" = now()
WHERE "code" IN ('3256106', '4112202');
