import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node --env-file=.env prisma/seed.js',
  },
  datasource: {
    // Change this from `env('DATABASE_URL')` to this:
    url: process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/db',
  },
})