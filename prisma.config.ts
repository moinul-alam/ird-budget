import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node --env-file=.env prisma/seed.js',
  },
  datasource: {
    // A Prisma config file makes the CLI resolve the datasource URL up front, even for
    // `prisma generate`, which never opens a connection. CI hosts (Cloudflare, Vercel)
    // have no DATABASE_URL at build time, so without the fallback the build fails before
    // it compiles anything. The placeholder is never dialled: anything that actually
    // connects (migrate, studio, drift) runs where a real DATABASE_URL is present.
    url: process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/db',
  },
})
