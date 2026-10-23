# Prisma Migration Plan

## Phase 0: Prisma Setup ✅
- [x] Install Prisma
- [x] Create Prisma schema (30 tables)
- [x] Generate Prisma client
- [x] Create database client wrapper

## Phase 0.5: Incremental File Migration ✅

### Files to Refactor (17 files) - ALL COMPLETED

**Core Infrastructure (3 files)**
1. [x] `src/lib/supabase/client.ts` → Removed (no longer needed)
2. [x] `src/lib/supabase/server.ts` → Removed (no longer needed)
3. [x] `src/lib/supabase/middleware.ts` → Removed (no longer needed)
4. [x] `src/proxy.ts` → Updated to remove Supabase dependency

**Admin Actions (6 files)**
5. [x] `src/app/actions/admin-settings.ts`
6. [x] `src/app/actions/admin-offices-management.ts`
7. [x] `src/app/actions/admin-codes.ts`
8. [x] `src/app/actions/admin-offices-config.ts`
9. [x] `src/app/actions/admin-budgets.ts`
10. [x] `src/app/actions/admin-users.ts`

**Office Actions (4 files)**
11. [x] `src/app/actions/office.ts`
12. [x] `src/app/actions/office-users.ts`
13. [x] `src/app/actions/forms.ts`
14. [x] `src/app/actions/budget.ts`

**Auth & Other (4 files)**
15. [x] `src/app/actions/auth.ts`
16. [x] `src/lib/budget/fetcher.ts`
17. [x] `src/app/auth/callback/route.ts`

## Migration Pattern

**Supabase Pattern:**
```typescript
const supabase = createOfficeClient()
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('field', value)
```

**Prisma Pattern:**
```typescript
const data = await prisma.tableName.findMany({
  where: { field: value }
})
```

## Quick Reference

| Supabase | Prisma |
|----------|--------|
| `.from('table')` | `prisma.table` |
| `.select('*')` | Default (includes all fields) |
| `.select('field1, field2')` | `select: { field1: true, field2: true }` |
| `.eq('field', value)` | `where: { field: value }` |
| `.insert({ data })` | `prisma.table.create({ data })` |
| `.update({ data })` | `prisma.table.update({ where, data })` |
| `.delete()` | `prisma.table.delete({ where })` |
| `.single()` | `.findFirst()` or `.findUnique()` |
| `.maybeSingle()` | `.findFirst()` (handle null in code) |
| `.order('field', { ascending: true })` | `orderBy: { field: 'asc' }` |
| `.gte('field', value)` | `where: { field: { gte: value } }` |
| `.in('field', array)` | `where: { field: { in: array } }` |
