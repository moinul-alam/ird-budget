import {
  SalaryTileItem,
  SalarySlabItem,
  SalaryValueFormat,
  VehicleTypeItem,
  FuelTypeItem,
  FuelCategoryItem,
  VehicleConfigItem,
  VehicleRentConfigItem,
  UtilityTypeItem,
  ItEquipmentTypeItem,
  EconomicCodeOption,
} from '@/app/actions/admin-settings'

export interface AdminSettingsClientProps {
  initialSalaryConfig: SalaryTileItem[]
  initialSalarySlabs: SalarySlabItem[]
  initialVehicleTypes: VehicleTypeItem[]
  initialFuelTypes: FuelTypeItem[]
  fuelCategories: FuelCategoryItem[]
  initialFuelConfigs: VehicleConfigItem[]
  initialRentConfigs: VehicleRentConfigItem[]
  initialUtilityTypes: UtilityTypeItem[]
  initialItItems: ItEquipmentTypeItem[]
  /** Every active economic code, for forms that must bind a row to one. */
  economicCodeOptions: EconomicCodeOption[]
  grades: number[]
}

export type SettingsTabKey =
  | 'salaries'
  | 'vehicles'
  | 'fuels'
  | 'vehicleFuel'
  | 'vehicleRent'
  | 'equipment'
  | 'utility'

export const SETTINGS_TAB_KEYS: SettingsTabKey[] = [
  'salaries',
  'vehicles',
  'fuels',
  'vehicleFuel',
  'vehicleRent',
  'equipment',
  'utility',
]

/** Editor for tiles whose `input_type` is 'number'. */
export interface SalaryNumberModalState {
  open: boolean
  tileId: number | null
  title: string
  unit: string
  value: number
  /**
   * Rate × quantity cards (e.g. ডাক) carry a second field. Null for an ordinary
   * single-value card, which keeps the editor as it was.
   */
  secondaryLabel: string | null
  secondaryUnit: string
  secondaryValue: number
}

/** Editor for tiles whose `input_type` is 'grade'. */
export interface SalaryGradeModalState {
  open: boolean
  tileId: number | null
  title: string
  value: number
  fromGrade: number
  toGrade: number
}

/** Editor for tiles whose `input_type` is 'slab' (admin_salary_slabs). */
export interface SalarySlabModalState {
  open: boolean
  configKey: string | null
  title: string
  valueFormat: SalaryValueFormat
  slabs: Array<{ from_grade: number; to_grade: number; value: number }>
}

export interface VehicleTypeModalState {
  open: boolean
  id?: number
  name: string
}

export interface FuelTypeModalState {
  open: boolean
  id?: number
  name: string
  unit_price: number
  /** `ref_fuel_categories` এর আইডি — তেল (3243301) নাকি গ্যাস (3243302) কোডে ব্যয়টি যাবে। */
  category_id: number
}

/** One fuel category's monthly litre quota inside the vehicle type's single form. */
export interface VehicleFuelConfigSectionState {
  /** `ref_fuel_categories` এর আইডি — তেল (3243301) নাকি গ্যাস (3243302) কোডে ব্যয়টি যাবে। */
  categoryId: number
  monthlyFuel: number
}

/**
 * A vehicle type is configured as a whole: one lubricant and one maintenance allowance for
 * the type, plus a litre quota per fuel category — so the admin fills it once instead of
 * once per category.
 */
export interface VehicleFuelConfigModalState {
  open: boolean
  /** Editing targets the vehicle type, not a single category row. */
  vehicleTypeId: string
  /** এক ধরনের যানবাহনের জন্য একটিই — জ্বালানি (তেল / গ্যাস) ভেদে আলাদা নয়। */
  annualLube: number
  annualMaint: number
  sections: VehicleFuelConfigSectionState[]
}

export interface VehicleRentConfigModalState {
  open: boolean
  id?: number
  carTypeId: string
  monthlyRent: number
}

export interface EquipmentModalState {
  open: boolean
  itemId: number | null
  title: string
  name: string
  unit_price: number
  /** `has_toner` — a toner-fed device (printer, photocopier) consumes the toner line. */
  has_toner: boolean
}

export interface UtilityModalState {
  open: boolean
  id?: number
  name: string
  /** The economic code this utility's bill lands in; null leaves it unbound. */
  economic_code_id: number | null
}
