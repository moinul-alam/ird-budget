// TEMPORARY pre-flight check.
// Counts rows that would violate each DB constraint we intend to add, so the
// migration cannot fail on live data. Delete this file once the migration is applied.
import pg from 'pg'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) {
  console.error('No DIRECT_URL / DATABASE_URL in env')
  process.exit(1)
}

// pg gives the URL's sslmode precedence over the client ssl option, which makes it verify a
// Supabase cert this machine has no root for. Strip the param and be explicit instead.
const clean = new URL(url)
clean.searchParams.delete('sslmode')
clean.searchParams.delete('uselibpqcompat')

const client = new pg.Client({
  connectionString: clean.toString(),
  ssl: { rejectUnauthorized: false },
})

const CHECKS = [
  ['C1 ministry XOR (dept/type)',
    `SELECT count(*)::int n FROM core_offices
      WHERE ministry_id IS NOT NULL AND (department_id IS NOT NULL OR office_type_id IS NOT NULL)`],

  ['C2 type implies department',
    `SELECT count(*)::int n FROM core_offices
      WHERE office_type_id IS NOT NULL AND department_id IS NULL`],

  ['C3 self-parent',
    `SELECT count(*)::int n FROM core_offices WHERE parent_office_id = id`],

  ['C4 office department != type department',
    `SELECT count(*)::int n FROM core_offices o
       JOIN core_office_types t ON t.id = o.office_type_id
      WHERE o.department_id IS DISTINCT FROM t.department_id`],

  ['C5 level not of this office type',
    `SELECT count(*)::int n FROM core_offices o
       JOIN core_office_levels l ON l.id = o.office_level_id
      WHERE o.office_type_id IS NOT NULL
        AND l.office_type_id IS DISTINCT FROM o.office_type_id`],

  ['C6 parent is not a head office',
    `SELECT count(*)::int n FROM core_offices o
       JOIN core_offices p ON p.id = o.parent_office_id
      WHERE p.parent_office_id IS NOT NULL`],

  ['C7 parent type/department mismatch',
    `SELECT count(*)::int n FROM core_offices o
       JOIN core_offices p ON p.id = o.parent_office_id
      WHERE p.office_type_id IS DISTINCT FROM o.office_type_id
         OR p.department_id IS DISTINCT FROM o.department_id`],

  ['C8 child level order < parent level order',
    `SELECT count(*)::int n FROM core_offices o
       JOIN core_offices p ON p.id = o.parent_office_id
       JOIN core_office_levels cl ON cl.id = o.office_level_id
       JOIN core_office_levels pl ON pl.id = p.office_level_id
      WHERE cl.level_order < pl.level_order`],

  ['C9 level owner count <> 1',
    `SELECT count(*)::int n FROM core_office_levels
      WHERE ((office_type_id IS NOT NULL)::int
           + (ministry_id IS NOT NULL)::int
           + (department_id IS NOT NULL)::int) <> 1`],

  ['C10 duplicate ministry offices',
    `SELECT count(*)::int n FROM (
       SELECT ministry_id FROM core_offices
        WHERE ministry_id IS NOT NULL
        GROUP BY ministry_id HAVING count(*) > 1) x`],

  ['C11 duplicate department offices',
    `SELECT count(*)::int n FROM (
       SELECT department_id FROM core_offices
        WHERE department_id IS NOT NULL AND office_type_id IS NULL
        GROUP BY department_id HAVING count(*) > 1) x`],

  ['C12 (info) offices with NULL level',
    `SELECT count(*)::int n FROM core_offices WHERE office_level_id IS NULL`],

  ['C13 (info) offices with NULL department',
    `SELECT count(*)::int n FROM core_offices WHERE department_id IS NULL`],

  ['C14 (info) offices with a parent',
    `SELECT count(*)::int n FROM core_offices WHERE parent_office_id IS NOT NULL`],

  ['C15 office type moved w/ offices (current state)',
    `SELECT count(*)::int n FROM (
       SELECT o.office_type_id FROM core_offices o
        WHERE o.office_type_id IS NOT NULL
        GROUP BY o.office_type_id) x`],

  ['C16 duplicate head offices per office type',
    `SELECT count(*)::int n FROM (
       SELECT office_type_id FROM core_offices
        WHERE parent_office_id IS NULL AND office_type_id IS NOT NULL
        GROUP BY office_type_id HAVING count(*) > 1) x`],
]

try {
  await client.connect()
  let blocking = 0
  for (const [label, sql] of CHECKS) {
    const res = await client.query(sql)
    const n = res.rows[0]?.n ?? 0
    const info = label.startsWith('C12') || label.startsWith('C13') || label.startsWith('C14') || label.startsWith('C15')
    if (!info && n > 0) blocking++
    console.log(`${info ? 'INFO' : n === 0 ? 'OK  ' : 'FAIL'}  ${label}: ${n}`)
  }
  console.log(`\nBLOCKING VIOLATIONS: ${blocking}`)
  process.exit(blocking === 0 ? 0 : 2)
} catch (err) {
  console.error('VERIFY ERROR:', err.message)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
