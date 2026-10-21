import {
  MinistryItem,
  DepartmentItem,
  OfficeTypeHierarchyItem,
  OfficeLevelItem,
  GroupBudgetSettingItem,
} from '@/app/actions/admin-offices-config'

export interface AdminOfficesConfigClientProps {
  initialMinistries: MinistryItem[]
  initialDepartments: DepartmentItem[]
  initialOfficeTypes: OfficeTypeHierarchyItem[]
  initialOfficeLevels: OfficeLevelItem[]
  initialGroupSettings: GroupBudgetSettingItem[]
}

export type ConfigTabType = 'ministries' | 'departments' | 'office_types' | 'hierarchy' | 'groups'

export interface MinistryModalState {
  open: boolean
  id?: string
  name: string
}

export interface DepartmentModalState {
  open: boolean
  id?: number
  name: string
  ministry_id: string
}

export interface OfficeTypeModalState {
  open: boolean
  id?: number
  name: string
  department_id: number
}

export interface HierarchyModalState {
  open: boolean
  id?: string
  office_type_id: number
  level_name: string
  level_order: number
}

export interface GroupModalState {
  open: boolean
  id?: string
  department_id: number
  office_type_id: number
  office_level_id?: string
  is_group_budget: boolean
}

export interface ConfirmModalState {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
}
