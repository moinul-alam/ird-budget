/**
 * Idempotent database seed.
 *
 *   npm run db:seed
 *
 * Safe to run repeatedly: every write is an upsert keyed on a natural unique
 * column, so existing rows are updated rather than duplicated. This is the
 * single source of truth for "minimum data required for the app to work" and
 * is what lets a database be wiped and rebuilt without locking anyone out.
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

async function main() {
  console.log('Seeding database...')
  await seedAdminUser()
  await seedBudgetCategories()
  await seedBudgetTypes()
  await seedFiscalYears()
  await seedEconomicCodes()
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
