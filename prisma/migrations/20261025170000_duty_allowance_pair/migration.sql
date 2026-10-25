-- দায়িত্ব ভাতা was split across two /admin/settings cards — the monthly rate
-- (`duty_allowance`) and the months paid (`duty_allowance_months`) — and both carried
-- the label 'দায়িত্ব ভাতা', so the tab read as a duplicate card.
--
-- They are one allowance. The months become the card's second field, exactly like the
-- ডাক pair (per-notice cost × notices), so the tab shows a single card whose value is
-- "rate × months". The engine reads the months with `tileSecondary`, not a second tile.

UPDATE "admin_salary_config"
SET "description_bn" = 'মাসিক হার × প্রদেয় মাসের সংখ্যা',
    "secondary_label_bn" = 'প্রদেয় মাসের সংখ্যা',
    "secondary_unit_bn" = 'মাস',
    "secondary_value" = COALESCE(
        (SELECT "value" FROM "admin_salary_config" WHERE "key" = 'duty_allowance_months'),
        6
    ),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "key" = 'duty_allowance';

DELETE FROM "admin_salary_config" WHERE "key" = 'duty_allowance_months';

-- Close the gap the removed card leaves in the tab order (it sat at sort_order 3).
UPDATE "admin_salary_config"
SET "sort_order" = "sort_order" - 1, "updated_at" = CURRENT_TIMESTAMP
WHERE "sort_order" > 3;
