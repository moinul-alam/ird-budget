/**
 * ONE-TIME import of the NBR head offices.
 *
 *   npm run db:seed:hq
 *
 * Reads the two source spreadsheets at the repository root:
 *
 *   head quarters.xlsx   — [office type | head-office name]   (the authoritative name list)
 *   hq with codes.xlsx   — [budget code | head-office name]   (the budget code for each name)
 *
 * Every row becomes a head office (core_offices with parent_office_id = NULL) under the
 * first ministry's department "জাতীয় রাজস্ব বোর্ড (NBR)", sitting at the top level of its
 * office type, ordered alphabetically with natural numeric ordering (১, ২, ৩ … ১০, ১১).
 *
 * This is a one-time import, not part of `npm run db:seed`. Like the reference seeder it is
 * gap-filling: a head office whose budget id already exists is left completely untouched, so
 * running it a second time creates nothing and never overwrites an administrator's edit.
 *
 * Data quirks handled here (decided with the administrator):
 *   - 15 names in `head quarters` have no code; they get a temporary "TMP-nnn" budget id to
 *     be corrected by hand in /admin/offices-management/head-offices.
 *   - 2 names appear twice in `hq with codes` with different codes; the first row wins.
 *   - Bengali type/name spelling differs between the files only by Unicode form (য় vs য+়,
 *     and a stray ZWNJ), so all lookups normalise before comparing.
 */
const fs = require('node:fs')
const path = require('node:path')
const XLSX = require('xlsx')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ROOT = process.cwd()
const HQ_FILE = path.join(ROOT, 'head quarters.xlsx')
const CODES_FILE = path.join(ROOT, 'hq with codes.xlsx')

// Bengali names use the same glyphs written with different codepoints across the two files
// (e.g. আয়কর with a precomposed য় vs য + nukta). Fold to one form before comparing, and drop
// the zero-width joiners that make two otherwise identical strings unequal.
const fold = (value) =>
  String(value == null ? '' : value)
    .normalize('NFC')
    .replace(/[\u200c\u200d]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// Natural ordering: ১, ২, ৩ … ১০, ১১ — not ১, ১০, ১১, ২.
const byName = new Intl.Collator('bn', { numeric: true, sensitivity: 'base' })

function readSheet(file) {
  const workbook = XLSX.readFile(file)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
}

async function loadSourceRows() {
  if (!fs.existsSync(HQ_FILE) || !fs.existsSync(CODES_FILE)) {
    throw new Error(`Source spreadsheets not found at ${ROOT}`)
  }

  const codeByName = new Map()
  for (const row of readSheet(CODES_FILE)) {
    const code = String(row[0] || '').trim()
    const name = String(row[1] || '').trim()
    if (!code || !name) continue
    if (!codeByName.has(fold(name))) codeByName.set(fold(name), code)
  }

  const entries = []
  for (const row of readSheet(HQ_FILE)) {
    const typeName = String(row[0] || '').trim()
    const name = String(row[1] || '').trim()
    if (!name) continue
    entries.push({ name, typeName, code: codeByName.get(fold(name)) || null })
  }

  entries.sort((a, b) => byName.compare(a.name, b.name))

  let placeholderIndex = 0
  for (const entry of entries) {
    if (entry.code) continue
    placeholderIndex += 1
    entry.code = `TMP-${String(placeholderIndex).padStart(3, '0')}`
    entry.isPlaceholder = true
  }

  return entries
}

async function resolveTargets() {
  const ministry = await prisma.coreMinistry.findFirst({ orderBy: { id: 'asc' } })
  if (!ministry) throw new Error('No ministry found — create the organogram before importing.')

  const department =
    (await prisma.coreDepartment.findFirst({
      where: { ministryId: ministry.id, name: { contains: 'জাতীয় রাজস্ব বোর্ড' } },
      orderBy: { id: 'asc' },
    })) ||
    (await prisma.coreDepartment.findFirst({ where: { ministryId: ministry.id }, orderBy: { id: 'asc' } }))
  if (!department) throw new Error(`No department under ministry "${ministry.name}".`)

  const officeTypes = await prisma.coreOfficeType.findMany({ where: { departmentId: department.id } })
  const typeByFold = new Map(officeTypes.map((type) => [fold(type.name), type]))
  if (!typeByFold.size) throw new Error(`No office types under "${department.name}".`)

  // A head office always occupies the top level of its office type: the lowest level_order,
  // tie-broken by the lowest id.
  const levels = await prisma.coreOfficeLevel.findMany({
    orderBy: [{ levelOrder: 'asc' }, { id: 'asc' }],
  })
  const topLevelByType = new Map()
  for (const level of levels) {
    const key = String(level.officeTypeId)
    if (!topLevelByType.has(key)) topLevelByType.set(key, level)
  }

  return { ministry, department, typeByFold, topLevelByType }
}

async function main() {
  console.log('Importing head offices (one-time, gap-filling)...')

  const entries = await loadSourceRows()
  const { ministry, department, typeByFold, topLevelByType } = await resolveTargets()

  console.log(`  target              : ${ministry.name} / ${department.name}`)
  console.log(`  source rows         : ${entries.length}`)

  let created = 0
  let skipped = 0
  let placeholders = 0
  const unknownTypes = new Set()
  const missingLevels = new Set()

  for (const entry of entries) {
    const officeType = typeByFold.get(fold(entry.typeName))
    if (!officeType) {
      unknownTypes.add(entry.typeName)
      continue
    }

    const topLevel = topLevelByType.get(String(officeType.id))
    if (!topLevel) missingLevels.add(officeType.name)

    const existing = await prisma.coreOffice.findUnique({
      where: { budgetId: entry.code },
      select: { id: true },
    })
    if (existing) {
      skipped += 1
      continue
    }

    await prisma.coreOffice.create({
      data: {
        name: entry.name,
        budgetId: entry.code,
        departmentId: department.id,
        officeTypeId: officeType.id,
        officeLevelId: topLevel ? topLevel.id : null,
        parentOfficeId: null,
        isActive: true,
      },
    })
    created += 1
    if (entry.isPlaceholder) placeholders += 1
  }

  console.log(`  core_offices        : ${created} created, ${skipped} already present`)
  if (placeholders) {
    console.log(`                        ! ${placeholders} rows use a temporary TMP- budget id`)
  }
  if (unknownTypes.size) {
    console.log(`                        ! office type not found: ${[...unknownTypes].join(', ')}`)
  }
  if (missingLevels.size) {
    console.log(`                        ! no office level defined for: ${[...missingLevels].join(', ')}`)
  }
  console.log('Done.')
}

main()
  .catch((error) => {
    console.error('Import failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
