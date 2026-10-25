/**
 * Connectivity check for the configured DATABASE_URL.
 *
 *   node --env-file=.env scripts/test-db-connection.js
 *
 * Credentials are read from the environment only — never hardcode them here.
 * This repository is public, so a password committed to it must be treated as
 * leaked (rotate it in the Supabase dashboard, then revoke the old one).
 */
const { Client } = require('pg')

const url = process.env.DATABASE_URL
if (!url) {
  console.error(
    'DATABASE_URL is not set. Run with:\n' +
      '  node --env-file=.env scripts/test-db-connection.js'
  )
  process.exit(1)
}

;(async () => {
  const { hostname, port, username, password, pathname, searchParams } = new URL(url)
  const client = new Client({
    host: hostname,
    port: Number(port) || 5432,
    user: decodeURIComponent(username),
    password: decodeURIComponent(password),
    database: pathname.replace(/^\//, '') || 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  })

  const mode = searchParams.get('pgbouncer') ? 'transaction pooler' : 'direct/session'
  const started = Date.now()

  try {
    await client.connect()
    const { rows } = await client.query(
      'SELECT current_database() AS db, current_user AS usr'
    )
    console.log(`OK   ${hostname}:${port} (${mode}) in ${Date.now() - started}ms`)
    console.log(`     database=${rows[0].db} user=${rows[0].usr}`)
  } catch (error) {
    console.error(
      `FAIL ${hostname}:${port} (${mode}) in ${Date.now() - started}ms — ${error.message.split('\n')[0]}`
    )
    process.exitCode = 1
  } finally {
    await client.end().catch(() => {})
  }
})()
