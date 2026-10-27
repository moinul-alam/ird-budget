import { BudgetCategoryItem, ExpenseCodeFullItem, FormulaTypeItem } from '@/lib/actions/admin-codes'
import { DepartmentItem, MinistryItem, OfficeLevelItem } from '@/lib/actions/admin-offices-config'

export interface OfficeTypeItem {
  id: string
  name: string
  department_name: string
  department_id: string
}

/** Which kind of organisation the code grants are being scoped to. */
export type CodeScopeType = 'office_type' | 'ministry' | 'department'

export interface AdminCodesClientProps {
  officeTypes: OfficeTypeItem[]
  departments: DepartmentItem[]
  ministries: MinistryItem[]
  officeLevels: OfficeLevelItem[]
  initialCodes: ExpenseCodeFullItem[]
  initialCategories: BudgetCategoryItem[]
  /** The engine formulas a code may be bound to (ref_formula_types). */
  formulaTypes: FormulaTypeItem[]
  initialOfficeTypeId: string
  initialDepartmentId?: string
  initialOfficeLevelId?: string
}

export interface CategoryModalState {
  open: boolean
  id?: string
  code: string
  title: string
  hierarchy_order: number
}

export interface CodeModalState {
  open: boolean
  id?: number
  code: string
  name: string
  parent_code: string
  parent_title: string
  hierarchy_order: number
  /** The engine formula this code dispatches to; null keeps it a manual entry. */
  formula_key?: string | null
  /** The form numbers whose data produced this code's amount. */
  source_forms?: number[]
}

export interface ConfirmToggleAllModalState {
  open: boolean
  enableAll: boolean
  title: string
  description: string
}
