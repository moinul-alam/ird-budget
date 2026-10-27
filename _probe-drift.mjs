// TEMPORARY probe: add / drop candidate DB objects so we can see whether Prisma's
// drift diff notices them. Deleted after use.
import pg from 'pg'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
const clean = new URL(url)
clean.searchParams.delete('sslmode')
clean.searchParams.delete('uselibpqcompat')
const client = new pg.Client({ connectionString: clean.toString(), ssl: { rejectUnauthorized: false } })

const ADD = [
  `ALTER TABLE "core_office_levels" ADD CONSTRAINT "probe_single_owner" CHECK (
     (CASE WHEN office_type_id IS NOT NULL THEN 1 ELSE 0 END
    + CASE WHEN ministry_id IS NOT NULL THEN 1 ELSE 0 END
    + CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END) = 1)`,
  `CREATE UNIQUE INDEX "probe_ministry_root" ON "core_offices" ("ministry_id") WHERE "ministry_id" IS NOT NULL`,
  `CREATE OR REPLACE FUNCTION probe_fn() RETURNS trigger AS $$ BEGIN RETURN NEW; END $$ LANGUAGE plpgsql`,
  `CREATE TRIGGER probe_trg BEFORE INSERT ON "core_offices" FOR EACH ROW EXECUTE FUNCTION probe_fn()`,
]

const DROP = [
  `DROP TRIGGER IF EXISTS probe_trg ON "core_offices"`,
  `DROP FUNCTION IF EXISTS probe_fn()`,
  `DROP INDEX IF EXISTS "probe_ministry_root"`,
  `ALTER TABLE "core_office_levels" DROP CONSTRAINT IF EXISTS "probe_single_owner"`,
]

const mode = process.argv[2]
const stmts = mode === 'add' ? ADD : DROP

await client.connect()
for (const sql of stmts) {
  await client.query(sql)
  console.log(`${mode}: ${sql.split('\n')[0].slice(0, 70)}`)
}
await client.end()
