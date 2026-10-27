# IRD Budget System

Budget estimation and submission system for the **Internal Resources Division (IRD),
Ministry of Finance, Government of Bangladesh**.

Subordinate offices fill twelve requirement forms once per budget cycle. The system computes
a code-wise budget sheet from that data, the office submits it, and administrators roll the
submissions up into reports. The entire interface is Bengali.

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · TailwindCSS v4 ·
Prisma 6 · PostgreSQL (Supabase, plain TCP) · jsPDF / xlsx for export.

***

## Documentation

| File | Read it for |
| ---- | ----------- |
| **[GUIDE.md](GUIDE.md)** | **The single source of truth.** Architecture, data flow, the twelve forms, the calculation engine, the admin surface, how to make a change, every operational command |
| **[SCHEMA.md](SCHEMA.md)** | The database: all 45 tables by domain, how they link, the integrity rules the database enforces, and the retired objects that must not come back |

Start with GUIDE.md. Drop into SCHEMA.md when the question is about a table, a relation, or
what happens when something is deleted.

***

## Quick start

```bash
# 1. dependencies
npm install

# 2. configure .env  (see GUIDE.md §3 — DATABASE_URL and DIRECT_URL both need
#    sslmode=verify-full, and the three secrets below must be set)
#    DATABASE_URL, DIRECT_URL, AUTH_SECRET, OFFICE_DEFAULT_PASSWORD, ADMIN_DEFAULT_PASSWORD

# 3. apply migrations and seed reference data
npm run db:deploy
npm run db:seed

# 4. run
npm run dev
```

The public landing page is at `/` (office login and registration), the admin console at
`/admin/login`.

***

## Common commands

| Command | Does |
| ------- | ---- |
| `npm run dev` | Start the app |
| `npm run build` | `prisma generate` + `next build` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:seed` | Idempotent: admin user + reference data. Fills gaps only |
| `npm run db:seed:hq` | One-time: import NBR head offices from the root spreadsheets |
| `npm run db:drift` | Exits non-zero if the database and `schema.prisma` disagree |
| `npm run db:studio` | Browse the data |
| `npm run db:reset` | **Destructive.** Drop everything, re-apply migrations, re-seed |

> **Never run `npm run db:reset` against a shared database.** It is a local-only command —
> it wipes the data every office has submitted. `db:seed` is always safe; it only creates
> what is missing.

> **Windows:** stop `npm run dev` before `db:generate` or `db:reset`. A running dev server
> holds the Prisma engine DLL and the command fails with `EPERM ... rename
> 'query_engine-windows.dll.node'`.

***

## Repository layout

```
prisma/          schema.prisma (source of truth), migrations/, seed.js
resources/       data files the seed reads; stale SQL historically kept here
src/
  app/           routes — (office)/ portal, (admin)/admin console, actions/ (every mutation)
  components/    ui/ primitives, app-shell, admin-shell, form-shell
  lib/           db client, sessions, bangla formatting, strings, budget/ engine, office/, report/
```

***

## Two rules that explain most of the codebase

1. **No hardcoding.** Any list a user can configure belongs in a table reached by a foreign
   key — never a constant in application code. See GUIDE.md §7.
2. **One source of truth per fact.** Reports recompute through the calculation engine instead
   of storing totals; a submitted budget is frozen as a snapshot. A second copy of a value is
   a bug waiting to happen. See SCHEMA.md §5.3 and §9.
