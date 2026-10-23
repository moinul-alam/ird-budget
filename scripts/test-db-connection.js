const { Client } = require('pg')
const dns = require('dns').promises

const password = 'TGLKuT9nvlV47t99'
const ref = 'jamjablqawadxvrqwrco'

async function tryClient(config, label) {
  const client = new Client({ ...config, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    await client.query('SELECT 1')
    console.log(`OK [${label}]`)
    return true
  } catch (e) {
    console.log(`FAIL [${label}]:`, e.message.split('\n')[0].slice(0, 140))
    return false
  } finally {
    await client.end().catch(() => {})
  }
}

;(async () => {
  // Direct DB (IPv6)
  try {
    const addrs = await dns.resolve6(`db.${ref}.supabase.co`)
    console.log('db IPv6:', addrs[0])
    for (const host of addrs.slice(0, 1)) {
      const ok = await tryClient(
        { host, user: 'postgres', password, database: 'postgres', port: 5432 },
        `direct IPv6 ${host}`
      )
      if (ok) process.exit(0)
    }
  } catch (e) {
    console.log('dns6 db:', e.message)
  }

  // Scan pooler hosts: aws-{0..1} x common APAC/EU/US regions
  const regions = [
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-south-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'eu-west-1',
    'eu-central-1',
    'us-east-1',
    'us-west-1',
  ]
  for (const idx of [0, 1, 2]) {
    for (const region of regions) {
      const host = `aws-${idx}-${region}.pooler.supabase.com`
      try {
        await dns.lookup(host)
      } catch {
        continue
      }
      for (const port of [5432, 6543]) {
        const ok = await tryClient(
          {
            host,
            user: `postgres.${ref}`,
            password,
            database: 'postgres',
            port,
          },
          `${host}:${port}`
        )
        if (ok) {
          console.log(
            `DATABASE_URL=postgresql://postgres.${ref}:${password}@${host}:${port}/postgres${port === 6543 ? '?pgbouncer=true' : ''}`
          )
          process.exit(0)
        }
      }
    }
  }
  process.exit(1)
})()
