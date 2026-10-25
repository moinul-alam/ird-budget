/**
 * Idempotent database seed.
 *
 *   npm run db:seed
 *
 * Safe to run repeatedly: every write is keyed on a natural unique column, so
 * existing rows are updated rather than duplicated. This is the single source
 * of truth for "minimum data required for the app to work" and is what lets a
 * database be wiped and rebuilt without locking anyone out.
 *
 * Scope: the admin login plus reference/lookup data only. The organizational
 * structure (ministries, departments, office types, office levels), the offices
 * themselves, their logins and all per-office-type configuration are created by
 * hand from the admin UI. They are deliberately NOT seeded, so anything an
 * administrator deletes stays deleted.
 *
 * Deliberately dependency-free (plain Node + @prisma/client) so it runs on any
 * machine that can run the app, with no extra toolchain.
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Admin user
// ---------------------------------------------------------------------------
// The app hashes admin passwords as unsalted SHA-256 hex
// (see src/app/actions/auth.ts). Keep these in sync.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'superadmin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123'
const ADMIN_PASSWORD_HINT = process.env.ADMIN_PASSWORD_HINT || ADMIN_PASSWORD

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex')

async function seedAdminUser() {
  // Never overwrite a password that has been changed away from the default:
  // only set the hash when the row is being created.
  const existing = await prisma.adminUser.findUnique({
    where: { username: ADMIN_USERNAME },
    select: { id: true },
  })

  if (existing) {
    await prisma.adminUser.update({
      where: { username: ADMIN_USERNAME },
      data: { passwordHint: ADMIN_PASSWORD_HINT, role: 'superadmin', isActive: true },
    })
    console.log(`  admin_users         : "${ADMIN_USERNAME}" already exists (password left untouched)`)
    return
  }

  await prisma.adminUser.create({
    data: {
      username: ADMIN_USERNAME,
      passwordHash: sha256Hex(ADMIN_PASSWORD),
      passwordHint: ADMIN_PASSWORD_HINT,
      role: 'superadmin',
      isActive: true,
    },
  })
  console.log(`  admin_users         : created "${ADMIN_USERNAME}"`)
}

// ---------------------------------------------------------------------------
// Reference data: budget categories
// ---------------------------------------------------------------------------
// One-time initial import. Categories live in ref_budget_categories and are fully
// editable from /admin/codes afterwards — the application never hardcodes them.
// Re-seeding only fills gaps, so a category you renamed or added by hand survives.
//
// The 4-digit prefix is the chart-of-accounts parent. Labels follow the category
// list in resources/budget-system-PRD.md.
const SEED_CATEGORIES = [
  { code: '3111', title: 'নগদ মজুরি ও বেতন' },
  { code: '3211', title: 'প্রশাসনিক ব্যয়' },
  { code: '3221', title: 'ফি, চার্জ ও কমিশন' },
  { code: '3231', title: 'প্রশিক্ষণ' },
  { code: '3243', title: 'পেট্রোল, অয়েল ও লুব্রিকেন্ট' },
  { code: '3244', title: 'ভ্রমণ ও বদলি' },
  { code: '3252', title: 'চিকিৎসা ও শল্য চিকিৎসা' },
  { code: '3253', title: 'জনশৃঙ্খলা ও নিরাপত্তা' },
  { code: '3255', title: 'মুদ্রণ ও মনিহারি' },
  { code: '3256', title: 'সাধারণ সরবরাহ' },
  { code: '3257', title: 'পেশাগত সেবা' },
  { code: '3258', title: 'মেরামত ও সংরক্ষণ' },
  { code: '3821', title: 'আবর্তক স্থানান্তর' },
  { code: '3911', title: 'সাধারণ সরবরাহ' },
  { code: '4111', title: 'ভবন ও স্থাপনা' },
  { code: '4112', title: 'যন্ত্রপাতি ও সরঞ্জামাদি' },
  { code: '4113', title: 'অন্যান্য স্থায়ী সম্পদ' },
]

async function seedBudgetCategories() {
  let created = 0

  for (const [index, item] of SEED_CATEGORIES.entries()) {
    const existing = await prisma.refBudgetCategory.findUnique({
      where: { code: item.code },
      select: { id: true },
    })
    if (existing) continue

    await prisma.refBudgetCategory.create({
      data: { code: item.code, title: item.title, sortOrder: index + 1 },
    })
    created += 1
  }

  console.log(
    `  ref_budget_categories: ${created} created, ${SEED_CATEGORIES.length - created} already present`
  )
}

// ---------------------------------------------------------------------------
// Reference data: budget types and fiscal years
// ---------------------------------------------------------------------------
// One-time initial import for a brand-new database. Both live in their own
// tables and are fully editable from /admin/budgets afterwards — the
// application never hardcodes them. Re-seeding only fills gaps, so a row you
// renamed or added by hand survives. Budget cycles reference these by foreign
// key, so renaming one here relabels every existing cycle.
const SEED_BUDGET_TYPES = ['প্রাক্কলিত', 'সংশোধিত']

const SEED_FISCAL_YEARS = ['২০২৪-২৫', '২০২৫-২৬', '২০২৬-২৭', '২০২৭-২৮']

async function seedBudgetTypes() {
  let created = 0

  for (const [index, name] of SEED_BUDGET_TYPES.entries()) {
    const existing = await prisma.refBudgetType.findUnique({ where: { name }, select: { id: true } })
    if (existing) continue

    await prisma.refBudgetType.create({ data: { name, sortOrder: index + 1 } })
    created += 1
  }

  console.log(
    `  ref_budget_types    : ${created} created, ${SEED_BUDGET_TYPES.length - created} already present`
  )
}

async function seedFiscalYears() {
  let created = 0

  for (const [index, year] of SEED_FISCAL_YEARS.entries()) {
    const existing = await prisma.refFiscalYear.findUnique({ where: { year }, select: { id: true } })
    if (existing) continue

    await prisma.refFiscalYear.create({ data: { year, sortOrder: index + 1 } })
    created += 1
  }

  console.log(
    `  ref_fiscal_years    : ${created} created, ${SEED_FISCAL_YEARS.length - created} already present`
  )
}

// ---------------------------------------------------------------------------
// Budget cycle
// ---------------------------------------------------------------------------
// An office login resolves its submission through the most recent cycle (see
// getOrCreateOfficeSubmission in src/app/actions/auth.ts) and returns null when
// no cycle exists at all. Without one here, an office user signs in and every
// form has no submission to save against.
async function seedBudgetCycle() {
  const fiscalYear = await prisma.refFiscalYear.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { id: true, year: true },
  })
  const budgetType = await prisma.refBudgetType.findFirst({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  })

  if (!fiscalYear || !budgetType) {
    console.log('  core_budget_cycles  : skipped (needs a fiscal year and a budget type)')
    return
  }

  const existing = await prisma.coreBudgetCycle.findUnique({
    where: {
      fiscalYearId_budgetTypeId: { fiscalYearId: fiscalYear.id, budgetTypeId: budgetType.id },
    },
    select: { id: true },
  })

  if (existing) {
    console.log(`  core_budget_cycles  : "${fiscalYear.year} ${budgetType.name}" already exists`)
    return
  }

  await prisma.coreBudgetCycle.create({
    data: {
      fiscalYearId: fiscalYear.id,
      budgetTypeId: budgetType.id,
      title: `${fiscalYear.year} ${budgetType.name}`,
      status: 'open',
      openedAt: new Date(),
    },
  })
  console.log(`  core_budget_cycles  : opened "${fiscalYear.year} ${budgetType.name}"`)
}

// ---------------------------------------------------------------------------
// Reference data: economic codes
// ---------------------------------------------------------------------------
async function seedEconomicCodes() {
  const file = path.join(process.cwd(), 'resources', 'expense_codes_backup_139.json')
  if (!fs.existsSync(file)) {
    console.log(`  ref_economic_codes  : skipped (${path.relative(process.cwd(), file)} not found)`)
    return
  }

  // A code's category is whichever category carries its 4-digit prefix.
  const categories = await prisma.refBudgetCategory.findMany({ select: { id: true, code: true } })
  const categoryIdByCode = new Map(categories.map((c) => [c.code, c.id]))

  const codes = JSON.parse(fs.readFileSync(file, 'utf8'))
  const unknownPrefixes = new Set()

  for (const item of codes) {
    const prefix = String(item.code).slice(0, 4)
    const categoryId = categoryIdByCode.get(prefix)
    if (!categoryId) unknownPrefixes.add(prefix)

    const data = {
      name: item.name,
      categoryId: categoryId ?? null,
      isManual: item.is_manual ?? true,
      // A computed code that still takes an office input (currently only ডাক).
      allowManualOverride: item.allow_manual_override ?? false,
      sortOrder: item.sort_order ?? 0,
      isActive: true,
    }

    await prisma.refEconomicCode.upsert({
      where: { code: String(item.code) },
      update: data,
      create: { code: String(item.code), ...data },
    })
  }

  console.log(`  ref_economic_codes  : upserted ${codes.length} codes`)
  if (unknownPrefixes.size) {
    console.log(`                        ! no category for prefixes: ${[...unknownPrefixes].join(', ')}`)
  }
}

// ---------------------------------------------------------------------------
// Reference data: pay grades
// ---------------------------------------------------------------------------
// Forms 2, 3 and 4 write one row per grade and the staff tables reference
// ref_grades.grade_no directly, so every grade a form offers must exist here.
// Grades 1–10 are officer grades and 11–20 are staff.
const SEED_EMPLOYEE_CATEGORIES = [
  { categoryName: 'officer', categoryNameBn: 'কর্মকর্তা' },
  { categoryName: 'staff', categoryNameBn: 'কর্মচারী' },
]

async function seedEmployeeCategories() {
  let created = 0

  for (const item of SEED_EMPLOYEE_CATEGORIES) {
    const existing = await prisma.refEmployeeCategory.findUnique({
      where: { categoryName: item.categoryName },
      select: { id: true },
    })
    if (existing) continue

    await prisma.refEmployeeCategory.create({ data: item })
    created += 1
  }

  console.log(
    `  ref_employee_categories: ${created} created, ${SEED_EMPLOYEE_CATEGORIES.length - created} already present`
  )
}

async function seedGrades() {
  const categories = await prisma.refEmployeeCategory.findMany({
    select: { id: true, categoryName: true },
  })
  const categoryIdByName = new Map(categories.map((c) => [c.categoryName, c.id]))

  const seedGrades = Array.from({ length: 20 }, (_, i) => ({
    gradeNo: i + 1,
    categoryId: categoryIdByName.get(i + 1 <= 10 ? 'officer' : 'staff')!,
  }))

  let created = 0

  for (const item of seedGrades) {
    const existing = await prisma.refGrade.findUnique({
      where: { gradeNo: item.gradeNo },
      select: { id: true, categoryId: true },
    })
    if (existing) {
      // Keep the officer/staff boundary correct on re-runs instead of only on first insert.
      if (existing.categoryId !== item.categoryId) {
        await prisma.refGrade.update({
          where: { gradeNo: item.gradeNo },
          data: { categoryId: item.categoryId },
        })
      }
      continue
    }

    await prisma.refGrade.create({ data: item })
    created += 1
  }

  console.log(
    `  ref_grades          : ${created} created, ${seedGrades.length - created} already present`
  )
}

// ---------------------------------------------------------------------------
// Reference data: allowance types
// ---------------------------------------------------------------------------
// Form 5 renders one card per allowance row, so everything the card shows is
// described here: the Bengali label, the count label and which of the basic /
// amount / due inputs the card collects. The budget engine keys its formulas off
// `name`, so the names must stay exactly as written.
const SEED_ALLOWANCE_TYPES = [
  { name: 'overtime', labelBn: 'অধিকাল ভাতা (চালক)', countLabelBn: 'গাড়ীচালকের সংখ্যা', hasBasic: true, hasAmount: false, hasDue: true, isCalculated: true, formulaKey: null, applicableCategory: 'staff' },
  { name: 'duty', labelBn: 'দায়িত্ব ভাতা', countLabelBn: 'কর্মকর্তার সংখ্যা', hasBasic: false, hasAmount: false, hasDue: false, isCalculated: true, formulaKey: null, applicableCategory: 'officer' },
  { name: 'dress', labelBn: 'পোশাক ভাতা', countLabelBn: 'কর্মচারীর সংখ্যা', hasBasic: false, hasAmount: true, hasDue: true, isCalculated: false, formulaKey: null, applicableCategory: 'staff' },
  { name: 'risk', labelBn: 'ঝুঁকি ভাতা', countLabelBn: 'কর্মচারীর সংখ্যা', hasBasic: false, hasAmount: true, hasDue: true, isCalculated: false, formulaKey: null, applicableCategory: 'staff' },
  { name: 'hill', labelBn: 'পাহাড়ী ভাতা', countLabelBn: 'কর্মচারীর সংখ্যা', hasBasic: false, hasAmount: true, hasDue: true, isCalculated: false, formulaKey: null, applicableCategory: 'staff' },
  { name: 'restRecreation', labelBn: 'শ্রান্তি ও বিনোদন ভাতা', countLabelBn: 'কর্মকর্তা/কর্মচারীর সংখ্যা', hasBasic: false, hasAmount: true, hasDue: true, isCalculated: false, formulaKey: null, applicableCategory: 'both' },
]

async function seedAllowanceTypes() {
  let created = 0

  for (const item of SEED_ALLOWANCE_TYPES) {
    // Upsert on the natural key so the descriptive columns stay in sync with
    // this file rather than only being set on first insert.
    await prisma.refAllowanceType.upsert({
      where: { name: item.name },
      update: item,
      create: item,
    })
    created += 1
  }

  console.log(`  ref_allowance_types : ${created} upserted`)
}

// ---------------------------------------------------------------------------
// Reference data: vehicle and fuel types
// ---------------------------------------------------------------------------
// Forms 7 and 8 offer a vehicle type; form 7 also pairs it with a fuel type.
// The budget engine picks a rate (fuel_price_octane / _diesel / _cng) from the
// fuel name, so keep the Bengali names below intact.
const SEED_VEHICLE_TYPES = ['মোটরসাইকেল', 'জিপ', 'মাইক্রোবাস', 'পিকআপ']

// `unit_price` is what /admin/settings (জ্বালানির দর) edits and what the budget
// engine charges per litre / cubic metre. The defaults match the figures the
// engine used to assume (admin_rates fuel_price_*) so a fresh database produces
// the same budgets as before the price moved into this table.
// `category` decides which of the two fuel codes the cost lands in — 3243301
// (পেট্রোল, অয়েল ও লুব্রিকেন্ট) for `oil`, 3243302 (গ্যাস ও জ্বালানী) for `gas`.
// It is the stable `category_name` of a ref_fuel_categories row; that row must be
// seeded first (see SEED_FUEL_CATEGORIES below).
const SEED_FUEL_CATEGORIES = [
  { categoryName: 'oil', categoryNameBn: 'তেল' },
  { categoryName: 'gas', categoryNameBn: 'গ্যাস' },
]

const SEED_FUEL_TYPES = [
  { name: 'অকটেন', unitPrice: 130, categoryName: 'oil' },
  { name: 'ডিজেল', unitPrice: 110, categoryName: 'oil' },
  { name: 'সিএনজি', unitPrice: 45, categoryName: 'gas' },
]

async function seedFuelCategories() {
  let created = 0

  for (const item of SEED_FUEL_CATEGORIES) {
    const existing = await prisma.refFuelCategory.findUnique({
      where: { categoryName: item.categoryName },
      select: { id: true },
    })
    if (existing) continue

    await prisma.refFuelCategory.create({ data: item })
    created += 1
  }

  console.log(
    `  ref_fuel_categories : ${created} created, ${SEED_FUEL_CATEGORIES.length - created} already present`
  )
}

async function seedVehicleTypes() {
  let created = 0

  for (const name of SEED_VEHICLE_TYPES) {
    const existing = await prisma.refVehicleType.findUnique({ where: { name }, select: { id: true } })
    if (existing) continue

    await prisma.refVehicleType.create({ data: { name } })
    created += 1
  }

  console.log(
    `  ref_vehicle_types   : ${created} created, ${SEED_VEHICLE_TYPES.length - created} already present`
  )
}

async function seedFuelTypes() {
  let created = 0

  const categories = await prisma.refFuelCategory.findMany({
    select: { id: true, categoryName: true },
  })
  const categoryIds = new Map(categories.map((c) => [c.categoryName, c.id]))

  for (const item of SEED_FUEL_TYPES) {
    const existing = await prisma.refFuelType.findUnique({ where: { name: item.name }, select: { id: true } })
    if (existing) continue

    const categoryId = categoryIds.get(item.categoryName)
    if (!categoryId) {
      throw new Error(
        `ref_fuel_categories has no "${item.categoryName}" — run seedFuelCategories() before seedFuelTypes().`
      )
    }

    await prisma.refFuelType.create({
      data: { name: item.name, unitPrice: item.unitPrice, categoryId },
    })
    created += 1
  }

  console.log(
    `  ref_fuel_types      : ${created} created, ${SEED_FUEL_TYPES.length - created} already present`
  )
}

// ---------------------------------------------------------------------------
// Reference data: IT equipment types
// ---------------------------------------------------------------------------
// Form 10 matches these rows by substring against hardcoded aliases (see the
// CARD_CONFIGS aliases in src/app/(office)/office/form-10/form-7-client.tsx).
// Each name below contains one of those aliases — renaming one breaks form 10
// silently (the row is never matched, so nothing is saved).
const SEED_IT_EQUIPMENT_TYPES = [
  { name: 'কম্পিউটার', hasToner: false, isLumpsum: false },
  { name: 'প্রিন্টার', hasToner: true, isLumpsum: false },
  { name: 'স্ক্যানার', hasToner: false, isLumpsum: false },
  { name: 'ফটোকপিয়ার', hasToner: false, isLumpsum: false },
]

async function seedItEquipmentTypes() {
  let created = 0

  for (const item of SEED_IT_EQUIPMENT_TYPES) {
    const existing = await prisma.refItEquipmentType.findUnique({
      where: { name: item.name },
      select: { id: true },
    })
    if (existing) continue

    await prisma.refItEquipmentType.create({ data: item })
    created += 1
  }

  console.log(
    `  ref_it_equipment_types: ${created} created, ${SEED_IT_EQUIPMENT_TYPES.length - created} already present`
  )
}

// ---------------------------------------------------------------------------
// Reference data: utility types
// ---------------------------------------------------------------------------
// Form 11's dropdown. Bengali bill names — re-seeding only fills gaps.
const SEED_UTILITY_TYPES = ['বিদ্যুৎ', 'পানি', 'গ্যাস', 'টেলিফোন', 'ইন্টারনেট']

async function seedUtilityTypes() {
  let created = 0

  for (const name of SEED_UTILITY_TYPES) {
    const existing = await prisma.refUtilityType.findUnique({ where: { name }, select: { id: true } })
    if (existing) continue

    await prisma.refUtilityType.create({ data: { name } })
    created += 1
  }

  console.log(
    `  ref_utility_types   : ${created} created, ${SEED_UTILITY_TYPES.length - created} already present`
  )
}

// ---------------------------------------------------------------------------
// Salary and allowance configuration
// ---------------------------------------------------------------------------
// The /admin/settings "বেতন-ভাতা" tab renders one tile per row of
// admin_salary_config; the tile list is data, not JSX, so adding a row adds a
// tile. Grade-banded tiles (বাড়ি ভাড়া, বিশেষ সুবিধা, মোবাইল ভাতা) keep their
// bands in admin_salary_slabs. Both are editable from the tab afterwards.
//
// The migration that introduced these tables already inserted the same rows for
// existing databases; this keeps a freshly reset database identical and fills
// any row an administrator deleted by hand.
const SEED_SALARY_CONFIG = [
  { key: 'leave_encashment_months', labelBn: 'ছুটি নগদায়ন', descriptionBn: 'মাসের সংখ্যা', unitBn: 'মাস', inputType: 'number', valueFormat: 'number', value: 18, sortOrder: 1 },
  { key: 'duty_allowance', labelBn: 'দায়িত্ব ভাতা', descriptionBn: 'মাসিক হার', unitBn: 'টাকা/মাস', inputType: 'number', valueFormat: 'amount', value: 1500, sortOrder: 2 },
  { key: 'transport_allowance', labelBn: 'যাতায়াত ভাতা', descriptionBn: 'গ্রেড অনুযায়ী মাসিক হার', unitBn: 'টাকা/মাস', inputType: 'grade', valueFormat: 'amount', value: 0, fromGrade: 1, toGrade: 20, sortOrder: 3 },
  { key: 'education_allowance', labelBn: 'শিক্ষা ভাতা', descriptionBn: 'জনপ্রতি মাসিক হার', unitBn: 'টাকা/মাস', inputType: 'number', valueFormat: 'amount', value: 500, sortOrder: 4 },
  { key: 'house_rent', labelBn: 'বাড়ি ভাড়া ভাতা', descriptionBn: 'গ্রেড অনুযায়ী মূল বেতনের শতকরা হার', unitBn: '% মূলবেতন', inputType: 'slab', valueFormat: 'percent', value: 0, sortOrder: 5 },
  { key: 'medical_allowance', labelBn: 'চিকিৎসা ভাতা', descriptionBn: 'কর্মকর্তা/কর্মচারী মাসিক হার', unitBn: 'টাকা/মাস', inputType: 'number', valueFormat: 'amount', value: 1500, sortOrder: 6 },
  { key: 'mobile_allowance', labelBn: 'মোবাইল/সেলফোন ভাতা', descriptionBn: 'গ্রেড অনুযায়ী মাসিক ভাতা', unitBn: 'স্ল্যাব', inputType: 'slab', valueFormat: 'amount', value: 0, sortOrder: 7 },
  { key: 'telephone_allowance', labelBn: 'আবাসিক টেলিফোন নগদায়ন', descriptionBn: 'গ্রেড অনুযায়ী মাসিক হার', unitBn: 'টাকা/মাস', inputType: 'grade', valueFormat: 'amount', value: 0, fromGrade: 1, toGrade: 20, sortOrder: 8 },
  { key: 'tiffin_allowance', labelBn: 'টিফিন ভাতা', descriptionBn: 'গ্রেড অনুযায়ী মাসিক হার', unitBn: 'টাকা/মাস', inputType: 'grade', valueFormat: 'amount', value: 0, fromGrade: 1, toGrade: 20, sortOrder: 9 },
  { key: 'wash_allowance', labelBn: 'ধোলাই ভাতা', descriptionBn: 'গ্রেড অনুযায়ী মাসিক হার', unitBn: 'টাকা/মাস', inputType: 'grade', valueFormat: 'amount', value: 0, fromGrade: 1, toGrade: 20, sortOrder: 10 },
  { key: 'entertainment_allowance', labelBn: 'আপ্যায়ন ভাতা', descriptionBn: 'গ্রেড অনুযায়ী মাসিক হার', unitBn: 'টাকা/মাস', inputType: 'grade', valueFormat: 'amount', value: 0, fromGrade: 1, toGrade: 20, sortOrder: 11 },
  { key: 'special_benefit', labelBn: 'বিশেষ সুবিধা', descriptionBn: 'গ্রেড অনুযায়ী মূল বেতনের শতকরা হার', unitBn: '% মূলবেতন', inputType: 'slab', valueFormat: 'percent', value: 0, sortOrder: 12 },
  { key: 'noboborsho_percent', labelBn: 'বাংলা নববর্ষ ভাতা', descriptionBn: 'মূল বেতনের শতকরা হার', unitBn: 'বেসিকের', inputType: 'number', valueFormat: 'percent', value: 20, sortOrder: 13 },
  { key: 'festival_bonus_multiplier', labelBn: 'উৎসব ভাতা', descriptionBn: 'বাৎসরিক বোনাস সংখ্যা', unitBn: 'টি বেসিক', inputType: 'number', valueFormat: 'number', value: 2, sortOrder: 14 },
  { key: 'office_rent_vat_percent', labelBn: 'অফিস ভাড়ার ভ্যাট হার', descriptionBn: 'ভাড়া বাবদ ভ্যাটের শতকরা হার', unitBn: 'ভাড়ার ওপর', inputType: 'number', valueFormat: 'percent', value: 15, sortOrder: 15 },
  { key: 'postal_rate', labelBn: 'ডাক ব্যয়', descriptionBn: 'প্রতি ডাকের ব্যয় × নন-ফাইলার প্রতি ডাকের সংখ্যা', unitBn: 'টাকা/ডাক', inputType: 'number', valueFormat: 'amount', value: 50, secondaryLabelBn: 'ডাকের সংখ্যা', secondaryUnitBn: 'টি', secondaryValue: 2, sortOrder: 16 },
]

const SEED_SALARY_SLABS = [
  { configKey: 'house_rent', fromGrade: 1, toGrade: 20, value: 40, sortOrder: 1 },
  { configKey: 'special_benefit', fromGrade: 1, toGrade: 20, value: 5, sortOrder: 1 },
  { configKey: 'mobile_allowance', fromGrade: 1, toGrade: 9, value: 1500, sortOrder: 1 },
  { configKey: 'mobile_allowance', fromGrade: 10, toGrade: 20, value: 1000, sortOrder: 2 },
]

async function seedSalaryConfig() {
  let created = 0

  for (const item of SEED_SALARY_CONFIG) {
    const existing = await prisma.adminSalaryConfig.findUnique({
      where: { key: item.key },
      select: { id: true },
    })
    if (existing) continue

    await prisma.adminSalaryConfig.create({ data: item })
    created += 1
  }

  let slabsCreated = 0
  for (const slab of SEED_SALARY_SLABS) {
    const existing = await prisma.adminSalarySlab.findFirst({
      where: { configKey: slab.configKey, fromGrade: slab.fromGrade, toGrade: slab.toGrade },
      select: { id: true },
    })
    if (existing) continue

    await prisma.adminSalarySlab.create({ data: slab })
    slabsCreated += 1
  }

  console.log(
    `  admin_salary_config : ${created} created, ${SEED_SALARY_CONFIG.length - created} already present`
  )
  console.log(
    `  admin_salary_slabs  : ${slabsCreated} created, ${SEED_SALARY_SLABS.length - slabsCreated} already present`
  )
}

// ---------------------------------------------------------------------------
// Admin rates
// ---------------------------------------------------------------------------
// Every admin_rates key the application reads must exist, otherwise the budget
// engine and the return-info form fall back to hardcoded values. Do not re-add
// `house_rent_percent` or `postal_rate`: both were superseded by the tab-1
// `house_rent` slab and by `postal_expense_rate`, and nothing reads them.
const SEED_RATES = [
  { key: 'medical_allowance_monthly', name: 'মাসিক চিকিৎসা ভাতা', value: 1500, unit: 'টাকা', description: 'প্রতি কর্মকর্তা/কর্মচারীর মাসিক চিকিৎসা ভাতা' },
  { key: 'festival_bonus_multiplier', name: 'উৎসব বোনাস গুণক', value: 2, unit: 'গুণ', description: 'উৎসব বোনাস = মূল বেতন × গুণক' },
  { key: 'provident_fund_percent', name: 'ভবিষ্যৎ তহবিলের হার', value: 10, unit: '%', description: 'মূল বেতনের শতাংশ হিসেবে ভবিষ্যৎ তহবিল' },
  { key: 'education_allowance', name: 'শিক্ষা ভাতা', value: 500, unit: 'টাকা', description: 'জনপ্রতি মাসিক শিক্ষা ভাতা' },
  { key: 'fuel_price_octane', name: 'অকটেনের দাম', value: 130, unit: 'টাকা/লিটার', description: 'প্রতি লিটার অকটেনের দাম' },
  { key: 'fuel_price_diesel', name: 'ডিজেলের দাম', value: 110, unit: 'টাকা/লিটার', description: 'প্রতি লিটার ডিজেলের দাম' },
  { key: 'fuel_price_cng', name: 'সিএনজি গ্যাসের দাম', value: 45, unit: 'টাকা/কেজি', description: 'প্রতি কেজি সিএনজি গ্যাসের দাম' },
  { key: 'vat_percentage', name: 'ভ্যাটের হার', value: 15, unit: '%', description: 'অফিস ভাড়ার উপর ভ্যাট (form 9)' },
  { key: 'postal_expense_rate', name: 'ডাক ব্যয়ের হার', value: 50, unit: 'টাকা', description: 'বাজেট হিসাবে প্রতি রিটার্নে ডাক ব্যয়' },
]

async function seedAdminRates() {
  let created = 0

  for (const item of SEED_RATES) {
    const existing = await prisma.adminRate.findUnique({
      where: { key: item.key },
      select: { id: true },
    })
    if (existing) continue

    await prisma.adminRate.create({ data: item })
    created += 1
  }

  console.log(
    `  admin_rates         : ${created} created, ${SEED_RATES.length - created} already present`
  )
}

// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding database...')
  await seedAdminUser()
  await seedBudgetCategories()
  await seedBudgetTypes()
  await seedFiscalYears()
  await seedEconomicCodes()
  await seedBudgetCycle()
  await seedEmployeeCategories()
  await seedGrades()
  await seedAllowanceTypes()
  await seedVehicleTypes()
  await seedFuelCategories()
  await seedFuelTypes()
  await seedItEquipmentTypes()
  await seedUtilityTypes()
  await seedSalaryConfig()
  await seedAdminRates()
  console.log('Done.')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
