import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Queries go through the `pg` driver rather than Prisma's own native query engine.
// That engine is a platform-specific binary, which cannot load in Cloudflare's
// workerd runtime — every query there would fail. The driver adapter is plain JS
// over a WASM query compiler, so it works on Workers and on Node (local dev,
// Vercel) identically, keeping one code path for every host. The connection string
// still comes from DATABASE_URL, same as the schema's datasource.
//
// One client — and therefore one connection pool — per server instance. The
// memoisation is deliberately NOT limited to development: on a serverless host
// the module can be re-evaluated per request, and a fresh client each time means
// a fresh pool each time, which exhausts the Supabase pooler's client limit and
// shows up as intermittent page-load failures that succeed on reload.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

globalForPrisma.prisma = prisma
