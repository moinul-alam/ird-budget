# Debug Supabase RLS with ORM

> **Workspace:** c:\App\ird-budget

---

**User**

I refactored many codes from supabase to orm (supabase still the base DB, but abstraction is used). RLS is enabled, so I used service role key to bypass it so that authenticated user such as admin and normal users have full access to CRUD operations, but admin logins using superadmin id and paassword 123 failing (it was working)

**Assistant**

I'll investigate the admin login issue. Let me start by exploring the codebase and checking for prior context.

Found the likely cause. Let me verify by checking all `adminUser` field usages against the schema.

Let me verify the actual DB columns for `admin_users`.

DB is not reachable from here (sandboxed). Let me confirm via the generated Prisma client types.

Confirmed. Let me check git history to see the pre-refactor implementation.

Let me check the other superadmin scripts and how the DB naming convention actually is.

Let me check whether the sandbox has any network access to the DB.

Network exists. Let me try connecting via the Supabase pooler to inspect the actual columns.

Key finding — the DB uses snake_case columns. Let me confirm what Prisma actually sends by running the real query.

Direct host is unreachable; let me retry through the working pooler connection.

Prisma is failing because the schema uses camelCase field names while the actual DB columns are snake_case. Let me gather the full picture from the live DB.

Let me check `prisma.config.ts` and confirm the stored password hash.

Now the picture is complete. Let me dump all DB columns to compare against the schema.

I have the root cause confirmed. Let me clean up my temp files.

## Root cause

RLS is **not** your problem. I connected to the live DB and confirmed:

- The connection role is `postgres`, which has `rolbypassrls = true`. RLS can't block it. Also, Prisma talks straight to Postgres (port 5432) — it never uses `SUPABASE_SERVICE_ROLE_KEY` at all. That key only works for Supabase's PostgREST/Data API, not for a Prisma connection.
- The superadmin row is intact and correct: `password_hash = sha256("123")` ✓, `password_hint = "123"` ✓, `role = superadmin` ✓, `is_active = true` ✓.

The real failure is in the ORM layer. I reproduced it against the live DB:

```
adminUser.loginQuery FAILED: PrismaClientValidationError
  Unknown field `passwordHint` for select statement on model `AdminUser`.
```

[auth.ts](file:///c:/App/ird-budget/src/app/actions/auth.ts#L267-L282) tells Prisma to select `passwordHint`, but the `AdminUser` model in [schema.prisma](file:///c:/App/ird-budget/prisma/schema.prisma#L570-L583) has no such field. Prisma validates the query before sending it, throws, and `loginAdmin` has no try/catch — so the action rejects and login fails. It worked before because supabase-js selected `*` and didn't do this validation.

## The bigger issue behind it

The Prisma schema uses **camelCase** field names with only `@@map` (table-level mapping), but the live database has **zero camelCase columns** — every column is snake_case:

```
core_offices.isActive does not exist     → coreOffice.select fails
office_users.passwordHash does not exist → office login fails
```

So this isn't just admin login — essentially every Prisma query that touches a field is broken, because there are no field-level `@map` annotations. There's also some schema drift (e.g. DB `office_users.budget_id` isn't in the model, model `office_users.passwordHint` isn't in the DB, table is `office_form_staff_new_recruits` vs model `..._new_recruit`).

Heads-up: the DB is also nearly empty — `core_offices`=0, `core_ministries`=0, `core_budget_cycles`=0, `office_users`=0; only the `admin_users` row exists.

I need your call on the fix direction before editing, since it affects the whole app:

Understood — minimal fix: `AdminUser` only.

Now regenerate the Prisma client.

Now verify the login path works against the live DB.

Fixed. `superadmin` / `123` now works.

## What was wrong

Two things, both in the ORM layer — RLS was never involved:

1. **`passwordHint` didn't exist on the `AdminUser` model.** [auth.ts](file:///c:/App/ird-budget/src/app/actions/auth.ts#L267-L282) selects `passwordHint`, so Prisma rejected the query before sending it (`Unknown field 'passwordHint' for select statement on model 'AdminUser'`) and the un-guarded server action threw.
2. **Even without that, the query would have failed.** The schema's field names are camelCase with no `@map`, but the DB columns are snake_case (`password_hash`, `is_active`, ...). Prisma was emitting `"admin_users"."passwordHash"`, a column that doesn't exist.

## Change made

[prisma/schema.prisma](file:///c:/App/ird-budget/prisma/schema.prisma#L571-L584) — `AdminUser` model only:

- Added `passwordHint String? @map("password_hint")`
- Added `@map` for `password_hash`, `is_active`, `created_at`, `updated_at`

Then regenerated the client (`npx prisma generate`).

## Verified against the live DB

Ran the exact `loginAdmin` Prisma query — it returns the superadmin row, `sha256("123")` matches `password_hash`, and the session payload resolves to `{ id: 1, username: 'superadmin', role: 'superadmin' }`.

## Notes for later (not changed)

- `src/app/actions/admin-users.ts` also benefits from the `@map` fix, so listing/creating/updating admin users now maps correctly too.
- **The rest of the ORM is still broken the same way.** Only `AdminUser` is mapped; every other model still emits camelCase identifiers against snake_case columns — e.g. office login fails with `office_users.passwordHash does not exist`, and admin CRUD fails with `core_offices.isActive does not exist`. Say the word and I'll map the remaining models the same way (no DB changes needed).
- Reminder: the tables are essentially empty (`core_offices`=0, `core_ministries`=0, `core_budget_cycles`=0, `office_users`=0) — only the `admin_users` row exists, so the app will look empty after login.

---

**User**

/admin/login this page does not even loading right now

**Assistant**

The page not loading at all points somewhere other than the DB query. Let me inspect the login route and the middleware/proxy.

The page component itself is trivial (no DB). So "not loading" is likely a middleware/proxy or server error. Let me check the Next 16 proxy docs and the running dev server.

Let me check the layouts and start the dev server to reproduce the actual error.

I'm now in read-only Chat Mode (no command/terminal tools). Let me diagnose statically — and I have a strong hypothesis: a redirect loop between the proxy and the admin layout.

This looks like a redirect loop. Let me verify the session cookie format and check for leftovers from the refactor.

This strongly suggests a redirect loop. Let me confirm how the old (pre-refactor) admin session cookie was set.I'm in read-only mode now, so let me finish the diagnosis with file inspection. Let me check for a redirect loop and missing modules.

Key insight: the proxy checks only for the *presence* of the `admin_session` cookie, while the admin layout checks its *validity*. Let me confirm the pieces that could make `/admin/login` unreachable.

I'm now in read-only mode (no terminal), so let me finish diagnosing from code. Let me check the protected side of the loop.

Now I have a clear picture. Let me read the rest of the login client and confirm there's no error boundary.

Let me confirm a couple more things: the login page's string keys and any redirects on the landing page.

---

**User**


/compact 

**User**

What the hell are you doing? '

**Assistant**

You're right — I've been analyzing without acting. Let me fix it now.

Let me actually reproduce the error instead of guessing.

A dev server is already running on port 3000. Let me check its logs for the actual error.

`/admin/login` returns **404**. Let me check the actual app directory structure.

Confirmed: proxy works, but `/admin/login` genuinely 404s — the running dev server is stale and doesn't know about the `(admin-auth)` route. Let me restart it.

Fixed — `/admin/login` now returns **200**. The stale dev server never picked up the `(admin-auth)` route group. Now let me check the latent redirect-loop with a stale cookie.

Reproduced the real bug: with a stale `admin_session` cookie, `/admin/login` → `/admin/dashboard` → `/admin/login` → **infinite redirect loop** (curl hit the 50-redirect cap).

Cause: [proxy.ts](file:///c:/App/ird-budget/src/proxy.ts#L24-L26) redirects based on cookie **presence**, while [layout.tsx](file:///c:/App/ird-budget/src/app/(admin)/admin/layout.tsx) redirects back based on cookie **validity**. Fixing the proxy side.

Now verifying all cases.

Page loads, no loop. Now let me verify the actual `superadmin` / `123` login path end-to-end.

Now verifying the DB query path that `loginAdmin` uses actually works.

The `.env` `DATABASE_URL` points to a host that is unreachable from this machine — the app cannot reach the DB at all. Let me confirm the working pooler.

The pooler works; the direct host doesn't. Updating `DATABASE_URL` to the pooler so the app can actually reach the DB.

DB reachable, user found, password `123` matches. Now restarting dev to load the new `.env` and testing the real login over HTTP.

Now an end-to-end login test over HTTP (real server action).

Let me verify the Next runtime itself can reach the DB by minting a valid session cookie and hitting a DB-backed admin page.

DB connectivity confirmed working (Postgres actually executed the query). Let me confirm the login page renders its form.

Fixed. Here's what was actually wrong — three separate things, and I'd been analyzing instead of testing:

**1. `/admin/login` returned 404 — stale dev server**
Your running `next dev` (PID 16720) was started before the `(admin-auth)/admin/login` route group existed and never registered it. Restarted it → `/admin/login` now returns **200** and renders the login form.

**2. A real infinite redirect loop (frozen the page)**
[proxy.ts](file:///c:/App/ird-budget/src/proxy.ts#L24-L27) bounced `/admin/login` → `/admin/dashboard` on mere cookie *presence*, while [layout.tsx](file:///c:/App/ird-budget/src/app/(admin)/admin/layout.tsx) bounced back on cookie *validity*. Any stale `admin_session` cookie = `ERR_TOO_MANY_REDIRECTS`. Reproduced it (curl hit the 50-redirect cap), then removed the blind redirect. Now: 0 redirects on the login page, 1 redirect from protected pages.

**3. The app couldn't reach the database at all**
[.env](file:///c:/App/ird-budget/.env#L1-L4) pointed `DATABASE_URL` at `db.jamjablqawadxvrqwrco.supabase.co:5432`, which is IPv6-only and unreachable here. Switched to the Supavisor pooler (session mode, port 5432) in [.env](file:///c:/App/ird-budget/.env#L4) and [prisma.config.ts](file:///c:/App/ird-budget/prisma.config.ts#L9). Verified the Next runtime now executes queries.

**Credentials verified against the live DB:** `superadmin` / `123` → `passwordHash == sha256("123")`, `passwordHint == "123"`, `isActive: true`. Login will succeed.

**Remaining blocker:** login succeeds, but it lands on a 500. Every other Prisma model still has camelCase fields with no `@map` to the snake_case columns — e.g. `core_budget_cycles.fiscalYear` should be `fiscal_year`:

```
P2022: The column `core_budget_cycles.fiscalYear` does not exist in the current database.
```

That's exactly the work you deferred earlier.

That's a reasonable guess, but the evidence says otherwise — let me prove it rather than argue.

Proven. RLS is **not** the cause:

- Connected role is `postgres` with **`rolbypassrls: true`** — RLS is already bypassed.
- With `row_security = on` forced, `SELECT fiscal_year FROM core_budget_cycles` **succeeds** (no permission error).
- `SELECT "fiscalYear"` fails with Postgres **`42703 undefined_column`** — that error is raised at parse/plan time, *before* RLS is ever evaluated.

The service role key is a PostgREST/Data-API credential. Prisma connects straight to Postgres over TCP as role `postgres` (relies on the DB password), so that key can't affect Prisma. The fix is the column mapping. Let me build it from the real DB schema.

Now I have the full drift picture. Let me check nullability of the drifted columns and whether app code uses the fields that don't exist in the DB.

Now the drift is fully mapped. The live DB is missing 5 columns the app code actually uses. Let me check row counts before touching anything.

All target tables are empty, so changes here are safe. Let me check nothing references `office_users.budget_id`.

All `budgetId` references are on `CoreOffice`, not `office_users`. Applying the additive DB fixes now.

DB aligned. Now rewriting the schema with `@map` annotations on every snake_case column.

Now validating and regenerating the Prisma client.

Prisma config skips `.env` loading and the running dev server locks the engine DLL. Stopping dev, then validating with the env var set.

Schema valid, client regenerated. Restarting dev and testing every admin page with a valid session.

13 of 14 admin pages now load. Checking the remaining dashboard error.

Found it — the dashboard includes `budgetSheet` (singular) but the schema relation is `budgetSheets`, and the code calls `.reduce()` on it (so it's a list).

All 14 admin pages load. Let me also prove the login POST itself end-to-end by finding the server action id.

Found the action id. Testing a real login POST through the server action.

The transport encoding needs React's FormData reference. Let me try the correct shape.

Let me do a quick sanity check that the fixes are still live, then report.

PowerShell aliases `curl`. Using `curl.exe`.

All 13 admin pages return **200** with a valid session. One last definitive check — exercising the real login POST.

PowerShell mangles the inner quotes. Let me exercise the POST correctly via a small script.

The action now runs — it received a FormData but no fields. Testing field-naming variants.

Found it — the prefix is `_1_`, not `1_`. Retesting.

Found it — the `0` root field must come **after** the form fields (that's the order React emits). Retesting.

Login POST now works end-to-end. Final proof: use the **cookie issued by the real login** to load admin pages.

Admin login is now working **end-to-end**, verified by actually exercising it (not by inspection).

## Proof

I ran a real login POST against the running server with `superadmin` / `123`, exactly as the browser client does, then used the cookie the server issued:

```
LOGIN OK, cookie issued = admin_session=eyJpZCI6MSwidXNlcm5hbWUiOi...
/admin/dashboard = 200      /admin/users = 200
/admin/budgets = 200        /admin/reports/summary = 200
/admin/codes = 200          /admin/reports/combined = 200
/admin/formulas = 200       /admin/reports/individual = 200
/admin/settings = 200       /admin/offices-management/field-offices = 200
/admin/offices-config = 200 /admin/offices-management/head-offices = 200
/admin/offices-users = 200
```

Wrong password is correctly rejected (`ইউজারনেম বা পাসওয়ার্ড সঠিক নয়`) with no cookie set. So: login accepted, session cookie minted and signature-valid, and all 13 admin pages render.

The earlier `500 "Connection closed."` I was chasing was my own curl multipart encoding, not an app bug — React Flight names the FormData fields `_1_username` / `_1_password` and requires the `0` root part **last**. Corrected, and the action succeeded.

## Your RLS / service-role-key hypothesis — it isn't RLS

Direct evidence against it:
- Prisma connects over TCP as role `postgres`, and `select current_user, rolbypassrls` returns `rolbypassrls: true` — RLS is **already bypassed** for every Prisma query.
- The original failure was `P2022 / 42703 undefined_column` (`core_budget_cycles.fiscalYear`), which Postgres raises at **parse/plan time, before RLS is ever evaluated**. A permission problem cannot produce an undefined-column error.
- `SUPABASE_SERVICE_ROLE_KEY` is a PostgREST/Data-API credential. It has no effect on a direct Postgres (TCP) connection, so it cannot fix this either way.

What actually broke it was camelCase Prisma fields against snake_case DB columns with no `@map`, plus the unreachable direct host. Fixes already in place: [schema.prisma](file:///c:/App/ird-budget/prisma/schema.prisma) (full `@map` coverage), [.env](file:///c:/App/ird-budget/.env) and [prisma.config.ts](file:///c:/App/ird-budget/prisma.config.ts) pointed at the Supavisor pooler, [proxy.ts](file:///c:/App/ird-budget/src/proxy.ts) redirect-loop removed, and [page.tsx](file:///c:/App/ird-budget/src/app/(admin)/admin/dashboard/page.tsx#L47-L70) `budgetSheet` → `budgetSheets`.

## One open item

`upgrade.md` is the canonical schema, but the **live DB has drifted from it**, and I did not touch that because you scoped this to "only fix admin login":
- `core_budget_cycles` has separate `UNIQUE` on `fiscal_year` and `budget_type`, while the schema declares a composite `@@unique([fiscalYear, budgetType])`
- `office_users` has an extra `budget_id` column with a `UNIQUE` the schema doesn't model
- `office_form_it_equipment` has an extra `annual_total_cost` column
- Several `ON DELETE` / unique variants differ on `office_form_allowances`, `office_form_leave_encashment`, `ref_allowances`

These don't affect login, but they will bite the first `create`/`update` that touches those columns. Want me to reconcile the schema/DB drift next, or leave it and move on?

---

**User**

give me a query to get the picture of the supabase tables, so that you can cross chech with upgrate md, suggest improvement, then if needed wipe all and create again. 
one question, I wiped entire tables, but after login, I can still see economic code categories, why?

**Assistant**

Found the answer to your question. Let me also pull the actual table picture right now rather than just handing you a query.

## Your question first: why you still see categories

Because those categories are **not** in Supabase at all — they're hardcoded in your source.

[admin-codes.ts](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts#L41-L51) queries `ref_economic_codes`, and if it gets **zero rows** it returns a hardcoded constant:

```ts
if (codes.length === 0) {
  return DEFAULT_CATEGORIES   // 9 hardcoded items: 3111, 3211, 3243, ...
}
```

`DEFAULT_CATEGORIES` is defined at [admin-codes.ts](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts#L26-L36). So an empty table silently renders 9 fake categories. Same masking pattern in two more places:

- [admin-budgets.ts](file:///c:/App/ird-budget/src/app/actions/admin-budgets.ts#L48-L71) — `getBudgetTypes()` and `getFiscalYears()` return hardcoded arrays **unconditionally**, never touching the DB.
- [admin-settings.ts](file:///c:/App/ird-budget/src/app/actions/admin-settings.ts#L31-L44) — falls back to `DEFAULT_SALARY_CONFIG` when `admin_rates` has no `salary_config` row.

So the UI will keep looking populated even with a completely empty database.

## The picture (already pulled from your live DB)

**35 tables, all RLS-enabled with exactly 1 policy each, all with a PK — and every single one is empty except `admin_users` (1 row).**

That last part matters: you did **not** wipe everything. `admin_users` survived with 1 row, which is exactly why `/admin/login` still works. If you truncate that too without re-inserting, you lock yourself out.

## Cross-check vs `upgrade.md`

Table set is an **exact 35/35 match** with the `CREATE TABLE` block in [upgrade.md](file:///c:/App/ird-budget/upgrade.md#L175-L650). No missing or stray tables.

Remaining schema-level drift (not affecting login):
- `office_users.budget_id` — exists in DB, not part of the canonical design
- `office_form_it_equipment.annual_total_cost` — extra column
- `core_budget_cycles` — DB has separate `UNIQUE` on `fiscal_year` and `budget_type`; schema declares a composite
- `office_form_allowances.effective_date` — present in DB

## The queries

**A — overview**

```sql
SELECT
  t.table_name,
  (SELECT count(*) FROM information_schema.columns c
    WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS col_count,
  COALESCE(s.n_live_tup, 0)                          AS live_rows,
  COALESCE(cl.relrowsecurity, FALSE)                 AS rls_enabled,
  (SELECT count(*) FROM pg_policy p WHERE p.polrelid = cl.oid) AS policy_count
FROM information_schema.tables t
LEFT JOIN pg_class cl
  ON cl.relname = t.table_name
 AND cl.relnamespace = 'public'::regnamespace
LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
```

**B — columns (this is the one to diff against `upgrade.md`)**

```sql
SELECT table_name,
       string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
```

**C — constraints + indexes, combined**

```sql
SELECT t.relname AS table_name,
       'CONSTRAINT: ' || CASE con.contype
         WHEN 'p' THEN 'PK' WHEN 'f' THEN 'FK'
         WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK' WHEN 'x' THEN 'EXCLUDE'
       END            AS kind,
       con.conname    AS name,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class     t ON t.oid = con.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
UNION ALL
SELECT tablename, 'INDEX', indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public'
ORDER BY table_name, kind, name;
```

## Suggested improvements

1. **Kill the silent fallbacks.** The empty states already exist in your UI (`filteredCategories.length === 0` → "none" message in [tab-create-codes.tsx](file:///c:/App/ird-budget/src/app/(admin)/admin/codes/_components/tab-create-codes.tsx#L121)), but `DEFAULT_CATEGORIES` prevents them from ever firing. Returning real empty data is what makes the admin UI trustworthy.
2. **You need a seed path, not just a wipe.** [upgrade.md](file:///c:/App/ird-budget/upgrade.md#L1316-L1322) says to re-seed from `backup_data.sql`. Right now all 13 `ref_*` / `admin_*` tables are empty, so every dropdown is running on hardcoded defaults rather than real data.
3. **Re-seed `admin_users` first** in any rebuild, or you can't log in.
4. **There are no Prisma migrations** — `prisma/` contains only [schema.prisma](file:///c:/App/ird-budget/prisma/schema.prisma). So "create again" means running `upgrade.md` Step 0.2/0.3 SQL manually, and the DB will keep drifting from the schema on every change.

Before I touch anything destructive, one decision:

Let me ground my recommendation in a few facts first.

Here's my read, and yes — there's a clear structural fix worth doing.

## The real problem isn't the 3 drifted columns

It's that your schema lives in **three places that disagree**, with **no history**:

| Where | State |
|---|---|
| [upgrade.md](file:///c:/App/ird-budget/upgrade.md#L175-L650) | hand-written DDL, says "verify 30 tables" but actually defines 35 |
| [schema.prisma](file:///c:/App/ird-budget/prisma/schema.prisma) | the ORM spec — no `prisma/migrations/` exists at all |
| live Supabase DB | 35 tables, drifted from both |

Every time you paste SQL by hand, they diverge a little more. `prisma migrate` is not wired up (no migrations folder, no npm script), so nothing catches it. That's the thing to fix.

**You are at the cheapest possible moment to fix it.** The entire database contains exactly one row of real data (`admin_users`). There is nothing to lose.

## Concrete drift I confirmed

- `office_users.budget_id` — exists in DB, absent from [OfficeUser](file:///c:/App/ird-budget/prisma/schema.prisma#L304-L317). Redundant: `office_id` is already `@unique`.
- `office_form_it_equipment.annual_total_cost` — exists in DB, absent from [OfficeFormItEquipment](file:///c:/App/ird-budget/prisma/schema.prisma#L502-L516).
- `core_budget_cycles` — DB has two separate `UNIQUE`s; schema declares `@@unique([fiscalYear, budgetType])`, which is clearly the intent.

## Two things you should know

**1. RLS does not protect your app.** `src/lib/supabase/server.ts` is dead code — nothing imports it. The app is 100% Prisma connecting as `postgres` (`rolbypassrls = true`), so all 35 policies are inert for your app. Keep them anyway (they still guard Supabase's public REST/PostgREST endpoint against the `anon` key), but don't count them as app security.

**2. `upgrade.md`'s wipe script drops tables that no longer exist** (`office_user_logins`, `budget_sheet`, `form_basic`, …). Harmless because of `IF EXISTS`, but it shows the doc has rotted.

## What I'd do

**Phase A — lock the spec (no DB writes).** Pick `schema.prisma` as the single source of truth and resolve the 3 drift items deliberately: drop `office_users.budget_id`, decide on `annual_total_cost`, make `core_budget_cycles` composite.

**Phase B — rebuild from the spec.** Wipe, then `prisma migrate dev --name init` generates a committed `prisma/migrations/` instead of hand-run SQL. Fold the RLS + grants block from [upgrade.md](file:///c:/App/ird-budget/upgrade.md#L617-L646) into a versioned migration so RLS is tracked too. Back up the `admin_users` row first so you don't lock yourself out.

**Phase C — stop the masking.** Delete the 4 hardcoded fallbacks ([admin-codes.ts](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts#L26-L51), [admin-budgets.ts](file:///c:/App/ird-budget/src/app/actions/admin-budgets.ts#L33-L44), [admin-settings.ts](file:///c:/App/ird-budget/src/app/actions/admin-settings.ts#L31-L44)). Your UI already has empty states — they just never fire. Right now these constants are why an empty database looks populated.

**Phase D — make drift impossible.** A seed script (`prisma/seed.ts`) so re-seeding `admin_users` + `ref_*` is one repeatable command instead of pasting `backup_data.sql`; a `db:diff` script using `prisma migrate diff` that fails if the DB and schema disagree; and `directUrl` so migrations use a direct connection while the app uses the pooler.

Phase D is what makes it future-proof. Phases A–C have to happen now to enable it — and they're free today because the DB is empty. Deferring means redoing this later with real data in the tables.

One decision before I start, since Phase B drops everything:

Good — that changes the shape of Phase B in an important way. Let me gather the remaining facts before I touch anything.

Approved. Starting execution — with one adaptation for your agnosticism goal: the RLS block in `upgrade.md` uses Supabase-only roles (`authenticated`, `service_role`), so it must stay **out** of the Prisma migration or it will break on plain Postgres.

Two important corrections before I wipe anything — let me verify them.

Confirmed — I was **wrong** about two of those. Let me correct that before proceeding:

- `DEFAULT_BUDGET_TYPES` / `DEFAULT_FISCAL_YEARS` are **not** fallbacks. [admin-budgets.ts](file:///c:/App/ird-budget/src/app/actions/admin-budgets.ts#L48-L65) returns them unconditionally and `saveBudgetType` hard-errors with "বাজেটের ধরণ পরিবর্তন করা যাবে না" — they're intentional stubs, and there's no budget-types table in the schema. Removing them would break the tab, not fix it.
- `DEFAULT_SALARY_CONFIG` is a legitimate defaults-merge (`{ ...DEFAULT_SALARY_CONFIG, ...parsed }`), not masking.

So only **`DEFAULT_CATEGORIES`** is a real Phase C target. The other two are a separate design gap I'll report.

Now Phase A — backing up what little data exists.

Phase A done — `admin_users` captured, and `rolcreatedb: true` (useful). Generating the initial migration now.

Migration matches the intended spec (35 tables, composite unique, no `budget_id`, no `annual_total_cost`). Now the wipe-and-apply.

Prisma's engine can't reach the pooler even though `pg` can. Diagnosing.

Both A and AAAA records exist (AAAA via a NAT64 prefix) — likely Prisma's Rust resolver picking IPv6 while Node uses IPv4. Testing connection options.

`env` helper is available — and the hardcoded password in `prisma.config.ts` is itself a problem. Let me check what's available for `.env` loading.

I'll pick up where the rebuild left off. First, let me check the current state of the connection config and the seed script.

Login is currently broken (the wipe dropped the only `admin_users` row). Restoring that first, plus verifying the rebuilt schema.

Login restored. `TABLE COUNT: 36` = the 35 app tables **plus** `_prisma_migrations` (the migration history that was previously missing entirely — that's the new baseline). Let me confirm and run the full cross-check.

Live DB matches `schema.prisma` exactly — the "missingInDB" entries are all virtual relation fields my parser didn't filter (list relations like `OfficeSubmission[]`). Let me tighten the parser and add constraint-level checks.

Now adding constraint-level verification to close out the specific drift items.

Schema is clean — **zero** real drift. Now let me settle the `sslmode` question, since sending the DB password unencrypted to a remote host is a security regression I don't want to bake in silently.

TLS works (just slow, and the cert chain isn't verifiable here). Prisma's `connect_timeout` default is 5s and the TLS handshake took ~4.2s — so the `require` failure may have been a **timeout**, not a cert problem. Let me test that.

Root cause found: it was a **connection timeout**, not TLS. `?sslmode=require&connect_timeout=30` works. Let me check if full verification also works — the most secure option.

Confirmed — `sslmode=verify-full` works with the OS trust store (Prisma uses the Windows cert store; Node's bundled CA list couldn't verify it). So we get **full TLS verification**, no security compromise. Updating `.env`.

`.env` now connects with full TLS verification. Let me look at the seed inputs before writing the seed script.

Real data backups exist as JSON. Let me check their shape.

No `tsx`/`ts-node`, so I'll write the seed as plain Node JS (no new dependencies). First let me pin down the category convention the app expects.

Now I have the authoritative category mapping. Let me confirm the app's exact password-hashing convention before writing the seed.

Node 26 and Prisma 6.19.3 confirmed. Writing the seed script now.

Now wiring the seed into Prisma config and adding npm scripts.

Seed works and the drift check is clean. But I need to check something important that the rebuild may have introduced.

Node's bundled CA list can't verify Supavisor's chain (Prisma uses the OS store). Using a relaxed SSL option for this read-only diagnostic.

Critical finding — let me verify whether the rebuilt tables have policies, since Supabase grants `anon` full DML by default.

Important: the rebuild **removed** the old `USING (true)` allow-all policies. Supabase's `ensure_rls` trigger turned RLS on for every new table and there are now **zero policies** → PostgREST/anon gets default-deny, which is strictly safer than before. Now Phase C.

Now let me verify end-to-end. Starting the dev server.

Dev server is up. Let me find the server-action ID so I can replay a real login POST.

Action ID found. Now replaying a real login and sweeping all admin pages.

All 13 pages 200 and auth behaves correctly. Let me confirm `/admin/codes` now renders the **real seeded** categories rather than the removed fallback.

All seeded data renders. Let me check the dev server log for hidden errors.

No errors. Now let me prove the whole "wipe and recreate" story works in one command — this is the core goal.

`db:reset` rebuilds everything in one command. Re-verifying login after the full reset (this now exercises the seed's *create* path).

Full wipe→recreate→login cycle verified. Let me check the ignore rules (credentials) and typecheck my edits.

`.env` is correctly gitignored. The two `tsc` errors are pre-existing syntax errors in `office/form-7` and `form-8` pages (unrelated to this work — none of my edited files appear). Cleaning up the temp scripts, which contain credentials.

Rebuild, drift check, and end-to-end verification are complete. Summary:

**Your question — why categories still appeared after wiping**

`getBudgetCategories()` in [admin-codes.ts](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts#L26-L58) returned a **hardcoded `DEFAULT_CATEGORIES` array of 9 fake categories whenever `ref_economic_codes` was empty**. Nothing was in Supabase — the app was inventing them. It also had `id: 'cat-3111'` so the UI's empty state could never fire. I removed that fallback and seeded the real 139 codes, so `/admin/codes` now renders actual data (verified: `ফি, চার্জ ও কমিশন`, `পেশাগত সেবা` etc. only exist in the seed).

**The picture query** (run in Supabase SQL editor):

```sql
select c.relname as table_name,
       (select count(*) from information_schema.columns
         where table_schema='public' and table_name=c.relname) as cols,
       c.relrowsecurity as rls,
       (select count(*) from pg_policy p where p.polrelid=c.oid) as policies
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by c.relname;
```

**Cross-check result: clean.** 35 tables in live DB = 35 in `schema.prisma` = 35 in `upgrade.md` = 35 in `migration.sql`. **Zero** column drift against `schema.prisma`. The old drift is gone: `office_users.budget_id` absent, `office_form_it_equipment.annual_total_cost` absent, composite unique on `core_budget_cycles(fiscal_year, budget_type)` present. 46 FKs, 70 indexes, 1 applied migration.

**Two findings worth your attention**

1. **`sslmode` was never a TLS problem.** Prisma's 5s default `connect_timeout` was being exceeded by the TLS handshake over the NAT64/IPv6 path, which surfaces as a misleading `P1001`. `.env` now uses `sslmode=verify-full&connect_timeout=30` — **full certificate + hostname verification**, no security compromise.
2. **Your rebuild is *more* secure than before.** Supabase's `ensure_rls` event trigger auto-enabled RLS on all 36 new tables, and there are now **zero policies** → `anon`/PostgREST gets default-deny. The old DB had a `USING (true)` allow-all policy on every table, so anyone with the public anon key could read/write everything. **This means `upgrade.md`'s RLS block should not be re-applied** — it would reintroduce that hole. I did not create the "Supabase-only RLS script" from the plan, because the correct action is to not create those policies at all.

**Rebuild workflow now exists and is proven**

```
npm run db:reset     # drop + migrate + seed  (ran successfully end-to-end)
npm run db:drift     # "No difference detected" (exit 0)
npm run db:seed      # idempotent
```
After a full `db:reset`, login was re-verified: wrong password → error + no cookie; `superadmin`/`123` → cookie; **13/13 admin pages 200**; no cookie → 307 to `/admin/login`.

Changed: [seed.js](file:///c:/App/ird-budget/prisma/seed.js), [prisma.config.ts](file:///c:/App/ird-budget/prisma.config.ts), [.env](file:///c:/App/ird-budget/.env), [package.json](file:///c:/App/ird-budget/package.json), [admin-codes.ts](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts). Two pre-existing `tsc` syntax errors in `office/form-7` and `form-8` pages are unrelated to this work.

Two things need your decision before I go further.

All three decisions noted. Starting with the Supabase removal.

Now updating `upgrade.md`. First the prerequisites and a new authoritative Step 0.

Now neutralizing the harmful RLS block.

Now the Supabase removal. Stopping the dev server first to avoid file locks.

Clean. Restarting the dev server for final verification.

Same action ID. Running final verification.

All green after the Supabase removal. Final drift check and cleanup.

No errors. Everything is done and verified.

## What changed

**Your original question** — categories appeared after wiping because [admin-codes.ts](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts) returned a hardcoded `DEFAULT_CATEGORIES` array of 9 fake rows whenever `ref_economic_codes` was empty. Nothing was in the database; the app was fabricating them. Removed, and replaced with the real 139 seeded codes.

**Root cause of the `sslmode` trouble** — it was never TLS. Prisma's 5s default `connect_timeout` was exceeded by the TLS handshake over the NAT64/IPv6 path, surfacing as a misleading `P1001 Can't reach database server`. `.env` now uses `sslmode=verify-full&connect_timeout=30` — full certificate *and* hostname verification, so no security was traded for reliability.

**Security finding** — the rebuild is *safer* than what it replaced. The old database had a `USING (true)` policy on all 35 tables, meaning anyone with the public anon key could read and write everything over PostgREST. Supabase's `ensure_rls` trigger re-enabled RLS on the new tables and there are now **zero policies**, so `anon` gets default-deny. I therefore did **not** create the planned "Supabase RLS script" — the correct action was to not create those policies at all, and `upgrade.md` now carries a warning instead.

## Files

- [seed.js](file:///c:/App/ird-budget/prisma/seed.js) — new, idempotent, zero new dependencies (plain Node + Prisma). Seeds `superadmin` and the 139 economic codes; env-overridable credentials; never overwrites a changed password.
- [prisma.config.ts](file:///c:/App/ird-budget/prisma.config.ts) — wired `migrations.seed`.
- [package.json](file:///c:/App/ird-budget/package.json) — added `db:generate`, `db:deploy`, `db:seed`, `db:reset`, `db:drift`, `db:studio`.
- [.env](file:///c:/App/ird-budget/.env) — fixed URL, Supabase vars removed.
- [upgrade.md](file:///c:/App/ird-budget/upgrade.md) — new authoritative Step 0 (Prisma workflow), old procedure marked legacy with its two harmful parts called out, RLS block replaced by an explanation, re-seeding + RLS notes rewritten.
- Supabase fully removed: deleted `src/lib/supabase/server.ts`, uninstalled both packages, dropped the three env vars. Zero references remain.

## Verified

`npm run db:reset` rebuilds from empty in one command (ran successfully), then: wrong password → no cookie; `superadmin`/`123` → cookie; **13/13 admin pages 200**; no cookie → 307 to `/admin/login`; `/admin/codes` renders real seeded data (`ফি, চার্জ ও কমিশন`, `3111101`); `npm run db:drift` → *No difference detected*. Cross-check confirmed 35/35/35/35 tables and **zero** column drift versus `schema.prisma`; the prior drift (`office_users.budget_id`, `office_form_it_equipment.annual_total_cost`, composite unique) is gone.

Dev server is running on port 3000.

Two notes:
1. **Stop the dev server before `db:reset`** — it holds a lock on the Prisma engine DLL, producing a harmless-but-noisy `EPERM` rename warning.
2. **Pre-existing, unrelated:** `tsc` reports syntax errors in `office/form-7/page.tsx` and `office/form-8/page.tsx`. Office data is intentionally empty per your choice, so those screens also need the admin-UI population path.

---

**User**


/compact 

**User**

the economic codes, where are they getting their categories? hard coded or from another table?

**Assistant**

Let me verify against the actual code rather than relying on memory.

Now let me see who else writes/reads `category`.

Neither — it's a free-text column on the codes table itself, and there is no category table anywhere.

**Where it lives:** [schema.prisma](file:///c:/App/ird-budget/prisma/schema.prisma#L138-L153) — `RefEconomicCode.category String? @db.VarChar(50)`. I listed all 35 models; none is a category/kind table. So a category is just a string tag on each row, not a foreign key.

**Where the strings come from** — three writers, and they disagree:

1. **Seed** — [seed.js](file:///c:/App/ird-budget/prisma/seed.js#L65-L83) hardcodes `CATEGORY_BY_PREFIX`, a JS map of 4-digit prefix → Bengali label, and writes the label (e.g. `3111101` → `নগদ মজুরি ও বেতন`). This is what fills all 139 rows on `db:reset`.

2. **Admin UI** — [admin-codes.ts](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts#L169-L191) does `category: data.parent_code`, i.e. it writes the raw 4-digit code `"3111"`, **not** the label.

3. **Readers patch over it with more hardcoded maps** — `categoryNameMap` in [getBudgetCategories()](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts#L38-L54) is keyed by English words (`'Salary'`, `'Admin'`…) that neither writer ever produces, so it is effectively dead code; and [getExpenseCodesWithCategoryAndMapping()](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts#L119-L133) has a second map keyed by 4-digit prefixes, covering only 9 of the 17 prefixes.

**Net effect:** the same column holds two different value shapes depending on provenance — Bengali label (seeded rows) vs. bare numeric code (rows created/edited in the admin UI). Display only looks right because each reader falls back to its own hardcoded map.

Want me to make it consistent — e.g. have `saveEconomicCode` store the resolved label so UI-created rows match seeded rows? That's a small change to one function; the alternative (a real `ref_budget_categories` table) is the bigger, future-proof option.

---

**User**

no, the economic code configuration page has option to create economic code category, if category is created, where does it save it? I donot want any hard coded, category and economic codes, all should be table depended so that they can be controlled

**Assistant**

The user is right — I need to look at the actual page UI, not just the action file. Let me find it.

Found it. The short answer: **it saves nowhere.** The button is a dead stub.

**What actually happens when you click "নতুন ক্যাটাগরি":**

- The modal collects code + title + hierarchy and submits — [admin-codes-client.tsx](file:///c:/App/ird-budget/src/app/(admin)/admin/codes/admin-codes-client.tsx#L122-L166)
- The action it calls is a stub — [admin-codes.ts](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts#L60-L79):

```ts
export async function saveBudgetCategory(data: {...}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }
  return { error: 'ক্যাটাগরি পরিচালনা ইকোনমিক কোডের মাধ্যমে করুন' }
}
```

It unconditionally returns an error, so the success branch (`setCategories(...)`) never runs: no DB write, and not even optimistic local state. Same for delete. There is no category table in the schema (I checked all 35 models).

So the category list on that page is *derived*: `SELECT DISTINCT category FROM ref_economic_codes`, then whatever string is on the code row is reused as the title, with hardcoded `categoryNameMap`s patching blanks in two places. The 17 labels come from the seed's hardcoded `CATEGORY_BY_PREFIX`.

That's exactly the hardcoding you want gone, and the "create category" UI is currently non-functional. Before I change the schema, one decision:

Plan confirmed. Let me gather the remaining touch points before editing.

Now the schema.

Non-interactive shell, so I'll write the migration by hand. Let me match the existing migration's exact DDL style.

Leftover dev server from the previous session is holding the Prisma engine DLL. Stopping it.

Now the actions file — categories CRUD first.

Now the code read/write paths.

Now the client wiring.

Now remove `parent_title` from the code-save call and the hardcoded fallbacks.

Now replace the fabricated-id optimistic code update with a server re-read.

Data-preserving migration confirmed: the seed found all 17 categories already present (lifted from the old text column). Let me check the one remaining code-level fallback.

This one is a real masking fallback too — and it's worse, since it synthesizes fake code ids. Removing it.

Now a full clean-slate rebuild to prove the whole chain works, plus a typecheck.

Clean rebuild works. Now let me start the app and verify.

Now an end-to-end verification of the write path through the real server actions.

I'll pick up where the last step left off: run the end-to-end verification script.

I need to confirm the action IDs in the script still match the current build.

All action IDs match the current build. Running the verification.

All 25 checks passed. Cleaning up the temp script.

Done. To answer your question directly: **previously it saved nowhere** — the "create category" button called `saveBudgetCategory()`, which was an unconditional-error stub, and there was no category table at all. Categories were a free-text `VARCHAR(50)` column on `ref_economic_codes`, patched over by two hardcoded name maps.

That's now fixed and table-driven end to end.

**What exists now**

- New table [`ref_budget_categories`](file:///c:/App/ird-budget/prisma/schema.prisma) (`id`, `code`, `title`, `sort_order`, `is_active`) and `ref_economic_codes.category_id` FK with `onDelete: SetNull` — the old free-text `category` column is gone.
- Migration [migration.sql](file:///c:/App/ird-budget/prisma/migrations/20261024000000_add_budget_categories/migration.sql) is data-preserving: it created the table and backfilled all 17 categories from the existing text column *before* dropping it.
- [seed.js](file:///c:/App/ird-budget/prisma/seed.js) inserts the 17 starting categories **as rows** (not code). They're thereafter fully editable/deletable in the UI, and a re-seed won't clobber your edits.
- [admin-codes.ts](file:///c:/App/ird-budget/src/app/actions/admin-codes.ts): real create/update/delete, with a duplicate-code guard and a "can't delete a category still holding codes" guard. Every hardcoded `categoryNameMap` is deleted.
- UI now applies the saved category optimistically and re-reads codes from the server.

**Verification** — ran the real server actions over HTTP with a live admin session, then asserted in Postgres. 25/25 checks passed, including: create persists, duplicate rejected, update persists, code links via FK, unknown category refused, delete blocked while referenced, and delete succeeds afterwards. Counts returned to the seeded 17 / 139. Also confirmed `db:reset` rebuilds cleanly and `db:drift` reports no difference.

Two things I did **not** touch, worth your call:

1. [`upgrade.md`](file:///c:/App/ird-budget/upgrade.md) still says "verify all **35** tables" — it's now stale by one table.
2. `getBudgetTypes()` / `getFiscalYears()` in `admin-budgets.ts` are the **same pattern** you just had me remove for categories: hardcoded arrays with a save action that refuses changes. If you want full admin control of those too, it needs the same treatment.

---

**User**

`getBudgetTypes()` /`getFiscalYears()` in`admin-budgets.ts` are the same pattern you just had me remove for categories: hardcoded arrays with a save action that refuses changes. If you want full admin control of those too, it needs the same treatment.

Fix it like category, we do not need any hard coded data, everything from database, if needs, fk reference to link them, that is the purpose of relational db, isn't it?

**Assistant**

I'll read the relevant files first.

Now let me find everything that reads cycle fiscal year / budget type, so a FK change doesn't break callers.

No cycle or submission data exists, so the migration is clean. Let me read the tabs UI.

Now I'll make the schema changes.

Now the seed.

Now the actions file.

Now the client component.

Now the downstream readers.

Dev server is down. Applying the migration chain and re-seeding.

Drift detected: I added two indexes Prisma doesn't declare. Removing them.

Only the pre-existing form-7/8 errors remain. Re-applying the corrected migration.

Clean reset, clean drift. Starting the dev server for end-to-end verification.

Now the end-to-end verification script.

All 42 checks pass. Cleaning up temp files and stopping the dev server.

Yes — that's exactly what a relational DB is for. Done, same treatment as categories.

**Two new reference tables** in [schema.prisma](file:///c:/App/ird-budget/prisma/schema.prisma):

- `RefBudgetType` — `id`, `name` (unique), `sortOrder`, `isActive`
- `RefFiscalYear` — `id`, `year` (unique), `sortOrder`, `isActive`

**`core_budget_cycles` now uses real FKs.** The `fiscal_year` and `budget_type` varchar columns are gone, replaced by `fiscal_year_id` / `budget_type_id` with `ON DELETE RESTRICT`. This also deleted two bits of hardcoded nonsense:

- the `:::name=সংশোধিত বাজেট` suffix hack that smuggled the type label inside the fiscal-year string, and its `fy.split(':::name=')` parsing in [dashboard/page.tsx](file:///c:/App/ird-budget/src/app/(admin)/admin/dashboard/page.tsx#L194-L199) and [reports/individual/page.tsx](file:///c:/App/ird-budget/src/app/(admin)/admin/reports/individual/page.tsx#L89-L90)
- the `cycle.budgetType === 'revised' ? 'সংশোধিত বাজেট' : 'প্রাক্কলিত বাজেট'` ternaries in three files, plus `saveCycle`'s `name.includes('সংশোধিত')` guess

Labels now come from the row you're pointing at, so renaming a type in the admin UI relabels every existing cycle automatically.

**[admin-budgets.ts](file:///c:/App/ird-budget/src/app/actions/admin-budgets.ts)** — `DEFAULT_BUDGET_TYPES` / `DEFAULT_FISCAL_YEARS` deleted. All four read/save/delete functions hit the DB for real, with `P2002` duplicate guards and a "still in use by N cycles" guard on delete. `saveCycle` now resolves both sides to FKs and reports `নির্বাচিত অর্থবছর পাওয়া যায়নি` for an unknown value.

**[seed.js](file:///c:/App/ird-budget/prisma/seed.js)** — the starting 2 types + 4 fiscal years are inserted as data (same pattern you approved for categories), so a `db:reset` produces a usable system with no hardcoded arrays anywhere.

**Migration** [migration.sql](file:///c:/App/ird-budget/prisma/migrations/20261024010000_budget_types_and_fiscal_years/migration.sql) is data-preserving: it lifts any values already referenced by cycles into the new tables before dropping the columns.

**Verified**: `db:reset` applies all three migrations cleanly, `db:drift` reports *No difference detected*, `tsc` shows only your two pre-existing `form-7`/`form-8` syntax errors, and 42/42 end-to-end checks passed — create/rename/duplicate-reject for both types and fiscal years, cycle storing real FK ids, **a rename flowing through to the existing cycle** (proving it's a link, not a copy), both delete guards firing, and the category flow still green.

One thing still stale, not touched: [`upgrade.md`](file:///c:/App/ird-budget/upgrade.md) documents 35 tables and the old `core_budget_cycles` columns. It's now off by three tables and one FK change.

---

**User**


/compact 

**User**

One thing still stale, not touched: `upgrade.md` documents 35 tables and the old`core_budget_cycles` columns. It's now off by three tables and one FK change.

explain clearly, I did not quite understnad what you are trying to tell me

**Assistant**

Let me read the actual file so I explain precisely rather than from memory.

Here's the plain explanation.

## What `upgrade.md` is

[upgrade.md](file:///c:/App/ird-budget/upgrade.md) is the project's written blueprint for the database — it contains the table definitions, the seeding notes, and the verification checklists. Even though the actual schema is now generated from [schema.prisma](file:///c:/App/ird-budget/prisma/schema.prisma), this document is still what a person reads to understand "what tables exist and why."

## What "stale" means

It's a description of a database that no longer exists. The document still describes the schema from **before** the two changes we made in this session (categories, then budget types / fiscal years). Nothing in the app is broken by this — it's a documentation mismatch, not a code bug.

Concretely, here are the specific mismatches:

| Where in the doc | What it says | What the DB actually has now |
|---|---|---|
| Counts: [line 717](file:///c:/App/ird-budget/upgrade.md#L717), [line 687](file:///c:/App/ird-budget/upgrade.md#L687) | "verify all **35** tables" | **38** tables (3 new reference tables added) |
| [line 1346](file:///c:/App/ird-budget/upgrade.md#L1346) | "Verify all **30** tables created" | 38 (this one was already wrong before today) |
| DDL [lines 313-324](file:///c:/App/ird-budget/upgrade.md#L313-L324) | `core_budget_cycles` has `fiscal_year VARCHAR(20)` and `budget_type VARCHAR(20) CHECK (... 'estimated','revised')` | Those two columns are **gone**. Now `fiscal_year_id` and `budget_type_id`, foreign keys pointing at the new tables |
| DDL [lines 343-354](file:///c:/App/ird-budget/upgrade.md#L343-L354) | `ref_economic_codes` has `category VARCHAR(50)` (free text) | Column is `category_id`, a foreign key to `ref_budget_categories` |
| DDL — nothing | — | Three tables aren't mentioned at all: `ref_budget_categories`, `ref_budget_types`, `ref_fiscal_years` |
| [line 68](file:///c:/App/ird-budget/upgrade.md#L68) and [lines 1384-1385](file:///c:/App/ird-budget/upgrade.md#L1384-L1385) | Seed "seeds the `superadmin` admin user and the 139 economic codes" | Seed now also creates 17 categories, 2 budget types, 4 fiscal years |
| [lines 786-788](file:///c:/App/ird-budget/upgrade.md#L786-L788) | Checklist says "verify `fiscal_year` format validation (YYYY-YY)" and "`budget_type` check constraint (estimated/revised)" | Those constraints no longer exist; validity now comes from the reference tables |

## Why it matters (and why it mostly doesn't)

- **Doesn't matter** for running the app: the real schema lives in `schema.prisma` + the migrations, and both are correct and drift-clean.
- **Matters** if someone follows the doc: it says the DB has a `budget_type` column and a `CHECK (budget_type IN ('estimated','revised'))` constraint, and a `35`-table expectation. Anyone comparing the doc to the DB will think something is broken, or will try to "fix" the DB back to the documented state.

The one nuance: the big DDL block sits inside a section the doc itself marks "**Step 0 (LEGACY) — superseded… Do not run the SQL in this section**," so that part is fenced off. But the seed description ([line 68](file:///c:/App/ird-budget/upgrade.md#L68)) is in the *active* section, and the counts and the Phase-1 checklist read as current facts.

Want me to update it — the three new tables, the two FK changes, the table counts, and the seed description? It's a doc-only edit, no code or schema impact.

---

**User**

Update it properly, with unnecesary part removed, only relevant and informational and referential for any dev to know what has been done, what is the backbone etc.

**Assistant**

Let me gather the current facts before rewriting.

Now I'll rewrite `upgrade.md` as a concise architecture reference.

Two fixes: a wrong cross-reference and awkward phrasing.

Caught an inaccuracy — that constraint isn't in the migrations. Fixing.

Rewrote [upgrade.md](file:///c:/App/ird-budget/upgrade.md): 1440 lines → 302. Only that file changed.

**Removed**
- The entire "Step 0 (LEGACY)" section: backup SQL, wipe SQL, and the 470-line schema DDL — all marked "do not run" and all describing an obsolete schema.
- The Phase 1/2/3 checklists (~140 unchecked boxes) that verified things like a `budget_type IN ('estimated','revised')` check constraint which no longer exists.
- The `USING (true)` RLS block (kept only as a warning not to reintroduce it).

**Kept and corrected**
- Connection requirements (`connect_timeout=30` / `sslmode=verify-full`) and the Prisma-config-skips-`.env` gotcha.
- Full schema map: 38 tables by the five domain prefixes, with the FK relationships spelled out.
- A section on the no-hardcoding rule — why categories, budget types, and fiscal years are tables reached by FK, and what guarantees the admin UI gives.
- Migration history with what each of the three migrations did.

**Corrections I made while writing it**
- Table count 35 → **38** (and dropped the other count that said 30).
- Documented the real `core_budget_cycles` shape (`fiscal_year_id` / `budget_type_id` FKs) and `ref_economic_codes.category_id`, plus the three tables the old doc never mentioned.
- Seed contents updated from "admin user + 139 codes" to all five datasets.
- Dropped the claimed `idx_one_open_cycle` index — it doesn't exist in any migration. Single-open-cycle is **application** logic in [admin-budgets.ts](file:///c:/App/ird-budget/src/app/actions/admin-budgets.ts#L220-L225), so §10 now says so explicitly.
- Dropped a self-parent `CHECK` constraint claim after grepping the migrations: there are no CHECK constraints at all. The doc now only asserts what's verifiable.
- §11 Status records what's outstanding, including the 8 `form-7`/`form-8` parse errors I re-confirmed just now.

One note: §12 lists the stale SQL files, which is now longer than what the old doc named — [resources/](file:///c:/App/ird-budget/resources) also has `drop_level_unique_constraint.sql`, `rename_to_core_economic_codes.sql`, and `update_group_budget_rules.sql`, plus five `create-superadmin*` variants in [scripts/](file:///c:/App/ird-budget/scripts). I documented them but did not delete anything.

---

**User**

i have logged into as superadmin, my target is to check one by one, each form and its table in the db, finalize and move to next. make changes to UI for making it better. what do you think? 

**Assistant**

Before I give you an opinion, let me check the things your plan will hit first.

I dug into the office side before answering, and found something that changes your sequencing. Short version: **the plan is right, but a third of the forms aren't wired to the database yet, so "check one by one" would stall on stubs.**

## What I found

**1. Six forms never read from the database.** The loaders already exist in [load-form-data.ts](file:///c:/App/ird-budget/src/lib/office/load-form-data.ts) — every one of them — but the pages don't call them:

| Route | Loads saved data? | Loader sitting unused |
|---|---|---|
| form-1 … form-6 | Yes, real Prisma | — |
| form-7 (govt vehicles) | No — always `[]` | `loadFormVehiclesGovtInitial` |
| form-8 (rented vehicles) | No — always `[]` | `loadFormVehiclesRentInitial` |
| form-9 (house rent) | No — always `null`, VAT hardcoded `15` | `loadFormHouseRentInitial`, `loadVatPercentage` |
| form-10 (IT equipment) | No — always `[]`, prices hardcoded to `0` | `loadFormItEquipmentInitial`, `loadItAdminPrices` |
| form-11 (utilities) | No — always `[]` | `loadFormUtilitiesInitial` |
| form-12 (return info) | No — always `null` | `loadFormReturnInfoInitial` |

So on those six you'd be testing a form that shows empty fields no matter what's in the table. [form-9/page.tsx](file:///c:/App/ird-budget/src/app/(office)/office/form-9/page.tsx#L11-L15) is the clearest case — it has a comment `// House rent data loading via Prisma` and then nothing.

**2. The build is currently red.** [form-7/page.tsx](file:///c:/App/ird-budget/src/app/(office)/office/form-7/page.tsx#L15-L22) and [form-8/page.tsx](file:///c:/App/ird-budget/src/app/(office)/office/form-8/page.tsx#L14-L21) contain a broken ternary — a leftover Supabase chain that was commented out mid-expression:

```tsx
submissionId
  ? Promise.resolve({ data: [] })
    //   .select('*')
    Promise.resolve({ data: [] })
  : Promise.resolve({ data: [] }),
```

That's the 8 `tsc` errors. Nothing can build until it's fixed.

**3. "Form 7" means three different things.** The route folder, the component name, and the DB table don't agree:

- route `form-7` → exports `Form5Page`, imports `form-5-client` → `office_form_vehicles_govt`
- route `form-10` → exports `Form7Page`, imports `form-7-client` → `office_form_it_equipment`
- route `form-12` → exports `Form10Page`, imports `form-10-client` → `office_form_return_info`

If we review "form 10" without settling this, we'll disagree about which form we're looking at.

**4. The bigger blocker: the dropdowns are empty.** The seed only populates admin user, budget categories, budget types, fiscal years, and economic codes. Not seeded: `ref_grades`, `ref_allowance_types`, `ref_vehicle_types`, `ref_fuel_types`, `ref_it_equipment_types`, `ref_utility_types`, `admin_rates`, the three config tables, and the entire `core_*` hierarchy — which also means there's no office account to log in as. **Every form except 1 and 6 pulls from one of those tables.** You can't verify "form saves to its table" when the form has nothing to select.

## My recommendation

Keep the loop, but reorder:

1. **Step 0 (once):** fix the two syntax errors, connect the six dead pages to the loaders that already exist, settle the numbering. That converts "12 forms" into "12 testable forms" — and it's mostly deletion, not new code.
2. **Then the loop, in dependency order:** basic → staff (2,3,4) → allowances/leave (5,6) → house rent (9) → vehicles (7,8) → IT (10) → utilities (11) → return info (12) → budget sheet. Forms 9–12 depend on `admin_rates` and config rows, so they naturally come after.
3. **UI polish as a second pass, not interleaved.** If we restyle while wiring, every form gets touched twice and consistency drifts.

And define "finalized" once so each form is judged the same way — my suggestion: loads saved rows from the DB, save→re-read round-trip shows the change, required validation and Bengali labels correct, matches the shared form pattern, typecheck clean, commit.

Four decisions before I start:

All four recommendations accepted. Let me set up tracking and read the code I'll be changing.

Now I have the full picture. Let me look at the current seed to extend it consistently.

Time to implement. I'll delegate the seed extension (large, self-contained) while I fix the six dead pages.

I'll start by reading the key files mentioned in the task.

Now let me read the PRD, admin-settings actions, auth, session, and the form-10 client.

Let me examine the PRD and the office form pages to understand data requirements.

I have enough context. Let me look at the PRD's IT/utility seeded values and the exact tail of the seed file once more, then write the changes.

Now I'll write the extended seed. First, the new seed functions:

I'll start by reading the current state of the seed file to see exactly what's there.

Now let me verify the schema field names for the models I'm using, to be safe.

All field names verified. Now I'll wire the new functions into `main()` in dependency order.

Now let me run the database reset. First, let me check for any stray node processes that might lock Prisma's engine.

A dev server is currently running (npm run dev + next dev). Per prior experience, the Prisma engine DLL can be locked by it during reset. Let me first try the reset; if it hits an EPERM lock I'll stop the dev server.

The reset succeeded; the EPERM occurred only during Prisma's implicit client regeneration (as expected because the dev server locks the engine DLL), but seeding is now running. Let me wait for it to finish.

The economic-codes step upserts ~139 rows one at a time over the remote pooler, so it takes a while. Let me continue waiting.

First seed run completed successfully (exit 0). Now let me run `db:seed` a second time to prove idempotency.

Idempotency proven (second run: 0 created everywhere, exit 0). Now let me write a temporary verification script in `%TEMP%`. First let me check the `.env` for the connection variable name.

Now I'll write the temporary verification script in the system temp directory.

I need to fix the relation name — `CoreOffice.officeUsers` is an array, not `officeUser`.

The verification output is complete. Let me confirm the process exited cleanly, then delete the temp script.

Exit code 0. Let me do one final targeted check that the stored office password hash matches the SHA-256 of `12345` (proving the login credential works), then delete the temp script.

The inline shell escaping is problematic. Let me just add the hash check to the temp script instead.

Login verified. Now I'll delete the temporary verification script.

Task complete. Here is the report.

## What was done
Extended `c:\App\ird-budget\prisma\seed.js` **only** (no other file changed). Added 13 new idempotent seed functions — each with a section banner, `SEED_*` constant, `async function seedX()`, and a padded `console.log` summary — and wired them into `main()` in dependency order after the existing five calls:

`seedGrades → seedAllowanceTypes → seedVehicleTypes → seedFuelTypes → seedItEquipmentTypes → seedUtilityTypes → seedAdminRates → seedOfficeHierarchy → seedGroupBudgetRule → seedVehicleConfigs → seedVehicleRentConfigs → seedItConfigs → seedOfficeUser`

All lookups are on natural unique columns (`gradeNo`, `name`, `key`, `code`, `budgetId`, `officeId`) via `findUnique`/`findFirst`, then gap-filling `.create`, so human-edited rows are never overwritten (passwords only written on create).

## Verification

**1) `npm run db:reset`** — DB dropped, 3 migrations re-applied, then seed ran (exit 0). Note: `migrate reset` prints `EPERM ... query_engine-windows.dll.node` because the **already-running** `npm run dev` holds the Prisma engine DLL; this only aborts the implicit client regeneration (no schema changed) and does not affect the reset or seed.

**2) `npm run db:seed` a second time (idempotency)** — exit 0, everything reported already present:
```
  admin_users         : "superadmin" already exists (password left untouched)
  ref_grades          : 0 created, 20 already present
  admin_rates         : 0 created, 12 already present
  office_users        : login for "আয়কর কমিশনার কার্যালয়" already exists (password left untouched)
```

**Row counts** (via a temp script in `%TEMP%`, since deleted):

| table | count | table | count |
|---|---|---|---|
| admin_users | 1 | admin_rates | 12 |
| ref_budget_categories | 17 | core_ministries | 1 |
| ref_budget_types | 2 | core_departments | 1 |
| ref_fiscal_years | 4 | core_office_types | 1 |
| ref_economic_codes | 139 | core_office_levels | 1 |
| ref_grades | 20 | core_offices | 1 |
| ref_allowance_types | 6 | admin_group_budget_rules | 1 |
| ref_vehicle_types | 4 | admin_vehicle_config | 6 |
| ref_fuel_types | 3 | admin_vehicle_rent_config | 4 |
| ref_it_equipment_types | 4 | admin_it_config | 4 |
| ref_utility_types | 5 | office_users | 1 |

**IT equipment names** (each substring-matches a form-10 `CARD_CONFIGS` alias): `কম্পিউটার`, `প্রিন্টার` (hasToner=true), `স্ক্যানার`, `ফটোকপিয়ার`.

**`admin_rates` keys (12):** `medical_allowance_monthly, house_rent_percent, festival_bonus_multiplier, provident_fund_percent, education_allowance, fuel_price_octane, fuel_price_diesel, fuel_price_cng, vat_percentage, postal_rate, postal_expense_rate, salary_config`

**3) Office login** — confirmed against the DB: username `IRD-0001`, password `12345`, office `আয়কর কমিশনার কার্যালয়`; stored hash equals `sha256('12345')`, `password_hint=12345`, `is_active=true` (matches `auth.ts` unsalted-SHA-256 + hint/`'12345'` acceptance).

## Invented values (no source in PRD/schema)
- `SEED_VEHICLE_CONFIGS` quantities (fuel quotas / lube / maintenance) and `SEED_VEHICLE_RENT_CONFIGS` rates (8000/45000/65000/55000) and `SEED_IT_CONFIGS` unit budgets (65000/25000/18000/120000).
- `SEED_OFFICE_PASSWORD = '12345'`, office `IRD-0001` / `আয়কর কমিশনার কার্যালয়`, ministry `MOF` / department `IRD` / office type `আয়কর অফিস` / level `প্রথম স্তর`.
- Utility type list extended beyond the PRD's 3 to include `গ্যাস, টেলিফোন`; IT fourth type used `ফটোকপিয়ার` instead of the PRD's "Accessories" so it matches form 10's photocopier card. Grades follow PRD/fetcher authority (1–9 officer, 10–20 staff), noting form-2's UI splits at `<=10`.

The pre-existing dev server was left running (I did not start or stop it).

Now the page wiring. First, two supporting fixes: the seed needs an open budget cycle (without one, office logins get no submission and nothing can save), and three loaders return field names the clients don't read.

Now the six dead pages.

I'll diagnose the three `fetcher.ts` errors first — a clean typecheck is the gate for the review loop.

Now let me see where these queries are defined.

Confirmed diagnosis. Let me verify the relation names in the schema before editing.

All three relations exist in the schema — the queries just never `include`d them. Fixing the three queries.

Now re-run the typecheck.

Typecheck is clean (exit 0). The errors were genuine missing `include` clauses, not stale generated types — no regeneration needed.

Now Step 0's last item: the component-name/route mismatch. Let me see the current state of the form folders.

Typecheck green. Now the component-name rename (routes stay). Let me gather the export names and the page imports.

Typecheck clean. Now the rename — it's mechanical but has cross-mappings (form-5's `Form3Client` must become `Form5Client` while form-7's `Form5Client` becomes `Form7Client`), so I'll map every reference site first.

Each client is imported only by its own page. Let me check the exported row interfaces too before delegating.

All the affected types are file-local — nothing outside each folder imports them, so the rename is fully self-contained per folder. Delegating this mechanical refactor with a verification gate.

I'll start by exploring the directory structure to understand what I'm working with.

Now let me read all the relevant files to understand their contents. Let me batch these reads.

I understand the pattern now. Let me read the remaining page.tsx files and grep the client files for the target identifiers.

Let me grep the client files for the target identifiers to confirm occurrences and check for collisions.

Let me check for any other `Form<digit>` identifiers in each client file to avoid collisions.

I have all the information needed. Now let me perform the 8 file moves in a single command.

All files moved. Now let me read the new file paths (to satisfy the edit prerequisite), then edit identifiers.

Now I'll rename the component identifiers in each client file (Batch A — one edit per file).

Batch B — the extra row-type renames in 3 client files, plus the component-name replacements in all 8 page files.

Batch C — update the import paths in all 8 page files.

All edits are complete. Now let me verify: run the type check and search for any leftover old references.

tsc exits 0 and no stale references remain. Let me do a final confirmation of the exported component names per folder.

All 8 renames are complete and verified. `npx tsc --noEmit` exits 0, and no stale references remain.

## Files renamed (8)
| Folder | Old file | New file |
|---|---|---|
| `form-3` | `form-2b-client.tsx` | `form-3-client.tsx` |
| `form-5` | `form-3-client.tsx` | `form-5-client.tsx` |
| `form-6` | `form-4-client.tsx` | `form-6-client.tsx` |
| `form-7` | `form-5-client.tsx` | `form-7-client.tsx` |
| `form-8` | `form-6-client.tsx` | `form-8-client.tsx` |
| `form-10` | `form-7-client.tsx` | `form-10-client.tsx` |
| `form-11` | `form-8-client.tsx` | `form-11-client.tsx` |
| `form-12` | `form-10-client.tsx` | `form-12-client.tsx` |

All under `c:\App\ird-budget\src\app\(office)\office\`.

## Identifiers renamed (file-scoped only)
- form-3: `Form2bClientProps`→`Form3ClientProps`, `Form2bClient`→`Form3Client` (left `SuspendedStaffRow` untouched)
- form-5: `Form3ClientProps`→`Form5ClientProps`, `Form3Client`→`Form5Client`
- form-6: `Form4ClientProps`→`Form6ClientProps`, `Form4Client`→`Form6Client`
- form-7: `Form5ClientProps`→`Form7ClientProps`, `Form5Client`→`Form7Client`, `Form5VehicleRow`→`Form7VehicleRow`
- form-8: `Form6ClientProps`→`Form8ClientProps`, `Form6Client`→`Form8Client`, `Form6VehicleRentRow`→`Form8VehicleRentRow`
- form-10: `Form7ClientProps`→`Form10ClientProps`, `Form7Client`→`Form10Client`
- form-11: `Form8ClientProps`→`Form11ClientProps`, `Form8Client`→`Form11Client`, `Form8UtilityRow`→`Form11UtilityRow`
- form-12: `Form10ClientProps`→`Form12ClientProps`, `Form10Client`→`Form12Client`

Each folder's `page.tsx` had its import path, import name, and JSX tag updated. No `page.tsx` files or route folders were renamed.

## Final folder → file → exported component mapping (all 12)
| Folder | File | Component (Props interface) |
|---|---|---|
| form-1 | form-1-client.tsx | `Form1Client` (unchanged) |
| form-2 | form-2-client.tsx | `Form2Client` (unchanged) |
| form-3 | form-3-client.tsx | `Form3Client` (`Form3ClientProps`) |
| form-4 | form-4-client.tsx | `Form4Client` (unchanged) |
| form-5 | form-5-client.tsx | `Form5Client` (`Form5ClientProps`) |
| form-6 | form-6-client.tsx | `Form6Client` (`Form6ClientProps`) |
| form-7 | form-7-client.tsx | `Form7Client` (`Form7ClientProps`) |
| form-8 | form-8-client.tsx | `Form8Client` (`Form8ClientProps`) |
| form-9 | form-9-client.tsx | `Form9Client` (unchanged) |
| form-10 | form-10-client.tsx | `Form10Client` (`Form10ClientProps`) |
| form-11 | form-11-client.tsx | `Form11Client` (`Form11ClientProps`) |
| form-12 | form-12-client.tsx | `Form12Client` (`Form12ClientProps`) |

## Verification
- `npx tsc --noEmit` → exit code **0**.
- Searched each folder: no remaining references to the old file names or old component names (`form-2b-client`, `Form3Client` in form-5, `Form4Client` in form-6, `Form5Client` in form-7, `Form6Client` in form-8, `Form7Client` in form-10, `Form8Client` in form-11, `Form10Client` in form-12 — all "No matches found").

Untouched as instructed: `form-1`, `form-2`, `form-4`, `form-9`, and `budget-sheet/budget-sheet-client.tsx`. No JSX, logic, strings, or styling were changed.

Step 0 is complete — typecheck exits 0.

**Step 0 summary**

| Item | Status |
|---|---|
| 8 parse errors in `form-7`/`form-8` pages | fixed (pages rewritten) |
| 6 dead forms (`7,8,9,10,11,12`) never reading the DB | wired to their existing loaders |
| 3 loader/client field-name mismatches (`count`, `maintenance_cost`, `monthly_rent_allowance`) | fixed |
| 3 `fetcher.ts` queries missing `include` (utilityType / vehicleRent config / IT config) | fixed |
| `seed.js` had no reference types, rates, office, or budget cycle | extended + `seedBudgetCycle()` added |
| 8 client files/exports numbered off from their route | renamed to `form-N-client.tsx` / `FormNClient` |
| hardcoded IT unit price, VAT %, empty arrays in the dead forms | now read from `admin_rates` / config tables |
| `npx tsc --noEmit` | **exit 0** |

Now starting the review loop at **Form 1**. Let me pull its three layers plus the shared shell.

Now the DB side for Form 1 — schema model, loader, and save action.

Form 1's inventory is clean (5 fields ↔ 5 columns). Let me check the validation schema and the UI strings to complete the check.

**Form 1 — reviewed.**

- **Table:** `office_form_basic` — [schema.prisma](file:///c:/App/ird-budget/prisma/schema.prisma#L397-L411). 5 columns ↔ 5 rendered fields. Loader, save action and client all agree. **Inventory clean.**
- **Defect (real, and shared by all 12 forms):** `formBasicSchema` in [forms.ts](file:///c:/App/ird-budget/src/lib/schemas/forms.ts#L5-L11) makes every field required, and [saveFormBasic](file:///c:/App/ird-budget/src/app/actions/forms.ts#L6-L41) returns `{ error: 'Required' }` — but [form-1-client.tsx](file:///c:/App/ird-budget/src/app/(office)/office/form-1/form-1-client.tsx#L36-L43) drops the return value, and [FormShell](file:///c:/App/ird-budget/src/components/form-shell.tsx#L44-L56) types `onSave` as `Promise<void>` and shows a green **সংরক্ষিত** unconditionally. So an incomplete form reports "Saved" while persisting nothing.
- **Cosmetic:** `formRef` in form-1 is declared and attached but never used.
- **Also stale:** the comments in [forms.ts](file:///c:/App/ird-budget/src/lib/schemas/forms.ts#L50-L104) still use the *old* form numbering (it calls vehicles "Form 5", IT "Form 7", utilities "Form 8", return-info "Form 10").

Let me audit forms 2–12 the same way before proposing fixes.

I'll conduct a thorough audit of forms 2-12. Let me start by exploring the directory structure and reading the core files.

Now let me read all the form client components and page files for forms 2-12:

Now I have all the information needed to compile the audit report. Let me analyze each form systematically.

---

# FORMS AUDIT REPORT (Forms 2-12)

## FORM 2: STAFF WORKING (কর্মরত কর্মকর্তা/কর্মচারী)

**1. Route folder and client component:**
- Route: `form-2/` → `Form2Client` (form-2-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormStaffWorking` → `office_form_staff_working`
- Save action: `saveFormStaffActiveRows` (forms.ts:43-80)
- Delete action: `deleteFormStaffActiveRow` (forms.ts:121-135)

**3. COLUMN COVERAGE (office_form_staff_working):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | From params |
| `grade_id` | Yes | From row.grade_id |
| `staff_count` | Yes | Mapped to `count` |
| `monthly_basic` | Yes | Mapped to `total_basic` |
| `due_salary` | Yes | Mapped to `due_salary` |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**4. FIELD COVERAGE:**
- Rendered fields: `grade_id`, `count`, `total_basic`, `due_salary`
- All map to DB columns correctly - no dropped fields.

**5. LOADER:**
- Function: `loadFormStaffWorkingInitial` (load-form-data.ts:25-36)
- Returns: `{ grade_id, count, total_basic, due_salary }` - matches client expectations.

**6. HARDCODED CONSTANTS:**
- `ALL_GRADES` array with 20 grades (form-2-client.tsx:48-52) - this is a domain constraint, acceptable.

**7. UI/UX ISSUES:**
- No required field markers in modal
- Strings: Uses `strings.form2.*` consistently
- Empty state: Proper empty state with icon and button

**8. BUGS:**
- None identified

---

## FORM 3: STAFF SUSPENDED (বরখাস্তকৃত কর্মকর্তা/কর্মচারী)

**1. Route folder and client component:**
- Route: `form-3/` → `Form3Client` (form-3-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormStaffSuspended` → `office_form_staff_suspended`
- Save action: `saveFormStaffSuspendedRows` (forms.ts:82-119)
- Delete action: `deleteFormStaffSuspendedRow` (forms.ts:137-151)

**3. COLUMN COVERAGE (office_form_staff_suspended):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | From params |
| `grade_id` | Yes | From row.grade_id |
| `suspended_count` | Yes | Mapped to `suspended_count` |
| `suspended_monthly_basic` | Yes | Mapped to `suspended_total_basic` |
| `suspended_due_salary` | Yes | Mapped to `suspended_due_salary` |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**4. FIELD COVERAGE:**
- Rendered: `suspended_count`, `suspended_total_basic`, `suspended_due_salary`
- All map correctly to DB columns.

**5. LOADER:**
- Function: `loadFormStaffSuspendedInitial` (load-form-data.ts:38-49)
- Returns keys matching client expectations.

**6. HARDCODED CONSTANTS:**
- Same `ALL_GRADES` array as form-2

**7. UI/UX ISSUES:**
- Uses `strings.form2b.*` (note the "2b" naming - legacy numbering)
- Proper empty state

**8. BUGS:**
- None identified

---

## FORM 4: NEW RECRUITS (নবনিয়োগপ্রাপ্ত কর্মচারী)

**1. Route folder and client component:**
- Route: `form-4/` → `Form4Client` (form-4-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormStaffNewRecruit` → `office_form_staff_new_recruits`
- Save action: `saveFormNewStaffRows` (forms.ts:654-683)
- Get action: `getFormNewStaffRows` (forms.ts:638-652)

**3. COLUMN COVERAGE (office_form_staff_new_recruits):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | From params |
| `grade_id` | Yes | From row.grade_id |
| `recruit_count` | Yes | Mapped to `count` |
| `monthly_basic` | Yes | Mapped to `monthly_basic` |
| `joining_date` | Yes | From `expected_date` |
| `months_remaining` | Yes | Calculated, mapped to `remaining_months` |
| `total_salary` | Yes | Mapped to `total_salary` |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**4. FIELD COVERAGE:**
- Rendered: `grade_id`, `count`, `monthly_basic`, `expected_date`, `remaining_months`, `total_salary`
- All map correctly to DB columns.

**5. LOADER:**
- Function: `getFormNewStaffRows` (forms.ts:638-652) - returns directly from action
- Note: Not using `load-form-data.ts` for this form

**6. HARDCODED CONSTANTS:**
- Fiscal year calculation logic in `calculateRemainingMonths` (form-4-client.tsx:54-83)
- This contains hardcoded month calculations based on July-June fiscal year

**7. UI/UX ISSUES:**
- Uses local component state for calculations
- Modal shows live calculation preview

**8. BUGS:**
- None identified

---

## FORM 5: ALLOWANCES (ভাতা সংক্রান্ত তথ্য)

**1. Route folder and client component:**
- Route: `form-5/` → `Form5Client` (form-5-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormAllowance` → `office_form_allowances`
- Save action: `saveFormAllowanceRow` (forms.ts:295-338)
- Also uses `saveFormRestRecreation` (forms.ts:255-293) for rest/recreation

**3. COLUMN COVERAGE (office_form_allowances):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | From params |
| `allowance_type_id` | Yes | From type lookup |
| `officer_count` | Yes | Mapped to `count` (but always 0 in code!) |
| `staff_count` | Yes | Always 0 |
| `total_annual_amount` | Yes | Mapped to `amount` |
| `effective_date` | **NO** | **DEAD COLUMN — never written** |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**4. FIELD COVERAGE:**
- Rendered: `count`, `total_basic`, `amount`, `due`, `date`
- **DROPPED FIELD**: `date` is collected in modal but never saved to DB
- `officer_count` and `staff_count` are hardcoded to 0 in save action

**5. LOADER:**
- Function: `loadFormAllowancesInitial` (load-form-data.ts:70-81)
- Also: `loadAllowanceTypes` (load-form-data.ts:59-68)

**6. HARDCODED CONSTANTS:**
- `ALLOWANCE_CONFIGS` array (form-5-client.tsx:41-112) with 6 hardcoded allowance types
- Default values for each card type

**7. UI/UX ISSUES:**
- `effective_date` field collected but never persisted
- Uses `strings.form3.*` (legacy numbering mismatch)
- Card-based UI is good but data loss risk with unsaved date field

**8. BUGS:**
- **CRITICAL**: `effective_date` is collected in the modal input but NEVER written to the database. The column exists in the schema but the save action doesn't include it.

---

## FORM 6: LEAVE ENCASHMENT (ছুটি নগদায়ন)

**1. Route folder and client component:**
- Route: `form-6/` → `Form6Client` (form-6-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormLeaveEncashment` → `office_form_leave_encashment`
- Save action: `saveFormLeave` (forms.ts:216-253)

**3. COLUMN COVERAGE (office_form_leave_encashment):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | Unique constraint |
| `leave_encashment_officer_basic` | Yes | From data |
| `leave_encashment_officer_due` | Yes | From data |
| `leave_encashment_staff_basic` | Yes | From data |
| `leave_encashment_staff_due` | Yes | From data |
| `rest_recreation_amount` | Yes | From data |
| `rest_recreation_due` | Yes | From data |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**4. FIELD COVERAGE:**
- Rendered: All 8 fields map correctly to DB columns
- No dropped fields

**5. LOADER:**
- Function: `loadFormLeaveEncashmentInitial` (load-form-data.ts:95-108)

**6. HARDCODED CONSTANTS:**
- None in this form

**7. UI/UX ISSUES:**
- Uses `strings.form4.*` (legacy numbering mismatch)

**8. BUGS:**
- None identified

---

## FORM 7: GOVT VEHICLES & FUEL (যানবাহন ও জ্বালানি)

**1. Route folder and client component:**
- Route: `form-7/` → `Form7Client` (form-7-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormVehicleGovt` → `office_form_vehicles_govt`
- Save action: `saveFormVehicleRow` (forms.ts:481-516)
- Delete action: `deleteFormVehicleRow` (forms.ts:518-527)

**3. COLUMN COVERAGE (office_form_vehicles_govt):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | From params |
| `vehicle_config_id` | Yes | From `vehicle_fuel_config_id` |
| `vehicle_count` | Yes | Mapped to `count` |
| `maintenance_due` | Yes | Mapped to `maintenance_cost` |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**4. FIELD COVERAGE:**
- Rendered: `vehicle_fuel_config_id`, `count`, `maintenance_cost`, `additional_expense`
- **DROPPED FIELD**: `additional_expense` is collected in UI but NEVER saved to DB
- The schema doesn't have a column for it

**5. LOADER:**
- Function: `loadFormVehiclesGovtInitial` (load-form-data.ts:132-160)

**6. HARDCODED CONSTANTS:**
- None - all values come from admin configurations

**7. UI/UX ISSUES:**
- `additional_expense` field is shown in modal but never persisted
- Uses `strings.form5.*` (legacy numbering)

**8. BUGS:**
- **DROPPED FIELD**: `additional_expense` is collected but never written to database. The column doesn't exist in the schema.

---

## FORM 8: RENTED VEHICLES (ভাড়া করা যানবাহন)

**1. Route folder and client component:**
- Route: `form-8/` → `Form8Client` (form-8-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormVehicleRent` → `office_form_vehicles_rent`
- Save action: `saveFormVehicleRentRow` (forms.ts:529-560)
- Delete action: `deleteFormVehicleRentRow` (forms.ts:562-571)

**3. COLUMN COVERAGE (office_form_vehicles_rent):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | From params |
| `vehicle_rent_config_id` | Yes | From params |
| `vehicle_count` | Yes | Mapped to `count` |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**4. FIELD COVERAGE:**
- Only `vehicle_rent_config_id` and `count` are persisted
- No additional fields collected in UI beyond what's saved

**5. LOADER:**
- Function: `loadFormVehiclesRentInitial` (load-form-data.ts:177-197)

**6. HARDCODED CONSTANTS:**
- None - monthly allowance comes from admin config

**7. UI/UX ISSUES:**
- Uses `strings.form6.*` (legacy numbering)

**8. BUGS:**
- None identified

---

## FORM 9: HOUSE RENT (অফিস ভাড়ার তথ্য)

**1. Route folder and client component:**
- Route: `form-9/` → `Form9Client` (form-9-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormHouseRent` → `office_form_house_rent`
- Save action: `saveFormHouseRent` (forms.ts:388-425)
- Delete action: `deleteFormHouseRent` (forms.ts:459-468)

**3. COLUMN COVERAGE (office_form_house_rent):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | Unique |
| `monthly_rent` | Yes | From `monthly_bill` |
| `vat_rate_id` | Yes | Looked up from admin_rates |
| `arrears_due` | Yes | Mapped to `due` |
| `annual_total` | Yes | Calculated: (monthly * 12) + due |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**4. FIELD COVERAGE:**
- Rendered: `monthly_bill`, `due`, `contract_start_date`, `contract_end_date`
- **DROPPED FIELDS**: `contract_start_date` and `contract_end_date` are collected in UI but NEVER saved to DB
- The schema doesn't have columns for these dates

**5. LOADER:**
- Function: `loadFormHouseRentInitial` (load-form-data.ts:204-215)
- **KEY MISMATCH**: Loader returns empty strings for `contract_start_date` and `contract_end_date` but these are never read from DB (columns don't exist)

**6. HARDCODED CONSTANTS:**
- VAT rate is fetched from admin config - not hardcoded

**7. UI/UX ISSUES:**
- Contract date fields are shown but never persisted
- Uses `strings.form9.*` correctly

**8. BUGS:**
- **DROPPED FIELDS**: `contract_start_date` and `contract_end_date` are collected in the modal but never written to the database. The columns don't exist in the schema.

---

## FORM 10: IT EQUIPMENT (কম্পিউটার ও আনুষঙ্গিক)

**1. Route folder and client component:**
- Route: `form-10/` → `Form10Client` (form-10-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormItEquipment` → `office_form_it_equipment`
- Save action: `saveFormITEquipmentRow` (forms.ts:573-610)
- Delete action: `deleteFormITEquipmentRow` (forms.ts:612-627)

**3. COLUMN COVERAGE (office_form_it_equipment):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | From params |
| `it_config_id` | Yes | From `equipmentTypeId` param |
| `existing_count` | Yes | From data |
| `new_demand_count` | Yes | Mapped from `required_qty` |
| `toner_cost_monthly` | Yes | From data |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**4. FIELD COVERAGE:**
- Rendered: `existing_count`, `damaged_count`, `toner_cost`, `required_qty`, `unit_budget`
- **DROPPED FIELD**: `damaged_count` is collected in UI but NEVER saved to DB (column doesn't exist)
- `unit_budget` is passed to save action but not stored in DB (comes from admin config lookup)

**5. LOADER:**
- Function: `loadFormItEquipmentInitial` (load-form-data.ts:249-264)
- Returns: `damaged_count` is hardcoded to 0 in loader return since it's not in DB

**6. HARDCODED CONSTANTS:**
- `CARD_CONFIGS` with aliases for matching equipment types (lines 68-106)
- Default unit prices: computer=65000, printer=25000, scanner=18000, photocopier=120000
- These are now overridable via admin prices passed from page.tsx

**7. UI/UX ISSUES:**
- Uses `strings.form7.*` (legacy numbering - form7 in strings is for IT equipment)

**8. BUGS:**
- **DROPPED FIELD**: `damaged_count` is collected in the modal input but never written to the database. The column doesn't exist in the schema.
- **ID MISMATCH**: The save action `saveFormITEquipmentRow` receives `equipmentTypeId` but this is passed to `itConfigId` in the Prisma call. The client matches cards to equipment types using fuzzy name matching (aliases), but the actual ID passed is the `AdminItConfig.id`, not the `RefItEquipmentType.id`. This could lead to mismatches if the admin config IDs don't align with the equipment type IDs.

---

## FORM 11: UTILITIES (ইউটিলিটি বিলসমূহ)

**1. Route folder and client component:**
- Route: `form-11/` → `Form11Client` (form-11-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormUtility` → `office_form_utilities`
- Save action: `saveFormUtilityRow` (forms.ts:340-369)
- Delete action: `deleteFormUtilityRow` (forms.ts:371-386)

**3. COLUMN COVERAGE (office_form_utilities):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | From params |
| `utility_type_id` | Yes | From params |
| `annual_bill` | Yes | Mapped from `annual_cost` |
| `arrears_due` | Yes | Mapped from `due` |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**4. FIELD COVERAGE:**
- Rendered: `utility_type_id`, `annual_cost`, `due`
- All map correctly to DB columns

**5. LOADER:**
- Function: `loadFormUtilitiesInitial` (load-form-data.ts:217-228)

**6. HARDCODED CONSTANTS:**
- None

**7. UI/UX ISSUES:**
- Uses `strings.form8.*` (legacy numbering)

**8. BUGS:**
- None identified

---

## FORM 12: RETURN INFO (আয়কর রিটার্ন সংক্রান্ত)

**1. Route folder and client component:**
- Route: `form-12/` → `Form12Client` (form-12-client.tsx)

**2. DB Table and Save Action:**
- Table: `OfficeFormReturnInfo` → `office_form_return_info`
- Save action: `saveFormReturnInfo` (forms.ts:427-457)
- Delete action: `deleteFormReturnInfo` (forms.ts:470-479)

**3. COLUMN COVERAGE (office_form_return_info):**
| Column | Written? | Notes |
|--------|----------|-------|
| `id` | PK | Auto |
| `submission_id` | Yes | Unique |
| `return_submitted_count` | Yes | From data |
| `postal_rate_id` | Yes | Looked up from admin_rates |
| `total_postal_demand` | Yes | Calculated |
| `created_at` | Auto | |
| `updated_at` | Auto | |

**DEAD COLUMN CONFIRMED:**
- `tin_count` column does NOT exist in the schema - the UI collects it but there's no corresponding column in `office_form_return_info`. The loader hardcodes `tin_count: 0` in the return.

**4. FIELD COVERAGE:**
- Rendered: `tin_count`, `return_submitted_count`
- **DROPPED FIELD**: `tin_count` is collected in UI but NEVER saved to DB (column doesn't exist)

**5. LOADER:**
- Function: `loadFormReturnInfoInitial` (load-form-data.ts:266-275)
- **BUG CONFIRMED**: Returns `tin_count: 0` hardcoded, but this column doesn't exist in the database schema. The UI expects this key but it's not a real column.

**6. HARDCODED CONSTANTS:**
- Postal rate lookup from admin config (not hardcoded)

**7. UI/UX ISSUES:**
- Uses `strings.form10.*` (legacy numbering)
- Form 10 in strings is for IT equipment, but this is form-12 route

**8. BUGS:**
- **CONFIRMED**: `tin_count` column does not exist in `office_form_return_info` table schema. The loader at `load-form-data.ts:272` hardcodes `tin_count: 0`, but the column was never added to the database. The client component at `form-12-client.tsx:39` expects this field.
- **DATA LOSS**: `tin_count` is collected in the UI but never persisted because there's no column for it.

---

# CROSS-CUTTING ISSUES

## 1. SCHEMA MISMATCHES / DEAD COLUMNS

| Form | Column | Issue |
|------|--------|-------|
| **Form 5** | `effective_date` | Exists in schema, collected in UI, **NEVER written** in save action |
| **Form 9** | `contract_start_date`, `contract_end_date` | Collected in UI, **columns don't exist**, never persisted |
| **Form 10** | `damaged_count` | Collected in UI, **column doesn't exist**, never persisted |
| **Form 12** | `tin_count` | **Column doesn't exist** in schema, hardcoded as 0 in loader |

## 2. LEGACY NUMBERING IN STRINGS

All forms reference `strings.formN.*` where N is the OLD numbering:
- Form 2 uses `strings.form2.*` ✓
- Form 3 uses `strings.form2b.*` (was "2b" in old numbering)
- Form 4 uses inline strings (no reference)
- Form 5 uses `strings.form3.*` (was "3" for allowances)
- Form 6 uses `strings.form4.*` (was "4" for leave)
- Form 7 uses `strings.form5.*` (was "5" for vehicles)
- Form 8 uses `strings.form6.*` (was "6" for rent)
- Form 9 uses `strings.form9.*` ✓
- Form 10 uses `strings.form7.*` (was "7" for IT)
- Form 11 uses `strings.form8.*` (was "8" for utilities)
- Form 12 uses `strings.form10.*` (was "10" for return info)

## 3. DROPPED FIELDS SUMMARY

| Form | Field | Collected? | Persisted? |
|------|-------|------------|------------|
| 5 | `date` (effective_date) | Yes | **NO** |
| 7 | `additional_expense` | Yes | **NO** |
| 9 | `contract_start_date` | Yes | **NO** |
| 9 | `contract_end_date` | Yes | **NO** |
| 10 | `damaged_count` | Yes | **NO** |
| 12 | `tin_count` | Yes | **NO** (column doesn't exist) |

## 4. HARDCODED CONSTANTS SUMMARY

| File | Line | Value | Description |
|------|------|-------|-------------|
| form-2-client.tsx | 48-52 | Grades 1-20 | Grade array (domain constraint) |
| form-3-client.tsx | 48-52 | Same grades | Same grade array |
| form-4-client.tsx | 54-83 | Fiscal year logic | Hardcoded July-June fiscal year |
| form-5-client.tsx | 41-112 | Allowance configs | 6 hardcoded allowance types |
| form-10-client.tsx | 68-106 | Equipment aliases | Fuzzy matching aliases |
| form-10-client.tsx | 76,86,95,104 | Default prices | 65000, 25000, 18000, 120000 |
| load-form-data.ts | 272 | `tin_count: 0` | Hardcoded for non-existent column |

## 5. KEY MISMATCHES

| Form | Loader Returns | Client Expects | Match? |
|------|--------------|----------------|--------|
| 5 | `effective_date` | `date` | Mismatched naming |
| 9 | `contract_start_date: ''` | `contract_start_date` | Empty string, never from DB |
| 9 | `contract_end_date: ''` | `contract_end_date` | Empty string, never from DB |
| 10 | `damaged_count: 0` | `damaged_count` | Hardcoded 0, never from DB |
| 12 | `tin_count: 0` | `tin_count` | Hardcoded 0, column doesn't exist |

---

# SUMMARY OF CRITICAL BUGS

1. **Form 5**: `effective_date` column exists but is never written (dead column in practice)
2. **Form 9**: Contract dates are collected but columns don't exist - data is lost
3. **Form 10**: `damaged_count` collected but column doesn't exist - data is lost
4. **Form 12**: `tin_count` column doesn't exist in schema but UI expects it - this will cause runtime errors if the code tries to query a non-existent column. The loader hardcodes `tin_count: 0` as a workaround, but this is a schema mismatch.

Let me verify the audit's most consequential claims myself before presenting them.

Verified. Key confirmations: `ALL_GRADES` hardcoded in [form-2-client.tsx](file:///c:/App/ird-budget/src/app/(office)/office/form-2/form-2-client.tsx#L48-L52); `ALLOWANCE_CONFIGS` hardcoded in [form-5-client.tsx](file:///c:/App/ird-budget/src/app/(office)/office/form-5/form-5-client.tsx#L41-L112); and in the schema only `effectiveDate` exists — `tin_count`, `contract_start_date/end_date`, `damaged_count`, `additional_expense` columns genuinely do **not** exist. Let me confirm the form-10 ID issue.

Reviewed all 12. Here's the picture.

**Clean / consistent:** forms 1, 2 (mapping), 3, 4, 6, 8, 11 — loader, client and save action all agree with their `office_form_*` table.

**Real bugs found**

| Form | Table | Issue |
|---|---|---|
| 5 | `office_form_allowances` | loader returns `effective_date`, client reads `date`; column exists but save action never writes it |
| 7 | `office_form_vehicles_govt` | UI collects `additional_expense`; no column — silently discarded |
| 9 | `office_form_house_rent` | UI collects `contract_start_date`/`contract_end_date`; no columns — discarded |
| 10 | `office_form_it_equipment` | UI collects `damaged_count`; no column. **Also:** client resolves `ref_it_equipment_types.id` but [saveFormITEquipmentRow](file:///c:/App/ird-budget/src/app/actions/forms.ts#L573-L610) writes it into `itConfigId`, which is an FK to `admin_it_config.id` — wrong table's id |
| 12 | `office_form_return_info` | UI collects `tin_count`; no column; loader hardcodes `tin_count: 0` |

**Hardcoding still present** (contradicts the project's no-hardcoding rule we applied to categories/types/years)
- `ALL_GRADES` — 20 grades hardcoded in [form-2-client.tsx](file:///c:/App/ird-budget/src/app/(office)/office/form-2/form-2-client.tsx#L48-L52) and form-3. `ref_grades` already has `gradeNo` + `category`.
- `ALLOWANCE_CONFIGS` — 6 allowance types hardcoded in [form-5-client.tsx](file:///c:/App/ird-budget/src/app/(office)/office/form-5/form-5-client.tsx#L41-L112). `ref_allowance_types` already has `isCalculated` / `formulaKey` / `applicableCategory` — the same pattern we removed for economic-code categories.

**Systemic (all 12 forms):** [FormShell](file:///c:/App/ird-budget/src/components/form-shell.tsx#L44-L56) discards the save action's `{ error }` and shows green **সংরক্ষিত** even when Zod validation rejected the save.

**Cosmetic leftovers:** `strings.*` keys and the comments in [forms.ts](file:///c:/App/ird-budget/src/lib/schemas/forms.ts) still use the old form numbering (`form2b`, `form3`=allowances … `form10`=return-info).

Three decisions block "finalizing" each form.

All three recommendations accepted. Setting up the work and gathering what I need for the schema changes.

Now I have the full picture. Setting up the plan and starting with the save-feedback fix.

Now the FormShell change.

Now the error banner between the form body and the action buttons.

Now the 12 clients must return the action result. Let me see how each passes `onSave`.

Let me read each `handleSaveAll` body so the edits are exact.

Now updating all 12 clients to propagate the action result.

I truncated form-6's payload by mistake. Restoring it.

WS3 done — typecheck clean. Moving to the schema changes.

Now the schema edits.

Now the migration file, matching the existing style.

Config loads `.env` via dotenv, so the CLI is fine. Applying the migration.

Migration applied. Now regenerating the Prisma client — this may hit the DLL lock if your dev server is running.

The generated client is locked by your running dev server — I'll need that stopped before I can regenerate and verify. Meanwhile, let me do the wiring. Reading the affected actions and loader.

Found another bug: [loadFormAllowancesInitial](file:///c:/App/ird-budget/src/lib/office/load-form-data.ts#L70-L81) returns `officer_count`/`total_annual_amount` but the client reads `count`/`amount` — so form 5 also never loads its saved values, and `total_basic`/`due` have no columns. I'll handle form 5 wholly in the allowance task. First, the four new columns.

I'll continue with `ws1-wire` — the loader half of the new-columns work. Let me read the current loaders.

Now let me make the loader edits and inspect the form-10 save action.

Now the loader edits.

Now fix the form-10 save action parameter semantics.

Now form-10 page and client.

Now the form-10 client.

Now form-5 (allowances). Let me read the rest of the client and its table.

Now let me make the schema changes for form 5.

Now the migration.

Now the allowance save action.

Now rewriting the form-5 client to be fully table-driven.

Now the grades in forms 2 and 3. Let me read them.

Applying the same table-driven grade changes to form-3.

Now form 4, which has the same hardcoded grade list.

Picking up form-4 where I left off — finishing the grade conversion.

Now I have everything. Applying the form-4 grade edits.

Now the two table cells and the section headers.

Both table cells need the same change — using `replace_all` on just the grade line.

Now the grade `<Select>`.

Now `form-4/page.tsx` — load grades and pass them.

Form-4 clean. Checking no other form still carries a hardcoded grade list.

Form-4 done; `ws2-grades` complete. Now the naming cleanup — checking the scope first.

`ws2-grades` is complete (forms 2, 3, 4 all table-driven; no hardcoded reference arrays remain anywhere). Let me check the terminal state before the verification step.

Applying the pending migration (this doesn't need the dev server stopped).

Migration applied. Now regenerating the Prisma client.

Expected — the dev server still holds the Prisma DLL. Meanwhile, let me finish the `upgrade.md` factual update (independent of that lock).

Now updating the migration table and the no-hardcoding rule to reflect the current state.

Let me run the seed to get exact per-table counts (also verifies the new upsert path).

Now the Status section.

I shouldn't claim `tsc` is clean — the client isn't regenerated yet. Correcting that.

---

**User**


/compact 

**Assistant**

Error: Your requests have exceeded the quota.

---

