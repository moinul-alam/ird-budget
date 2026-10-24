-- ছুটি নগদায়ন (3111110 কর্মকর্তা / 3111209 কর্মচারী) was computed as the office's monthly
-- basic with no multiplier, so the figure the office typed never matched the encashment it
-- represented. How many months of basic are encashed is a policy figure the administrator
-- owns, so it joins the "বেতন-ভাতা" tab as a card (seventeenth tile) defaulting to 18.
--
-- Nothing is compiled into the engine: a database without this row reads the multiplier as
-- 0, so the line stays 0 until the administrator sets it.

INSERT INTO "admin_salary_config"
    ("key", "label_bn", "description_bn", "unit_bn", "input_type", "value_format", "value", "from_grade", "to_grade", "sort_order", "updated_at")
VALUES
    ('leave_encashment_months', 'ছুটি নগদায়ন', 'মাসের সংখ্যা', 'মাস', 'number', 'number', 18, NULL, NULL, 17, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
