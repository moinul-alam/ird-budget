# Refactoring Status

## Phase 0: Project Bootstrap
- [ ] Scaffold new Next.js 15 project with TypeScript and App Router
- [ ] Install dependencies (Supabase, React Hook Form, Zod, Lucide React, Shadcn)
- [ ] Add Shadcn components
- [ ] Set up environment variables

## Phase 1: Inspect Existing Codebase [COMPLETED]
- Reviewed all `src-old/pages/office/*.astro` files (Form 1 to 10 and budget-sheet)
- Extracted schemas and data field representations into `src/lib/schemas/forms.ts`
- Extracted calculation formulas into pure functions in `src/lib/budget/calculate.ts`
- Added schema notes and Supabase DB insights to `src/lib/supabase/schema-notes.ts`

## Phase 2: Supabase Setup [COMPLETED]
- Inspect existing schema
- Document schema changes in `src/lib/supabase/schema-notes.ts`
- Ensure required tables exist
- Enable RLS on all tables
- Set up Supabase clients (`server.ts` and `client.ts`)

## Phase 3: Authentication [COMPLETED]
- Create `middleware.ts`
- Create `/login` and `/auth/callback` pages
- Create auth utilities (`src/lib/auth.ts`)

## Phase 4: App Structure & Routing [COMPLETED]
- Create route structure for auth, app (dashboard, forms, budget), and admin

## Phase 5: Forms (Core Feature) [COMPLETED]
- Implement Server Component, Client Component, and Server Action pattern for forms
- Create Zod schemas in `src/lib/schemas/`
- Create Server Actions in `src/app/actions/forms.ts`
- Implement form completion tracking on the dashboard

## Phase 6: Budget Summary Page [COMPLETED]
- Implement calculated items logic in `src/lib/budget/calculate.ts`
- Implement manual items
- Implement submission process

## Phase 7: Admin Reports [COMPLETED]
- Create Combined Office Report (Skeleton)
- Create Individual Office Report (Skeleton)
- Create Budget Code Summary (Skeleton)

## Phase 8: Shared Components [COMPLETED]
- Create layout components (AppNav, Sidebar, AdminNav)
- Create form components (FormShell, FieldError)
- Create budget components (BudgetTable, ManualItemRow)

## Phase 9: TypeScript Types [COMPLETED]
- Create `database.ts`, `budget.ts`, `forms.ts`

## Phase 10: Cleanup & Validation
- [ ] Delete all Astro and Svelte files
- [ ] Remove Astro/Svelte from `package.json`
- [ ] Fix all TypeScript errors
- [ ] Build successfully
- [ ] Test manually

## Phase 11: Generate arch.md
- [ ] Generate `arch.md` with required sections
