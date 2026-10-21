import { FieldOfficeItem, HeadOfficeItem } from '@/app/actions/admin-offices-management'
import { MinistryItem, DepartmentItem, OfficeTypeHierarchyItem } from '@/app/actions/admin-offices-config'

export interface FieldOfficesClientProps {
  initialFieldOffices: FieldOfficeItem[]
  headOffices: HeadOfficeItem[]
  ministries: MinistryItem[]
  departments: DepartmentItem[]
  officeTypes: OfficeTypeHierarchyItem[]
}

export interface FieldOfficeModalState {
  open: boolean
  id?: number
  name: string
  budget_id: string
  ministry_id: string
  department_id: number
  head_office_id: number
  office_type_id: number
}

export interface ConfirmModalState {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
}
