# Refactor Guide: Astro + Svelte → Next.js 15 + TypeScript + Supabase

> **For AI IDE use.** Read this entire document before touching any files. Follow sections in order. Do not skip steps.

---

## Overview

This project is being migrated from Astro + Svelte + Tailwind to a new stack. The goal is a clean rebuild — not a line-by-line port. Svelte-specific logic (stores, reactive statements, `$:`, `bind:`) must be **discarded and rebuilt from scratch** in React/Next.js idioms. Do not attempt to translate Svelte syntax.

### What This App Does
A government office budget management system where:
- **Users** log in, fill 10 structured forms (staff salaries, vehicles, computers, utilities, etc.), view a final budget summary with auto-calculated totals + manual line items, then submit
- **Admins** view reports: per-office, combined, and budget-code-level summaries

---

## Target Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Database + Auth | Supabase (existing instance, keep DB) |
| Styling | Tailwind CSS |
| Components | Shadcn/ui |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |

**Do not add:** TanStack Query, Zustand, Drizzle ORM, Prisma, or any other libraries not listed above unless explicitly required for a specific feature.

---

## Phase 0: Project Bootstrap

1. Scaffold a new Next.js 15 project with TypeScript and App Router:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
   ```

2. Install dependencies:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   npm install react-hook-form zod @hookform/resolvers
   npm install lucide-react
   npx shadcn@latest init
   ```
   When prompted by shadcn: choose default style, use CSS variables, keep default paths.

3. Add the following Shadcn components (install only what's needed as you build):
   ```bash
   npx shadcn@latest add button input label select textarea table card badge dialog alert
   ```

4. Set up environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<from existing project>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<from existing project>
   SUPABASE_SERVICE_ROLE_KEY=<from existing project>
   ```

---

## Phase 1: Inspect Existing Codebase

Before writing any new code, read the existing Astro + Svelte project and extract the following. **Do not copy code — extract intent.**

For each existing form and UI component, document:
- What data fields it captures (names, types, validation rules)
- What it displays (labels, placeholders, calculated values)
- Any business logic (formulas, conditionals, derived values)

Specifically look for:
- Budget code definitions and their calculation logic
- The 10 form structures and their fields
- How the final budget form aggregates data from other forms
- Any role-based logic (user vs admin views)
- Existing Supabase table names, column names, and relationships

Store these notes as inline comments in the new TypeScript types you create. Do not create a separate notes file.

---

## Phase 2: Supabase Setup

### 2.1 Inspect Existing Schema

Connect to the existing Supabase project and inspect the current schema:
- List all tables and their columns
- Note foreign key relationships
- Note any RLS policies already in place
- Note any existing auth configuration

### 2.2 Assess Schema Compatibility

The existing database must be preserved. However, if the schema needs changes to support the new app properly (e.g., missing tables, bad column types, no RLS), make additive changes only — new tables, new columns with defaults, new policies. Do not drop or rename existing tables or columns.

Document all schema changes you make in a comment block at the top of `src/lib/supabase/schema-notes.ts`.

### 2.3 Required Tables (create if missing)

Ensure the following tables exist with at minimum these fields. Adapt to what already exists:

```sql
-- Offices / departments
offices (id, name, code, created_at)

-- Budget submissions (one per office per year)
budget_submissions (id, office_id, fiscal_year, status, submitted_at, submitted_by)

-- Form data (one row per form per submission)
-- form_type: 'staff_salary' | 'vehicles' | 'computers' | 'utilities' | etc.
form_data (id, submission_id, form_type, data jsonb, updated_at)

-- Budget line items (auto-calculated + manual)
budget_line_items (id, submission_id, budget_code, description, amount, is_manual, created_at)

-- User profiles (linked to auth.users)
profiles (id, user_id, office_id, role, full_name)
-- role: 'user' | 'admin'
```

### 2.4 Row Level Security

Enable RLS on all tables. At minimum:
- Users can only read/write data belonging to their `office_id`
- Admins can read all rows
- No user can directly modify `budget_submissions.status` — that happens via a server action

### 2.5 Supabase Client Setup

Create two clients following the `@supabase/ssr` pattern:

**`src/lib/supabase/server.ts`** — for Server Components and Server Actions (uses cookies)

**`src/lib/supabase/client.ts`** — for Client Components (browser singleton)

Follow the official `@supabase/ssr` docs pattern exactly. Do not use the deprecated `@supabase/auth-helpers-nextjs`.

---

## Phase 3: Authentication

### 3.1 Middleware

Create `middleware.ts` at the project root. It must:
- Refresh the Supabase session on every request
- Redirect unauthenticated users to `/login`
- Redirect authenticated users away from `/login`
- Allow public access only to `/login` and `/auth/callback`

### 3.2 Auth Pages

**`/login`** — email/password login form using RHF + Zod. On success, redirect to `/dashboard`. Show field-level errors. Use Shadcn `Input`, `Button`, `Label`.

**`/auth/callback`** — route handler that exchanges the auth code for a session (required for email confirmation flows).

### 3.3 Auth Utilities

Create `src/lib/auth.ts` with:
- `getUser()` — gets current user from server, throws if not authenticated
- `getUserProfile()` — gets user + their office_id and role
- `requireAdmin()` — throws redirect if user role is not 'admin'

---

## Phase 4: App Structure & Routing

Create the following route structure using Next.js App Router:

```
src/app/
├── (auth)/
│   └── login/
│       └── page.tsx
├── (app)/
│   ├── layout.tsx          ← shared nav/sidebar for logged-in users
│   ├── dashboard/
│   │   └── page.tsx        ← overview: form completion status, submit button
│   ├── forms/
│   │   ├── layout.tsx      ← form navigation sidebar
│   │   ├── staff-salary/
│   │   │   └── page.tsx
│   │   ├── vehicles/
│   │   │   └── page.tsx
│   │   ├── computers/
│   │   │   └── page.tsx
│   │   ├── utilities/
│   │   │   └── page.tsx
│   │   └── [formSlug]/     ← catch-all for remaining forms
│   │       └── page.tsx
│   └── budget/
│       └── page.tsx        ← final budget form: calculated + manual items, submit
├── (admin)/
│   ├── layout.tsx          ← admin layout, requires admin role
│   ├── reports/
│   │   ├── page.tsx        ← combined office report
│   │   ├── [officeId]/
│   │   │   └── page.tsx    ← individual office report
│   │   └── codes/
│   │       └── page.tsx    ← budget code summary
│   └── offices/
│       └── page.tsx        ← manage offices
└── auth/
    └── callback/
        └── route.ts
```

---

## Phase 5: Forms (Core Feature)

This is the most important part. Follow this pattern for every form.

### 5.1 Form Pattern

Each of the 10 forms follows the same structure:

1. **Server Component page** — fetches existing saved data for this form from `form_data` table, passes it as `defaultValues` to the client form component
2. **Client Component form** — uses `useForm` from RHF with a Zod schema, renders fields using Shadcn components, calls a Server Action on submit
3. **Server Action** — validates with Zod, upserts into `form_data` table, returns success/error

### 5.2 Zod Schemas

Create `src/lib/schemas/` with one file per form. Example for staff salary:

```typescript
// src/lib/schemas/staff-salary.ts
import { z } from 'zod'

export const staffSalarySchema = z.object({
  total_staff: z.number().int().min(0),
  basic_salary_per_head: z.number().min(0),
  house_rent_allowance_pct: z.number().min(0).max(100),
  education_allowance_per_head: z.number().min(0),
  // ... other fields from existing form
})

export type StaffSalaryData = z.infer<typeof staffSalarySchema>
```

Create schemas for all 10 forms by extracting field definitions from the existing Svelte forms.

### 5.3 Server Actions

Create `src/app/actions/forms.ts`:

```typescript
'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { staffSalarySchema } from '@/lib/schemas/staff-salary'
import { revalidatePath } from 'next/cache'

export async function saveStaffSalaryForm(submissionId: string, formData: unknown) {
  const parsed = staffSalarySchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('form_data')
    .upsert({
      submission_id: submissionId,
      form_type: 'staff_salary',
      data: parsed.data,
      updated_at: new Date().toISOString()
    }, { onConflict: 'submission_id,form_type' })

  if (error) return { error: { message: error.message } }

  revalidatePath('/dashboard')
  return { success: true }
}
```

Create one action per form. Keep actions in `src/app/actions/`.

### 5.4 Auto-save vs Manual Save

Forms should save on submit (button click), not on every keystroke. Each form page has a "Save & Continue" button. The user can navigate away and return — data is loaded from the DB each time.

### 5.5 Form Completion Tracking

The dashboard must show which of the 10 forms are complete. A form is "complete" if a row exists in `form_data` for that `submission_id` and `form_type`. Compute this in a Server Component — do not store completion state in the DB separately.

---

## Phase 6: Budget Summary Page

**`/budget`** — the final step before submission.

### 6.1 Calculated Items

On page load (Server Component), read all `form_data` rows for the current submission and compute budget line items using the budget codes. Each code maps to a formula. Example:

```typescript
// src/lib/budget/calculate.ts

export function calculateBudgetLines(formDataMap: Record<string, unknown>): BudgetLineItem[] {
  const salary = formDataMap['staff_salary'] as StaffSalaryData
  // ...

  return [
    {
      code: 'A-1101',
      description: 'Basic Salary',
      amount: salary.total_staff * salary.basic_salary_per_head * 12,
      is_manual: false
    },
    {
      code: 'A-1102',
      description: 'House Rent Allowance',
      amount: salary.total_staff * salary.basic_salary_per_head * (salary.house_rent_allowance_pct / 100) * 12,
      is_manual: false
    },
    // ... all other codes
  ]
}
```

Extract all budget code formulas from the existing Svelte project. Put all calculation logic in `src/lib/budget/calculate.ts`. This file must be pure TypeScript with no framework dependencies.

### 6.2 Manual Items

Below the calculated items, render a dynamic list where users can add manual line items (code, description, amount). Store these in `budget_line_items` with `is_manual: true`.

### 6.3 Submission

A "Submit Budget" button calls a Server Action that:
1. Validates all 10 forms are complete
2. Saves all calculated line items to `budget_line_items`
3. Sets `budget_submissions.status` to `'submitted'`
4. Redirects to a confirmation page

After submission, forms become read-only for the user.

---

## Phase 7: Admin Reports

Admin pages are in the `(admin)` route group. The layout must call `requireAdmin()` — redirect non-admins to `/dashboard`.

### 7.1 Report Pages

Each report page is a **Server Component** that queries Supabase and renders a table. Use Shadcn `Table` component.

**Combined Office Report (`/admin/reports`)**
- List all offices with their submission status, total budget amount, and a link to the individual report

**Individual Office Report (`/admin/reports/[officeId]`)**
- Office details + all budget line items grouped by code
- Show form-by-form breakdown
- Print-friendly layout (use `print:` Tailwind classes)

**Budget Code Summary (`/admin/reports/codes`)**
- Group all submitted line items by budget code across all offices
- Show per-office amounts and a grand total column
- Render as a wide table, allow horizontal scroll on mobile

### 7.2 No Client-Side Fetching for Reports

Reports are read-heavy, infrequently updated, and don't need real-time updates. Fetch everything in Server Components. Do not use `useEffect` or client-side data fetching for any report page.

---

## Phase 8: Shared Components

Create these reusable components in `src/components/`:

```
src/components/
├── ui/               ← Shadcn auto-generated, do not edit
├── layout/
│   ├── AppNav.tsx    ← top nav with user info and logout
│   ├── Sidebar.tsx   ← form navigation links with completion indicators
│   └── AdminNav.tsx  ← admin-specific navigation
├── forms/
│   ├── FormShell.tsx ← wrapper: title, description, save button, error display
│   └── FieldError.tsx← displays RHF field errors consistently
└── budget/
    ├── BudgetTable.tsx   ← renders line items table
    └── ManualItemRow.tsx ← input row for manual budget entries
```

---

## Phase 9: TypeScript Types

Create `src/types/` with:

```typescript
// src/types/database.ts — mirror Supabase table shapes
// src/types/budget.ts — BudgetLineItem, BudgetCode, etc.
// src/types/forms.ts — FormType union type, FormStatus, etc.
```

Define a `FormType` union:
```typescript
export type FormType =
  | 'staff_salary'
  | 'vehicles'
  | 'computers'
  | 'utilities'
  | 'office_equipment'
  | 'travel'
  | 'training'
  | 'maintenance'
  | 'miscellaneous'
  | 'capital_expenditure'
```

Adjust names to match whatever the existing project uses.

---

## Phase 10: Cleanup & Validation

1. Delete all Astro and Svelte files — no `.astro`, `.svelte`, or `svelte.config.*` files should remain
2. Remove Astro and Svelte from `package.json`
3. Run `npx tsc --noEmit` and fix all TypeScript errors
4. Run `npm run build` — the build must succeed with zero errors before this refactor is considered complete
5. Test manually:
   - Login and logout
   - Fill and save at least 2 forms
   - View the budget summary page
   - Submit a budget
   - View admin reports (if admin user available)

---

## Phase 11: Generate arch.md

After the refactor is fully complete and `npm run build` passes, generate a file called `arch.md` in the project root.

`arch.md` must contain the following sections:

### Section 1: Project Overview
What this application does, who uses it, and what problem it solves. 2–3 paragraphs.

### Section 2: Tech Stack
A table listing every technology, its version (read from `package.json`), and one sentence on why it's used. No libraries outside the approved stack should appear.

### Section 3: Project Structure
A full annotated directory tree of `src/`. For every folder and key file, write one line explaining what it contains and what rules apply to it. Example:
```
src/
├── app/                   ← Next.js App Router. All routes live here.
│   ├── (auth)/            ← Public routes. No auth required.
│   ├── (app)/             ← Protected routes. Auth enforced via middleware.
│   ├── (admin)/           ← Admin-only routes. requireAdmin() called in layout.
│   └── actions/           ← Server Actions only. No client code here.
├── components/
│   ├── ui/                ← Shadcn components. Never edit these manually.
│   └── ...                ← Project components. Always typed, never use `any`.
├── lib/
│   ├── supabase/          ← Supabase clients. Use server.ts in Server Components, client.ts in Client Components.
│   ├── schemas/           ← Zod schemas. One file per form. Source of truth for validation.
│   └── budget/            ← Pure calculation logic. No framework imports allowed here.
└── types/                 ← TypeScript type definitions. No runtime code.
```

### Section 4: Auth & Role Model
Explain how authentication works (Supabase Auth + SSR), how roles are stored (profiles table), how role checks are enforced (middleware + `requireAdmin()`), and how RLS policies protect the database.

### Section 5: Data Flow
Explain the lifecycle of a budget submission:
1. User logs in → profile fetched → office_id known
2. User fills forms → data saved to `form_data` via Server Actions
3. Budget page reads `form_data` → calculations run in `src/lib/budget/calculate.ts` → line items displayed
4. User submits → `budget_submissions.status` set to `submitted` → forms become read-only
5. Admin reads reports → Server Components query `budget_line_items` and `form_data` directly

### Section 6: Forms Architecture
Explain the 3-layer pattern: Server Component (fetch) → Client Component (RHF form) → Server Action (validate + save). List all 10 form types and their corresponding schema file and action.

### Section 7: Budget Codes
List all budget codes used in the system with their descriptions and which form data they are derived from (or mark as manual). This is important reference for future developers adding or modifying budget codes.

### Section 8: Developer Guidelines

Include the following rules verbatim:

```
RULES FOR THIS PROJECT

1. No new dependencies without a documented reason. Check the approved stack first.
2. All data fetching in Server Components unless real-time or user-interaction-dependent.
3. All mutations via Server Actions. No API routes for form submissions.
4. All forms must have a corresponding Zod schema in src/lib/schemas/.
5. Never use `any` in TypeScript. Use `unknown` and narrow it.
6. Never edit files in src/components/ui/ — these are Shadcn managed.
7. All budget calculation logic must live in src/lib/budget/calculate.ts — never inline in components.
8. Admin pages must call requireAdmin() in their layout, not in individual pages.
9. Use the server Supabase client in Server Components and Actions. Never use the browser client on the server.
10. RLS is the security layer. Never trust client-sent office_id or user_id — always derive from the server session.
```

### Section 9: Environment Variables
List all required environment variables, what they are for, and where to find them (Supabase dashboard, etc.).

### Section 10: Deployment Notes
Note that this project is designed for Vercel deployment. List any Supabase configuration needed (auth redirect URLs, etc.) and any environment variables that must be set in the Vercel dashboard.

---

## Important Constraints

- **Never use `any` in TypeScript.** Use `unknown` and narrow with Zod or type guards.
- **Never fetch data in Client Components** unless it's triggered by user interaction (e.g., search-as-you-type). All initial data loads happen in Server Components.
- **Never use API routes (`route.ts`) for form submissions.** Use Server Actions.
- **Never edit `src/components/ui/`** — that's Shadcn managed code.
- **Budget calculation logic must be pure.** `src/lib/budget/calculate.ts` must have zero imports from React, Next.js, or Supabase.
- **Do not invent budget codes or form fields.** Extract them from the existing Svelte project exactly.
