import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// The connection string lives in .env only — never inline credentials here.
// `directUrl` is intentionally unset: the Supavisor *session* pooler (port 5432)
// supports the DDL that migrations need, so one URL serves both the app and the
// Prisma CLI. If you move to a Postgres host that needs a separate migration
// connection, add `directUrl: env('DIRECT_DATABASE_URL')` rather than editing
// the application URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  // `prisma migrate reset` / `prisma db seed` run this. --env-file keeps the
  // child process able to read DATABASE_URL, because a Prisma config file
  // makes the CLI skip its own .env loading.
  migrations: {
    seed: 'node --env-file=.env prisma/seed.js',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
