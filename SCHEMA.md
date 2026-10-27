# Database Schema Reference

**45 tables**, all in the `public` schema of the PostgreSQL database. This file is the
*narrative* reference — what each table is for, how the domains link, and which integrity
rules the database enforces on its own.

The **authoritative definition is [prisma/schema.prisma](prisma/schema.prisma)**. If this
file and the schema ever disagree, the schema wins and this file is the bug. Apply changes
only through migrations, then run `npm run db:drift` — a clean result reads
`No difference detected.`

***

## 1. Conventions

| Convention | Rule |
| ---------- | ---- |
| Table names | `snake_case`, plural, prefixed by domain (`core_`, `ref_`, `admin_`, `office_`) |
| Column names | `snake_case`. Every Prisma field carries an explicit `@map` — there is no naming inference to fall back on |
| Primary keys | `BigInt` autoincrement, except `ref_grades.id` which is `Int` |
| Timestamps | `created_at` / `updated_at` are `timestamptz`; `@updatedAt` drives the latter |
| Money | `Decimal(14, 2)` on form and rate tables, `Decimal(16, 2)` on snapshots |
| Domain prefixes | Load-bearing — they indicate who owns the data and how safe it is to delete |

The four prefixes mean:

- **`core_`** — organisational structure. An admin builds it by hand; almost nothing hangs off it with `CASCADE`.
- **`ref_`** — reference lists an admin fully controls through `/admin/codes`, `/admin/budgets`, `/admin/settings`.
- **`admin_`** — rates and per-type configuration; the administrator's numbers.
- **`office_`** — what the offices submitted, plus the two derived sheet tables.

***

## 2. Domain 1 — `core_` : organisational structure (6 tables)

```
core_ministries ──< core_departments ──< core_office_types ──< core_office_levels
       │                    │                                          ▲
       │                    │                                          │
       └────────────────────┴──────────────────────────────────────────┘
                            │                    (a level belongs to exactly one owner)
                            ▼
                       core_offices ──< core_offices  (parent_office_id)
```

| Table | Role |
| ----- | ---- |
| `core_ministries` | Top tier. Each ministry is itself a budget-owning entity: it holds an office row, a budget ID and a login of its own |
| `core_departments` | Belongs to exactly **one** ministry (`ministry_id` is a single column, so it cannot be under two) |
| `core_office_types` | Belongs to exactly one department. `sort_order` numbers the types in the org chart |
| `core_office_levels` | A level (স্তর) under **one** owner: an office type *or* a ministry *or* a department. `level_order` is the rank (ক্রম) within that owner |
| `core_offices` | Every office, including the ministry/department rows that exist only to own a login and a grant |
| `core_budget_cycles` | A fiscal year × budget type pair, both sides foreign keys |

### `core_office_levels` — one owner, three nullable columns

Ministry and department levels exist so economic codes can be granted to those entities:
**grants are keyed by level**, so a ministry that must submit a budget needs a level to
grant against. Office-type levels are the ordinary field-office hierarchy.

Exactly one of `office_type_id` / `ministry_id` / `department_id` is set, enforced by
`core_office_levels_single_owner_check` (§7).

### `core_offices` — two ownership shapes

| Shape | Columns set | Meaning |
| ----- | ----------- | ------- |
| Ordinary office | `department_id` + `office_type_id` + `office_level_id` | A field or head office under a type |
| Root office | `ministry_id` **or** `department_id`, no `office_type_id` | The budget-owning row for that entity |

`parent_office_id` is a self-reference for the reporting chain (`SET NULL` on delete, so
removing a parent orphans rather than deletes its children).

### `core_budget_cycles`

`UNIQUE(fiscal_year_id, budget_type_id)`. Carries `salary_months` (বেতন-মাস, `CHECK 1..12`) —
the multiplier the engine annualises every monthly figure with. It lives on the cycle, not
in a global setting, because two cycles can legitimately have different month counts.

`status` is `open` or `closed`. **The application allows only one open cycle at a time**;
that rule is enforced in [admin-budgets.ts](src/app/actions/admin-budgets.ts), not by a
database constraint.

***

## 3. Domain 2 — `ref_` : reference data (14 tables)

Every list a user can configure lives here and is reached by a foreign key. Nothing in this
domain may be replaced by a constant in code.

### 3.1 Lists the admin renames or extends

`ref_budget_categories`, `ref_budget_types`, `ref_fiscal_years`, `ref_grades`,
`ref_employee_categories`, `ref_allowance_types`, `ref_vehicle_types`, `ref_fuel_categories`,
`ref_fuel_types`, `ref_it_equipment_types`, `ref_utility_types`, `ref_formula_types`.

Natural keys carry a `UNIQUE` constraint, so a duplicate surfaces as Prisma `P2002` and the
admin UI turns it into a Bangla message.

`ref_grades.grade_no` is the key other tables join on (1–20). `ref_employee_categories`
holds the কর্মকর্তা / কর্মচারী split; **grades 1–10 are officer, 11–20 are staff**, expressed
as `ref_grades.category_id` rather than a name test.

### 3.2 `ref_economic_codes` — the spine of the whole calculation

| Column | Meaning |
| ------ | ------- |
| `code` | The 7-digit economic code, unique |
| `is_manual` | The office types the amount in; the engine leaves it alone |
| `allow_manual_override` | Engine-computed, but the office may still overwrite it (only ডাক today) |
| `formula_key` | Which registry formula computes it. **The engine dispatches on this, never on the code** |
| `source_forms` | The form numbers whose data produced the amount, so the sheet can point the office at the form to edit |
| `category_id` | → `ref_budget_categories` |

A `formula_key` that names no registered formula computes **0** — a mis-bound code can never
invent an amount.

### 3.3 `office_level_economic_code_mapping` — the grant table

`(office_level_id, economic_code_id)` unique, with an `is_enabled` flag. **This is what
decides which codes an office may submit**: the office's own `core_office_levels` row is
looked up, and a level with no rows shows no codes at all. Both sides are `CASCADE`, so
removing a level or a code withdraws the grant with it.

This table is the single most common cause of a blank-looking budget sheet — if an office
sees no codes, check the grant for its level first.

### 3.4 Cross-domain pointers

Three reference rows name the economic code they feed, so the engine never matches on a name:

- `ref_fuel_categories.economic_code_id` → 3243301 (তেল) / 3243302 (গ্যাস)
- `ref_utility_types.economic_code_id` → 3211113 / 3211115 / 3211117 / 3211120
- `ref_economic_codes.formula_key`, `ref_allowance_types.formula_key` → `ref_formula_types.key`

***

## 4. Domain 3 — `admin_` : rates and configuration (6 tables)

| Table | Role |
| ----- | ---- |
| `admin_salary_config` | One row per tile on `/admin/settings` → বেতন-ভাতা. `key` is unique; `input_type` is `number` / `grade` / `slab` |
| `admin_salary_slabs` | Grade-banded values (house rent); `config_key` → `admin_salary_config.key`, `CASCADE` |
| `admin_vehicle_config` | Fuel quota per vehicle type × fuel **category**; `UNIQUE(vehicle_type_id, fuel_category_id)` |
| `admin_vehicle_allowance_config` | Lubricant + maintenance per vehicle type; `vehicle_type_id` is unique, so one allocation per type however many fuels it burns |
| `admin_vehicle_rent_config` | Monthly rent rate per vehicle type; `UNIQUE(vehicle_type_id)` |
| `admin_it_config` | Unit budget per office type × equipment type; `UNIQUE(office_type_id, equipment_type_id)` |

### The rate × quantity pair

A salary tile is normally one value. Setting `secondary_label_bn` turns it into a **pair** and
the tab renders `secondary_value` beside `value` — both factors of the multiplication belong
to the administrator, so no multiplier is compiled into the engine. Two tiles use it: **ডাক**
(per-notice cost × notices per non-filer) and **দায়িত্ব ভাতা** (monthly rate × months
payable). Nothing in the UI names this shape; the column alone decides it.

***

## 5. Domain 4 — `office_` : submissions and forms (17 tables)

### 5.1 The submission

`office_users` (one per office, unsalted SHA-256 hash) and `office_submissions`, with
`UNIQUE(office_id, cycle_id)` — an office has at most one submission per cycle.

`office_submissions.status` is `draft` or `submitted`. `last_data_write_at` is the
"inputs moved since you last looked" signal, written by the same guard that enforces
draft-only writes. Every form table `CASCADE`s from here, so deleting a submission clears
its data; but `cycle_id` and `office_id` are `RESTRICT`, so you cannot delete the cycle or
office out from under a submission.

### 5.2 The twelve form tables

| Form | Table | Note |
| ---- | ----- | ---- |
| ১ | `office_form_basic` | 1:1 (`submission_id` unique) |
| ২ | `office_form_staff_working` | `UNIQUE(submission_id, grade_id)` |
| ৩ | `office_form_staff_suspended` | `UNIQUE(submission_id, grade_id)` |
| ৪ | `office_form_staff_new_recruits` | No uniqueness — several recruits per grade |
| ৫ | `office_form_allowances` | `UNIQUE(submission_id, allowance_type_id)`; shape flags on `ref_allowance_types` decide which inputs render |
| ৬ | `office_form_leave_encashment` | 1:1 |
| ৭ | `office_form_vehicles_govt` | `UNIQUE(submission_id, vehicle_config_id, fuel_type_id)` — one vehicle may be budgeted on two fuels of the same category |
| ৮ | `office_form_vehicles_rent` | `UNIQUE(submission_id, vehicle_rent_config_id)` |
| ৯ | `office_form_house_rent` | 1:1. The VAT percentage comes from the `office_rent_vat_percent` tile, not a column here |
| ১০ | `office_form_it_equipment` | `UNIQUE(submission_id, it_config_id)` |
| ১১ | `office_form_utilities` | `UNIQUE(submission_id, utility_type_id)` |
| ১২ | `office_form_return_info` | 1:1. Postage comes from the `postal_rate` tile |

All form tables upsert on `submission_id` (plus the entity id on multi-row forms), so
re-saving never duplicates.

### 5.3 The two sheet tables — do not confuse them

| Table | What it holds | Who reads it |
| ----- | ------------- | ------------ |
| `office_budget_sheet` | **Only the office's manual overrides.** `manual_value` is the only column read back; `auto_value` and `final_value` are convenience mirrors | The live draft sheet |
| `office_budget_snapshots` + `office_budget_snapshot_rows` | A **frozen copy of the whole code-wise vector**, written in the same transaction as `draft → submitted` | Everything, once a submission exists |

Rules that follow from this:

1. **A draft is recomputed live** through `computeSubmissionSheet`; never sum `office_budget_sheet`
   to get a total — it does not contain the computed amounts.
2. **A submitted number never moves.** The snapshot copies every display field in (code, name,
   category, sort order) rather than reading through a relation, so a code later renamed or
   retired still renders as the office submitted it. `economic_code_id` is kept as a link and
   `SET NULL`s if the code is ever removed — which is exactly why the copies exist.
3. `OfficeBudgetSnapshot.config_fingerprint` is a hash of the admin config the amounts were
   computed from, so `configStale` can tell "rates changed since submission" apart from
   "identical capture".
4. Snapshots are **versioned** (`UNIQUE(submission_id, version)`): `unlock → edit → resubmit`
   appends version 2 and leaves version 1 as the audit trail.

***

## 6. Domain 5 — admin users and group rules (2 tables)

| Table | Role |
| ----- | ---- |
| `admin_users` | `username` unique, `role` (`superadmin` / `admin`), unsalted SHA-256 hash, kept in sync with [prisma/seed.js](prisma/seed.js) |
| `admin_group_budget_rules` | Which offices are rolled up together. `UNIQUE(office_type_id, office_level_id)` |

**`admin_group_budget_rules` is the only source of truth for group budgeting.** A rule with
`office_level_id = NULL` covers **every level** of its office type — the resolution the
combined report and the dashboard both use. The `is_group_budget` column on
`core_office_types` that once shadowed this was dropped (§9).

***

## 7. The hierarchy, and what the database enforces

The model is a strict single-parent tree:

```
1 ministry  ──< N departments
1 department ──< N office types
1 office type ──< N levels     (levels under one type MAY share a level_order)
1 level      ──< N offices
1 office     ──< N child offices
```

Because each link is a **single foreign-key column**, none of the "one child, two parents"
cases is representable — a department physically cannot point at two ministries.

Not everything fits a foreign key, so six raw objects in
[20261027110000_office_hierarchy_constraints](prisma/migrations/20261027110000_office_hierarchy_constraints/migration.sql)
and the purge migration close the remaining gaps. All are applied:

| Object | Kind | Enforces |
| ------ | ---- | -------- |
| `core_office_levels_single_owner_check` | CHECK | Exactly one of `office_type_id` / `ministry_id` / `department_id` is set |
| `core_offices_ownership_shape_check` | CHECK | `ministry_id` is never combined with `department_id` or `office_type_id` |
| `core_offices_type_department_check` | CHECK | `office_type_id` is only ever set with a `department_id` |
| `core_offices_no_self_parent_check` | CHECK | An office is not its own parent |
| `core_offices_placement_trigger` | TRIGGER | A level/type on an office must belong to that office's own department |
| `core_offices_ministry_root_key` | partial UNIQUE | At most one root office per ministry |
| `core_offices_department_root_key` | partial UNIQUE | At most one root office per department (i.e. one without an office type) |
| `core_budget_cycles_salary_months_check` | CHECK | `salary_months` is 1–12 |

The same rules are mirrored at the write path in
[placement.ts](src/lib/office/placement.ts) (`assertOfficePlacement`, `resolveTopLevelId`) so
an admin sees a Bangla message instead of a raw Postgres error. **The trigger is the
backstop, not the primary guard** — keep both in step.

There is no database constraint requiring at least one ministry. That is a bootstrap
condition, satisfied by `npm run db:seed`.

***

## 8. Delete behaviour — the whole policy in one table

**60 foreign keys.** The rule of thumb: *structure is `RESTRICT`, submission data is
`CASCADE`, and optional pointers are `SET NULL`.*

### `RESTRICT` — a parent with children cannot be deleted

| Child.column | → Parent |
| ------------ | -------- |
| `core_departments.ministry_id` | `core_ministries` |
| `core_office_types.department_id` | `core_departments` |
| `core_offices.department_id` / `.ministry_id` / `.office_type_id` | those parents |
| `core_offices.office_level_id` | `core_office_levels` |
| `core_budget_cycles.fiscal_year_id` / `.budget_type_id` | `ref_fiscal_years` / `ref_budget_types` |
| `office_submissions.office_id` / `.cycle_id` | `core_offices` / `core_budget_cycles` |
| `office_budget_sheet.economic_code_id` | `ref_economic_codes` |
| `office_form_*` → their config/type (`grade_id`, `allowance_type_id`, `vehicle_config_id`, `vehicle_rent_config_id`, `fuel_type_id`, `it_config_id`, `utility_type_id`) | the matching `ref_` / `admin_` table |
| `ref_grades.category_id`, `ref_fuel_types.category_id`, `admin_vehicle_config.fuel_category_id` | the matching `ref_` table |

This is what answers "can we delete a top tier that has children?" — **no, and the database
refuses it**, not just the UI.

### `CASCADE` — children are owned by the parent

Everything under `office_submissions`; `office_users.office_id`; `admin_salary_slabs` under a
config; the vehicle/IT configs under their vehicle or office type; the two snapshot tables
under their snapshot; `office_level_economic_code_mapping` on both sides; the level rows
under a ministry / department / office type; the group rules under their type or level.

### `SET NULL` — optional pointers

`core_offices.parent_office_id`, `office_submissions.reviewed_by`,
`office_budget_snapshot_rows.economic_code_id`, `ref_economic_codes.category_id` and
`.formula_key`, `ref_allowance_types.formula_key`, `ref_fuel_categories.economic_code_id`,
`ref_utility_types.economic_code_id`.

***

## 9. Retired objects — do not reintroduce

Removed by
[20261027120000_purge_dead_rate_and_scope_columns](prisma/migrations/20261027120000_purge_dead_rate_and_scope_columns/migration.sql)
because each duplicated a live source of truth and could silently diverge from it.

| Removed | What it was | Where the truth lives now |
| ------- | ----------- | ------------------------- |
| `admin_rates` (table, 9 rows) | Legacy key/value rates read as a fallback by two forms; no admin screen wrote it | `admin_salary_config` tiles, defaulting to 0 |
| `office_form_house_rent.vat_rate_id` | FK that only existed to satisfy `admin_rates` | The `office_rent_vat_percent` tile |
| `office_form_return_info.postal_rate_id` | Same | The `postal_rate` tile |
| `core_office_types.is_group_budget` | Stale flag (always `false`) that the individual report read while the dashboard read the rules table | `admin_group_budget_rules` |
| `admin_vehicle_config.office_type_id`, `admin_vehicle_rent_config.office_type_id` | Unusable: the unique keys omit the column, so a per-type row collides with the global row | Global rows (the columns were dropped, not repurposed) |

Two related changes went in with the same migration:

- `core_offices.office_level_id` was `SET NULL`; it is now **`RESTRICT`**. Deleting a level
  used to blank the level on its offices, silently emptying their sheets with no error.
- `core_budget_cycles.salary_months` gained its 1–12 `CHECK`.

***

## 10. Verifying the database

```bash
npm run db:drift    # exits non-zero if the database and schema.prisma disagree
npm run db:studio   # browse the data
```

`db:drift` is the gate to run after any schema work and is suitable for CI. A clean result
reads `No difference detected.`
