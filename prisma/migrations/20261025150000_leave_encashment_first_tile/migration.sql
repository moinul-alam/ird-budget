-- ছুটি নগদায়ন takes the first card on the বেতন-ভাতা tab. It was appended last when
-- it was introduced (the seventeenth tile); now that বেতন-ভাতা মাস has moved to the
-- budget cycle, the first slot it left behind is where it belongs.
UPDATE "admin_salary_config"
SET "sort_order" = 1, "updated_at" = CURRENT_TIMESTAMP
WHERE "key" = 'leave_encashment_months';
