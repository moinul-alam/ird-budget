import { cache } from 'react'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { getCloudflareContext } from '@opennextjs/cloudflare/cloudflare-context'

// workerd identifies itself through the user agent — Cloudflare's documented way of telling whether
// code is running on Workers. It matches nothing else: on Node (local `next dev`, Vercel, the
// OpenNext build) `navigator` is either absent or reports `Node.js/…`.
const onWorkers =
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

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
// It is built on first use rather than at module scope because `getCloudflareContext()` is only
// readable inside a request: a module-scope read would fall back to DATABASE_URL, which on a
// Worker is the pooler connection whose TLS handshake cannot complete.
function createPrisma(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl(),
      // Workers only. An isolate is frozen between requests and the runtime kills its sockets, so a
      // connection that outlives its request is dead; the next request that borrows it waits on a
      // socket that will never answer, and Cloudflare cancels the request with "your Worker's code
      // had hung and would never generate a response" — permanently, until the isolate is
      // recycled. Retiring every connection after a single use means none can be handed out again.
      // Off Workers the pool is long-lived on purpose, so connections are reused as usual.
      ...(onWorkers ? { maxUses: 1 } : {}),
    }),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

function getSharedPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma()
  }
  return globalForPrisma.prisma
}

// Which lifetime the client gets depends on the host, and the difference matters:
//
//   Workers  — one client per request. React's `cache()` memoises it for exactly the duration of
//              the request and drops it afterwards, so no pool (and therefore no socket) survives
//              into the frozen isolate. Outside a request `cache()` simply calls through.
//   Node     — one client per process. This memoisation is deliberately NOT limited to
//              development: on a serverless host the module can be re-evaluated per request, and a
//              fresh client each time means a fresh pool each time, which exhausts the Supabase
//              pooler's client limit and shows up as intermittent page-load failures that succeed
//              on reload.
const getPrisma = onWorkers ? cache(createPrisma) : getSharedPrisma

// A Proxy so the ~hundreds of existing `prisma.model.method()` call sites keep working against
// the client built above.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma() as unknown as Record<string | symbol, unknown>
    const value = client[property]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
