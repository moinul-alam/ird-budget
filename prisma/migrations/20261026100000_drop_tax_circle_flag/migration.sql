-- The কর সার্কেল checkbox on the office-type modal stored a flag nothing should own.
-- The ডাক line (3211119) is the one computed code that only a কর সার্কেল raises, and the
-- only office that fills ফর্ম ১২ is a কর সার্কেল — the form tells every other office not
-- to. So the entered return info is itself the signal: a code with no form-12 data stays
-- 0 and the office types the allotment by hand (`allow_manual_override`, set on 3211119).
-- The flag was therefore redundant admin data, not a rule.
ALTER TABLE "core_office_types" DROP COLUMN "is_tax_circle";
