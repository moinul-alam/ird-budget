# IRD Budget System : Developer & Operations Guide

> **This file is the single source of truth for the project.**

The application is a budget estimation and submission system for the **Internal
Resources Division (IRD), Ministry of Finance, Government of Bangladesh**. Subordinate offices fill twelve requirement forms once per budget cycle; the system computes a
code-wise budget sheet from that data; offices submit, and administrators roll the
submissions up into reports.

***

## 1. Tech stack

| Layer              | Choice                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Framework          | Next.js 16 (App Router, React Server Components + Server Actions)                          |
| Language           | TypeScript 5 (strict)                                                                      |
| Runtime UI         | React 19                                                                                   |
| Styling            | TailwindCSS v4 (`@tailwindcss/postcss`), `tw-animate-css`, tokens in `src/app/globals.css` |
| Components         | Base UI (`@base-ui/react`) + Shadcn structure, Lucide icons                                |
| Forms & validation | React Hook Form + Zod (`@hookform/resolvers/zod`)                                          |
| ORM                | Prisma 6                                                                                   |
| Database           | PostgreSQL (hosted on Supabase, reached over plain TCP)                                    |
| PDF / Excel export | `jspdf` (canvas-rendered, see §17) + `xlsx`                                                |
| Localisation       | Bengali-only UI — `src/lib/bangla.ts` (digits/currency/date), `src/lib/strings.ts` (copy)  |

There is **no backend-as-a-service client in the codebase.** The Supabase JS
libraries and their environment variables were deliberately removed; all data access
is Prisma over a Postgres TCP connection. Moving to another Postgres host is a
`DATABASE_URL` change and nothing else.

***

## 2. Where the truth lives

| Artifact                                     | Role                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [prisma/schema.prisma](prisma/schema.prisma) | **Single source of truth for the schema.** Change this first.                             |
| [prisma/migrations/](prisma/migrations)      | Immutable, ordered history of how the database reached its current shape (32 migrations). |
| [prisma/seed.js](prisma/seed.js)             | Minimum data required for the app to work after a wipe.                                   |
| [prisma.config.ts](prisma.config.ts)         | Prisma CLI config (schema path, seed command, datasource URL).                            |
| [src/lib/db/client.ts](src/lib/db/client.ts) | The one `PrismaClient` instance, memoised on `globalThis` in dev.                         |

The database is created and evolved **only** through Prisma migrations. Hand-run SQL
is what produced the drift this setup exists to eliminate — see §16.

***

## 3. Getting started

### Environment variables (`.env`)

| Variable                  | Scope            | Notes                                                                                                                                                                                                                                                                                       |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | app + CLI        | Postgres connection. Two parameters are mandatory — see below.                                                                                                                                                                                                                              |
| `DIRECT_URL`              | CLI / migrations | `directUrl` in [prisma/schema.prisma](prisma/schema.prisma); session pooler (5432). Required wherever `prisma migrate` or `prisma generate` runs, including on Vercel.                                                                                                                      |
| `AUTH_SECRET`             | server only      | HMAC key that signs the `admin_session` cookie ([src/lib/auth-admin.ts](src/lib/auth-admin.ts)). Rotating it invalidates every admin session. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. In production the app **throws** if it is unset. |
| `OFFICE_DEFAULT_PASSWORD` | server only      | Password an office gets until a superadmin sets its own ([src/lib/office/defaults.ts](src/lib/office/defaults.ts)). **Throws if unset** (at build time in production).                                                                                                                      |
| `ADMIN_DEFAULT_PASSWORD`  | server only      | Password a new admin account gets when the superadmin leaves the field blank ([src/lib/admin/defaults.ts](src/lib/admin/defaults.ts)). Same rule.                                                                                                                                           |

None of these may be prefixed `NEXT_PUBLIC_` — that prefix inlines the value into the
client JavaScript. Server values reach an authenticated admin UI only inside a server
action's response (see `saveFieldOffice`).

### Connection requirements

`DATABASE_URL` must carry:

**Pool mode differs by environment.**

`directUrl` is intentionally unset in [prisma.config.ts](prisma.config.ts): the Supavisor
session pooler supports the DDL migrations need, so one URL serves app and CLI. On a host
that needs a separate migration connection, add `directUrl: env('DIRECT_DATABASE_URL')`
there instead of changing the application URL.

**Gotcha:** the presence of a Prisma config file makes the CLI skip its own `.env`
loading, so every Prisma-invoking script passes `--env-file=.env` explicitly.

**Gotcha:** Prisma stores a sha256 checksum of each `migration.sql`, so a working copy
whose line endings differ from when the migration was applied looks *modified* and blocks
`migrate deploy`/`migrate dev`. `.gitattributes` pins
`prisma/migrations/**/migration.sql` to `text eol=lf` — do not remove that rule.

### Region

The database sits in **AWS Asia Pacific (Mumbai,** **`ap-south-1`)**. Region placement
dominates every other performance lever (measured from Dhaka, warm connection):

| Host                    | Round trip | 13 parallel dashboard queries |
| ----------------------- | ---------- | ----------------------------- |
| Sydney `ap-southeast-2` | 307 ms     | 3984 ms                       |
| Mumbai `ap-south-1`     | 43 ms      | 568 ms                        |

The Vercel function region must match; this project pins it in `vercel.json`. If the host
is ever slow again, check the region before changing provider — a same-region benchmark
puts Neon and Supabase within 4 ms of each other.

***

## 4. Repository map

```
ird-budget/
├── prisma/
│   ├── schema.prisma              # schema source of truth
│   ├── migrations/                # 32 ordered migrations
│   ├── seed.js                    # idempotent seed (admin + reference data)
│   └── seed-head-offices.js       # one-time NBR head-office import
├── resources/                     # data files referenced by the seed, plus stale SQL (§16)
├── src/
│   ├── app/
│   │   ├── (office)/              # field-office portal
│   │   │   ├── dashboard/         # form-completion tracker
│   │   │   └── office/
│   │   │       ├── office-info/   # self-service office profile
│   │   │       ├── form-1 … form-12/
│   │   │       └── budget-sheet/  # the master sheet
│   │   ├── (admin)/admin/         # admin portal (see §10)
│   │   ├── (admin-auth)/admin/login/
│   │   ├── superadmin/login/      # legacy alias that redirects to admin login
│   │   ├── actions/               # every server action (mutations)
│   │   ├── page.tsx               # public landing (office login / register)
│   │   └── layout.tsx, globals.css
│   ├── components/                # ui/ primitives, app-shell, admin-shell, form-shell
│   └── lib/
│       ├── db/client.ts           # single PrismaClient
│       ├── session.ts             # office session cookie
│       ├── auth-admin.ts          # signed admin session cookie
│       ├── bangla.ts              # Bengali digits / currency / date
│       ├── strings.ts             # all UI copy
│       ├── schemas/forms.ts       # Zod schemas
│       ├── budget/                # engine + sheet + fetcher + reports + grouping
│       ├── office/                # forms list, dashboard stats, loaders, defaults
│       ├── report/                # specs.ts + export.ts (PDF/Excel)
│       └── admin/defaults.ts
├── prisma.config.ts
└── .env / .env.example
```

***

## 5. Architecture & data flow

### 5.1 Roles and authentication

Two independent, cookie-based sessions — **no Supabase Auth**.

Office passwords are stored as unsalted SHA-256 hashes; the plaintext default comes from
`OFFICE_DEFAULT_PASSWORD` and is created only when the office/user row is created.

### 5.2 Request lifecycle

Admin data reads are cached with `unstable_cache` under `ADMIN_DATA_TAG = 'admin-data'`;
every admin save action invalidates it with `updateTag(ADMIN_DATA_TAG)`.

### 5.3 The calculation engine

[src/lib/budget/calculate.ts](src/lib/budget/calculate.ts) is a **pure, dependency-free
module** (imports nothing from React/Next/Prisma). It takes a `BudgetContext` — a plain
object of all form data plus the admin configuration — and returns the computed values.

The engine holds **no per-code facts**. Which formula computes a code, and which forms
feed it, are columns on the code:

The engine is only a registry keyed by those formula strings (`formulaRegistry`). A key
with no arithmetic computes `0`, so a mistaken binding can never invent an amount. A
formula receives `(ctx, code)`, so one formula serves many codes whose differences are
data. Re-pointing a code at another formula, or adding a code that reuses an existing one,
is an admin row — not a branch in code. `/admin/formulas` renders this same data, so the
page cannot drift from the engine.

The engine is also the **only** source of computed amounts: reports recompute live through
it rather than summing stored values (§6), so a report can never disagree with the sheet.

### 5.4 The submission sheet

One primitive: a submission's **code-wise vector** — one row per economic code the office's
level is allowed, with an auto value (engine), an optional manual override, and a final
value, summed to a total.

| File                                                           | Role                                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [src/lib/budget/sheet.ts](src/lib/budget/sheet.ts)             | `computeSubmissionSheet(submissionId)` — the single builder of that vector.                    |
| [src/lib/budget/report.ts](src/lib/budget/report.ts)           | `rollupOffices(officeIds, cycleId)` — sums the vector across offices; also `getActiveCycle()`. |
| [src/lib/budget/group-codes.ts](src/lib/budget/group-codes.ts) | Pure category grouping for the drill-down and roll-up tables.                                  |

`office_budget_sheet` stores **only manual overrides** — auto values are never persisted —
so a draft is recomputed, never summed from that table. `rollupOffices` recomputes each
submission through `computeSubmissionSheet`, capped at 4 concurrent submissions (`mapLimit`)
because each costs \~15 queries against a remote database.

On submit, the whole vector is frozen into `office_budget_snapshots` in the same transaction
as the status change, and everything downstream reads that instead of the forms — so an admin
rate change after submission cannot move a submitted number (SCHEMA.md §5.3).

Which codes an office may submit is gated by `office_level_economic_code_mapping` for the
office's own `core_office_levels` row (with an `is_enabled` flag). A level with no rows
shows no codes — the same reading `/admin/codes` gives.

***

## 6. Reporting

Three routes, one aggregation, three ways to choose the office set:

| Route                                            | Scope                     | Office set                                                                              |
| ------------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------- |
| `/admin/reports/individual` (অফিসভিত্তিক)        | one office (drill-down)   | the chosen office; vector shown code by code with a সর্বমোট header                      |
| `/admin/reports/summary` (কোডভিত্তিক সারসংক্ষেপ) | one office **level**      | all active offices of the selected `core_office_levels` row                             |
| `/admin/reports/combined` (সমন্বিত)              | one **group-budget rule** | all active offices covered by an `admin_group_budget_rules` row where `is_group_budget` |

Each roll-up shows two tables — the code-wise column summed across the offices in scope
(category-grouped, with a সর্বমোট) and each office's own total with its submission status
(দাখিলকৃত / খসড়া / শুরু করেনি). Scope selection lives in the URL (`?level=` / `?rule=` /
`?office=`), matching the settings tabs, so a re-render keeps it. Roll-up rows accumulate on
`row.id` (the economic-code id), not the code string.

There is **no separate reporting dataset**: a report reads the submission's frozen snapshot
once one exists, and otherwise recomputes the draft live through the engine. Either way it
never sums a stored total, so a report cannot disagree with the sheet it came from (see
SCHEMA.md §5.3).

***

## 7. Configuration model — "no hardcoding"

> **Rule: any list a user can configure belongs in a table, reached by a foreign key —
> never a constant in application code.**

This applies to economic-code categories, budget types, fiscal years, grades, allowance
types, formulas, utilities, fuel types and every `ref_*` list. The admin UI at
`/admin/codes`, `/admin/budgets` and `/admin/settings` performs real create / rename /
delete against those tables, guarded by a unique constraint on the natural key (surfaced as
a friendly duplicate message on Prisma `P2002`) and an in-use check before delete.

Consequences to keep in mind:

### The paired "rate × quantity" card

A salary-config tile is normally one value. Setting `secondary_label_bn` turns it into a
**rate × quantity pair** and the tab renders/saves `secondary_value` next to `value` — so
both factors of the multiplication are the administrator's and no multiplier is compiled into
the engine. Two cards use it today: **ডাক** (cost per notice × notices per non-filer) and
**দায়িত্ব ভাতা** (monthly rate × months payable). Nothing in the UI names this shape; the
column alone decides it.

### `/admin/settings` — the worked example

Its seven tabs hold **no hardcoded values**; every card, price and slab is read from a table
and written back by a server action in
[admin-settings.ts](src/app/actions/admin-settings.ts):

Accent colours and icons are the only thing still in the component — presentation, keyed off
the row's identity with a neutral fallback. The open tab lives in the URL (`?tab=…`) so a
save that triggers `revalidatePath` does not reset it.

Seed data in [prisma/seed.js](prisma/seed.js) is **data, not code**: it only fills gaps on
first run, so a row you renamed or added by hand survives re-seeding.

***

## 8. Database schema map — 45 tables

The full per-table reference, every foreign key and its delete rule, and the integrity rules
the database enforces are in **[SCHEMA.md](SCHEMA.md)**. This section is the map.

Domain prefixes are load-bearing: they indicate who owns the data.

### Domain 1 — `core_` : organisational structure (6 tables)

`core_ministries` → `core_departments` → `core_office_types` → `core_office_levels` →
`core_offices` (self-referencing via `parent_office_id` for the hierarchy).

`core_budget_cycles` is a fiscal year × budget type pair, both sides foreign keys, not text:

```
core_budget_cycles(fiscal_year_id → ref_fiscal_years, budget_type_id → ref_budget_types)
UNIQUE(fiscal_year_id, budget_type_id)
```

It also carries `salary_months` (1–12) — the multiplier the engine uses for annual
salary/allowance and IT-supply calculations for that cycle.

### Domain 2 — `ref_` : reference data the admin fully controls (14 tables)

`ref_employee_categories`, `ref_grades`, `ref_budget_categories`, `ref_formula_types`,
`ref_budget_types`, `ref_fiscal_years`, `ref_economic_codes`,
`office_level_economic_code_mapping`, `ref_allowance_types`, `ref_vehicle_types`,
`ref_fuel_types`, `ref_fuel_categories`, `ref_it_equipment_types`, `ref_utility_types`.

Referential links inside this domain:

`ref_fuel_types.unit_price` and `ref_it_equipment_types.unit_price` are the prices edited on
`/admin/settings` (per litre, per unit).

### Domain 3 — `admin_` : rates and per-office-type configuration (6 tables)

`admin_salary_config` (the salary tiles `/admin/settings` tab 1 renders — `key` unique, with
`input_type` `number`/`grade`/`slab`, `value_format`, the value, and the optional
`secondary_*` pair),
`admin_salary_slabs` (grade-banded values such as house rent, FK → `admin_salary_config.key`),
`admin_vehicle_config`, `admin_vehicle_allowance_config`, `admin_vehicle_rent_config`,
`admin_it_config`.

### Domain 4 — `office_` : submissions and the twelve forms (17 tables)

`office_users`, `office_submissions` (`UNIQUE(office_id, cycle_id)`), then the per-form
tables: `office_form_basic`, `office_form_staff_working`, `office_form_staff_suspended`,
`office_form_staff_new_recruits`, `office_form_allowances`, `office_form_leave_encashment`,
`office_form_vehicles_govt`, `office_form_vehicles_rent`, `office_form_house_rent`,
`office_form_it_equipment`, `office_form_utilities`, `office_form_return_info`, the draft
output table `office_budget_sheet` (manual overrides per economic code), and the freeze pair
`office_budget_snapshots` + `office_budget_snapshot_rows`, written on submit.

All form tables cascade from `office_submissions`. `office_form_vehicles_govt` also hangs off
configuration: a row points at an `admin_vehicle_config` **and** at the `ref_fuel_type` the
office declares, unique on `(submission_id, vehicle_config_id, fuel_type_id)` so one vehicle
may be budgeted on two fuels of the same category (ডিজেল and অকটেন are both oil).

### Domain 5 — admin users (2 tables)

`admin_users` (username unique, role, unsalted SHA-256 hash — kept in sync with
[prisma/seed.js](prisma/seed.js)) and `admin_group_budget_rules`.

***

## 9. The twelve forms

Defined once in [src/lib/office/forms.ts](src/lib/office/forms.ts) (`FORM_ITEMS`), which the
drawer and dashboard both read, so the count can never drift from the links.

| #  | Route             | Title                                   |
| -- | ----------------- | --------------------------------------- |
| ১  | `/office/form-1`  | অফিসের তথ্য                             |
| ২  | `/office/form-2`  | বেতন (কর্মরত)                           |
| ৩  | `/office/form-3`  | বেতন (বরখাস্তকৃত কর্মকর্তা/কর্মচারীদের) |
| ৪  | `/office/form-4`  | বেতন (নবনিয়োগপ্রাপ্ত কর্মচারী)         |
| ৫  | `/office/form-5`  | ভাতা সংক্রান্ত তথ্য                     |
| ৬  | `/office/form-6`  | ছুটি নগদায়ন                            |
| ৭  | `/office/form-7`  | যানবাহন ও জ্বালানি তথ্য                 |
| ৮  | `/office/form-8`  | যানবাহন ভাড়ার তথ্য                     |
| ৯  | `/office/form-9`  | অফিস ভাড়ার তথ্য                        |
| ১০ | `/office/form-10` | কম্পিউটার ও আনুষঙ্গিক                   |
| ১১ | `/office/form-11` | ইউটিলিটি বিলসমূহ                        |
| ১২ | `/office/form-12` | আয়কর রিটার্ন সংক্রান্ত                 |

Every form follows the same pattern: `page.tsx` (server) resolves the session and loads
existing rows, `form-N-client.tsx` renders inside `<FormShell>` (header + prev/next), and a
save handler in [forms.ts](src/app/actions/forms.ts) upserts and calls `revalidatePath`.
Persistence uses the `upsert` pattern keyed on `submission_id` (plus the entity id for
multi-row forms) so re-saving never duplicates rows.

***

## 10. Admin surface

| Route                                          | Purpose                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `/`                                            | Public landing — office login (13-digit Budget ID) and office registration |
| `/admin/login`                                 | Admin / superadmin login (`/superadmin/login` redirects here)              |
| `/admin/dashboard`                             | Overview                                                                   |
| `/admin/budgets`                               | Budget cycles (fiscal year × type, status, বেতন-মাস)                       |
| `/admin/codes`                                 | Budget categories + economic codes, formulas, per-level enablement         |
| `/admin/formulas`                              | Read-only view of the formula registry and code→form bindings              |
| `/admin/offices-config`                        | Office types, levels, hierarchy                                            |
| `/admin/offices-management/head-offices`       | Head offices                                                               |
| `/admin/offices-management/field-offices`      | Field offices (incl. level)                                                |
| `/admin/offices-management/group-budget`       | Group-budget rules                                                         |
| `/admin/offices-users`                         | Office user accounts and passwords                                         |
| `/admin/settings`                              | Default-value configuration (7 tabs, §7)                                   |
| `/admin/users`                                 | Admin accounts                                                             |
| `/admin/reports/{individual,summary,combined}` | Reports (§6)                                                               |

***

## 11. How to modify or extend

### Change a rate, price or slab

Do it in `/admin/settings`. Do not edit the engine. If a value is genuinely missing from the
UI, add a column/row to the relevant table (with a migration) and surface it in
[admin-settings.ts](src/app/actions/admin-settings.ts) — never a constant in code.

### Change which formula computes a code, or which forms feed it

Edit the code on `/admin/codes` (`formula_key`, `source_forms`). Add a new formula only if
the *arithmetic* is new; then register it in `formulaRegistry` in
[calculate.ts](src/lib/budget/calculate.ts) and add a `ref_formula_types` row via the seed.

### Reshape an allowance card (form 5)

Edit the `ref_allowance_types` row's descriptive columns (`label_bn`, `count_label_bn`,
`has_basic`, `has_amount`, `has_due`, `formula_key`). The card is rendered from that data.

### Add a form step

Create `src/app/(office)/office/form-N/(page.tsx, form-N-client.tsx)` using `FormShell`, add
the route to `FORM_ROUTES` in [src/lib/office/forms.ts](src/lib/office/forms.ts) (the drawer
and dashboard follow automatically), add its `strings.forms.formN` entry, and chain
`prevHref`/`nextHref` across neighbours.

### Database changes — write a migration

```bash
# 1. edit prisma/schema.prisma  (every field needs @map to snake_case)
# 2. regenerate the client
npm run db:generate
# 3. create + apply the migration (needs an interactive TTY)
npx prisma migrate dev --name <description>
# 4. commit BOTH schema.prisma and prisma/migrations/<timestamp>_<description>/
```

In a non-interactive shell, hand-author `prisma/migrations/<timestamp>_<description>/migration.sql`
and apply it with `npm run db:deploy`. **Never edit an applied migration** — add a new one.
Migrations must be data-preserving: add the new column, lift any referenced value, then drop
the old column.

***

## 12. Invariants enforced in application code

Not everything is a database constraint. These hold only because the write path enforces
them, so changing that code means changing the rule:

| Invariant | Where |
| --------- | ----- |
| One open budget cycle at a time | [admin-budgets.ts](src/app/actions/admin-budgets.ts) — the database has no such constraint |
| An office's level and type must belong to its own department | [placement.ts](src/lib/office/placement.ts) (`assertOfficePlacement`), with the `core_offices_placement_trigger` as backstop |
| Forms are read-only once the budget is submitted | The form save guard; a submitted budget must be unlocked deliberately to edit |
| A parent with children is never deleted | Pre-checks in the delete actions, so the admin sees a Bangla message rather than a raw Postgres error |
| The seed never opens a second cycle | [seed.js](prisma/seed.js) — it provisions the first one only, and leaves which cycle is open to the admin |
| `AUTH_SECRET`, `OFFICE_DEFAULT_PASSWORD`, `ADMIN_DEFAULT_PASSWORD` must be set | The app throws instead of falling back to a default |

The database-side rules are in SCHEMA.md §7.

***

## 13. Migrations

32 migrations, all applied. The table in this section is the *what and why*; the SQL is in
[prisma/migrations/](prisma/migrations).

| Migration                                               | What it did                                                                                                                                                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261023000000_init`                                   | Full schema v2 — 35 tables across the five domains.                                                                                                                                                                   |
| `20261024000000_add_budget_categories`                  | Added `ref_budget_categories`; replaced `ref_economic_codes.category` (text) with `category_id` FK, backfilled by 4-digit prefix.                                                                                     |
| `20261024010000_budget_types_and_fiscal_years`          | Added `ref_budget_types` / `ref_fiscal_years`; replaced the free-text cycle fields with FKs.                                                                                                                          |
| `20261024020000_form_missing_columns`                   | Added five columns the forms collected but discarded.                                                                                                                                                                 |
| `20261024030000_allowance_detail_and_labels`            | Added `office_form_allowances.total_basic`/`due_amount` and the five descriptive `ref_allowance_types` columns that make form 5 table-driven.                                                                         |
| `20261024040000_settings_config_tables`                 | Added `admin_salary_config` + `admin_salary_slabs` (seeded from the old `admin_rates` JSON, then deleted); `unit_price` on fuel/equipment types; made vehicle config's `office_type_id` nullable with global uniques. |
| `20261024050000_education_allowance_per_staff`          | Corrected শিক্ষা ভাতা: flat monthly amount per staff × headcount.                                                                                                                                                     |
| `20261024060000_auto_allowance_codes`                   | Flipped nine allowance codes to automatic so admin rates drive the sheet.                                                                                                                                             |
| `20261024070000_postal_rate_card`                       | Added `allow_manual_override` (set for ডাক); added the `postal_rate` tile; removed dead `admin_rates` rows.                                                                                                           |
| `20261024080000_postal_rate_pair`                       | Added the `secondary_*` columns and made ডাক a rate × quantity pair — the last hardcoded multiplier removed.                                                                                                          |
| `20261024090000_fuel_category`                          | Added `ref_fuel_types.category` (`oil`/`gas`), backfilled by name.                                                                                                                                                    |
| `20261024100000_fuel_category_lookup`                   | Promoted that tag to `ref_fuel_categories` with a FK.                                                                                                                                                                 |
| `20261024110000_vehicle_config_fuel_category`           | Moved vehicle-fuel config to a fuel *category*; added the declared `fuel_type_id` to form 7's rows.                                                                                                                   |
| `20261024120000_vehicle_allowance_per_type`             | Lifted lubricant/maintenance to `admin_vehicle_allowance_config` (one per type).                                                                                                                                      |
| `20261024130000_employee_categories`                    | Promoted the officer/staff split to `ref_employee_categories`; added `ref_grades.category_id`; boundary grades 1–10 / 11–20.                                                                                          |
| `20261024140000_leave_encashment_months`                | Added the `leave_encashment_months` tile (default 18) for `3111110`/`3111209`.                                                                                                                                        |
| `20261024150000_auto_form5_allowance_codes`             | Flipped form 5's own-figure allowances (ঝুঁকি, পাহাড়ী, পোশাক, অধিকাল) to engine-computed.                                                                                                                            |
| `20261024160000_telephone_utility_code`                 | Brought টেলিফোন (`3211120`) in line with the other utilities (`is_manual` → automatic).                                                                                                                               |
| `20261025100000_default_office_password`                | Changed the `password_hint` column default off `12345`.                                                                                                                                                               |
| `20261025110000_default_office_password_backfill`       | Moved offices still on the old default onto the current one.                                                                                                                                                          |
| `20261025120000_auto_form5_form10_codes`                | Flipped `3256106` and `4112202` to automatic.                                                                                                                                                                         |
| `20261025120000_drop_office_password_hint_default`      | Dropped the `password_hint` default (value now comes from `OFFICE_DEFAULT_PASSWORD`).                                                                                                                                 |
| `20261025130000_ministry_department_offices_and_levels` | Widened the org model so a level/office can hang off a ministry or a department; provisioned one per existing ministry/department.                                                                                    |
| `20261025140000_cycle_salary_months`                    | Moved বেতন-মাস onto the cycle (`core_budget_cycles.salary_months`), retiring the global tile.                                                                                                                         |
| `20261025150000_leave_encashment_first_tile`            | Moved ছুটি নগদায়ন to the first card on the বেতন-ভাতা tab.                                                                                                                                                            |
| `20261025160000_formula_registry_and_code_links`        | Created `ref_formula_types` and bound every computed code to a formula + source forms; bound form 5 cards; pointed utilities/fuel-categories at codes; added `is_tax_circle`.                                         |
| `20261025170000_duty_allowance_pair`                    | Merged the two দায়িত্ব ভাতা cards into one rate × quantity card (months as `secondary_value`).                                                                                                                       |
| `20261025180000_shift_office_level_tiers`               | Moved levels onto one global tier scale — ministry 1, department 2, office-type levels 3+. Rewrote `level_order` only; ids and grants untouched.                                                                      |
| `20261026100000_drop_tax_circle_flag`                   | Dropped `core_office_types.is_tax_circle`: only a কর সার্কেল fills form 12, so the entered return info is itself the signal and the flag was redundant admin data.                                                     |
| `20261027100000_budget_submission_snapshots`            | Added `office_budget_snapshots` + `office_budget_snapshot_rows` — the frozen code-wise vector written on submit, versioned per re-submission.                                                                        |
| `20261027110000_office_hierarchy_constraints`           | Raw SQL: the four office CHECKs, the `core_offices_placement_trigger`, and the two partial unique root keys (SCHEMA.md §7).                                                                                           |
| `20261027120000_purge_dead_rate_and_scope_columns`      | Dropped `admin_rates` (+ its two FK columns), `core_office_types.is_group_budget`, the two vehicle `office_type_id` columns; moved `office_level_id` to `RESTRICT`; added the `salary_months` CHECK.                     |

***

## 14. Seeding

[prisma/seed.js](prisma/seed.js) is idempotent and dependency-free (plain Node +
`@prisma/client`). Current contents:

| Table                     | Rows                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `admin_users`             | `superadmin` (overridable via `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HINT`)           |
| `ref_budget_categories`   | 17                                                                                                   |
| `ref_budget_types`        | 2                                                                                                    |
| `ref_fiscal_years`        | 4                                                                                                    |
| `ref_economic_codes`      | 139, read from [resources/expense\_codes\_backup\_139.json](resources/expense_codes_backup_139.json) |
| `ref_employee_categories` | 2 (কর্মকর্তা / কর্মচারী)                                                                             |
| `ref_grades`              | 20 (1–10 কর্মকর্তা, 11–20 কর্মচারী)                                                                  |
| `ref_allowance_types`     | 6, with card-shape flags                                                                             |
| `ref_vehicle_types`       | 4                                                                                                    |
| `ref_fuel_categories`     | 2 (তেল / গ্যাস)                                                                                      |
| `ref_fuel_types`          | 3 (unit\_price 130 / 110 / 45)                                                                       |
| `ref_it_equipment_types`  | 4 (`unit_price` 0, for the admin to price)                                                           |
| `ref_utility_types`       | 5                                                                                                    |
| `admin_salary_config`     | 16 tiles                                                                                             |
| `admin_salary_slabs`      | 4 grade bands                                                                                        |
| `core_budget_cycles`      | 1 open cycle — provisioned only when the table is empty                                              |

The admin password is written only on row **creation**, so re-seeding never overwrites a
password you changed. Reference rows are created only if missing (`ref_allowance_types` is
upserted, so edits to its descriptive columns propagate on re-seed); economic codes are
upserted with their category resolved by 4-digit prefix. To add reference data, extend
`prisma/seed.js` — do not add ad-hoc `*.sql` seed files.

### NBR head offices (one-time import)

`npm run db:seed:hq` runs [prisma/seed-head-offices.js](prisma/seed-head-offices.js), kept
out of `db:seed` because it writes organisational data an admin manages by hand. It reads
`head quarters.xlsx` (`[office type | name]`) and `hq with codes.xlsx` (`[budget code | name]`)
at the repo root and creates 102 head offices under `জাতীয় রাজস্ব বোর্ড (NBR)`, each at the top
level of its office type, in natural alphabetical order (১, ২, ৩ … ১০, ১১). Like `seed.js` it
only fills gaps; 15 names with no code in the source carry a temporary `TMP-nnn` budget id to
be corrected in the admin UI.

***

## 15. Operational commands

```bash
npm run dev          # start the app
npm run db:generate  # regenerate the Prisma client after a schema change
npm run db:deploy    # apply committed migrations
npm run db:seed      # idempotent: admin user + reference data
npm run db:seed:hq   # one-time: NBR head offices from the root spreadsheets
npm run db:reset     # DESTRUCTIVE: drop everything, re-apply migrations, re-seed
npm run db:drift     # exits non-zero if the database and schema.prisma disagree
npm run db:studio    # browse data
npm run lint         # eslint
npm run build        # prisma generate && next build
```

`npm run db:drift` is the gate to run after any schema work and is suitable for CI; a clean
result reads `No difference detected.` Rebuilding from nothing is `npm run db:reset` — one
command returns a wiped database to a working state, login included.

**Windows gotcha:** `prisma generate` fails with
`EPERM ... rename 'query_engine-windows.dll.node'` when a `next dev` process still holds the
engine DLL. Stop the dev server first — the same applies before `npm run db:reset`.

***

## 16. Stale files — do not run

Historical SQL left in the repo. None of it matches the current schema.

| File                                                                                           | Why it is stale                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [resources/seed\_data.sql](resources/seed_data.sql)                                            | Targets the pre-rename schema (`departments`, `office_types`, `expense_codes`, …). |
| [resources/grant\_permissions.sql](resources/grant_permissions.sql)                            | Supabase-only grants; unrelated to the Prisma connection.                          |
| [resources/drop\_level\_unique\_constraint.sql](resources/drop_level_unique_constraint.sql)    | One-off fix for an earlier schema's constraint.                                    |
| [resources/rename\_to\_core\_economic\_codes.sql](resources/rename_to_core_economic_codes.sql) | Pre-`core_`/`ref_` rename.                                                         |
| [resources/update\_group\_budget\_rules.sql](resources/update_group_budget_rules.sql)          | One-off data patch for an earlier schema.                                          |
| [scripts/create-superadmin\*.js/.sql](scripts)                                                 | Predate `prisma/seed.js`.                                                          |
| [scripts/seed\_redesigned\_data.js](scripts/seed_redesigned_data.js)                           | Superseded by `prisma/seed.js`.                                                    |

[resources/expense\_codes\_backup\_139.json](resources/expense_codes_backup_139.json) is current
and read by the seed.

### Row Level Security

RLS is enabled on every table with **zero policies**, which denies all access by default. Leave
it that way. The app is unaffected (Prisma connects as the `postgres` role, which has
`rolbypassrls = true`), and RLS only governs the PostgREST surface. **Never create a
`USING (true)`** **policy** — it permits everything and is equivalent to disabling security.

***

## 17. Localisation & UI conventions

The UI is Bengali-only. Two fonts carry it, set as tokens in
[globals.css](src/app/globals.css):

| Token | Font | Used for |
| ----- | ---- | -------- |
| `--font-sans` / `--font-mono` | Tiro Bangla | Body text |
| `--font-heading` / `--font-title` | Anek Bangla | Headings (`h1`–`h6`, `.font-title`) |

Numbers are rendered through [bangla.ts](src/lib/bangla.ts) — `toBanglaNumber` — wherever a
count, id or amount is shown, and lists of Bengali numerals are sorted naturally (১, ২, ৩ …)
rather than lexically. Shared UI copy is centralised in
[strings.ts](src/lib/strings.ts) (app name, form titles, section headings); labels used by a
single screen are written inline in that component.

***

## 18. Current status

Implemented and verified: the schema above, the Prisma migration workflow (32 migrations),
seeding, admin and office authentication, the table-driven reference data, the formula
registry, the calculation engine, the office budget sheet, the submission snapshots, and the
three report routes — `npx tsc --noEmit` is clean and `npm run db:drift` reports no
difference.
