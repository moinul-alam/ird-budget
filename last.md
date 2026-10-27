I am concerned about the layering of offices, how robust/foolproof it is. I am talking about minisytry-department-office type-level, headoffice field office links. Analyse and let me know

**Assistant**

I'll dig into the schema and the config/registration paths before judging robustness.

I'll finish gathering evidence on the office hierarchy before delivering the analysis.

I read the full write-path surface for the office model — schema, both config action files, the office self-service action, public registration, and the budget sheet's level lookup. Here is the analysis.

## The model as designed

Four config tiers, then offices hang off them:

```
CoreMinistry ──< CoreDepartment ──< CoreOfficeType ──< CoreOfficeLevel ──< CoreOffice
   (order 1)          (order 2)         (parent = dept)     (owner = min/dept/type)   │
                                                                         parentOfficeId ┘ (self-relation)
```

Two independent axes meet on `CoreOffice`:

| Axis | Column(s) | Meaning |
|---|---|---|
| Ownership | `ministryId` / `departmentId`+`officeTypeId` | who the office belongs to |
| Line management | `parentOfficeId` | head office vs field office |

Head office = `parentOfficeId IS NULL AND officeTypeId IS NOT NULL`; a ministry/department's own login row is a *root office without an office type* and is deliberately excluded from the head-office list ([admin-offices-management.ts](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-management.ts#L53-L57)).

## What is actually solid

- The FK graph is deliberate, not accidental: `Restrict` on ministry→department→office-type→office; `Cascade` from levels to their owner; `SetNull` for `office.officeLevelId` and `parentOfficeId`; `Cascade` for `OfficeUser`; `Restrict` for `OfficeSubmission`.
- `budgetId` is unique and is the login key; `OfficeUser.officeId` is unique; `(officeLevelId, economicCodeId)` is unique.
- `budgetDataBlockMessage` protects ministry, department, head-office and field-office deletes ([budget-data.ts](file:///c:/Apps/ird-budget/src/lib/office/budget-data.ts#L13-L28)) — submitted and draft data outlives config, and it says so in Bangla.
- Head-office delete explicitly refuses while children exist.

## Where it is not foolproof

**1. The two documented invariants exist only as comments — no DB constraint (High).**
The schema *states* "a level belongs to exactly one owner" and "exactly one ownership style applies per row" ([schema.prisma](file:///c:/Apps/ird-budget/prisma/schema.prisma#L73-L76)), and a grep across all migrations finds only PRIMARY KEY and FOREIGN KEY constraints — zero `CHECK`s. Enforcement lives solely in `saveOfficeLevel` ([admin-offices-config.ts](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-config.ts#L424-L431)) and nowhere else. Every other writer (`saveMinistry`, `saveDepartment`, `saveHeadOffice`, `saveFieldOffice`, `updateMyOfficeProfile`) can produce a row violating both.

**2. `office_type_id` and `office_level_id` are never cross-checked (High).**
This is the most consequential one, because the *entire budget sheet* is gated by level: `getActiveEconomicCodes(officeLevelId)` filters to that level's grants ([sheet.ts](file:///c:/Apps/ird-budget/src/lib/budget/sheet.ts#L39-L46), [#L93-L96](file:///c:/Apps/ird-budget/src/lib/budget/sheet.ts#L93-L96)). Three writers accept both ids straight from the client with no check that the level's `officeTypeId` matches the office's:

- [saveFieldOffice](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-management.ts#L308-L311)
- [updateMyOfficeProfile](file:///c:/Apps/ird-budget/src/app/actions/office.ts#L207-L217) — reachable by any authenticated office for its own row
- [registerOffice](file:///c:/Apps/ird-budget/src/app/actions/auth.ts#L172-L181) — public

The UIs do filter (`getOfficeLevelsForType`), so it takes a crafted or stale request — but the server action is the trust boundary, and here it trusts. Result: an office silently inherits a *different* office type's economic codes.

**3. `deleteOfficeLevel` silently blanks an office's budget (High).**
`core_offices.officeLevelId` is `SetNull`, and level deletion has no budget guard ([admin-offices-config.ts](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-config.ts#L455-L472)). `getLevelEnabledCodeIds(null)` returns `[]` ([sheet.ts](file:///c:/Apps/ird-budget/src/lib/budget/sheet.ts#L39-L46)), and the code comments explicitly treat "no grants" as "no codes" — so a live draft collapses to an empty sheet with no error. An office that had *submitted* keeps its frozen snapshot, so the two offices that were identical yesterday now disagree, with nothing in the UI explaining why.

**4. `parentOfficeId` is written raw in all four paths — nothing validates the link (High).**
No check that the parent is not itself (`data.id === head_office_id`), that there is no cycle, that the parent is a *head* office, that it's in the same department/type, or that its `levelOrder` is above the child's. The office self-service picker makes this reachable rather than theoretical: [`getParentOffices`](file:///c:/Apps/ird-budget/src/app/actions/office.ts#L72-L85) returns *every* office in the department, field offices included, so office A can make field office B its parent and B can point back at A.

Also, `saveFieldOffice` takes `department_id` as an independent input and only falls back to the type's department when it's absent ([L287-L300](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-management.ts#L287-L300)) — a caller can pass a department that agrees with neither the office type nor the parent.

**5. Deleting a field office silently *promotes* its children to head offices (Medium-High).**
`deleteHeadOffice` checks for children; [`deleteFieldOffice`](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-management.ts#L363-L384) does not, and the self-relation is `onDelete: SetNull`. So if a chain ever exists (see #4), deleting the middle link orphans the grandchild, which then satisfies the head-office filter at [L57](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-management.ts#L57) — it appears in the Head Offices tab, and both [getOfficeHeader](file:///c:/Apps/ird-budget/src/lib/office/dashboard.ts#L67-L73) and [budget.ts](file:///c:/Apps/ird-budget/src/app/actions/budget.ts#L121-L126) start showing the *department* as its "head office". The system reclassifies rather than refusing.

**6. Delete guarding is uneven, and the gaps fail loudly in English (Medium).**
Ministry and department are guarded; [office type](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-config.ts#L366-L381) and [office level](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-config.ts#L455-L472) are not. They still refuse — via `Restrict` from `core_offices.officeTypeId` — but the admin sees a raw Prisma FK violation instead of the friendly Bangla "has budget data, edit or copy instead" message. So the safety net exists but the *guidance* doesn't, exactly where an admin is most likely to be.

**7. Moving an office type between departments desynchronises its offices (Medium).**
`saveOfficeType` writes `departmentId` freely ([L336-L355](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-config.ts#L336-L355)) and does not re-point the offices beneath it, while `core_offices.departmentId` is a separate column. Afterwards, the type tab reads the department from the *type* ([L313-L314](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-config.ts#L313-L314)) and the head-office tab reads it from the *office row* ([L77-L78](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-management.ts#L77-L78)) — the same office shows two different departments depending on the screen, and department reports follow the stale column.

**8. There is no uniqueness on "one head office per office type" (Low).**
Nothing stops two root offices under one type. Both get auto-pinned to the same lowest level ([L112-L120](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-management.ts#L112-L120)), and the field-office parent picker then offers two indistinguishable choices.

**9. `levelOrder` means three different things (Low, latent).**
Ministry is hard-coded 1, department 2, office-type levels start at 3 and then number per-type ([tab-office-levels.tsx](file:///c:/Apps/ird-budget/src/app/(admin)/admin/offices-config/_components/tab-office-levels.tsx#L85-L93), [admin-offices-config.ts](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-config.ts#L434-L436)); meanwhile `OfficeTypeHierarchyItem.hierarchy_label` renders "Level N" from `core_office_types.sort_order` — a third column ([L315-L316](file:///c:/Apps/ird-budget/src/app/actions/admin-offices-config.ts#L315-L316)). Everything compares within a single type today, so it holds; any future cross-type ordering will be wrong.

**10. Stale comment / dead field (Low).**
`getGroupBudgetSettings` returns `department_id: ''` with the comment "Office type doesn't directly link to department in new schema" — but `CoreOfficeType.departmentId` is `NOT NULL`. The comment is wrong and the field is permanently empty, which is why the group-budget table re-derives the department client-side.

## Verdict

The **shape** is sound and the FK semantics were chosen carefully. The **robustness is per-write-path, not systemic**: there are four independent entrances into `core_offices` (admin head office, admin field office, office self-service, public registration), each re-implementing a different subset of the rules, with the shared invariants asserted only in `saveOfficeLevel` and nowhere at the database. So it is "correct as long as everything goes through the UI as intended" — not "cannot be corrupted". The failure modes are quiet ones (blank sheet, wrong codes, silent reclassification) rather than loud ones, which is the worse kind.

## Smallest fixes with the largest effect, in order

1. One shared `assertOfficePlacement()` (level belongs to type, type belongs to department, parent is a head office in the same dept+type with a higher tier, no self-parent, no cycle) called from all four office writers.
2. Two `CHECK` constraints in raw SQL migrations for the documented XOR invariants — Prisma tolerates unmodelled constraints.
3. A budget/office-reference guard on `deleteOfficeLevel` (and the Bangla message on office-type delete), so level deletion can't blank a live sheet.
4. Repeat the children check in `deleteFieldOffice`, or make the promotion an explicit, confirmed action.
5. Cascade or block `saveOfficeType`'s department move when offices exist.

Want me to implement any of these? I'd suggest starting with 1 and 3 — they close the two highest-impact quiet failures and don't touch the schema.

---

**User**

Will they change the UI or just tidy up back end?

**Assistant**

Short answer: **all five are backend-only.** No new screens, no layout changes, no new components. But three of them are *behaviour*-visible — they turn currently-silent success into a refusal, and the refusal surfaces through error channels that already exist.

## Fix by fix

| Fix | Code change | Any UI change? |
|---|---|---|
| 1. Shared `assertOfficePlacement()` | server actions only | No. New refusals reuse the existing `{ error }` return that the dialogs already render (that is how the budget-data message reaches the admin today). |
| 2. Two `CHECK` constraints | raw SQL migration | No. |
| 3. Guard on `deleteOfficeLevel` + Bangla message on office-type delete | two actions | No. It *replaces* a raw Prisma FK error with the friendly Bangla string — same slot, better text. |
| 4. Children check in `deleteFieldOffice` | one action | No — if you pick "block". The alternative ("confirm the promotion") would need a small dialog, so I'd recommend blocking. |
| 5. Office type department move | one action | No — if you pick "block when offices exist". Cascading silently would be invisible, which is worse. |

## The three that are visible in behaviour, not design

1. **`assertOfficePlacement` can start refusing saves that succeed today.** Only for requests that bypass the UI filters (crafted/stale) — normal admin and office use already passes, because the forms filter levels by type. So in day-to-day operation it's invisible; in the edge cases it converts a silent wrong write into a message.
2. **Tightening validation can lock out a pre-existing bad row.** If any office in the database already has a level that doesn't belong to its office type, that office can no longer save its profile until it's corrected. This is the one item that needs a decision from you, and it should be preceded by a read-only audit query — no UI, but a data question.
3. **The `CHECK` constraints can fail the migration itself** if existing rows already violate them. That's also a data-cleanup step, not a UI step. Worth flagging too: Prisma doesn't model these constraints, so `prisma migrate dev` may try to drop them — they belong in a raw migration that stays outside the schema.

## What stays untouched

- `strings.ts` — the actions already hard-code their Bangla error strings inline (`'অননুমোদিত প্রবেশাধিকার'` etc.), so new messages follow the same convention. No new string keys.
- The config tabs, the field-office modal, the office self-service profile page, the group-budget table — none are touched.
- Findings #8 (one head office per type), #9 (`levelOrder` overloading) and #10 (stale comment) are pure backend/latent; #10 is a comment fix plus optionally populating a field the client already re-derives anyway.

So: nothing you would see change in appearance. The only thing you'd notice is that a few operations that used to "work" now say no, with a Bangla explanation — and before that, one audit query to see whether existing data would trip the new rules.

If you want, I can run that audit read-only first so you can decide on #1 and #2 with the real numbers in front of you.

---

**User**

You have full autonomy, make this robust, I agree with the 5 recommendation, and in addition, if you need to make the database and backend robust and failsafe, make it so

**Assistant**

Full autonomy accepted. First, remaining evidence and a read-only audit of live data before I touch anything.

Now a read-only audit of the live database before I change anything.

Audit is clean — the invariants hold in live data today, and it also disproved one of my own recommendations. Checking a few more things before writing code.

Baseline drift is clean (zero). Before I commit to DB-level constraints, I need to know which object types Prisma's drift check can see — so I'll probe with a transient constraint.

Prisma's drift diff is blind to CHECK constraints, partial unique indexes and triggers — so I can enforce at DB level without breaking the project's drift guard. Checking the remaining client contracts before writing.

I'll start by re-reading the implementation targets, then build the hardening.

Now I have the full picture. Let me set up tracking and run a focused pre-flight check for the exact constraints I plan to add.

All constraints are safe to add on live data (0 blocking violations). Now the shared validator.

The client never sends `department_id` to `saveFieldOffice`, so that parameter can go. Now wiring the validator in.

---

