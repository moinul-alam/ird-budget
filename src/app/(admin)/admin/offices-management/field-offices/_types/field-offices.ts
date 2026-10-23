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
  id?: string
  name: string
  budget_id: string
  ministry_id: string
  department_id?: string
  head_office_id: string
  office_type_id: string
  office_level_id: string
}

export interface ConfirmModalState {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
}
