# Internal Resources Division (IRD) Budget Management System
## Architectural & Developer Technical Guidelines

---

## 1. Executive Summary & Tech Stack

This application is an institutional budget management web application developed for the **Internal Resources Division (IRD), Ministry of Finance, Government of Bangladesh**. It facilitates end-to-end budgeting workflows: configuring budget cycles and economic codes, setting up office types and organizational hierarchies, and allowing subordinate field offices to fill out 11 distinct budget requirement forms and generate a master Budget Sheet.

### Core Technologies
- **Framework**: [Next.js](https://nextjs.org/) (Version 16.x, App Router, React 19)
- **Language**: TypeScript 5.x (Strict mode enabled)
- **Styling**: TailwindCSS v4 with PostCSS, `tw-animate-css`, and custom theme tokens in `src/app/globals.css`
- **UI Component System**: Lightweight accessible primitives using Radix/Base UI (`@base-ui/react`), Shadcn UI structure, Lucide React icons
- **Form Management & Validation**: React Hook Form with Zod schemas (`@hookform/resolvers/zod`)
- **Backend / Database**: Supabase PostgreSQL with `@supabase/supabase-js` and `@supabase/ssr`
- **Language / Localization**: Native Bangla UI (Bangla numbers, currency formatting, labels, and fiscal year calculations in `src/lib/bangla.ts` & `src/lib/strings.ts`)

---

## 2. Directory Structure

```
ird-budget/
├── .next/                         # Next.js build cache & compiled artifacts
├── public/                        # Static assets (images, logos, fonts)
├── src/
│   ├── app/                       # Next.js App Router root
│   │   ├── (admin)/               # Admin portal routes
│   │   │   └── admin/
│   │   │       ├── dashboard/     # Modern admin dashboard (overview cards, charts)
│   │   │       ├── budgets/       # Budget cycle configuration
│   │   │       ├── codes/         # Economic code & category hierarchy config
│   │   │       ├── offices-config/# Office types, hierarchy, and group settings
│   │   │       ├── offices-users/ # Office user approvals & directory
│   │   │       ├── reports/       # Analytical & aggregated budget reports
│   │   │       ├── settings/      # System settings & parameters
│   │   │       └── users/         # Admin user management
│   │   ├── (admin-auth)/          # Admin authentication pages (login)
│   │   ├── (office)/              # Office user portal routes
│   │   │   ├── dashboard/         # Field office overview & forms completion tracker
│   │   │   └── office/            # Sequential budget forms (1 through 11)
│   │   │       ├── form-1/        # ১. অফিসের সাধারণ তথ্যাদি
│   │   │       ├── form-2/        # ২. কর্মরত কর্মকর্তা ও কর্মচারীদের বেতন
│   │   │       ├── form-3/        # ৩. বেতন (বরখাস্তকৃত কর্মকর্তা/কর্মচারীদের)
│   │   │       ├── form-4/        # ৪. কর্মকর্তা ও কর্মচারীদের ভাতা সংক্রান্ত তথ্য
│   │   │       ├── form-5/        # ৫. কর্মকর্তা ও কর্মচারীদের অবসর ও ছুটি নগদায়ন
│   │   │       ├── form-6/        # ৬. যানবাহনের জ্বালানি ও সিএনজি ব্যয় সংক্রান্ত তথ্য
│   │   │       ├── form-7/        # ৭. গাড়ি ভাড়ার তথ্য ও আর্থিক বিবরণী
│   │   │       ├── form-8/        # ৮. অফিস ভাড়ার তথ্য সংক্রান্ত বিবরণী
│   │   │       ├── form-9/        # ৯. কম্পিউটার ও তথ্যপ্রযুক্তি সরঞ্জাম মেরামতের তথ্য
│   │   │       ├── form-10/       # ১০. ইউটিলিটি বিলসমূহ (বিদ্যুৎ, গ্যাস, পানি)
│   │   │       ├── form-11/       # ১১. আয়কর রিটার্ন সংক্রান্ত ব্যয় বিবরণী
│   │   │       └── budget-sheet/  # মাস্টার বাজেট শিট (সংকলন ও সাবমিশন)
│   │   ├── actions/               # Server Actions (Mutations & DB operations)
│   │   │   ├── admin-budgets.ts   # Admin budget cycles actions
│   │   │   ├── admin-codes.ts     # Economic codes & categories CRUD
│   │   │   ├── admin-offices-config.ts # Types, hierarchy, and group settings CRUD
│   │   │   ├── admin-settings.ts  # Admin global configurations
│   │   │   ├── admin-users.ts     # Admin credentials & permissions
│   │   │   ├── auth.ts            # Office & Admin authentication / cookies
│   │   │   ├── forms.ts           # Submissions & budget forms persistence
│   │   │   └── office.ts          # Office profile & basic setup
│   │   ├── globals.css            # Global CSS styles and Tailwind setup
│   │   ├── layout.tsx             # Root layout with fonts & providers
│   │   ├── landing-client.tsx     # Homepage / Entry portal (Office login & register)
│   │   └── page.tsx               # Root page
│   ├── components/                # Reusable UI & Layout Components
│   │   ├── ui/                    # Base UI primitives (button, dialog, input, card, table)
│   │   ├── app-shell.tsx          # Layout shell for Office user (Drawer, Header, Navigation)
│   │   ├── admin-shell.tsx        # Layout shell for Admin portal (Sidebar, Stats, User Menu)
│   │   └── form-shell.tsx         # Standard wrapper for Forms 1-11 (Header, Prev/Next buttons)
│   └── lib/                       # Helpers, Utilities, Schemas & Constants
│       ├── bangla.ts              # Bangla digits, currency, and date formatting
│       ├── strings.ts             # Centralized UI copy, translations & labels
│       ├── schemas/               # Zod validation schemas
│       │   └── forms.ts           # Validation schemas for form entries
│       ├── supabase/              # Supabase client instantiation
│       │   ├── client.ts          # Browser client
│       │   └── server.ts          # Server client (SSR cookies support)
│       └── utils.ts               # Tailwind class merge helper (cn)
├── AGENTS.md                      # AI & Agent conventions
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript compiler settings
```

---

## 3. Architecture & Design Patterns

### 3.1 Authentication & Multi-Tenancy Roles
1. **Office Users (Field Offices)**:
   - Authenticated through Office Registration or Budget Code PIN login.
   - Session stored securely in encrypted HTTP-only cookies (`office_session`).
   - Every submission is bound to an active `submission_id` linked with the current open budget cycle.
2. **Admin Users**:
   - Authenticated through `/admin/login`.
   - Session managed via Supabase Auth or admin cookies.
   - Admin manages codes, cycles, office hierarchies, and reviews consolidated submissions.

### 3.2 Form Architecture (Form 1 to 11)
Every budget form follows a standardized, decoupled pattern:
- **Server Page (`page.tsx`)**:
  - Reads session cookies from `cookies()`.
  - Checks authorization and active `submission_id`.
  - Fetches existing form data from Supabase using `createOfficeClient()`.
  - Passes preloaded data into the Client Component as props.
- **Client Component (`form-X-client.tsx`)**:
  - Encapsulated inside `<FormShell>` (`src/components/form-shell.tsx`).
  - Provides:
    - `formNumber`: Integer 1 through 11.
    - `prevHref`: Relative route to the preceding step (or `null` for Form 1).
    - `nextHref`: Relative route to the next step.
    - `onSave`: Async callback to commit inputs.
  - Interactive table or field inputs with automatic calculation of total amounts using Bangla numbers (`toBanglaNumber` / `toBanglaAmount`).
- **Server Actions (`src/app/actions/forms.ts`)**:
  - Handles batch inserts/updates using Supabase client.
  - Automatically triggers `revalidatePath` so navigation and dashboard completion status reflect immediate changes.

---

## 4. How to Modify or Extend the Application

### 4.1 Modifying an Existing Budget Form (Form 1 - 11)
When adding fields, changing columns, or altering calculations in any form:
1. **Update UI Labels & Text**:
   - Add or edit label keys in `src/lib/strings.ts` under the corresponding form namespace (e.g., `strings.form3`).
   - Keep Bangla phrasing standardized.
2. **Update Validation Schema**:
   - If validating with Zod, update `src/lib/schemas/forms.ts`.
3. **Update Client Form Component**:
   - Locate the target form in `src/app/(office)/office/form-[N]/form-[N]-client.tsx`.
   - Update table headers, inputs, row states, and calculation hooks.
4. **Update Server Action / Persistence**:
   - Modify the respective save handler in `src/app/actions/forms.ts`.
   - Ensure the database column or JSON structure matches the updated data payload.
5. **Update Master Budget Sheet**:
   - If the form impacts total economic code allocations, check `src/app/(office)/office/budget-sheet/` to ensure the summary aggregates new items accurately.

### 4.2 Adding a New Route or Form
If you need to introduce an additional form step:
1. Create directory `src/app/(office)/office/form-[N]/`.
2. Create `page.tsx` and `form-[N]-client.tsx` following the `FormShell` pattern.
3. Update `FORM_NAV_ITEMS` in `src/components/app-shell.tsx` to include the new navigation item and icon.
4. Update `FORM_LIST` in `src/app/(office)/dashboard/page.tsx` for dashboard tracking cards.
5. Chain `prevHref` and `nextHref` across the adjacent forms to maintain uninterrupted sequential navigation.

### 4.3 Modifying Admin Configurations
1. **Office Configuration (`/admin/offices-config`)**:
   - Backed by `src/app/actions/admin-offices-config.ts`.
   - Tab 1: Department types (e.g. আয়কর, ভ্যাট).
   - Tab 2: Office types & hierarchy order.
   - Tab 3: Group settings (enabling group budgeting per department & office type).
2. **Economic Codes Configuration (`/admin/codes`)**:
   - Backed by `src/app/actions/admin-codes.ts`.
   - Tab 1: Budget categories (e.g. ৩১১১ নগদ মজুরি ও বেতন) & Economic codes.
   - Tab 2: Code visibility/enablement per office type.

---

## 5. Coding Standards & Conventions

1. **Bangla Text & Numbers**:
   - Never hardcode English digits (0-9) in user-facing financial statistics or form badges. Use `toBanglaNumber(value)` and `toBanglaAmount(amount)` from `src/lib/bangla.ts`.
   - Centralize reusable text strings in `src/lib/strings.ts`.
2. **Next.js & React Conventions**:
   - Adhere to Server/Client Component boundaries. Mark interactive files with `'use client'`.
   - Keep data fetching on the server in `page.tsx` whenever possible.
3. **Database Consistency**:
   - Run type checks with `npx tsc --noEmit` after modifying database query structures or server action signatures.
