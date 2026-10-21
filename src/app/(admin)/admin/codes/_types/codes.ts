import { BudgetCategoryItem, ExpenseCodeFullItem } from '@/app/actions/admin-codes'
import { DepartmentItem, OfficeLevelItem } from '@/app/actions/admin-offices-config'

export interface OfficeTypeItem {
  id: number
  name: string
  department_name: string
  department_id: number
}

export interface AdminCodesClientProps {
  officeTypes: OfficeTypeItem[]
  departments: DepartmentItem[]
  officeLevels: OfficeLevelItem[]
  initialCodes: ExpenseCodeFullItem[]
  initialCategories: BudgetCategoryItem[]
  initialOfficeTypeId: number
  initialDepartmentId?: number
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
}

export interface ConfirmToggleAllModalState {
  open: boolean
  enableAll: boolean
  title: string
  description: string
}
