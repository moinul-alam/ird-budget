import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { getCloudflareContext } from '@opennextjs/cloudflare/cloudflare-context'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Where the connection string comes from depends on the host.
//
// On Cloudflare Workers it must be the HYPERDRIVE binding. A direct connection from a Worker
// cannot work: workerd validates the server certificate against its own CA bundle and ignores the
// `ca` / `rejectUnauthorized` options, while the Supabase pooler serves a private chain
// (Supabase Root 2021 CA, self-signed) — so every `sslmode` value fails the handshake with
// `UnknownIssuer`. Hyperdrive terminates that TLS itself and gives the Worker a plain local
// socket.
//
// Everywhere else (local `next dev`, Vercel) there is no Cloudflare context and DATABASE_URL is
// used exactly as before.
function databaseUrl(): string {
  try {
    const env = getCloudflareContext().env as { HYPERDRIVE?: { connectionString: string } }
    if (env.HYPERDRIVE) {
      return env.HYPERDRIVE.connectionString
    }
  } catch {
    // No Cloudflare context: not running on Workers.
  }
  return process.env.DATABASE_URL as string
}

// Queries go through the `pg` driver rather than Prisma's own native query engine.
// That engine is a platform-specific binary, which cannot load in Cloudflare's
// workerd runtime — every query there would fail. The driver adapter is plain JS
// over a WASM query compiler, so it works on Workers and on Node (local dev,
// Vercel) identically, keeping one code path for every host.
//
// One client — and therefore one connection pool — per server instance. The
// memoisation is deliberately NOT limited to development: on a serverless host
// the module can be re-evaluated per request, and a fresh client each time means
// a fresh pool each time, which exhausts the Supabase pooler's client limit and
// shows up as intermittent page-load failures that succeed on reload.
//
// It is built on first use rather than at module scope because `getCloudflareContext()` is only
// readable inside a request: a module-scope read would fall back to DATABASE_URL, which on a
// Worker is the pooler connection whose TLS handshake cannot complete.
function createPrisma(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl() }),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma()
  }
  return globalForPrisma.prisma
}

// A Proxy so the ~hundreds of existing `prisma.model.method()` call sites keep working against
// the client built lazily above.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma() as unknown as Record<string | symbol, unknown>
    const value = client[property]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
