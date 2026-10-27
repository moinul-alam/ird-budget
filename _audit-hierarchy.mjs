// TEMPORARY read-only audit of the office hierarchy. Deleted after use.
import pg from 'pg'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) {
  console.error('no DATABASE_URL/DIRECT_URL')
  process.exit(1)
}

// pg honours `sslmode=require` from the URL over the ssl option, which makes it verify a
// Supabase cert our machine has no root for. Strip the param and be explicit.
const clean = new URL(url)
clean.searchParams.delete('sslmode')
clean.searchParams.delete('uselibpqcompat')

const client = new pg.Client({
  connectionString: clean.toString(),
  ssl: { rejectUnauthorized: false },
})

const checks = [
  [
    'A. levels whose owner count is not exactly 1',
    `SELECT id, level_name, level_order, office_type_id, ministry_id, department_id,
            (CASE WHEN office_type_id IS NOT NULL THEN 1 ELSE 0 END
           + CASE WHEN ministry_id IS NOT NULL THEN 1 ELSE 0 END
           + CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END) AS owners
     FROM core_office_levels
     WHERE (CASE WHEN office_type_id IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN ministry_id IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END) <> 1`,
  ],
  [
    'B. offices violating the ownership shape',
    `SELECT id, budget_id, name, ministry_id, department_id, office_type_id, parent_office_id
     FROM core_offices
     WHERE (ministry_id IS NOT NULL AND (department_id IS NOT NULL OR office_type_id IS NOT NULL))
        OR (office_type_id IS NOT NULL AND department_id IS NULL)
        OR (parent_office_id IS NOT NULL AND office_type_id IS NULL)
        OR (parent_office_id = id)
        OR (budget_id = '')`,
  ],
  [
    'C. office.department_id disagrees with its office type department',
    `SELECT o.id, o.budget_id, o.department_id AS office_dept, ot.department_id AS type_dept
     FROM core_offices o JOIN core_office_types ot ON ot.id = o.office_type_id
     WHERE o.department_id IS DISTINCT FROM ot.department_id`,
  ],
  [
    'D. office.office_level_id does not belong to its office type',
    `SELECT o.id, o.budget_id, o.office_type_id, o.office_level_id, l.office_type_id AS level_owner_type
     FROM core_offices o JOIN core_office_levels l ON l.id = o.office_level_id
     WHERE l.office_type_id IS DISTINCT FROM o.office_type_id`,
  ],
  [
    'E. typed offices with no level',
    `SELECT count(*)::int AS n FROM core_offices WHERE office_type_id IS NOT NULL AND office_level_id IS NULL`,
  ],
  [
    'F. offices whose parent is itself a field office (grandparent exists)',
    `SELECT c.id, c.budget_id, p.id AS parent_id, p.parent_office_id AS grandparent_id
     FROM core_offices c JOIN core_offices p ON p.id = c.parent_office_id
     WHERE p.parent_office_id IS NOT NULL`,
  ],
  [
    'G. child/parent department or office-type mismatch',
    `SELECT c.id, c.budget_id, c.department_id AS c_dept, p.department_id AS p_dept,
            c.office_type_id AS c_type, p.office_type_id AS p_type
     FROM core_offices c JOIN core_offices p ON p.id = c.parent_office_id
     WHERE c.department_id IS DISTINCT FROM p.department_id
        OR c.office_type_id IS DISTINCT FROM p.office_type_id`,
  ],
  [
    'H. child level order <= parent level order',
    `SELECT c.id, c.budget_id, cl.level_order AS child_order, pl.level_order AS parent_order
     FROM core_offices c
     JOIN core_offices p ON p.id = c.parent_office_id
     JOIN core_office_levels cl ON cl.id = c.office_level_id
     JOIN core_office_levels pl ON pl.id = p.office_level_id
     WHERE cl.level_order <= pl.level_order`,
  ],
  [
    'I. parent-chain cycles',
    `WITH RECURSIVE up AS (
       SELECT o.id AS start_id, o.parent_office_id AS cur, 1 AS depth
       FROM core_offices o WHERE o.parent_office_id IS NOT NULL
       UNION ALL
       SELECT u.start_id, p.parent_office_id, u.depth + 1
       FROM up u JOIN core_offices p ON p.id = u.cur
       WHERE u.cur IS NOT NULL AND u.depth < 30
     )
     SELECT DISTINCT start_id FROM up WHERE cur = start_id`,
  ],
  [
    'J. office types with more than one head office',
    `SELECT office_type_id, count(*)::int AS n
     FROM core_offices
     WHERE parent_office_id IS NULL AND office_type_id IS NOT NULL
     GROUP BY office_type_id HAVING count(*) > 1
     ORDER BY n DESC`,
  ],
  [
    'K. ministries with more than one office row',
    `SELECT ministry_id, count(*)::int AS n FROM core_offices WHERE ministry_id IS NOT NULL
     GROUP BY ministry_id HAVING count(*) > 1`,
  ],
  [
    'L. departments with more than one root office row',
    `SELECT department_id, count(*)::int AS n FROM core_offices
     WHERE office_type_id IS NULL AND department_id IS NOT NULL
     GROUP BY department_id HAVING count(*) > 1`,
  ],
  [
    'M. let me see the whole picture (counts)',
    `SELECT
       (SELECT count(*)::int FROM core_offices) AS offices,
       (SELECT count(*)::int FROM core_offices WHERE ministry_id IS NOT NULL) AS ministry_rows,
       (SELECT count(*)::int FROM core_offices WHERE department_id IS NOT NULL AND office_type_id IS NULL) AS dept_rows,
       (SELECT count(*)::int FROM core_offices WHERE office_type_id IS NOT NULL AND parent_office_id IS NULL) AS head_offices,
       (SELECT count(*)::int FROM core_offices WHERE parent_office_id IS NOT NULL) AS field_offices,
       (SELECT count(*)::int FROM core_office_levels) AS levels,
       (SELECT count(*)::int FROM core_office_types) AS office_types,
       (SELECT count(*)::int FROM core_departments) AS departments,
       (SELECT count(*)::int FROM core_ministries) AS ministries`,
  ],
  [
    'N. offices with no login row',
    `SELECT o.id, o.budget_id, o.name
     FROM core_offices o LEFT JOIN office_users u ON u.office_id = o.id
     WHERE u.id IS NULL`,
  ],
  [
    'O. duplicate level_order inside one office type',
    `SELECT office_type_id, level_order, count(*)::int AS n FROM core_office_levels
     WHERE office_type_id IS NOT NULL GROUP BY office_type_id, level_order HAVING count(*) > 1`,
  ],
  [
    'P. ministry/department level rows (owning root offices)',
    `SELECT id, level_name, level_order, ministry_id, department_id FROM core_office_levels
     WHERE office_type_id IS NULL ORDER BY level_order LIMIT 20`,
  ],
  [
    'Q. offices whose level owner is a ministry/department but the office is typed',
    `SELECT o.id, o.budget_id, o.office_type_id, l.id AS level_id, l.ministry_id, l.department_id
     FROM core_offices o JOIN core_office_levels l ON l.id = o.office_level_id
     WHERE o.office_type_id IS NOT NULL AND l.office_type_id IS NULL`,
  ],
]

try {
  await client.connect()
  for (const [label, sql] of checks) {
    const res = await client.query(sql)
    console.log(`\n=== ${label} -> ${res.rowCount} row(s) ===`)
    for (const row of res.rows.slice(0, 12)) console.log(JSON.stringify(row))
    if (res.rowCount > 12) console.log(`… ${res.rowCount - 12} more`)
  }
} catch (e) {
  console.error('AUDIT ERROR:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
