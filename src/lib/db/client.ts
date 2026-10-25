import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// One client — and therefore one connection pool — per server instance. The
// memoisation is deliberately NOT limited to development: on a serverless host
// (Vercel) the module can be re-evaluated per request, and a fresh PrismaClient
// each time means a fresh pool each time, which exhausts the Supabase pooler's
// client limit and shows up as intermittent page-load failures that succeed on
// reload.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

globalForPrisma.prisma = prisma
