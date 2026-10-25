import {
  BudgetTypeItem,
  FiscalYearItem,
  CycleItem,
} from '@/app/actions/admin-budgets'

export interface AdminBudgetsClientProps {
  initialBudgetTypes: BudgetTypeItem[]
  initialFiscalYears: FiscalYearItem[]
  initialCycles: CycleItem[]
}

export type BudgetTabType = 'budget_types' | 'fiscal_years' | 'cycles'

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
  status: 'open' | 'closed'
}

export interface ConfirmBudgetModalState {
  open: boolean
  title: string
  description: string
  isArchive: boolean
  onConfirm: () => void
}
