import {
  MinistryItem,
  DepartmentItem,
  OfficeTypeHierarchyItem,
  OfficeLevelItem,
  LevelOwnerType,
} from '@/app/actions/admin-offices-config'

export interface AdminOfficesConfigClientProps {
  initialMinistries: MinistryItem[]
  initialDepartments: DepartmentItem[]
  initialOfficeTypes: OfficeTypeHierarchyItem[]
  initialOfficeLevels: OfficeLevelItem[]
}

export type ConfigTabType = 'ministries' | 'departments' | 'office_types' | 'hierarchy'

export interface MinistryModalState {
  open: boolean
  id?: string
  name: string
  budget_id?: string
}

export interface DepartmentModalState {
  open: boolean
  id?: string
  name: string
  ministry_id: string
  budget_id?: string
}

export interface OfficeTypeModalState {
  open: boolean
  id?: string
  name: string
  department_id: string
  /** কর সার্কেল হলে true — ফর্ম ১২-এর ডাক খরচ শুধু এই ধরনের অফিসে হিসাব হয়। */
  is_tax_circle: boolean
}

export interface HierarchyModalState {
  open: boolean
  id?: string
  owner_type: LevelOwnerType
  owner_id: string
  level_name: string
  level_order: number
}

export interface GroupModalState {
  open: boolean
  id?: string
  department_id: string
  office_type_id: string
  office_level_id?: string
  is_group_budget: boolean
}

export interface ConfirmModalState {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
}
