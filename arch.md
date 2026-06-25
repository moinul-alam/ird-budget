# IRD Budget System Architecture

## Overview
The IRD Budget System is a modernized web application built with Next.js 15, React Server Components, and Supabase. This architecture replaces the legacy Astro and Svelte application to provide a robust, type-safe, and server-side rendered application flow.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Shadcn UI
- **Backend/Database:** Supabase (PostgreSQL)
- **Data Validation:** Zod
- **Authentication:** Supabase Auth (SSR)

## Key Architectural Decisions

### 1. Server Components First
All data fetching and initial rendering is performed using **React Server Components (RSC)**. This minimizes client-side JavaScript, improves initial load times, and allows direct secure database access from the server using the Supabase Server Client (`src/lib/supabase/server.ts`).

### 2. Client Components for Interactivity
Only parts of the application requiring user interaction (e.g., form inputs, state management) are marked with `'use client'`. We follow the "leaves of the tree" pattern, where parent Server Components fetch data and pass it as props to child Client Components.

### 3. Server Actions for Mutations
All form submissions and database modifications are handled via **Server Actions** (`src/app/actions/*.ts`). This eliminates the need for separate API routes and provides end-to-end type safety between the form submission on the client and the database mutation on the server.

### 4. Pure Calculation Engine
A core requirement of the system is calculating the budget based on form inputs. This logic is completely decoupled from the UI framework in a pure functional module: `src/lib/budget/calculate.ts`. 
- **Pure Functions:** The engine takes a `BudgetContext` (a standard JavaScript object) and returns calculated values.
- **Zero Dependencies:** It imports nothing from React, Next.js, or Supabase.
- **Testability:** This design ensures the calculation logic is highly testable and agnostic to the UI layer.

### 5. Localization (Bangla First)
The entire application UI is localized in Bengali. To maintain consistency and avoid scattered strings:
- All text strings are centralized in `src/lib/strings.ts`.
- Number and currency conversions (English to Bengali) are handled by utility functions in `src/lib/bangla.ts`.

## Directory Structure
```
src/
├── app/
│   ├── (admin)/       # Admin dashboard & reports
│   ├── (office)/      # Office user flow (forms 1-10, budget summary)
│   ├── actions/       # Next.js Server Actions (auth, forms, budget)
│   ├── auth/          # Auth callbacks
│   ├── login/         # Public login page
│   ├── layout.tsx     # Root layout (lang="bn", fonts, etc.)
│   └── page.tsx       # Entry point redirect
├── components/        # Reusable UI components
│   ├── ui/            # Shadcn base components
│   ├── app-shell.tsx  # Main dashboard layout
│   └── form-shell.tsx # Wrapper for all data entry forms
├── lib/               # Utilities and core logic
│   ├── budget/        # Pure calculation engine & data fetchers
│   ├── schemas/       # Zod validation schemas
│   ├── supabase/      # Supabase server/client utilities
│   ├── bangla.ts      # Number conversion utilities
│   ├── strings.ts     # Centralized Bengali strings
│   └── utils.ts       # Tailwind class merging
└── proxy.ts           # Next.js middleware (session management)
```

## Data Flow (Office User)
1. **Authentication:** User logs in (`/login`). `proxy.ts` establishes a secure session via cookies.
2. **Dashboard:** User is redirected to `/dashboard` which displays the progress of their form submissions.
3. **Data Entry:** User proceeds through Forms 1-10. For each form:
   - Server Component (`page.tsx`) fetches existing data from Supabase.
   - Client Component (`form-x-client.tsx`) renders the form.
   - On save, a Server Action (`actions/forms.ts`) upserts data to Supabase.
4. **Budget Summary:** At `/office/budget-sheet`, the `getBudgetContext()` fetcher aggregates all form data. The `calculate.ts` engine processes this context, and the results are displayed alongside fields for manual overrides.

## Future Enhancements
- Implementation of the full Admin Reports (Phase 7 placeholders currently exist).
- Complete the UI implementation of Forms 3-10 (currently using skeleton components to allow navigation).
- Integration of a robust PDF generation service for printing the final budget sheet.
