# Budget Sheet Saving Mechanism

> **Workspace:** c:\Apps\ird-budget

---

**User**

I have one discussion, no code, just let me know. How does it saves the final budget sheet? is it calculated all the time or there is matrix/table that keep saved version?

**Assistant**

I'll look into how the budget data is stored and whether totals are computed on the fly or persisted.

Now let me find where this sheet gets computed and written.

Let me check how reports read the sheet and confirm the calculation engine's inputs.

Short answer: **there is no saved "final budget matrix." The final sheet is recalculated on the fly every time, from the raw form data plus a small table of manual overrides.**

Here's the actual flow:

## 1. There IS a table, but it only stores manual overrides
[OfficeBudgetSheet](file:///c:/Apps/ird-budget/prisma/schema.prisma#L783-L798) (`office_budget_sheet`) has three value columns — `autoValue`, `manualValue`, `finalValue` — which *looks* like a saved snapshot. But look at the write path in [budget.ts](file:///c:/Apps/ird-budget/src/app/actions/budget.ts#L221-L239):

- `autoValue` is always written as `0`
- `finalValue` is just a copy of `manualValue`

...and the read path in [sheet.ts](file:///c:/Apps/ird-budget/src/lib/budget/sheet.ts#L149-L159) only ever reads `manualValue`. So `autoValue`/`finalValue` are effectively vestigial — the table is really just a store of *"this office manually overwrote this economic code with this number."*

## 2. The sheet itself is computed live, deterministically
[computeSubmissionSheet()](file:///c:/Apps/ird-budget/src/lib/budget/sheet.ts#L133-L162) is the single source of truth. Each time it runs it:

1. Reads the office's form data (Forms 1–12) → `getBudgetContext()`
2. Runs the pure formula engine `calculateAll()` over them → `auto_value`
3. Reads the stored `manual_value` overrides, if any
4. `final_value = manual_value ?? auto_value`
5. Filters to only the codes the admin granted that office's level

So **"final" is a derived value, not a stored one.** There's no frozen matrix anywhere.

## 3. Why it can't drift
Both the office's own sheet view ([load-form-data.ts](file:///c:/Apps/ird-budget/src/lib/office/load-form-data.ts#L444)) and every report — summary/combined/individual ([report.ts](file:///c:/Apps/ird-budget/src/lib/budget/report.ts#L127), [individual/page.tsx](file:///c:/Apps/ird-budget/src/app/(admin)/admin/reports/individual/page.tsx#L85)) — call the *same* `computeSubmissionSheet()`. So a report can never disagree with what the office sees. The inputs it depends on (form rows, admin rates/config, manual overrides) are all persisted, and the engine is pure, so the result is reproducible.

## One implication worth knowing
Because nothing is snapshotted at submit time, the totals are **not frozen on submission**. If a SuperAdmin later changes a rate (e.g. a salary slab or vehicle config) in the admin settings, previously "submitted" budgets and their reports will recompute to different numbers on the next view. If you ever need submitted budgets to be immutable/auditable, that would require adding an actual snapshot (e.g. persisting the full `finalValue` rows at submit and reading from them instead of recomputing).

Want me to sketch what a snapshot-on-submit approach would look like, or is this enough for the discussion?

---

**User**

the implication you are discussing, is my concern, I think we have to store the submitted budget, in its entirety (both auto and manual), to maintain the integrity of the data. And we can introduce safety so that it remains same in all aspects. my proposals:
1. Add সংরক্ষণ (Draft) button on the left side of চূড়ান্ত দাখিল (Submit) button. Two reason, all the forms has Save and Save and Next button, we need to incorporate that in the final budget. Another, they can save without submit, check all the value, if satisfied then submit even later. We can add one non-blocking background task.
if a budget is saved as draft, then user change a value from a form, coming back to budget, what if they forgot to press recalculate? as saving a draft stops auto calculation as data is fetched from table, right? the background task, can check each, time, whether table value changed or not, if changed, then it show a modal to user to Recalculate with a Recalcualte button, user presses it, and it recalculates. If the budget is submitted, then forms are getting in read mode so they can't change any form. What if admin changes value during draft saved of submitted? if in draft mode, same thing, show a modal to user, to recalcualte, but if already submitted, then admin has to recalculate for them.

Discuss, these are top of my head, if you have better solution as you have all the coding knowledge, enlighten me, we are in this together

**Assistant**

Let me ground this in the current code before I weigh in — I want to check how recalculation and submission work today.

Good — this clarifies the current behavior a lot. Let me verify two more things: how form saves work and whether submitted forms are actually locked.

Your instinct is right, and after reading the code I'd push back on one part of the plan and simplify the rest. Here's the honest engineering take.

## First, an important reframe

Right now the sheet is **never** saved — [computeSubmissionSheet](file:///c:/Apps/ird-budget/src/lib/budget/sheet.ts#L133-L162) rebuilds every value from form data + admin config + manual overrides on every open. The "পুনরায় গণনা করুন" button is just a refetch; it isn't required for correctness today. The manual overrides live in [office_budget_sheet](file:///c:/Apps/ird-budget/prisma/schema.prisma#L783-L798) (only `manualValue` is actually read; `autoValue` is always written `0` and `finalValue` just mirrors `manualValue` — dead columns).

So the staleness problem you're worried about **doesn't exist yet — it would be created by the act of saving.** That's the key insight: the moment you persist computed values, you introduce the "is this still current?" question. So design it so that question only has to be asked where it actually matters.

## The simplification: two regimes, not one

**Draft (খসড়া) → never freeze. Live-compute.**
**Submitted (দাখিলকৃত) → freeze in full.**

- **Draft:** the sheet keeps recomputing from persisted inputs every time it opens. Because the engine is a pure function of (form data + config + manual overrides), a draft **can never be stale**. Your "they forgot to press recalculate" failure mode simply disappears — there's nothing to recalculate.
- **Submitted:** on submit, write a complete snapshot (every code: auto, manual, final) in the *same transaction* as the status change. The office's view and every report read the snapshot instead of recomputing.

This gives you exactly what you asked for — "store the submitted budget in its entirety, both auto and manual" — and integrity comes along for free.

## Now, your three proposals

**1. Save button left of Submit — yes, but drop the "Draft" wording.**
A সংরক্ষণ button is a good idea and low-risk: [saveManualValues](file:///c:/Apps/ird-budget/src/app/actions/budget.ts#L247-L268) already exists and is status-neutral — the button would just surface existing logic. Two corrections:
- It's **not** "Save as Draft." The submission is already draft. Save = *persist my manual overrides, keep status as-is*. Calling it "Save (Draft)" invites confusion with the `status='draft'` state. Label it সংরক্ষণ.
- **Save and Next doesn't apply.** Save-and-Next exists because the forms are paginated. The sheet is one long page grouped by category — there is no "next." Just Save + Submit.

**2. The staleness modal + background task — I'd drop it for drafts.**
With live-computed drafts this is unnecessary complexity. And a background polling task is the wrong tool regardless: it only fires while the page is open, races against writes, wastes IO, and "comparing table values" is fragile. If you want a staleness signal at all, compute it **cheaply at read time** instead:

- Add an integer `configVersion`, bumped on *any* admin write to rates/config.
- Add a `lastDataWriteAt` on the submission, bumped on *every* form save.
- The snapshot records both. Staleness = one integer compare + one timestamp compare. O(1), no polling, works for drafts and submitted alike.

**3. Admin changes a rate — this becomes a policy question, not a tech one.**
- **While the office is still draft:** nothing to do. Config change flows through on the next open automatically. No modal needed.
- **After submission:** the snapshot is frozen, so nothing silently changes. Now you choose:
  - **Option A (best for integrity):** submitted is immutable. Rate changes only affect *future* submissions. Optionally show a badge "rates changed after submission."
  - **Option B:** admin can force a recompute, which writes a **new snapshot version** and preserves the old one. This is the only way to honor "admin recalculates for them" without destroying the audit trail.

Note the codebase already has [unlockBudget](file:///c:/Apps/ird-budget/src/app/actions/budget.ts#L365-L395) — it flips status back to draft and keeps `submitted_at`. That's the natural path for B: unlock → live recompute → resubmit → snapshot v2 (v1 retained).

## Integrity gaps I'd fix regardless of this feature

These matter more than the snapshot for real integrity:

1. **The read-only-after-submit guarantee is UI-only.** [forms.ts](file:///c:/Apps/ird-budget/src/app/actions/forms.ts#L22-L23) checks *ownership* but never *status*. The lock is `inert` in [form-shell.tsx](file:///c:/Apps/ird-budget/src/components/form-shell.tsx#L226-L229), driven by [layout.tsx](file:///c:/Apps/ird-budget/src/app/(office)/layout.tsx#L28-L30). A crafted request can still write to a submitted submission. Every form write should reject when `status='submitted'`.
2. **Snapshot must be self-contained.** If an admin later disables a code for a level, don't re-filter the submitted snapshot by current grants — read it as stored.
3. **Atomicity.** The snapshot write must ride inside the submit transaction ([submitBudget](file:///c:/Apps/ird-budget/src/app/actions/budget.ts#L290-L300) already uses `$transaction`), so you can never have "submitted but no snapshot."

## Storage: three tiers

- **Tier 1 (least code):** reuse `office_budget_sheet` — actually populate `autoValue`/`finalValue` at submit, and when `status='submitted'` read from the table instead of recomputing. One snapshot per submission, overwritten on resubmit. No versioning. Cleans up the dead columns too.
- **Tier 2 (recommended):** new `office_budget_snapshot` + `..._rows` with `version`, `configVersion`, `capturedAt`, `fingerprint`. Enables Option B and "as-submitted vs recomputed" auditing from day one.
- **Tier 3:** JSONB blob on the submission. Cheap, since reports already aggregate in JS — but loses per-code queryability.

I'd start at **Tier 1 or Tier 2**, shaping the schema so the other is a drop-in later.

## What I'd want us to decide before any code

1. **Submitted = immutable, or admin-recomputable-with-versioning?** (Option A vs B)
2. **Tier 1 vs Tier 2** storage.
3. **Do we want the `configVersion` + `lastDataWriteAt` stamps** even if we skip the modal? (I'd say yes — they're the cheap, correct version of your background task.)
4. **Confirm the semantics of সংরক্ষণ:** persist manual overrides only, status unchanged. Agreed?

My recommendation in one line: **live-compute drafts, snapshot-and-freeze on submit, replace the polling task with two version stamps, and add a server-side status guard to every form write.** That satisfies "same in all aspects" without adding a failure mode for us to babysit.

Want me to sketch the schema + the read-path branch (snapshot vs. recompute) so you can see the actual shape before committing?

---

**User**

1. Option A
2. Tier 2 (in the future, I might introduce specific recalculate from Admin, not user level, Admin changes value, and can force recalculate for entire or specific office, but that is for future version)
3. Yes, agree with semantics


if you thing this is the best way, confirm me, I need your approval as well

**Assistant**

Approved. This is the right call, and the pieces fit together cleanly. Here's my confirmation plus the few details I'd lock so the future admin-recompute lands without a redesign.

## Locked decisions

| # | Decision | Understood as |
|---|---|---|
| 1 | **Option A** — submitted is immutable | Admin rate changes never mutate a submitted budget. They affect future submissions only. |
| 2 | **Tier 2** — versioned snapshot tables | `office_budget_snapshot` (+ rows) with `version`, `configVersion`, `capturedAt`, `fingerprint`. |
| 3 | **Version stamps** — yes | `configVersion` (bumped on any admin config write) + `lastDataWriteAt` (bumped on any form save). These are the cheap, correct replacement for the polling task. |
| 4 | **সংরক্ষণ semantics** — confirmed | Persists manual overrides only; `status` stays `draft`. Not "save as draft." No Save-and-Next. |

## Why I'm confident, not just agreeable

- Under **Option A**, the snapshot is **append-only by nature** — it's a revision history, which is exactly what your future "admin force-recalculate" will append to (v2, v3…). You're not building throwaway work.
- The **version column earns its keep even under A**: `unlock → recompute → resubmit` already exists in [unlockBudget](file:///c:/Apps/ird-budget/src/app/actions/budget.ts#L365-L395), and that path should create a new version, not overwrite.
- Your **future admin-triggered recompute** (`Option B`) becomes a *pure feature addition*: write a new snapshot version + record who/why. No schema change, no migration. That's the sign of a good seam.

## Details I'd nail now (so the future feature is a drop-in)

1. **`office_budget_sheet` keeps its job** — it stays the *draft working table* for manual overrides. The snapshot tables are separate and read-only. Don't merge them; merging is what would make versioning impossible.
2. **Snapshot stores display fields, not just code IDs** — code string, name, category. Names/categories can be renamed later; a submitted sheet must render *exactly* as it did. This is your "same in all aspects" guarantee.
3. **Snapshot is self-contained w.r.t. level grants** — never re-filter a submitted snapshot by the current per-level code grants.
4. **`recalculateBudget` becomes submitted-aware** — for a submitted budget it's a no-op (hide/disable the button). Immutability means there's nothing to recalc.
5. **Read path branches in one place** — keep `computeSubmissionSheet` for drafts, add a sibling that returns the snapshot when `status='submitted'`. Office view *and* all reports ([report.ts](file:///c:/Apps/ird-budget/src/lib/budget/report.ts#L127)) call that one branch point, so they can never diverge.
6. **Server-side status guard on every form write** — this is the gap I'd close in the same PR. Right now [forms.ts](file:///c:/Apps/ird-budget/src/app/actions/forms.ts#L22-L23) only checks ownership; immutability is unenforceable without it.
7. **The `configVersion` compare is now informational only** — under Option A it can't trigger anything, so it powers at most a "rates changed since submission" badge for admins. Cheap to keep, useful later.

## One honest caveat

Tier 2 + Option A means submitted numbers are frozen, so if an admin fixes a *wrong* rate mid-cycle, the already-submitted offices keep the old number until they're told to unlock+resubmit. That's the correct trade for integrity, but it's a workflow to communicate to admins — which is precisely why your planned admin-force-recompute exists. Nothing to change now; just don't be surprised by it.

So: **yes, approved as specified.** I'd add the two version stamps (#3) and the server-side guard (#6) to the scope even though they weren't the headline ask — they're what make the guarantee real.

Say the word and I'll produce the concrete shape: the two Prisma models, the `configVersion`/`lastDataWriteAt` columns, and the read-path branch — as a sketch for you to review before any implementation.

---

**User**

Do whatever you need to do to achieve this, you have full autonomy. 

**Assistant**

I'll take this on. Let me first explore the exact surfaces I need to touch, then implement.

---

