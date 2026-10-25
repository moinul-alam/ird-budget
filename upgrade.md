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
produced the drift this setup exists to eliminate — see §13 for stale SQL files that must not
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

**The pool mode differs by environment.** Which pooler the application URL points at is not the
same locally and on Vercel:

- **Local dev and the Prisma CLI** — the *session* pooler (5432). A dev server is one long-lived
  process, which is the case session mode is built for. Measured on the path this project is
  developed from, a warm query costs ~300ms through the session pooler and ~1480ms through the
  transaction pooler, back to back in one process.
- **Vercel** — the *transaction* pooler (6543) with `pgbouncer=true&connection_limit=1`, because a
  serverless instance must not hold a connection open between requests.

`connection_limit` has to suit the mode. Session mode caps the whole project at 15 clients
(`EMAXCONNSESSION … max clients are limited to pool_size: 15`), so the local URL sets 5 and leaves
the rest for the CLI, Studio and one-off scripts; transaction mode multiplexes and tolerates
hundreds. Setting the serverless value of 1 locally is what a `Timed out fetching a new connection
from the connection pool … (connection limit: 1)` on `/dashboard` looks like: the page issues 13
queries in parallel (`loadOfficeDashboardStats`), and one connection serialises them past the 10
second `pool_timeout`.

`directUrl` is intentionally unset in [prisma.config.ts](prisma.config.ts): the Supavisor
*session* pooler (port 5432) supports the DDL migrations need, so one URL serves both the app
and the CLI. On a host that needs a separate migration connection, add
`directUrl: env('DIRECT_DATABASE_URL')` there rather than changing the application URL.

**Gotcha:** the presence of a Prisma config file makes the CLI skip its own `.env` loading.
That is why every Prisma-invoking script passes `--env-file=.env` explicitly.

### Required environment variables

| Variable | Scope | Notes |
| --- | --- | --- |
| `DATABASE_URL` | app + CLI | see above |
| `DIRECT_URL` | local scripts only | session pooler (5432), used for migrations |
| `AUTH_SECRET` | server only | HMAC key signing the `admin_session` cookie ([src/lib/auth-admin.ts](src/lib/auth-admin.ts)). Rotating it invalidates every admin session. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |
| `OFFICE_DEFAULT_PASSWORD` | server only | the password an office is given until a superadmin sets its own ([src/lib/office/defaults.ts](src/lib/office/defaults.ts)). **Not** `NEXT_PUBLIC_`, so it never reaches the browser bundle. In production the app throws if it is unset — which happens at build time, so the build fails rather than shipping offices nobody can log into. Changing it affects only offices created afterwards. |

None of these may be prefixed `NEXT_PUBLIC_`: that prefix inlines the value into the client
JavaScript, where it is readable by anyone. Server values reach an authenticated admin UI only
as part of a server action's response (see `saveFieldOffice`).

---

## 4. Schema map — 41 tables

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

### Domain 2 — `ref_` : reference data the admin fully controls (12 tables)

`ref_grades`, `ref_budget_categories`, `ref_budget_types`, `ref_fiscal_years`,
`ref_economic_codes`, `office_level_economic_code_mapping`, `ref_allowance_types`,
`ref_vehicle_types`, `ref_fuel_types`, `ref_fuel_categories`, `ref_it_equipment_types`,
`ref_utility_types`.

Referential links inside this domain:

- `ref_economic_codes.category_id → ref_budget_categories` — **`ON DELETE SET NULL`**, so
  deleting a category never deletes codes; they simply become uncategorised.
- `ref_fuel_types.category_id → ref_fuel_categories` — **`ON DELETE RESTRICT`**, because a fuel's
  category is what sends its cost to one of two different economic codes (below); dropping the
  category would leave the fuel with nowhere to be charged.
- `office_level_economic_code_mapping` — which codes a given office level may submit, with an
  `is_enabled` flag. This is the gate the office budget sheet obeys: `computeSubmissionSheet`
  resolves the office's level and asks for only those codes, so a level that has no rows at all
  shows none — the same reading `/admin/codes` gives.
- `ref_economic_codes` also carries the two flags that decide **who supplies a figure**:
  `is_manual` (the office types it by hand) and `allow_manual_override` (the engine computes it
  but the budget sheet still renders an override box). The second flag is set on exactly one
  code today — ডাক (`3211119`) — whose amount depends on a non-filer count only the office can
  confirm.

`ref_fuel_types.unit_price` and `ref_it_equipment_types.unit_price` are the prices the
administrator edits on `/admin/settings` (per litre, per unit). The calculation engine reads the
fuel prices from here, overriding the legacy `admin_rates.fuel_price_*` scalars when set.

`ref_fuel_categories` holds the two fuel categories, seeded rather than editable: `category_name`
is the stable key the engine matches on (`oil` / `gas`) and `category_name_bn` is the Bengali label
(`তেল` / `গ্যাস`) shown on `/admin/settings`. A fuel's `category_id` decides which of the two fuel
codes it is charged to — `3243301` পেট্রোল, অয়েল ও লুব্রিকেন্ট for oil and `3243302` গ্যাস ও জ্বালানী
for gas. The engine splits on this link rather than on substrings of the fuel's name, so an
administrator can add or rename a fuel without its cost silently moving to the wrong code.

### Domain 3 — `admin_` : rates and per-office-type configuration (7 tables)

`admin_rates` (key/value rates plus VAT and postal rates), `admin_salary_config` (the sixteen
salary tiles the `/admin/settings` tab 1 renders — `key` unique, with `input_type`
`number`/`grade`/`slab`, `value_format` and the current value), `admin_salary_slabs` (grade-banded
values such as house rent, FK → `admin_salary_config.key`), `admin_vehicle_config`,
`admin_vehicle_allowance_config`, `admin_vehicle_rent_config`, `admin_it_config`.

A tile is normally a single value. Setting `secondary_label_bn` turns it into a **rate ×
quantity pair** — ডাক is the one such card (cost per notice × notices served per non-filer). The
tab then renders and saves `secondary_value` next to `value`, so both factors of the
multiplication are the administrator's, and no multiplier is compiled into the engine. Nothing in
the UI names this card: the column alone decides the shape.

`admin_vehicle_config` and `admin_vehicle_rent_config` keep an **optional** `office_type_id`:
a row with `office_type_id IS NULL` is a global default the `/admin/settings` page manages, while a
row tagged with an office type is a per-office-type override. Their uniques are
`(vehicle_type_id, fuel_category_id)` and `(vehicle_type_id)` respectively — a global and a tagged
row may coexist. `admin_it_config` remains a strict per-office-type composite unique on
(office type × equipment type).

`admin_vehicle_config` names a fuel **category**, not a fuel (`fuel_category_id` →
`ref_fuel_categories`, `ON DELETE RESTRICT`): since every oil is charged to the same code and
every gas to the other, the administrator sets one litre quota per vehicle type per category
instead of repeating it for each fuel. The per-litre price is not lost — form 7 declares the
exact fuel the office buys, and [fetcher.ts](src/lib/budget/fetcher.ts) prices the litres from
that fuel's `unit_price` while taking the code from the config's category. Only the litre quota
lives here; the rest of the type's allowance is one level up.

`admin_vehicle_allowance_config` holds a vehicle type's lubricant and maintenance allowance —
`vehicle_type_id` unique, FK → `ref_vehicle_types` (`ON DELETE CASCADE`). These are facts about
the *type*, not about the fuel: a jeep that runs on both তেল and গ্যাস gets one lubricant and one
maintenance allowance, not one per category. Keeping them on the per-category row would have
stored the same number twice and let the copies drift. The engine reaches them through the
office row's config (`config.vehicleType.allowanceConfig`).

The settings page treats a vehicle type as **one** configuration: its tab shows the type's
lubricant and maintenance once and then a litre quota per fuel category read from
`ref_fuel_categories`, and saves the lot together (`saveVehicleConfigForType`). The administrator
therefore fills one form per vehicle type rather than one per category, and deleting a type
removes its allowance row and every category row with it.

### Domain 4 — `office_` : submissions and the twelve forms (15 tables)

`office_users`, `office_submissions` (`UNIQUE(office_id, cycle_id)`), then the per-form tables:
`office_form_basic`, `office_form_staff_working`, `office_form_staff_suspended`,
`office_form_staff_new_recruits`, `office_form_allowances`, `office_form_leave_encashment`,
`office_form_vehicles_govt`, `office_form_vehicles_rent`, `office_form_house_rent`,
`office_form_it_equipment`, `office_form_utilities`, `office_form_return_info`, and the final
output table `office_budget_sheet` (auto / manual / final value per economic code).

All form tables cascade from `office_submissions`, so deleting a submission removes its form
data. `office_form_vehicles_govt` is the one form table that also hangs off configuration data: a
row points at an `admin_vehicle_config` (the vehicle-on-category allowance) **and** at the
`ref_fuel_type` the office declares, and its unique is
`(submission_id, vehicle_config_id, fuel_type_id)` so one vehicle may be budgeted on two fuels of
the same category (ডিজেল and অকটেন are both oil) without one replacing the other.

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
and the officer/staff split is driven by the grade's `category_id` → `ref_employee_categories`
(কর্মকর্তা grades 1–10 / কর্মচারী grades 11–20) instead of a grade-number range. Form 4 (নবনিয়োগ)
offers only the কর্মচারী grades.
Allowance cards on form 5 are likewise rendered from `ref_allowance_types` (its
`label_bn`/`count_label_bn`/`has_basic`/`has_amount`/`has_due` columns describe each card's shape),
so adding or reshaping an allowance is an admin edit, not a code change.

Seed data in [prisma/seed.js](prisma/seed.js) is **data, not code**: it only fills gaps on first
run, so a row you rename or add by hand survives re-seeding.

`/admin/settings` (ডিফল্ট ভ্যালু কনফিগারেশন) is the worked example: its seven tabs hold **no
hardcoded values**. Every card, price and slab is read from a table and written back by a server
action in [admin-settings.ts](src/app/actions/admin-settings.ts) —

- tab 1 (বেতন) ← `admin_salary_config` + `admin_salary_slabs`;
- tabs 2/3 (যানবাহন / জ্বালানি) ← `ref_vehicle_types` / `ref_fuel_types`;
- tabs 4/5 (যানবাহন-জ্বালানি / ভাড়া) ← `admin_vehicle_config` / `admin_vehicle_rent_config`
  (global rows, `office_type_id IS NULL`);
- tab 6 (কম্পিউটার সরঞ্জাম) ← `ref_it_equipment_types.unit_price`;
- tab 7 (ইউটিলিটি) ← `ref_utility_types`.

The accent colours and lucide icons are the only thing still in the component: they are
presentation, keyed off the row's identity, with a neutral fallback for unknown keys. Which tab is
open lives in the URL (`?tab=…`), so a save that triggers `revalidatePath` does not reset it.

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
| `20261024040000_settings_config_tables` | Added `admin_salary_config` (unique `key`) and `admin_salary_slabs` (FK → `admin_salary_config.key`), seeded with the 15 tiles + 4 slabs and back-filled from the old `admin_rates.salary_config` JSON (then deleted). Added `unit_price` to `ref_fuel_types` and `ref_it_equipment_types`. Dropped `NOT NULL` on `admin_vehicle_config.office_type_id` / `admin_vehicle_rent_config.office_type_id` and swapped their uniques to `(vehicle_type_id, fuel_type_id)` / `(vehicle_type_id)` for global rows. |
| `20261024050000_education_allowance_per_staff` | Corrected the শিক্ষা ভাতা tile description: no office form collects a child count, so the rate is a flat monthly amount **per staff member** that the engine multiplies by the office headcount. |
| `20261024060000_auto_allowance_codes` | Flipped nine allowance codes from `is_manual` to automatic (`3111301` দায়িত্ব, `3111302` যাতায়াত, `3111312` মোবাইল, `3111313` আবাসিক টেলিফোন, `3111314` টিফিন, `3111316` ধোলাই, `3111331` আপ্যায়ন, `3111335` বাংলা নববর্ষ, `3111352` বিশেষ সুবিধা), so the administrator rates on `/admin/settings` tab 1 drive the budget instead of the office retyping every figure. |
| `20261024070000_postal_rate_card` | Added `ref_economic_codes.allow_manual_override` (set for ডাক `3211119`); inserted the sixteenth salary tile `postal_rate` (ডাক ব্যয়ের হার) and lifted the legacy value into it; repointed `office_form_return_info.postal_rate_id` off the duplicate row; deleted the now-dead `admin_rates` rows `house_rent_percent` and `postal_rate`. |
| `20261024080000_postal_rate_pair` | Added `admin_salary_config.secondary_label_bn` / `secondary_unit_bn` / `secondary_value` and configured the ডাক card as a rate × quantity pair (cost per notice × notices per non-filer), removing the last hardcoded multiplier from the engine. |
| `20261024090000_fuel_category` | Added `ref_fuel_types.category` (`'oil'` / `'gas'`, default `'oil'`), backfilled by name, so `3243301` / `3243302` split on a stored column instead of on the engine's fuel-name substring match. |
| `20261024100000_fuel_category_lookup` | Promoted that tag to real reference data: created `ref_fuel_categories` (`category_name` / `category_name_bn`, seeded with তেল and গ্যাস), added `ref_fuel_types.category_id` (`NOT NULL`, FK → `ON DELETE RESTRICT`), lifted the tag into it, and dropped the old `category` column. |
| `20261024110000_vehicle_config_fuel_category` | Moved the vehicle-fuel config from one fuel to a fuel **category**: added `admin_vehicle_config.fuel_category_id` (FK → `ref_fuel_categories`, `ON DELETE RESTRICT`), lifted each row's fuel to its category and swapped the unique to `(vehicle_type_id, fuel_category_id)`. Added `office_form_vehicles_govt.fuel_type_id` (FK → `ref_fuel_types`, `ON DELETE RESTRICT`) — the fuel the office declares — backfilled from the row's config and folded into that row's unique, so the per-litre price stays with the office. |
| `20261024120000_vehicle_allowance_per_type` | Created `admin_vehicle_allowance_config` (`vehicle_type_id` unique, FK → `ref_vehicle_types`, `ON DELETE CASCADE`) and lifted one lubricant/maintenance allowance per vehicle type out of the per-category rows before dropping `admin_vehicle_config.annual_lube_allowance` / `annual_maintenance_allowance`. A type using both তেল and গ্যাস now carries one allowance instead of two copies. |
| `20261024130000_employee_categories` | Promoted the officer/staff split to real reference data: created `ref_employee_categories` (`category_name` / `category_name_bn`, seeded with কর্মকর্তা and কর্মচারী), added `ref_grades.category_id` (`NOT NULL`, FK → `ON DELETE RESTRICT`), lifted the old tag into it, corrected the boundary to grades 1–10 কর্মকর্তা / 11–20 কর্মচারী, and dropped the old `category` column. |

The fourteen later migrations are **data-preserving**: they add tables/columns, lift any value already
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
| `ref_employee_categories` | 2 (`officer` কর্মকর্তা / `staff` কর্মচারী — the two employee categories the forms group by) |
| `ref_grades` | 20 (`grade_no` 1–20, `category_id` → `ref_employee_categories`: 1–10 কর্মকর্তা, 11–20 কর্মচারী) |
| `ref_allowance_types` | 6, each with its card-shape flags (`label_bn`, `count_label_bn`, `has_basic`, `has_amount`, `has_due`) |
| `ref_vehicle_types` | 4 |
| `ref_fuel_categories` | 2 (`oil` তেল / `gas` গ্যাস — the two fuel codes the budget splits on) |
| `ref_fuel_types` | 3 (unit_price 130 / 110 / 45; অকটেন ও ডিজেল → `oil`, সিএনজি → `gas`) |
| `ref_it_equipment_types` | 4 (`unit_price` 0, for the admin to price) |
| `ref_utility_types` | 5 |
| `admin_salary_config` | 16 tiles |
| `admin_salary_slabs` | 4 grade bands |
| `admin_rates` | 9 |
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

## 11. Reporting

Reports are a pure read layer over the **same formula engine the office's own budget sheet
uses**. There is no separate reporting dataset and no snapshot taken at submit — a report is
recomputed live from the office's forms each time it is opened, so a report can never disagree
with the sheet the office sees.

The one primitive is a submission's **code-wise vector**: one row per economic code the office's
level is allowed, with an auto value (from the engine), an optional manual override, and a final
value, summed to a total.

| File | Role |
|---|---|
| [src/lib/budget/sheet.ts](src/lib/budget/sheet.ts) | `computeSubmissionSheet(submissionId)` — the single builder of that vector. The office budget sheet ([budget.ts](src/app/actions/budget.ts)) and every report call it. |
| [src/lib/budget/report.ts](src/lib/budget/report.ts) | `rollupOffices(officeIds, cycleId)` — sums the vector across a set of offices: `codes` (each code summed across the set), `offices` (each office's own total), `grand_total` (the total of totals). Also `getActiveCycle()`. |
| [src/lib/budget/group-codes.ts](src/lib/budget/group-codes.ts) | Pure category grouping, shared by the drill-down and the roll-up tables. |

`office_budget_sheet` holds **only manual overrides** — auto values are never persisted — so a
report cannot simply sum that table. `rollupOffices` instead recomputes each submission through
`computeSubmissionSheet`, capped at 4 concurrent submissions (`mapLimit`) because the database is
remote and each submission costs ~15 queries. The roll-up keeps the global code list (it spans
offices on different levels, each granted a different set), while each office's own vector holds
only the codes its level was granted.

### The three scopes

One aggregation, three ways to choose the set of offices:

| Route | Scope | Office set |
|---|---|---|
| `/admin/reports/individual` (অফিসভিত্তিক) | one office (drill-down) | the chosen office; its vector is shown code by code with a সর্বমোট header |
| `/admin/reports/summary` (কোডভিত্তিক সারসংক্ষেপ) | one **office level** | all active offices of the selected `core_office_levels` row (office type × level) |
| `/admin/reports/combined` (সমন্বিত) | one **group-budget rule** | all active offices covered by a `admin_group_budget_rules` row where `is_group_budget` (office type × optional level), set on `/admin/offices-management/group-budget` |

Each roll-up shows two tables — the code-wise column summed across the offices in scope
(category-grouped, with a সর্বমোট of the grand total) and each office's own total with its
submission status (দাখিলকৃত / খসড়া / শুরু করেনি) — so "an office's total" and "the level's total
of totals" are the same figure read two ways.

Scope selection lives in the URL (`?level=` / `?rule=` / `?office=`), matching the settings tabs,
so a re-render or refresh keeps the chosen scope. Roll-up rows accumulate on `row.id` (the
economic-code id), not the code string.

---

## 12. Status

Implemented and verified: the schema above, the Prisma migration workflow (eleven migrations
applied), seeding, admin authentication, and table-driven reference data for economic codes,
categories, budget types, fiscal years, grades, allowance types, and the `/admin/settings`
default-value configuration.

Outstanding:

- **The office forms: code is done, browser round-trip is not.** Each form was checked against its
  table. Values the UI collected but silently dropped now have real columns (`20261024020000`);
  form 5 round-trips its basic/amount/due fields and renders its cards from `ref_allowance_types`;
  form 10 keys its rows by the *equipment type*, whose price lives on
  `ref_it_equipment_types.unit_price` (edited on `/admin/settings?tab=equipment`) with `admin_it_config.unit_budget`
  as an optional per-office-type override — the `admin_it_config` link row is gap-filled on first save rather
  than required up front, which is why a card was previously priced at 0; forms 2/3/4/5 build their grade and allowance
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
- **The office budget sheet obeys the admin's code grants.** It lists only the codes enabled for
  the office's own `core_office_levels` row (§10), in `ক্রম / কোড / ব্যয় খাত / বরাদ্দের পরিমাণ`
  columns, one amount column (amber-bordered box for an `is_manual` code, dashed blue for an
  `allow_manual_override` one), rows banded in three tonal steps, and an info icon beside each
  computed amount whose click says which form to edit and links to it (`codeSourceForms` in
  [src/lib/budget/calculate.ts](src/lib/budget/calculate.ts), kept beside the formulas for that
  reason — a form-less code simply has no icon). The level itself is now editable on
  `/admin/offices-management/field-offices` — `saveFieldOffice` previously accepted the modal's
  `মাঠ অফিসের স্তর` and silently dropped it, which is why a field office stayed levelless (and, with
  the gate above, would see no codes at all). `npx tsc --noEmit` is clean; what has not run is the
  manual browser pass.
- **Formula engine and reporting: code is done, browser verification is not.** The engine
  consumes every `/admin/settings` card: the nine formerly-manual allowances are computed from
  their administrator rates, the house-rent and special-benefit slabs are grade-aware, and ডাক is
  computed for কর সার্কেল (non-filers × notices × cost per notice, both factors read from the ডাক
  card) with a budget-sheet override for every other office type. The IT codes follow the same rule:
  `3255101` (কম্পিউটার সামগ্রী) multiplies by the `বেতন-ভাতা মাস` tile instead of a compiled-in 12, and
  `4112202` (কম্পিউটার ও আনুষঙ্গিক) is requested qty × the administrator's unit price. The three report routes (§11) are
  built on the same `computeSubmissionSheet` builder the office sheet uses. `npx tsc --noEmit` is
  clean. What has not run is the manual browser pass over `/admin/reports/*`, which depends on the
  office hierarchy below being filled in.

---

## 13. Stale files — do not run

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
