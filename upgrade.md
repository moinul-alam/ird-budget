# IRD Budget System — Database & Architecture Reference

This document is the reference for **what the database is, how it was built, and what is
still outstanding**. It is descriptive, not a script: nothing here should be executed by
hand.

---

## 1. Where the truth lives

| Artifact | Role |
|---|---|
| [prisma/schema.prisma](prisma/schema.prisma) | **Single source of truth** for the schema. Change this first. |
| [prisma/migrations/](prisma/migrations) | Immutable, ordered history of how the database got to its current shape. |
| [prisma/seed.js](prisma/seed.js) | Minimum data required for the app to work after a wipe. |
| [prisma.config.ts](prisma.config.ts) | Prisma CLI configuration (schema path, seed command, datasource URL). |

The database is created and evolved **only** through Prisma migrations. Hand-run SQL is what
produced the drift this setup exists to eliminate — see §12 for stale SQL files that must not
be run.

---

## 2. Backbone

| Layer | Choice |
|---|---|
| Runtime | Next.js 16 (App Router, server components + server actions) |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| Data access | Prisma over TCP. There is **no** backend-as-a-service client in the codebase. |

Single client instance: [src/lib/db/client.ts](src/lib/db/client.ts) — a `PrismaClient`
memoised on `globalThis` in development so hot reloads do not exhaust connections.

Server actions (all mutations) live in [src/app/actions/](src/app/actions); each is a
`'use server'` module that checks the admin session, writes through Prisma, and calls
`revalidatePath` for the affected routes.

### Database-agnosticism

The application depends on *PostgreSQL*, not on *Supabase*. The connection is an ordinary
Postgres TCP connection, and nothing under `prisma/migrations/` is host-specific. Moving to a
different Postgres host is a `DATABASE_URL` change — no code changes.

The one abstraction that was deliberately removed rather than kept: the Supabase client
libraries (`@supabase/ssr`, `@supabase/supabase-js`) and their environment variables are gone.
RLS therefore plays no part in application queries (see §7).

---

## 3. Connection requirements

`DATABASE_URL` in `.env`. Two parameters are mandatory:

- **`connect_timeout=30`** — Prisma's 5-second default is exceeded by the TLS handshake when
  the host resolves over a NAT64/IPv6 path. The failure surfaces as a misleading
  `P1001 Can't reach database server`, which looks like a TLS or credential problem but is
  only a timeout.
- **`sslmode=verify-full`** — real certificate and hostname verification. Prisma trusts the OS
  certificate store; Node's bundled CA list may not contain the host's CA, so a raw `pg`
  script can fail to verify a connection Prisma handles fine.

`directUrl` is intentionally unset in [prisma.config.ts](prisma.config.ts): the Supavisor
*session* pooler (port 5432) supports the DDL migrations need, so one URL serves both the app
and the CLI. On a host that needs a separate migration connection, add
`directUrl: env('DIRECT_DATABASE_URL')` there rather than changing the application URL.

**Gotcha:** the presence of a Prisma config file makes the CLI skip its own `.env` loading.
That is why every Prisma-invoking script passes `--env-file=.env` explicitly.

---

## 4. Schema map — 38 tables

Domain prefixes are load-bearing: they indicate who owns the data.

### Domain 1 — `core_` : organisational structure (6 tables)

`core_ministries` → `core_departments` → `core_office_types` → `core_office_levels` →
`core_offices` (self-referencing via `parent_office_id` for the office hierarchy).

`core_budget_cycles` is a fiscal year × budget type pair. Both sides are foreign keys into
reference tables, not text:

```
core_budget_cycles(fiscal_year_id → ref_fiscal_years, budget_type_id → ref_budget_types)
UNIQUE(fiscal_year_id, budget_type_id)
```

Consequence: renaming a budget type or fiscal year in the admin UI **relabels every cycle that
uses it**. That is the intended behaviour of a relational link.

### Domain 2 — `ref_` : reference data the admin fully controls (11 tables)

`ref_grades`, `ref_budget_categories`, `ref_budget_types`, `ref_fiscal_years`,
`ref_economic_codes`, `office_level_economic_code_mapping`, `ref_allowance_types`,
`ref_vehicle_types`, `ref_fuel_types`, `ref_it_equipment_types`, `ref_utility_types`.

Referential links inside this domain:

- `ref_economic_codes.category_id → ref_budget_categories` — **`ON DELETE SET NULL`**, so
  deleting a category never deletes codes; they simply become uncategorised.
- `office_level_economic_code_mapping` — which codes a given office level may submit, with an
  `is_enabled` flag.

### Domain 3 — `admin_` : rates and per-office-type configuration (4 tables)

`admin_rates` (key/value rates plus VAT and postal rates), `admin_vehicle_config`,
`admin_vehicle_rent_config`, `admin_it_config`. Each config row is a composite unique on
(office type × vehicle/equipment/fuel type).

### Domain 4 — `office_` : submissions and the twelve forms (15 tables)

`office_users`, `office_submissions` (`UNIQUE(office_id, cycle_id)`), then the per-form tables:
`office_form_basic`, `office_form_staff_working`, `office_form_staff_suspended`,
`office_form_staff_new_recruits`, `office_form_allowances`, `office_form_leave_encashment`,
`office_form_vehicles_govt`, `office_form_vehicles_rent`, `office_form_house_rent`,
`office_form_it_equipment`, `office_form_utilities`, `office_form_return_info`, and the final
output table `office_budget_sheet` (auto / manual / final value per economic code).

All form tables cascade from `office_submissions`, so deleting a submission removes its form
data.

### Domain 5 — admin users (2 tables)

`admin_users` (username unique, role, unsalted SHA-256 hash — kept in sync with
[prisma/seed.js](prisma/seed.js)) and `admin_group_budget_rules`.

---

## 5. Reference data and configuration: no hardcoding

**Rule: any list a user can configure belongs in a table, reached by foreign key — never in a
constant in application code.**

This applies to economic code categories, budget types, fiscal years, grades, allowance types,
and every `ref_*` list. The admin UI at `/admin/codes` and `/admin/budgets` performs real
create / rename / delete against those tables, guarded by:

- a unique constraint on the natural key, surfaced to the user as a friendly duplicate message
  (Prisma error `P2002`); and
- an in-use check before delete, so a reference row that a cycle or code still points at cannot
  be removed.

Form UI reads these tables rather than shipping its own copy. In particular the office forms no
longer carry a hardcoded grade list (`1`–`20`): the grade `<select>` is built from `ref_grades`,
and the officer/staff split is driven by `ref_grades.category` instead of a grade-number range.
Allowance cards on form 5 are likewise rendered from `ref_allowance_types` (its
`label_bn`/`count_label_bn`/`has_basic`/`has_amount`/`has_due` columns describe each card's shape),
so adding or reshaping an allowance is an admin edit, not a code change.

Seed data in [prisma/seed.js](prisma/seed.js) is **data, not code**: it only fills gaps on first
run, so a row you rename or add by hand survives re-seeding.

`sort_order` / `is_active` exist on every reference table so display order and visibility are
administrable rather than compiled in.

---

## 6. Migrations

| Migration | What it did |
|---|---|
| `20261023000000_init` | Created the full schema v2 — 35 tables across the five domains. |
| `20261024000000_add_budget_categories` | Added `ref_budget_categories`; replaced `ref_economic_codes.category` (free text) with `category_id` FK, backfilling by 4-digit code prefix. |
| `20261024010000_budget_types_and_fiscal_years` | Added `ref_budget_types` and `ref_fiscal_years`; replaced `core_budget_cycles.fiscal_year` / `budget_type` (free text plus a check constraint) with the two FKs. |
| `20261024020000_form_missing_columns` | Added five columns the forms collected but discarded: `office_form_vehicles_govt.additional_expense`, `office_form_house_rent.contract_start_date` / `contract_end_date`, `office_form_it_equipment.damaged_count`, `office_form_return_info.tin_count`. |
| `20261024030000_allowance_detail_and_labels` | Added `office_form_allowances.total_basic` / `due_amount`, and the five descriptive columns on `ref_allowance_types` (`label_bn`, `count_label_bn`, `has_basic`, `has_amount`, `has_due`) that make the form 5 cards table-driven; backfills the six seeded allowance types. |

The four later migrations are **data-preserving**: they add tables/columns, lift any value already
referenced by existing rows, and only then drop the old column. Replaying them on a populated
database loses nothing.

### Writing a new migration

```bash
# 1. edit prisma/schema.prisma
# 2. regenerate the client
npm run db:generate
# 3. create + apply the migration (requires an interactive terminal)
npx prisma migrate dev --name <description>
# 4. commit BOTH schema.prisma and prisma/migrations/<timestamp>_<description>/
```

`prisma migrate dev` needs an interactive TTY. In a non-interactive shell, hand-author
`prisma/migrations/<timestamp>_<description>/migration.sql` and apply it with `npm run db:deploy`.

**Never** edit an applied migration. Add a new one.

---

## 7. Row Level Security

RLS is enabled on every table with **zero policies**, which denies all access by default. Leave
it that way.

- The app is unaffected: Prisma connects as the role in `DATABASE_URL` (on Supabase, `postgres`,
  which has `rolbypassrls = true`), so policies never apply to application queries. The
  `service_role` key is a PostgREST credential and plays no part in them.
- RLS only governs the PostgREST surface. Enabled with no policy, the public `anon` key can read
  and write nothing.
- **Never create a `USING (true)` policy.** That permits everything and is equivalent to
  disabling security. An earlier version of this plan did exactly that on all 35 tables; it has
  been removed.
- If data is ever exposed over PostgREST, write narrow, explicit policies for the specific
  tables and operations intended. Never `USING (true)`.

---

## 8. Operational commands

```bash
npm run dev          # start the app
npm run db:generate  # regenerate the Prisma client after a schema change
npm run db:deploy    # apply committed migrations to the database
npm run db:seed      # idempotent: admin user + reference data
npm run db:seed:hq   # one-time: NBR head offices from the root spreadsheets
npm run db:reset     # DESTRUCTIVE: drop everything, re-apply migrations, re-seed
npm run db:drift     # exits non-zero if the database and schema.prisma disagree
npm run db:studio    # browse data
```

`npm run db:drift` is the gate to run after any schema work and is suitable for CI. A clean
result reads `No difference detected.`

Rebuilding from nothing is `npm run db:reset` — one command returns a wiped database to a
working state, including a login.

### Windows gotcha

`prisma generate` fails with `EPERM ... rename 'query_engine-windows.dll.node'` when a
`next dev` process still holds the engine DLL. Stop the dev server first.

---

## 9. Seeding

[prisma/seed.js](prisma/seed.js) is idempotent and dependency-free (plain Node +
`@prisma/client`). Current contents:

| Table | Rows |
|---|---|
| `admin_users` | `superadmin` (overridable via `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HINT`) |
| `ref_budget_categories` | 17 |
| `ref_budget_types` | 2 |
| `ref_fiscal_years` | 4 |
| `ref_economic_codes` | 139, read from [resources/expense_codes_backup_139.json](resources/expense_codes_backup_139.json) |
| `ref_grades` | 20 (`grade_no` 1–20, `category` `officer` / `staff`) |
| `ref_allowance_types` | 6, each with its card-shape flags (`label_bn`, `count_label_bn`, `has_basic`, `has_amount`, `has_due`) |
| `ref_vehicle_types` | 4 |
| `ref_fuel_types` | 3 |
| `ref_it_equipment_types` | 4 |
| `ref_utility_types` | 5 |
| `admin_rates` | 12 |
| `core_budget_cycles` | 1 open cycle |

The admin password is only written when the row is **created**, so re-running the seed never
overwrites a password you have since changed. Reference rows are created only if missing
(`ref_allowance_types` is upserted, so edits to its descriptive columns propagate on re-seed);
economic codes are upserted with their category resolved by 4-digit prefix against
`ref_budget_categories`.

To add reference data, extend `prisma/seed.js`. Do not add ad-hoc `*.sql` seed files.

### NBR head offices (one-time import)

`npm run db:seed:hq` runs [prisma/seed-head-offices.js](prisma/seed-head-offices.js), a **separate,
one-time** import kept out of `db:seed` because it writes organizational data an administrator
manages by hand. It reads the two spreadsheets at the repository root — `head quarters.xlsx`
(`[office type | name]`) and `hq with codes.xlsx` (`[budget code | name]`) — and creates 102 head
offices (`core_offices.parent_office_id = NULL`) under the first ministry's department
`জাতীয় রাজস্ব বোর্ড (NBR)`, each at the **top level of its office type** (lowest `level_order`),
inserted in natural alphabetical order (১, ২, ৩ … ১০, ১১).

Like `seed.js` it only fills gaps: a head office whose budget id already exists is skipped, so a
second run creates nothing. 15 names have no code in the source and carry a temporary `TMP-nnn`
budget id to be corrected in the admin UI.

---

## 10. Invariants enforced in the application

Not everything is a database constraint. These are enforced by server actions and are worth
knowing before changing them:

- **One open cycle at a time.** Opening a cycle closes all others
  ([admin-budgets.ts](src/app/actions/admin-budgets.ts), `saveCycle` / `toggleCycleStatus`).
  This is application logic, not a partial unique index.
- **Cycles cannot be deleted once submitted against.** `deleteOrArchiveCycle` archives (sets
  `status = 'closed'`) when submissions exist, and only deletes when there are none.
- **Reference rows in use cannot be deleted**, and duplicates are rejected by unique constraint.

---

## 11. Status

Implemented and verified: the schema above, the Prisma migration workflow (five migrations
applied), seeding, admin authentication, and table-driven reference data for economic codes,
categories, budget types, fiscal years, grades, and allowance types.

Outstanding:

- **The office forms: code is done, browser round-trip is not.** Each form was checked against its
  table. Values the UI collected but silently dropped now have real columns (`20261024020000`);
  form 5 round-trips its basic/amount/due fields and renders its cards from `ref_allowance_types`;
  form 10 keys its rows by `admin_it_config.id`; forms 2/3/4/5 build their grade and allowance
  selectors from the reference tables; the shared `FormShell` now surfaces a save action's
  `{ error }` instead of always showing "সংরক্ষিত"; and the flat `strings.form*` keys plus the
  `src/lib/schemas/forms.ts` comments were renumbered to match the routes. `npx tsc --noEmit` is
  clean, the client is regenerated, and `npm run db:drift` reports no difference. What remains is
  the manual round-trip per form in a browser (load saved rows, save, reload), which has not run.
- **Office hierarchy is intentionally minimal.** The seed creates one office (`IRD-0001`) so the
  app is usable; the hierarchy is meant to grow through the admin UI.
  [resources/offices_backup_91.json](resources/offices_backup_91.json) holds 91 real offices but
  references `office_type_id` values that do not exist in the rebuilt database, so it cannot be
  replayed as-is.
- **Formula engine and reporting** are not verified end-to-end;
  [src/lib/budget/calculate.ts](src/lib/budget/calculate.ts) and the `/admin/reports/*` pages
  exist but depend on the office hierarchy above.

---

## 12. Stale files — do not run

Historical SQL left in the repo. None of it matches the current schema.

| File | Why it is stale |
|---|---|
| [resources/seed_data.sql](resources/seed_data.sql) | Targets the pre-rename schema (`departments`, `office_types`, `expense_codes`, `code_type_mapping`, `parent_offices`). |
| [resources/grant_permissions.sql](resources/grant_permissions.sql) | Supabase-only grants; unrelated to the Prisma connection. |
| [resources/drop_level_unique_constraint.sql](resources/drop_level_unique_constraint.sql) | One-off fix for a constraint of an earlier schema. |
| [resources/rename_to_core_economic_codes.sql](resources/rename_to_core_economic_codes.sql) | Pre-`core_`/`ref_` rename. |
| [resources/update_group_budget_rules.sql](resources/update_group_budget_rules.sql) | One-off data patch for an earlier schema. |
| [scripts/create-superadmin*.js/.sql](scripts) | Predate `prisma/seed.js`. |
| [scripts/seed_redesigned_data.js](scripts/seed_redesigned_data.js) | Superseded by `prisma/seed.js`. |

[resources/budget-system-PRD.md](resources/budget-system-PRD.md) and
[resources/expense_codes_backup_139.json](resources/expense_codes_backup_139.json) are current
and referenced by the seed.
