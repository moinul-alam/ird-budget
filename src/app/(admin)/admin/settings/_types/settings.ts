import {
  SalaryCodeConfig,
  VehicleTypeItem,
  FuelTypeItem,
  VehicleFuelConfigItem,
  VehicleRentConfigItem,
  UtilityTypeItem,
} from '@/app/actions/admin-settings'

export interface AdminSettingsClientProps {
  initialSalaryConfig: SalaryCodeConfig
  initialVehicleTypes: VehicleTypeItem[]
  initialFuelTypes: FuelTypeItem[]
  initialFuelConfigs: VehicleFuelConfigItem[]
  initialRentConfigs: VehicleRentConfigItem[]
  initialUtilityTypes: UtilityTypeItem[]
}

export type SettingsTabKey = 'salaries' | 'vehicles' | 'fuels' | 'vehicleFuel' | 'vehicleRent' | 'equipment' | 'utility'

export interface NumberModalState {
  open: boolean
  field: keyof SalaryCodeConfig | null
  title: string
  unit: string
  value: number
}

export interface GradeModalState {
  open: boolean
  field:
    | 'transport_allowance'
    | 'telephone_allowance'
    | 'tiffin_allowance'
    | 'wash_allowance'
    | 'entertainment_allowance'
    | 'special_benefit_allowance'
    | null
  title: string
  rate: number
  fromGrade: number
  toGrade: number
}

export interface VehicleTypeModalState {
  open: boolean
  id?: number
  name: string
  order: number
}

export interface FuelTypeModalState {
  open: boolean
  id?: number
  name: string
  price: number
  order: number
}

export interface VehicleFuelConfigModalState {
  open: boolean
  id?: number
  carTypeId: string
  fuelTypeId: string
  monthlyFuel: number
  annualLube: number
  annualMaint: number
}

export interface VehicleRentConfigModalState {
  open: boolean
  id?: number
  carTypeId: string
  monthlyRent: number
}

export interface EquipmentModalState {
  open: boolean
  field: 'computer_price' | 'laptop_price' | 'printer_price' | 'scanner_price' | 'photocopier_price' | null
  title: string
  price: number
}

export interface UtilityModalState {
  open: boolean
  id?: number
  name: string
  order: number
}
