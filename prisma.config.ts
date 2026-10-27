import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// The connection string lives in .env only — never inline credentials here.
// `directUrl` is deliberately not set here: the schema declares it itself
// (prisma/schema.prisma -> directUrl = env("DIRECT_URL")), so Prisma Migrate reads
// DIRECT_URL while the app and the generated client read DATABASE_URL. Both currently
// address the same Supavisor *session* pooler on port 5432 in ap-south-1, which is what
// lets one pooler serve both the app and the CLI. On a host that needs a separate
// migration connection, repoint DIRECT_URL rather than editing the application URL.
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
