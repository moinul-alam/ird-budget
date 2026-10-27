# Release Audit — Database & Backend Integrity

**Scope:** all 47 tables in `public`, the backend write paths, and every business value that lives in code instead of a table.
**Method:** live read-only probes against the shared Supabase database + full source read of the write paths.
**Verdict:** the **structure is sound** (0 integrity violations across every hierarchy invariant), but there is **one release-blocking data gap** and a set of **duplicate / vestigial sources of truth** that must be closed before offices start submitting.

---

## 0. Executive summary

| # | Finding | Severity | Type | Status |
|---|---------|----------|------|--------|
| F1 | **108 of 110 offices will open an EMPTY budget sheet** — only 1 of 24 levels has any granted economic code | **P0 blocker** | live data | **open — user grants on `/admin/codes`** |
| F2 | **Two sources of truth for "group budget"** — `reports/individual` read the stale `core_office_types.is_group_budget` column (all `false`) while dashboard/combined read `admin_group_budget_rules`, so the individual report's group badge was **always wrong** | **P1** | live bug | **fixed** |
| F3 | Legacy `admin_rates` (9 rows) was still read as a fallback by two forms; no admin UI writes it | P1 | duplicate | **fixed** |
| F4 | House-rent mirror hardcoded `× 12`, ignoring the cycle's `salary_months` | P1 | hardcode | **fixed** |
| F5 | `salary_months ?? 0` silently zeroed every monthly figure on a bad cycle link | P1 | hardcode | **fixed** |
| F6 | 6 reference-data deletes returned raw Postgres FK errors instead of a Bangla guard | P1 | UX/consistency | **fixed** |
| F7 | Deleting a level would `SET NULL` on its offices (blank sheet, no error) — mitigated only in one code path | P2 | fragility | **fixed** |
| F8 | `deleteMinistry` / `deleteDepartment` didn't pre-check children (relied on RESTRICT → raw error) | P2 | UX/consistency | **fixed** |
| F9 | Code-invented identifiers/labels: `MIN_/DEPT_${Date.now()}`, `hierarchy_label: "Level N"`, `department_id: ''` | P2 | hardcode | **fixed** |
| F10 | Policy constants in code: 13-digit budget ID, `MIN_PASSWORD_LENGTH=6`, cookie 7d, salary-months 1..12 | P2 | hardcode | **fixed** (constants + DB CHECK) |
| F11 | `admin_vehicle_config.officeTypeId` / `admin_vehicle_rent_config.officeTypeId` were **unusable**: the unique keys omit the column, so a per-type row collides with the global row | P2 | design flaw | **fixed — global-only, columns dropped** |
| F12 | Allowance live-preview `switch` — **re-checked: NOT a defect** (see below) | — | — | **withdrawn** |
| F13 | `%TEMP%\ird-db.js` was a DROP-ALL-TABLES script holding live DB credentials | **P0 hygiene** | outside repo | **fixed — deleted (5 files)** |

**F12 withdraws itself.** The `calculateAllowance` preview `switch` in `calculate.ts` was flagged as covering "5 of ~30 formula keys". Re-reading it against what form 5 actually renders: the switch has a case for **every allowance type form 5 offers**, and every other key falls through to the shared registry path. It is complete, not partial — no change needed.

---

## Batch A — Core Office Structure (the hierarchy)

**Tables:** `core_ministries`, `core_departments`, `core_office_types`, `core_office_levels`, `core_offices`

```
core_ministries (1)
   └─< core_departments (4)          ministry_id  → RESTRICT   [single FK column = cannot be under 2 ministries]
           └─< core_office_types (4)  department_id → RESTRICT  [single FK column = cannot be under 2 departments]
                   └─< core_office_levels (24) office_type_id → CASCADE
   └─< core_office_levels (ministry level)  ministry_id → CASCADE
           └─< core_office_levels (department level) department_id → CASCADE
core_offices (110)  ── ministry_id → RESTRICT | department_id → RESTRICT | office_type_id → RESTRICT
                    ── office_level_id → SET NULL | parent_office_id → SET NULL (self-referencing)
```

### Your stated constraints — verified live

| Constraint | How it is guaranteed | Live result |
|---|---|---|
| at least one ministry | seed data | ✅ 1 ministry |
| 1 ministry → many departments | one-to-many FK | ✅ 4 departments |
| **a department cannot be under 2 ministries** | `core_departments.ministry_id` is a **single FK column** — multi-parent is structurally impossible | ✅ 0 violations |
| 1 department → many office types | one-to-many FK | ✅ 4 types |
| **an office type cannot be under 2 departments** | `core_office_types.department_id` is a **single FK column** | ✅ 0 violations |
| 1 office type → many levels | one-to-many FK | ✅ 24 levels |
| **a level cannot be under 2 office types** | `core_office_levels` has exactly 3 nullable owner FKs + CHECK `core_office_levels_single_owner_check` (=1 owner) | ✅ 0 violations |
| **levels under one type may share the same `level_order`** | `level_order` is a plain `Int`, **no unique constraint** | ✅ level 1 `কর অঞ্চল` and level 2 `কর আপীল অঞ্চল` both sit at order 3 under type 1 |

### Cross-row rules (raw migration `20261027110000_office_hierarchy_constraints`)

A `CHECK` cannot see other rows, so these live in the trigger `core_offices_placement_check()` (BEFORE INSERT/UPDATE on `core_offices`), mirrored in `src/lib/office/placement.ts`:

- office's `department_id` must equal its office-type's department → **0 violations**
- office's `office_level_id` must be owned by the office's own type → **0 violations**
- `parent_office_id` must point at a **root head office** (`parent_office_id IS NULL`) of the **same type + department** on a **higher-or-equal tier** (`child.level_order >= parent.level_order`) → **0 violations**
- no self-parent (`core_offices_no_self_parent_check`)
- ownership shape: a ministry office carries neither department nor type; a typed office always carries its department → **0 violations**
- `core_offices_ministry_root_key` / `core_offices_department_root_key` — exactly one login/root office per ministry and per department

All four guard objects are present in the live DB (trigger + 4 CHECKs confirmed).

### Fragility / ambiguity in this batch

- **F1 (P0 — blocker).** Grants are keyed by *level*, not by office. `sheet.ts:getLevelEnabledCodeIds` treats a level with **no mapping rows** as "nothing granted → empty sheet" (by design, matching the admin screen). Live data:

  | level | name | offices on it | grants |
  |---|---|---|---|
  | 1 | কর অঞ্চল | 62 | **0** |
  | 6 | কমিশনারেট | 41 | **0** |
  | 11 | মন্ত্রণালয় | 1 | **0** |
  | 12–15 | দপ্তর (×4) | 4 | **0** |
  | 5 | কর সার্কেল | 2 | 139 |
  | 9,10,16–24 | (unused levels) | 0 | **0** |

  **108 of 110 offices → EMPTY-SHEET; 2 → has-grants.** The moment offices log in they will find nothing to fill. This is a **data** fix (grant codes on `/admin/codes` per level), but it is the single thing that will make the release look broken.
  *Recommendation:* grant codes to at least levels **1** and **6** (103 of the 110 offices) plus the 4 `দপ্তর` levels and `মন্ত্রণালয়`; and add a warning/empty-state guard in `/admin/codes` and on the office sheet so a grant-less level is loud, not silent.

- **F7 (P2). — fixed.** `core_offices.office_level_id` was `ON DELETE SET NULL`, so deleting a level would **silently blank every office on it** with no error. `deleteOfficeLevel` guards this explicitly (`admin-offices-config.ts`), but nothing at the DB level did — a future writer (or raw SQL) could still orphan offices. The FK is now **`RESTRICT`**, matching `office_type_id` and `department_id`.
- **F8 (P2). — fixed.** `deleteMinistry` and `deleteDepartment` only ran the budget guard, then deleted. If a ministry still had departments, the delete hit the `RESTRICT` FK and the admin saw a **raw Postgres error** (`error.message`) rather than Bangla. Both now count their children first and return a Bangla "child exists" message, matching `deleteOfficeType`/`deleteOfficeLevel`.

### Deletion safety — direct answer to your question

> *"if one department has anything under it … we can never allow deleting one top tier that has child, right?"*

**Correct, and it is enforced — in three layers:**

1. **DB FK `ON DELETE RESTRICT`** on `core_departments.ministry_id`, `core_office_types.department_id`, `core_offices.department_id/office_type_id/ministry_id` — the parent delete **cannot** proceed while children exist. No cascade can ever invalidate a child.
2. **Explicit code guards** — `budgetDataBlockMessage()` blocks a tier that has started budgeting; `deleteOfficeType`/`deleteOfficeLevel` block when offices still point at them; `deleteHeadOffice`/`deleteFieldOffice` block on child offices.
3. **Trade-off to accept:** the two top tiers (`deleteMinistry`/`deleteDepartment`) rely on layer 1 only, so the message is raw (see F8). Behaviourally safe, cosmetically wrong.

The only *non-restrictive* edges are the low-risk ones: level/user tables `CASCADE` (delete a type → its levels and grants follow, intended), and `office_level_id`/`parent_office_id` `SET NULL` (see F7).

---

## Batch B — Reference Catalogues (`ref_*`)

**Tables (13):** `ref_grades`, `ref_employee_categories`, `ref_economic_codes`, `ref_budget_categories`, `ref_budget_types`, `ref_fiscal_years`, `ref_formula_types`, `ref_allowance_types`, `ref_fuel_categories`, `ref_fuel_types`, `ref_utility_types`, `ref_it_equipment_types`, `ref_vehicle_types`

**Posture:** clean. These are the intended "everything is data" layer:

- `ref_grades.category_id → ref_employee_categories` — officer(1–10)/staff(11–20) comes from the **table**, not a grade-number guess (`load-form-data.ts:49`). ✅
- `ref_economic_codes.formula_key` / `ref_allowance_types.formula_key` → `ref_formula_types.key` → `formulaRegistry` in `calculate.ts`. **All 30 keys currently resolve; an unknown key computes to 0** — this is the correct "registry, never a hardcoded list" pattern. ✅
- `ref_fiscal_years` / `ref_budget_types` are guarded by usage-count checks in `admin-budgets.ts` before delete. ✅

**Ambiguity:** none structural. The only note is that the *catalogue* is complete but the *grants* (Batch D) are not — see F1.

---

## Batch C — Admin Configuration (tiles, rates, per-type config)

**Tables (7):** `admin_salary_config`, `admin_salary_slabs`, `admin_vehicle_config`, `admin_vehicle_allowance_config`, `admin_vehicle_rent_config`, `admin_it_config`, `admin_group_budget_rules` — *(the eighth, `admin_rates`, was dropped; see F3)*

**Structure:** `admin_salary_config` (tile) → `admin_salary_slabs`; the per-office-type configs (`admin_vehicle_config`, `admin_it_config`, …) hang off `core_office_types` with `CASCADE`. This is the table-driven layer the admin edits.

### Fragilities / ambiguities

- **F2 (P1 — two sources of truth, one of them live-wrong). — fixed.** "Is this office a group budget?" was answered **twice**:
  - `core_office_types.is_group_budget` — a real column, **`false` for all 4 types**; **written** by `saveOfficeType` (`admin-offices-config.ts:363`) and **read** by `reports/individual/page.tsx:65` (`off.officeType?.isGroupBudget`);
  - `admin_group_budget_rules` — the table the dashboard (`admin/dashboard/page.tsx:76`, with a comment at `:72-75` calling the column "a separate control that screen never writes") and `reports/combined/page.tsx:33` actually **read** (2 rows: types 1 & 2).

  This was not merely an ambiguity — it was an **active disagreement**: a type covered by a rule shows *"গ্রুপ বাজেট"* in the combined report and dashboard, but **never** in the individual report, because that page read the stale column. **Fixed:** the individual report now resolves from `admin_group_budget_rules`, and the column is dropped.

- **F3 (P1 — legacy duplicate). — fixed.** `admin_rates` (9 rows) overlapped the new tile table:
  - `education_allowance` (500) and `festival_bonus_multiplier` (2) now also exist as `admin_salary_config` tiles with the **same keys and values**;
  - `vat_percentage` (15) and `postal_expense_rate` (50) were still read as a **fallback** in `loadVatPercentage` (`load-form-data.ts`) and `saveFormReturnInfo` (`forms.ts`).
  No admin screen wrote `admin_rates` any more, so editing the tile left the legacy row stale. **Fixed:** both reads now come from the tiles exclusively (defaulting to 0), and `admin_rates` — together with its two FK columns — is dropped.

- **F11 (P2 — a feature that cannot be used). — fixed (global-only).** `load-form-data.ts` deliberately read the vehicle configs as *"per-type row + global (`officeTypeId` null) row"* via `OR: [{ officeTypeId }, { officeTypeId: null }]` — so the column **was** load-bearing. But the unique keys **omit** it: `admin_vehicle_config @@unique([vehicleTypeId, fuelCategoryId])` and `admin_vehicle_rent_config @@unique([vehicleTypeId])`. A given (vehicle type, fuel category) could therefore hold **either** a global row **or** a per-type row, never both — adding a per-type override over an existing default raised `P2002`. That is why **0 rows populated `officeTypeId`**: the feature was unreachable, not merely unused. **Fixed:** both columns, their FKs and the two `OR` filters are gone; the tables are global-only.

- **F6 (P1 — unguarded deletes). — fixed.** Six deletes in `admin-settings.ts` had **no referential-integrity guard**: `deleteVehicleType`, `deleteFuelType`, `deleteVehicleConfigForType`, `deleteVehicleRentConfig`, `deleteUtilityType`, `deleteItEquipmentType`. They leaned on the raw FK and surfaced `error.message` (an English Postgres string) to the admin. **Fixed:** each now pre-checks its referencing rows and returns a Bangla message, with the `try/catch` kept as a backstop.

---

## Batch D — Grants & Budget Cycle

**Tables (2):** `office_level_economic_code_mapping`, `core_budget_cycles`

- `office_level_economic_code_mapping` — the join that says "this level may fill these codes". `@@unique([officeLevelId, economicCodeId])` ✅. **This is where F1 lives** (Batch A).
- `core_budget_cycles` — holds `salary_months` (the annualising multiplier for every monthly figure) and `status`. Live: **1 cycle, `salary_months = 12`, `status = open`**. ✅
  - "only one open cycle at a time" is enforced in `admin-budgets.ts` ✅.
  - `salary_months` is validated **in code** as integer 1..12 (`admin-budgets.ts:216`, plus the client at `admin-budgets-client.tsx:137`), not by a DB CHECK. **F10.**
  - FK for `budget_type_id` / `fiscal_year_id` uses `ON DELETE RESTRICT` ✅ (per project rule).

---

## Batch E — Office Data / Forms (`office_form_*`)

**Tables (12):** `office_form_basic`, `office_form_staff_working`, `office_form_staff_suspended`, `office_form_staff_new_recruits`, `office_form_allowances`, `office_form_leave_encashment`, `office_form_house_rent`, `office_form_utilities`, `office_form_vehicles_govt`, `office_form_vehicles_rent`, `office_form_it_equipment`, `office_form_return_info`

**Structure:** every row is `submission_id`-scoped, one row per submission (or per grade / per entity for the multi-row forms), written via **`upsert`** so a re-save never duplicates ✅. All writes pass through `guardDraftWrite` (`forms.ts:38`), which **rejects writes to a submitted budget at the statement level** — the submitted-lock is not UI-only ✅.

### Fragilities / hardcodes

- **F4 (P1). — fixed.** `saveFormHouseRent` mirrored `annualTotal: (monthly_bill * 12) + data.due` — a **hardcoded 12**. The form itself (`form-9-client.tsx`) and the engine (`calculate.ts`) correctly use `salaryMonths`, so the stored `office_form_house_rent.annual_total` would have drifted from the sheet whenever `salary_months ≠ 12` (latent only because today's cycle is 12). It now uses `loadSalaryMonths()`.
- **F5 (P1). — fixed.** `fetcher.ts` (`salary_months: Number(submission?.cycle?.salaryMonths ?? 0)`) and `loadSalaryMonths()` (`cycle?.salaryMonths ?? 0`) let a submission whose cycle cannot be resolved make **every monthly-derived figure read as 0** with no error. Both now **throw** instead of silently falling back to 0.
- `saveFormReturnInfo` reads the tile as the sole source now that `admin_rates` is gone (F3).

---

## Batch F — Submission, Sheet & Snapshot

**Tables (4):** `office_submissions`, `office_budget_sheet`, `office_budget_snapshots`, `office_budget_snapshot_rows`

**Structure — this batch is well designed:**

- `office_submissions.status` drives the draft/submitted lifecycle; `last_data_write_at` is stamped by the same statement that enforces the lock ✅.
- `office_budget_sheet` stores **only the office's manual overrides**; every reader recomputes live through `computeSubmissionSheet` so sheets and reports can never drift ✅.
- On submit, `writeSubmissionSnapshot` **freezes** the computed rows into `office_budget_snapshots` / `..._rows` (copying code/name/category), and `getSubmissionSheet` reads the snapshot for submitted budgets — so a later admin config change cannot move a submitted number ✅. `config_fingerprint` detects admin drift ✅.

**Ambiguity:** minimal. One edge — `writeSubmissionSnapshot` **skips the row insert when `sheet.rows.length === 0`**, so a submitted budget with a grant-less level (F1) produces a snapshot with **no rows**. Not a bug per se, but it means F1 also degrades the submitted/report side, not just the entry screen.

---

## Batch G — Identity & Access

**Tables (2):** `admin_users`, `office_users`

- Passwords are **sha256** (as in `auth.ts`, `admin-offices-management.ts`). ✅ consistent.
- Login IDs: office login auto-creates with `OFFICE_DEFAULT_PASSWORD`; admin with `ADMIN_DEFAULT_PASSWORD` — both read from env and **throw if unset** ✅.
- **F10 (P2).** Session cookie `maxAge` is hardcoded to 7 days (`auth.ts`), `MIN_PASSWORD_LENGTH = 6` (`admin-profile.ts:15`), and the **13-digit budget-ID rule** (numeric, English) is hardcoded in `landing-client.tsx` (validation + `maxLength={13}`, ~5 sites) and mirrored in the register action. These are policy constants; acceptable in code, but not admin-configurable if the policy ever changes.

---

## Batch H — Framework

**Tables (1):** `_prisma_migrations`

- The hierarchy guards (CHECKs, trigger, partial unique indexes) live in a **raw migration** because Prisma cannot model them, and `prisma migrate diff` **ignores** them. Consequence: `db:drift` will **not** warn if a future `db:push`/reset drops them. Note this in `GUIDE.md`; verify the trigger exists after any schema rebuild.

---

## Hardcoded values that "should be on a table" — consolidated list

| Where | Value that was hardcoded | Now | Status |
|---|---|---|---|
| `admin-offices-config.ts` | `MIN_${Date.now()}` / `DEPT_${Date.now()}` | admin-entered budget id (required) | fixed |
| `admin-offices-config.ts` | `hierarchy_label: "Level ${sortOrder}"` | field removed — it was English and unused | fixed |
| `admin-offices-config.ts` | `department_id: ''` placeholder | field removed | fixed |
| `admin-budgets.ts`, `admin-budgets-client.tsx` | `salaryMonths` 1..12 | `SALARY_MONTHS_MIN/MAX` + DB CHECK | fixed |
| `forms.ts` | `× 12` annual mirror | cycle `salary_months` | fixed |
| `fetcher.ts`, `load-form-data.ts` | `salary_months ?? 0` | fail loud | fixed |
| `admin-settings.ts` ×6 | delete without guard | Bangla in-use guard | fixed |
| `landing-client.tsx`, `auth.ts` | 13-digit staff-budget id | `BUDGET_ID_LENGTH` (+ server-side check) | fixed |
| `admin-profile.ts` | `MIN_PASSWORD_LENGTH = 6` | `MIN_PASSWORD_LENGTH` in `constants.ts` | fixed |
| `session.ts`, `auth.ts`, `auth-admin.ts` | cookie `maxAge` 7 days | `SESSION_MAX_AGE_SECONDS` | fixed |
| `core_office_types.is_group_budget` | stale column (all `false`) | reader repointed to `admin_group_budget_rules`; column dropped | fixed |
| `admin_rates` | legacy rate rows + 2 FK columns | reads moved to tiles; FKs + table dropped | fixed |
| `admin_vehicle_config/…_rent_config.officeTypeId` | unreachable per-type override | columns + `OR` filters dropped (global-only) | fixed |
| `calculate.ts calculateAllowance` | *(flagged as 5-case `switch`)* | re-checked — it is complete for form 5; no change | withdrawn |

---

## Remediation plan (per finding)

**F1 — empty sheets (P0, data).**
On `/admin/codes`, grant each level the codes it may fill: **level 1 (কর অঞ্চল)** and **level 6 (কমিশনারেট)** cover 103 of the 110 offices; then levels **11** (মন্ত্রণালয়) and **12–15** (the four দপ্তর) and the remaining field levels (3,4,7,8,9,10,16–24) for the offices that will use them.
*Code side (prevents recurrence):* in `admin-codes.ts` surface a **hard warning** (and a "copy grants from another level" action) for a level with zero mappings; on the office sheet, replace the silent empty state with an explicit "এই স্তরে এখনো কোনো কোড বরাদ্দ হয়নি" message instead of a blank table.

**F2 — group budget (P1, code + schema).**
Repoint `reports/individual/page.tsx:65` to resolve group membership from `admin_group_budget_rules` exactly as `dashboard/page.tsx:86-92` does (rule with `officeLevelId === null` covers every level of its type). Remove `is_group_budget` from `OfficeTypeItem` and stop writing `isGroupBudget` in `saveOfficeType`. Then drop the column (see purge list).

**F3 — `admin_rates` (P1, code + schema).**
1. `forms.ts:497-499` only needs the FK id — delete that read and the `vat_rate_id` write. 2. `load-form-data.ts:279` and `forms.ts:551-553` fall back to the legacy row — make the tile (`office_rent_vat_percent`, `postal_rate`) the sole source, defaulting to 0. 3. Drop `office_form_house_rent.vat_rate_id` and `office_form_return_info.postal_rate_id`. 4. Drop `admin_rates`.

**F4 — house-rent mirror (P1, code).**
In `saveFormHouseRent`, read the submission's cycle `salary_months` and compute `annualTotal = monthly_bill * salaryMonths + due`. (The engine already uses `budgetMonths(ctx)`; only the stored mirror is wrong.)

**F5 — silent zero (P1, code).**
`fetcher.ts:495` and `load-form-data.ts:386`: replace `?? 0` with a resolved value that **throws** (or logs) when `submission.cycle` is missing, so a broken cycle link fails loudly rather than rendering a zero sheet.

**F6 — unguarded deletes (P1, code).**
Add an in-use pre-check to the six `admin-settings.ts` deletes (mirror `deleteOfficeType`, returning a Bangla message), and keep the `try/catch` as a backstop.

**F7 — level `SET NULL` (P2, schema).**
Raw migration: `ALTER TABLE core_offices DROP CONSTRAINT …; ALTER TABLE core_offices ADD CONSTRAINT core_offices_office_level_id_fkey FOREIGN KEY (office_level_id) REFERENCES core_office_levels(id) ON DELETE RESTRICT;` — matches `office_type_id` and makes an orphaning delete impossible at the DB level.

**F8 — top-tier delete messages (P2, code).**
In `deleteMinistry`/`deleteDepartment`, count child departments / office types / offices first and return a Bangla "শিশু রেকর্ড বিদ্যমান" message instead of letting the RESTRICT FK surface a raw Postgres error.

**F9 — code-invented labels/ids (P2, code).**
`admin-offices-config.ts:316` → build `hierarchy_label` from the level's own name/order in Bangla. `:87/:199` → require the admin to enter the ministry/department budget id (or derive it from a sequence) instead of `MIN_/DEPT_${Date.now()}`. `:539` → drop the `department_id: ''` placeholder.

**F10 — policy constants (P2, code).**
Given the project's "everything is data" rule, put the 13-digit budget-id rule, `MIN_PASSWORD_LENGTH`, the session cookie lifetime and the salary-months range in one place — either a small `app_settings` key/value table (admin-editable) or a single shared `constants.ts` module — instead of scattered literals. A DB `CHECK (salary_months BETWEEN 1 AND 12)` should also back the cycle column.

**F11 — vehicle config scope (P2, schema).**
Decided: **global-only**. The two `OR` filters were removed (the configs are read with no `where`), the `officeTypeId` columns were dropped, and the unique keys stay `(vehicleTypeId, fuelCategoryId)` / `(vehicleTypeId)`.

**F12 — withdrawn.** `calculateAllowance`'s `switch` covers every allowance type form 5 renders; the rest resolve through the registry. No change warranted.

**F13 — temp scripts (P0 hygiene).** Deleted (see below).

---

## Purge list — dead / conflicting objects

Everything was checked against the source; only these are candidates. **All other 44 tables and their columns are referenced and should stay.**

| Object | Kind | Evidence it is safe to purge | Action | Status |
|---|---|---|---|---|
| `core_office_types.is_group_budget` | column | superseded by `admin_group_budget_rules`; the one remaining reader (`reports/individual:65`) was itself the bug | repoint reader → drop column → remove from `OfficeTypeItem` + `saveOfficeType` | **done** |
| `admin_rates` | table (9 rows) | no admin UI writes it; only a 2-site fallback that the tile table now duplicates | migrate fallbacks → drop FKs → drop table | **done** |
| `office_form_house_rent.vat_rate_id` | column | written only to satisfy the `admin_rates` FK; the % comes from the tile | drop with `admin_rates` | **done** |
| `office_form_return_info.postal_rate_id` | column | same | drop with `admin_rates` | **done** |
| `admin_vehicle_config.officeTypeId` | column | 0 rows; unreachable because of the unique key | drop, global-only | **done** |
| `admin_vehicle_rent_config.officeTypeId` | column | same | drop, global-only | **done** |
| `hierarchy_label`, `is_group_budget` on `OfficeTypeHierarchyItem` | API field | derived/duplicated values in the client type | remove with the columns above | **done** |
| `department_id` / `department_name` on `GroupBudgetSettingItem` + `GroupModalState` | API/type field | written but never read by `saveGroupBudgetSetting`; the department is derivable from the office type | removed; the table derives it from `officeTypes` | **done** |
| `calculateAllowance` preview `switch` | code | re-checked: complete for every type form 5 renders | no change | **withdrawn** |
| `%TEMP%\ird-*.js` (5 credential-bearing + 5 read-only probes) | files | ad-hoc probes, not imported anywhere | delete | **done** |

**Keep deliberately:** `_prisma_migrations` (holds the raw hierarchy constraints), `office_budget_sheet` (manual overrides — read at `sheet.ts:171`, `admin-codes.ts:265`), and all `ref_*` catalogues.

---

## The temp scripts you asked about

Neither is imported by the project (a repo-wide search finds them only in this report) — they are hand-written one-off probes, so their **necessity is zero** for the app. All of them were deleted from `%TEMP%` on 2026-10-27.

Five of the ten carried the **same plaintext production credential** hard-coded:

- **`ird-db.js`** — *not* a diagnostic. It connects to the **live Supabase database** with the hard-coded connection string and runs `DROP TABLE … CASCADE` for **every table in `public`**, then prints how many are left. If it were ever run by accident it would have wiped the whole shared database, including the office data you are about to go live with.
- **`ird-migrate.js`** — same credential, and it runs `ALTER TABLE` DDL against the live database. Cheap to re-create as a proper Prisma migration; dangerous to keep.
- **`ird-counts.js`** — harmless by comparison: same credential, but it only `SELECT count(*)` on 13 tables. Its siblings **`ird-cols.js`** (inspects `information_schema.columns`) and **`ird-rls-proof.js`** are likewise read-only.
- The real problem with all five is the **credential in the file**, not what the query does.
- **Done:** all deleted. Because that password sat in plaintext on disk (and possibly in shell history), **rotating the database password is still advisable.**

The other five (`ird-audit-check{,2,3,4}.js`, `ird-db-columns.json`) read credentials from `.env` via Prisma and were read-only; they were one-off audit probes and are deleted too.

---

## Resolution log

| # | Finding | Resolution |
|---|---|---|
| F1 | empty sheets | **open — your task.** Grant codes per level on `/admin/codes`; levels 1 & 6 cover 103 of 110 offices. |
| F2 | group-budget two sources of truth | `reports/individual` now resolves from `admin_group_budget_rules`; column dropped. |
| F3 | `admin_rates` fallback | Tile is the sole source; FKs + columns + table dropped. |
| F4 | `× 12` mirror | `saveFormHouseRent` now uses the cycle's `salary_months`. |
| F5 | silent `?? 0` | `fetcher.ts` and `loadSalaryMonths` now fail loud. |
| F6 | unguarded deletes | 6 Bangla in-use guards added in `admin-settings.ts`. |
| F7 | level `SET NULL` | FK is now `ON DELETE RESTRICT` (schema + migration). |
| F8 | raw FK error on top-tier delete | Child-count guards added to `deleteMinistry` / `deleteDepartment`. |
| F9 | invented ids / labels / placeholders | Budget id is admin-entered; `hierarchy_label` and the `department_id` placeholder removed. |
| F10 | scattered policy constants | New `src/lib/constants.ts` + `CHECK (salary_months BETWEEN 1 AND 12)`. |
| F11 | unreachable per-type vehicle config | Global-only; columns dropped, `OR` filters removed. |
| F12 | preview `switch` | Withdrawn — not a defect. |
| F13 | temp scripts | Deleted; rotate the DB password. |

**Migration:** `20261027120000_purge_dead_rate_and_scope_columns` — applied; `db:drift` reports **no difference**.
