import {
  MinistryItem,
  DepartmentItem,
  OfficeTypeHierarchyItem,
  OfficeLevelItem,
} from '@/lib/actions/admin-offices-config'

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
}

export interface HierarchyModalState {
  open: boolean
  id?: string
  /** মন্ত্রণালয় → দপ্তর/সংস্থা → অফিসের ধরণ: the chain that leads to the level's owner. The
   *  created level always belongs to the selected office type (the hierarchy tab only declares
   *  field-office levels; ministry/department levels are provisioned by their own tabs). */
  ministry_id: string
  department_id: string
  office_type_id: string
  level_name: string
  level_order: number
}

export interface GroupModalState {
  open: boolean
  id?: string
  office_type_id: string
  office_level_id?: string
  is_group_budget: boolean
}

export interface ConfirmModalState {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  /** When true the action is not allowed (e.g. the office holds budget data): the dialog only
   *  explains why and offers a dismiss button instead of a confirm button. */
  blocked?: boolean
}
