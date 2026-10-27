import {
  BudgetTypeItem,
  FiscalYearItem,
  CycleItem,
  CycleStatus,
} from '@/app/actions/admin-budgets'

export interface AdminBudgetsClientProps {
  initialBudgetTypes: BudgetTypeItem[]
  initialFiscalYears: FiscalYearItem[]
  initialCycles: CycleItem[]
}

export const BUDGET_TABS = ['budget_types', 'fiscal_years', 'cycles'] as const

export type BudgetTabType = (typeof BUDGET_TABS)[number]

export const isBudgetTab = (value: string | null): value is BudgetTabType =>
  value !== null && (BUDGET_TABS as readonly string[]).includes(value)

/** Bengali-only status copy, shared by the status control, the toast and the modal. */
export const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  open: 'উন্মুক্ত',
  closed: 'বন্ধ',
  archived: 'আর্কাইভড',
}

export interface BudgetTypeModalState {
  open: boolean
  id?: string
  name: string
}

export interface FiscalYearModalState {
  open: boolean
  id?: string
  year: string
}

export interface CycleModalState {
  open: boolean
  id?: number
  fiscal_year: string
  budget_type_name: string
  /** বেতন-মাস — 1–12; the number of months this cycle's budget annualises by. */
  salary_months: number
  status: CycleStatus
}

export interface ConfirmBudgetModalState {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
}
