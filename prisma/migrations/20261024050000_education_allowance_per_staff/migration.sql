-- শিক্ষা ভাতা was described as a per-child rate, but no office form collects a
-- child count (it would make the form too heavy for the user). The rate is a flat
-- monthly amount per staff member, multiplied by the office headcount in the
-- budget engine. Correct the tile's description to match what is actually done.

UPDATE "admin_salary_config"
SET "description_bn" = 'জনপ্রতি মাসিক হার'
WHERE "key" = 'education_allowance';
