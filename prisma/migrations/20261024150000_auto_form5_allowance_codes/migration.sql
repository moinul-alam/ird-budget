-- These form 5 allowances were flagged `is_manual`, so the figure the office enters
-- on the card never reached the budget sheet: the line stayed empty and the office
-- was asked to type the same number a second time. Each one is the office's own
-- figure from form 5 — a monthly rate, a lump sum or a total basic — so the engine
-- now reads the card and the manual box disappears from the sheet.
--
--  3111308 ঝুঁকি ভাতা      form 5 মাসিক হার × বেতন-ভাতা মাস + বকেয়া
--  3111309 পাহাড়ী ভাতা    form 5 মাসিক হার × বেতন-ভাতা মাস + বকেয়া
--  3111315 পোশাক ভাতা     form 5-এ লেখা পরিমাণ + বকেয়া
--  3111327 অধিকাল ভাতা     form 5 মাসিক মোট মূল বেতন × বেতন-ভাতা মাস + বকেয়া

UPDATE "ref_economic_codes"
SET "is_manual" = FALSE, "updated_at" = now()
WHERE "code" IN ('3111308', '3111309', '3111315', '3111327');
