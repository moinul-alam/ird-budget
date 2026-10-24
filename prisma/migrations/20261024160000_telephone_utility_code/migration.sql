-- টেলিফোন is one of the bills form 11 collects, but the code was flagged `is_manual`,
-- so the office's form 11 entry never reached the budget sheet: the line stayed empty
-- and asked for the same number a second time. বিদ্যুৎ, পানি and ইন্টারনেট on the same
-- form were already wired to the engine; this brings টেলিফোন in line with them.
--
--  3211120 টেলিফোন    form 11-এ লেখা বাৎসরিক বিল

UPDATE "ref_economic_codes"
SET "is_manual" = FALSE, "updated_at" = now()
WHERE "code" = '3211120';
