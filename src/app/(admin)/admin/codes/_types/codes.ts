import { BudgetCategoryItem, ExpenseCodeFullItem } from '@/app/actions/admin-codes'

export interface OfficeTypeItem {
  id: number
  name: string
  department_name: string
  department_id: number
}

export interface AdminCodesClientProps {
  officeTypes: OfficeTypeItem[]
  initialCodes: ExpenseCodeFullItem[]
  initialCategories: BudgetCategoryItem[]
  initialOfficeTypeId: number
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
}
