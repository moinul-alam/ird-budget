-- ============================================================
-- SEED: Office Types (13 groups)
-- ============================================================

-- First insert departments
INSERT INTO departments (name) VALUES
  ('কর বিভাগ'),
  ('কাস্টমস ও ভ্যাট বিভাগ');

-- Insert office types
-- Tax related (department_id = 1)
INSERT INTO office_types (name, department_id, is_group_budget) VALUES
  ('Tax Headquarter', 1, FALSE),
  ('Taxes Range', 1, FALSE),
  ('Taxes Appellate Range', 1, FALSE),
  ('Taxes Departmental Representative', 1, FALSE),
  ('Taxes Survey Range', 1, FALSE),
  ('Taxes Circle', 1, TRUE),
  ('Taxes Survey Circle', 1, TRUE),
-- Customs & VAT related (department_id = 2)
  ('Customs Headquarter', 2, FALSE),
  ('VAT Divisions', 2, FALSE),
  ('VAT Circles', 2, TRUE),
  ('Customs Intelligence Regional Offices', 2, FALSE),
  ('Customs Intelligence Circles', 2, TRUE),
  ('LC Stations', 2, FALSE);

-- ============================================================
-- SEED: Expense Codes (139 codes from Excel)
-- ============================================================

INSERT INTO expense_codes (code, name, formula_key, is_manual, sort_order) VALUES
  ('3111101', 'মূল বেতন (অফিসার)', NULL, TRUE, 1),
  ('3111110', 'ছুটি নগদায়ন বেতন (অফিসার)', NULL, TRUE, 2),
  ('3111201', 'মূল বেতন (কর্মচারী)', NULL, TRUE, 3),
  ('3111209', 'ছুটি নগদায়ন বেতন (কর্মচারী)', NULL, TRUE, 4),
  ('3111301', 'দায়িত্ব ভাতা', NULL, TRUE, 5),
  ('3111302', 'যাতায়াত ভাতা', NULL, TRUE, 6),
  ('3111303', 'দৈনিক খোরাকি ভাতা', NULL, TRUE, 7),
  ('3111306', 'শিক্ষা ভাতা', NULL, TRUE, 8),
  ('3111308', 'ঝুঁকি ভাতা', NULL, TRUE, 9),
  ('3111309', 'পাহাড়ী ভাতা', NULL, TRUE, 10),
  ('3111310', 'বাড়ি ভাড়া ভাতা', NULL, TRUE, 11),
  ('3111311', 'চিকিৎসা ভাতা', NULL, TRUE, 12),
  ('3111312', 'মোবাইল/সেলফোন ভাতা', NULL, TRUE, 13),
  ('3111313', 'আবাসিক টেলিফোন নগদায়ন ভাতা', NULL, TRUE, 14),
  ('3111314', 'টিফিন ভাতা', NULL, TRUE, 15),
  ('3111315', 'পোশাক ভাতা', NULL, TRUE, 16),
  ('3111316', 'ধোলাই ভাতা', NULL, TRUE, 17),
  ('3111325', 'উৎসব ভাতা', NULL, TRUE, 18),
  ('3111327', 'অধিকাল ভাতা', NULL, TRUE, 19),
  ('3111328', 'শ্রান্তি ও বিনোদন ভাতা', NULL, TRUE, 20),
  ('3111329', 'প্রশিক্ষণ ভাতা', NULL, TRUE, 21),
  ('3111331', 'আপ্যায়ন ভাতা', NULL, TRUE, 22),
  ('3111332', 'সম্যানী ভাতা', NULL, TRUE, 23),
  ('3111334', 'পদক ভাতা', NULL, TRUE, 24),
  ('3111335', 'বাংলা নববর্ষ ভাতা', NULL, TRUE, 25),
  ('3111341', 'বিচারিক ভাতা', NULL, TRUE, 26),
  ('3111344', 'খোরপোষ ভাতা (সাসপেনসন)', NULL, TRUE, 27),
  ('3111352', 'বিশেষ সুবিধা', NULL, TRUE, 28),
  ('3211101', 'পুরস্কার', NULL, TRUE, 29),
  ('3211102', 'পরিষ্কার পরিচ্ছন্নতা সামগ্রী', NULL, TRUE, 30),
  ('3211103', 'ক্ষতিপূরণ', NULL, TRUE, 31),
  ('3211104', 'আনুষঙ্গিক কর্মচারী ও প্রতিষ্ঠান', NULL, TRUE, 32),
  ('3211106', 'আপ্যায়ন ব্যয়', NULL, TRUE, 33),
  ('3211107', 'যানবাহন ব্যবহার (চুক্তিভিত্তিক)', NULL, TRUE, 34),
  ('3211110', 'আইন সংক্রান্ত ব্যয়', NULL, TRUE, 35),
  ('3211111', 'সেমিনার/কনফারেন্স ব্যয়', NULL, TRUE, 36),
  ('3211113', 'বিদ্যুৎ', NULL, TRUE, 37),
  ('3211115', 'পানি', NULL, TRUE, 38),
  ('3211116', 'কুরিয়ার', NULL, TRUE, 39),
  ('3211117', 'ইন্টারনেট/ফ্যাক্স/টেলেক্স', NULL, TRUE, 40),
  ('3211119', 'ডাক', NULL, TRUE, 41),
  ('3211120', 'টেলিফোন', NULL, TRUE, 42),
  ('3211121', 'মেশিন ও সরঞ্জমাদির ভাড়া', NULL, TRUE, 43),
  ('3211123', 'অন্যান্য সম্পদের ভাড়া', NULL, TRUE, 44),
  ('3211125', 'প্রচার ও বিজ্ঞাপন ব্যয়', NULL, TRUE, 45),
  ('3211127', 'বইপত্র ও সাময়িকী', NULL, TRUE, 46),
  ('3211128', 'প্রকাশনা', NULL, TRUE, 47),
  ('3211129', 'অফিস ভবন ভাড়া', NULL, TRUE, 48),
  ('3211130', 'যাতায়াত ব্যয়', NULL, TRUE, 49),
  ('3211131', 'আউটসোর্সিং', NULL, TRUE, 50),
  ('3211134', 'শ্রমিক (অনিয়মিত) মজুরি', NULL, TRUE, 51),
  ('3211135', 'নিয়োগ পরীক্ষা', NULL, TRUE, 52),
  ('3211136', 'সংবাদ/তথ্য সংগ্রহ', NULL, TRUE, 53),
  ('3211138', 'ডাটা এন্ট্রি', NULL, TRUE, 54),
  ('3211139', 'এস.এম.এস', NULL, TRUE, 55),
  ('3221101', 'নিরীক্ষা/সমীক্ষা ফি', NULL, TRUE, 56),
  ('3221102', 'লাইসেন্স ফি', NULL, TRUE, 57),
  ('3221104', 'নিবন্ধন ফি', NULL, TRUE, 58),
  ('3221105', 'টেস্টিং ফি', NULL, TRUE, 59),
  ('3221106', 'পরিবহণ ব্যয়', NULL, TRUE, 60),
  ('3221107', 'অনুলিপি ব্যায়', NULL, TRUE, 61),
  ('3221110', 'কমিশন', NULL, TRUE, 62),
  ('3221112', 'চাঁদা', NULL, TRUE, 63),
  ('3221116', 'নকশা (অবকাঠামো অনুমোদন ফি)', NULL, TRUE, 64),
  ('3221118', 'ফিটনেস ফি', NULL, TRUE, 65),
  ('3221119', 'পারমিট ফি', NULL, TRUE, 66),
  ('3221120', 'ডাটা ব্যবহার ব্যয়', NULL, TRUE, 67),
  ('3231301', 'প্রশিক্ষণ', NULL, TRUE, 68),
  ('3243301', 'পেট্রোল, অয়েল ও লুব্রিকেন্ট', NULL, TRUE, 69),
  ('3243302', 'গ্যাস ও জ্বালানী', NULL, TRUE, 70),
  ('3244101', 'ভ্রমণ ব্যয়', NULL, TRUE, 71),
  ('3244102', 'বদলি ব্যয়', NULL, TRUE, 72),
  ('3252101', 'বিছানপত্র', NULL, TRUE, 73),
  ('3252103', 'ভর্তুকী', NULL, TRUE, 74),
  ('3252109', 'ঔষধ', NULL, TRUE, 75),
  ('3253101', 'নিরাপত্তা সামগ্রী', NULL, TRUE, 76),
  ('3253103', 'নিরাপত্তা সেবা (ভাড়া ভিত্তিক)', NULL, TRUE, 77),
  ('3255101', 'কম্পিউটার সামগ্রী', NULL, TRUE, 78),
  ('3255102', 'মুদ্রণ ও বাঁধাই', NULL, TRUE, 79),
  ('3255104', 'স্ট্যাম্প ও সিল', NULL, TRUE, 80),
  ('3255105', 'অন্যান্য মনিহারি', NULL, TRUE, 81),
  ('3256102', 'রাসায়নিক', NULL, TRUE, 82),
  ('3256103', 'ব্যবহার্য সামগ্রী', NULL, TRUE, 83),
  ('3256106', 'পোশাক', NULL, TRUE, 84),
  ('3256107', 'ক্রিড়া সামগ্রী', NULL, TRUE, 85),
  ('3257101', 'কনসালটেন্সি', NULL, TRUE, 86),
  ('3257102', 'গোয়েন্দা', NULL, TRUE, 87),
  ('3257103', 'গবেষণা', NULL, TRUE, 88),
  ('3257105', 'উদ্ভাবন', NULL, TRUE, 89),
  ('3257106', 'শুদ্ধাচার', NULL, TRUE, 90),
  ('3257206', 'সম্মানী', NULL, TRUE, 91),
  ('3257301', 'অনুষ্ঠান উৎসবাদি', NULL, TRUE, 92),
  ('3257304', 'বাগান পরিচর্যা', NULL, TRUE, 93),
  ('3257305', 'তদন্ত', NULL, TRUE, 94),
  ('3257306', 'ডাটা সংক্ষণ ব্যায়', NULL, TRUE, 95),
  ('3258101', 'মোটরযান', NULL, TRUE, 96),
  ('3258102', 'আসবাবপত্র', NULL, TRUE, 97),
  ('3258103', 'কম্পিউটার', NULL, TRUE, 98),
  ('3258104', 'অফিস সরঞ্জামাদি', NULL, TRUE, 99),
  ('3258105', 'অন্যান্য যন্ত্রপাতি ও সরঞ্জামাদি', NULL, TRUE, 100),
  ('3258106', 'আবাসিক ভবন', NULL, TRUE, 101),
  ('3258107', 'অনাবাসিক ভবন', NULL, TRUE, 102),
  ('3258108', 'অন্যান্য ভবন ও স্থাপনা', NULL, TRUE, 103),
  ('3258115', 'স্বাস্থ্য বিধান ও পানি সরবরাহ', NULL, TRUE, 104),
  ('3258117', 'লাইন ও তার', NULL, TRUE, 105),
  ('3258119', 'বৈদ্যুতিক স্থাপনা', NULL, TRUE, 106),
  ('3258126', 'টেলিযোগাযোগ সরঞ্জমাদি', NULL, TRUE, 107),
  ('3258127', 'ফিটিং ও ফিক্সার', NULL, TRUE, 108),
  ('3258128', 'জলযান', NULL, TRUE, 109),
  ('3258134', 'যন্ত্রপাতি ও সরঞ্জামাদি', NULL, TRUE, 110),
  ('3258136', 'খেলা/প্রশিক্ষণ মাঠ', NULL, TRUE, 111),
  ('3258139', 'পাশ হাউস', NULL, TRUE, 112),
  ('3258140', 'মোটরযান রক্ষণারবক্ষণ ব্যয়', NULL, TRUE, 113),
  ('3258141', 'অভ্যন্তরীণ শোভাবর্ধন', NULL, TRUE, 114),
  ('3258143', 'সফট্ওয়্যার ও ড্যাটাবেজ রক্ষণাবেক্ষণ', NULL, TRUE, 115),
  ('3258144', 'ওয়েবসাইট রক্ষণাবেক্ষণ', NULL, TRUE, 116),
  ('3821102', 'ভূমি উন্নয়ন কর', NULL, TRUE, 117),
  ('3821103', 'পৌর কর', NULL, TRUE, 118),
  ('3821129', 'ধ্বংসযোগ্য মালামাল বিনষ্টকরণ', NULL, TRUE, 119),
  ('3911111', 'সাধারণ থোক বরাদ্দ', NULL, TRUE, 120),
  ('3911112', 'অপ্রত্যাশিত ব্যায়', NULL, TRUE, 121),
  ('4111101', 'ভূমি অধিগ্রহণ/ক্রয়', NULL, TRUE, 122),
  ('4111201', 'অনাবাসিক ভবন', NULL, TRUE, 123),
  ('4111317', 'অন্যান্য ভবন ও স্থাপনা', NULL, TRUE, 124),
  ('4111325', 'অভ্যন্তরীণ শোভাবর্ধন', NULL, TRUE, 125),
  ('4112101', 'মোটরযান', NULL, TRUE, 126),
  ('4112102', 'জলযান', NULL, TRUE, 127),
  ('4112201', 'তথ্য যোগাযোগ প্রযুক্তি সরঞ্জামাদি', NULL, TRUE, 128),
  ('4112202', 'কম্পিউটার ও আনুষঙ্গিক', NULL, TRUE, 129),
  ('4112204', 'টেলিযোগাযোগ সরঞ্জাম', NULL, TRUE, 130),
  ('4112303', 'বৈদ্যুতিক সরঞ্জমাদি', NULL, TRUE, 131),
  ('4112305', 'অগ্নিনির্বাপক সরঞ্জমাদি', NULL, TRUE, 132),
  ('4112306', 'গবেষণা সরঞ্জমাদি', NULL, TRUE, 133),
  ('4112310', 'অফিস সরঞ্জামাদি', NULL, TRUE, 134),
  ('4112312', 'শিক্ষা ও শিক্ষণ উপকরণ', NULL, TRUE, 135),
  ('4112314', 'আসবাবপত্র', NULL, TRUE, 136),
  ('4112316', 'অন্যান্য যন্ত্রপাতি ও সরঞ্জামাদি', NULL, TRUE, 137),
  ('4113301', 'কম্পিউটার সফটওয়ার', NULL, TRUE, 138),
  ('4113303', 'ওয়েবসাইট ডেভেলপমেন্ট', NULL, TRUE, 139);

-- ============================================================
-- SEED: Code-Type Mapping
-- Maps each expense code to applicable office types
-- office_type IDs: THQ=1, TR=2, TAR=3, TDR=4, TSR=5, TCR=6, TSCR=7
--                  CHQ=8, VD=9, VCR=10, CIR=11, CICR=12, LCS=13
-- ============================================================

INSERT INTO code_type_mapping (code_id, office_type_id)
SELECT ec.id, ot.id
FROM expense_codes ec, office_types ot
WHERE (
  (ec.code = '3111101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111110' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111201' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111209' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111301' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111302' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111303' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions'))
  OR
  (ec.code = '3111306' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111308' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles'))
  OR
  (ec.code = '3111309' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles'))
  OR
  (ec.code = '3111310' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111311' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111312' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111313' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles'))
  OR
  (ec.code = '3111314' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111315' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'LC Stations'))
  OR
  (ec.code = '3111316' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111325' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111327' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles'))
  OR
  (ec.code = '3111328' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111329' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3111331' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3111332' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3111334' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3111335' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111341' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3111344' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3111352' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3211101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3211102' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3211103' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3211104' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3211106' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions'))
  OR
  (ec.code = '3211107' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Circle'))
  OR
  (ec.code = '3211110' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions'))
  OR
  (ec.code = '3211111' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions'))
  OR
  (ec.code = '3211113' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3211115' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3211116' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions'))
  OR
  (ec.code = '3211117' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3211119' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3211120' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3211121' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3211123' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3211125' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions'))
  OR
  (ec.code = '3211127' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Appellate Range', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles'))
  OR
  (ec.code = '3211128' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3211129' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3211130' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Circle'))
  OR
  (ec.code = '3211131' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Circle'))
  OR
  (ec.code = '3211134' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3211135' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3211136' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3211138' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3211139' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221102' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221104' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221105' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221106' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221107' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions'))
  OR
  (ec.code = '3221110' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221112' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221116' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221118' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221119' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3221120' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3231301' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions'))
  OR
  (ec.code = '3243301' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3243302' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3244101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3244102' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3252101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3252103' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3252109' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3253101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3253103' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'LC Stations'))
  OR
  (ec.code = '3255101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3255102' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Range', 'Taxes Circle', 'VAT Circles'))
  OR
  (ec.code = '3255104' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Circle'))
  OR
  (ec.code = '3255105' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3256102' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3256103' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Circle'))
  OR
  (ec.code = '3256106' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3256107' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3257101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3257102' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3257103' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3257105' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3257106' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3257206' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3257301' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Circle'))
  OR
  (ec.code = '3257304' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Circle'))
  OR
  (ec.code = '3257305' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Circle'))
  OR
  (ec.code = '3257306' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Circle', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3258102' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3258103' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '3258104' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Circle', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles'))
  OR
  (ec.code = '3258105' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles'))
  OR
  (ec.code = '3258106' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258107' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258108' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258115' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258117' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258119' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258126' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258127' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258128' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258134' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258136' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258139' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258140' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258141' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Circle'))
  OR
  (ec.code = '3258143' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3258144' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3821102' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Range', 'Taxes Circle', 'VAT Circles', 'LC Stations'))
  OR
  (ec.code = '3821103' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'VAT Divisions', 'Taxes Range', 'Taxes Circle', 'VAT Circles', 'LC Stations'))
  OR
  (ec.code = '3821129' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '3911111' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Circle', 'VAT Circles', 'LC Stations'))
  OR
  (ec.code = '3911112' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4111101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4111201' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4111317' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4111325' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4112101' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4112102' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4112201' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4112202' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '4112204' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4112303' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4112305' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4112306' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4112310' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '4112312' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
  OR
  (ec.code = '4112314' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Departmental Representative', 'VAT Divisions', 'Taxes Range', 'Taxes Appellate Range', 'Taxes Survey Range', 'Taxes Circle', 'Taxes Survey Circle', 'VAT Circles', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles', 'LC Stations'))
  OR
  (ec.code = '4112316' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Customs Intelligence Regional Offices', 'Customs Intelligence Circles'))
  OR
  (ec.code = '4113301' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter', 'Taxes Circle'))
  OR
  (ec.code = '4113303' AND ot.name IN ('Tax Headquarter', 'Customs Headquarter'))
);

-- ============================================================
-- SEED: Parent Offices
-- department_id: 1 = কর বিভাগ, 2 = কাস্টমস ও ভ্যাট বিভাগ
-- ============================================================

INSERT INTO parent_offices (name, department_id) VALUES
  ('জাতীয় রাজস্ব বোর্ড', 1),
  ('ট্যাকসেস আপীলাত ট্রাইব্যুনাল', 1),
  ('বিসিএস (কর) একাডেমি, ঢাকা', 1),
  ('নিরীক্ষা, গোয়েন্দা ও তদন্ত অধিদপ্তর, মূল্য সংযোজন কর', 1),
  ('আয়কর গোয়েন্দা ও তদন্ত ইউনিট', 1),
  ('ই-ট্যাক্স ম্যানেজমেন্ট ইউনিট', 1),
  ('কর পরিদর্শন পরিদপ্তর, ঢাকা', 1),
  ('উৎসে কর ব্যবস্থাপনা ইউনিট', 1),
  ('কেন্দ্রীয় কর জরীপ অঞ্চল, ঢাকা', 1),
  ('বৃহৎ করদাতা ইউনিট-কর', 1),
  ('কর অঞ্চল-১, ঢাকা', 1),
  ('কর অঞ্চল-২, ঢাকা', 1),
  ('কর অঞ্চল-৩, ঢাকা', 1),
  ('কর অঞ্চল-৪, ঢাকা', 1),
  ('কর অঞ্চল-৫, ঢাকা', 1),
  ('কর অঞ্চল-৬, ঢাকা', 1),
  ('কর অঞ্চল-৭, ঢাকা', 1),
  ('কর অঞ্চল-৮, ঢাকা', 1),
  ('কর অঞ্চল-৯, ঢাকা', 1),
  ('কর অঞ্চল-১০, ঢাকা', 1),
  ('কর অঞ্চল-১১, ঢাকা', 1),
  ('কর অঞ্চল-১২, ঢাকা', 1),
  ('কর অঞ্চল-১৩, ঢাকা', 1),
  ('কর অঞ্চল-১৪, ঢাকা', 1),
  ('কর অঞ্চল-১৫, ঢাকা', 1),
  ('কর অঞ্চল-১৬, ঢাকা', 1),
  ('কর অঞ্চল-১৭, ঢাকা', 1),
  ('কর অঞ্চল-১৮, ঢাকা', 1),
  ('কর অঞ্চল-১৯, ঢাকা', 1),
  ('কর অঞ্চল-২০, ঢাকা', 1),
  ('কর অঞ্চল-২১, ঢাকা', 1),
  ('কর অঞ্চল-২২, ঢাকা', 1),
  ('কর অঞ্চল-২৩, ঢাকা', 1),
  ('কর অঞ্চল-২৪, ঢাকা', 1),
  ('কর অঞ্চল-২৫, ঢাকা', 1),
  ('কর অঞ্চল-গাজীপুর', 1),
  ('কর অঞ্চল-ময়মনসিংহ', 1),
  ('কর অঞ্চল-রাজশাহী', 1),
  ('কর অঞ্চল-রংপুর', 1),
  ('কর অঞ্চল-সিলেট', 1),
  ('কর অঞ্চল-বগুড়া', 1),
  ('কর অঞ্চল-খুলনা', 1),
  ('কর অঞ্চল-যশোর', 1),
  ('কর অঞ্চল-কুষ্টিয়া', 1),
  ('কর অঞ্চল-ফরিদপুর', 1),
  ('কর অঞ্চল-পাবনা', 1),
  ('কর অঞ্চল-বরিশাল', 1),
  ('কর অঞ্চল-নোয়াখালী', 1),
  ('কর অঞ্চল-দিনাজপুর', 1),
  ('কর অঞ্চল-নরসিংদী', 1),
  ('কর অঞ্চল-কক্সবাজার', 1),
  ('কর অঞ্চল-কুমিল্লা', 1),
  ('কর অঞ্চল-নারায়নগঞ্জ', 1),
  ('কর অঞ্চল-১, চট্টগ্রাম', 1),
  ('কর অঞ্চল-২, চট্টগ্রাম', 1),
  ('কর অঞ্চল-৩, চট্টগ্রাম', 1),
  ('কর অঞ্চল-৪, চট্টগ্রাম', 1),
  ('কর অঞ্চল-৫, চট্টগ্রাম', 1),
  ('কর অঞ্চল-৬, চট্টগ্রাম', 1),
  ('কর আপীল অঞ্চল-১, ঢাকা', 1),
  ('কর আপীল অঞ্চল-২, ঢাকা', 1),
  ('কর আপীল অঞ্চল-৩, ঢাকা', 1),
  ('কর আপীল অঞ্চল-৪, ঢাকা', 1),
  ('কর আপীল অঞ্চল-খুলনা', 1),
  ('কর আপীল অঞ্চল-চট্টগ্রাম', 1),
  ('কর আপীল অঞ্চল-রাজশাহী', 1),
  ('অভ্যন্তরীণ সম্পদ বিভাগ', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট আপীলাত ট্রাইব্যুনাল', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট ট্রেনিং একাডেমি, চট্টগ্রাম', 2),
  ('বৃহৎ করদাতা ইউনিট, মূল্য সংযোজন কর', 2),
  ('শুল্ক রেয়াত ও প্রত্যর্পণ পরিদপ্তর, ঢাকা', 2),
  ('কাস্টমস গোয়েন্দা ও তদন্ত আধিদপ্তর', 2),
  ('কাস্টমস রিস্ক ম্যানেজমেন্ট ইউনিট', 2),
  ('কাস্টমস মূল্যায়ন ও অভ্যন্তরীণ নিরীক্ষা কমিশনারেট', 2),
  ('কাস্টম হাউস, চট্টগ্রাম', 2),
  ('কাস্টমস হাউস, বেনাপোল', 2),
  ('কাস্টম হাউস, আইসিডি, কমলাপুর', 2),
  ('কাস্টমস হাউস, ঢাকা', 2),
  ('কাস্টম হাউস, মোংলা', 2),
  ('কাস্টম হাউস, পানগাঁও', 2),
  ('কাস্টমস এক্সাইজ ভ্যাট কমিশনারেট, ঢাকা (পূর্ব)', 2),
  ('কাস্টমস এক্সাইজ ভ্যাট কমিশনারেট, ঢাকা (পশ্চিম)', 2),
  ('কাস্টমস এক্সাইজ ভ্যাট কমিশনারেট, ঢাকা (উত্তর)', 2),
  ('কাস্টমস এক্সাইজ ভ্যাট কমিশনারেট, ঢাকা (দক্ষিণ)', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট কমিশনারেট, সিলেট', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট কমিশনারেট, রাজশাহী', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট কমিশনারেট, খুলনা', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট কমিশনারেট, রংপুর', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট কমিশনারেট, যশোর', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট কমিশনারেট, চট্টগ্রাম', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট কমিশনারেট, কুমিল্লা', 2),
  ('কাস্টমস বন্ড কমিশনারেট, ঢাকা (পূর্ব)', 2),
  ('কাস্টমস বন্ড কমিশনারেট, ঢাকা (উত্তর)', 2),
  ('কাস্টমস বন্ড কমিশনারেট, ঢাকা (দক্ষিণ)', 2),
  ('কাস্টমস বন্ড কমিশনারেট, চট্টগ্রাম', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট আপীল কমিশনারেট, ঢাকা-১', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট আপীল কমিশনারেট, ঢাকা-২', 2),
  ('কাস্টমস, এক্সাইজ ও ভ্যাট আপীল কমিশনারেট, চট্টগ্রাম', 2);