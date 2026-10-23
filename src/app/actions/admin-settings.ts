'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath } from 'next/cache'

export interface SalaryCodeConfig {
  salary_months: number
  duty_allowance: number
  education_allowance: number
  medical_allowance: number
  noboborsho_percent: number
  festival_bonus_multiplier: number
  office_rent_vat_percent: number
}

const DEFAULT_SALARY_CONFIG: SalaryCodeConfig = {
  salary_months: 12,
  duty_allowance: 1500,
  education_allowance: 500,
  medical_allowance: 1500,
  noboborsho_percent: 20,
  festival_bonus_multiplier: 2,
  office_rent_vat_percent: 15,
}

// ----------------------------------------------------
// Salary Config Persistence (stored in admin_rates)
// ----------------------------------------------------

export async function getSalaryCodeConfig(): Promise<SalaryCodeConfig> {
  const config = await prisma.adminRate.findUnique({
    where: { key: 'salary_config' },
  })

  if (!config) {
    return DEFAULT_SALARY_CONFIG
  }

  try {
    const parsed = JSON.parse(config.name || '{}')
    return { ...DEFAULT_SALARY_CONFIG, ...parsed }
  } catch {
    return DEFAULT_SALARY_CONFIG
  }
}

export async function saveSalaryCodeConfig(config: Partial<SalaryCodeConfig>) {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'অননুমোদিত প্রবেশাধিকার' }
  }

  const currentConfig = await getSalaryCodeConfig()
  const merged = { ...currentConfig, ...config }
  const configJson = JSON.stringify(merged)

  try {
    await prisma.adminRate.upsert({
      where: { key: 'salary_config' },
      update: {
        name: configJson,
        value: 0,
        unit: 'json',
      },
      create: {
        key: 'salary_config',
        name: configJson,
        value: 0,
        unit: 'json',
      },
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: 'সংরক্ষণ ব্যর্থ হয়েছে: ' + error.message }
  }
}

// ----------------------------------------------------
// Vehicle Types (ref_vehicle_types)
// ----------------------------------------------------

export interface VehicleTypeItem {
  id: number
  name: string
}

export async function getVehicleTypes(): Promise<VehicleTypeItem[]> {
  const types = await prisma.refVehicleType.findMany({
    orderBy: { id: 'asc' },
  })

  return types.map((t) => ({
    id: Number(t.id),
    name: t.name,
  }))
}

export async function saveVehicleType(data: { id?: number; name: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cleanName = data.name.trim()

  try {
    if (data.id) {
      await prisma.refVehicleType.update({
        where: { id: BigInt(data.id) },
        data: { name: cleanName },
      })
    } else {
      await prisma.refVehicleType.create({
        data: { name: cleanName },
      })
    }

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteVehicleType(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.refVehicleType.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// ----------------------------------------------------
// Fuel Types (ref_fuel_types)
// ----------------------------------------------------

export interface FuelTypeItem {
  id: number
  name: string
  price?: number
}

export async function getFuelTypes(): Promise<FuelTypeItem[]> {
  const types = await prisma.refFuelType.findMany({
    orderBy: { id: 'asc' },
  })

  return types.map((t) => ({
    id: Number(t.id),
    name: t.name,
    price: 0, // Price would be fetched from rates table in a full implementation
  }))
}

export async function saveFuelType(data: { id?: number; name: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cleanName = data.name.trim()

  try {
    if (data.id) {
      await prisma.refFuelType.update({
        where: { id: BigInt(data.id) },
        data: { name: cleanName },
      })
    } else {
      await prisma.refFuelType.create({
        data: { name: cleanName },
      })
    }

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFuelType(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.refFuelType.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// ----------------------------------------------------
// Vehicle Config (admin_vehicle_config)
// ----------------------------------------------------

export interface VehicleConfigItem {
  id: number
  office_type_id: number
  vehicle_type_id: number
  fuel_type_id: number
  monthly_fuel_quota_liter: number
  annual_lube_allowance: number
  annual_maintenance_allowance: number
}

export async function getVehicleConfigs(): Promise<VehicleConfigItem[]> {
  const configs = await prisma.adminVehicleConfig.findMany({
    include: {
      officeType: {
        select: { name: true },
      },
      vehicleType: {
        select: { name: true },
      },
      fuelType: {
        select: { name: true },
      },
    },
    orderBy: { id: 'asc' },
  })

  return configs.map((c) => ({
    id: Number(c.id),
    office_type_id: Number(c.officeTypeId),
    vehicle_type_id: Number(c.vehicleTypeId),
    fuel_type_id: Number(c.fuelTypeId),
    monthly_fuel_quota_liter: Number(c.monthlyFuelQuotaLiter || 0),
    annual_lube_allowance: Number(c.annualLubeAllowance || 0),
    annual_maintenance_allowance: Number(c.annualMaintenanceAllowance || 0),
  }))
}

export async function saveVehicleConfig(data: {
  id?: number
  office_type_id: number
  vehicle_type_id: number
  fuel_type_id: number
  monthly_fuel_quota_liter: number
  annual_lube_allowance: number
  annual_maintenance_allowance: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    if (data.id) {
      await prisma.adminVehicleConfig.update({
        where: { id: BigInt(data.id) },
        data: {
          officeTypeId: BigInt(data.office_type_id),
          vehicleTypeId: BigInt(data.vehicle_type_id),
          fuelTypeId: BigInt(data.fuel_type_id),
          monthlyFuelQuotaLiter: data.monthly_fuel_quota_liter,
          annualLubeAllowance: data.annual_lube_allowance,
          annualMaintenanceAllowance: data.annual_maintenance_allowance,
        },
      })
    } else {
      await prisma.adminVehicleConfig.create({
        data: {
          officeTypeId: BigInt(data.office_type_id),
          vehicleTypeId: BigInt(data.vehicle_type_id),
          fuelTypeId: BigInt(data.fuel_type_id),
          monthlyFuelQuotaLiter: data.monthly_fuel_quota_liter,
          annualLubeAllowance: data.annual_lube_allowance,
          annualMaintenanceAllowance: data.annual_maintenance_allowance,
        },
      })
    }

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteVehicleConfig(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.adminVehicleConfig.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// ----------------------------------------------------
// Vehicle Rent Config (admin_vehicle_rent_config)
// ----------------------------------------------------

export interface VehicleRentConfigItem {
  id: number
  office_type_id: number
  vehicle_type_id: number
  monthly_rent_rate: number
}

export async function getVehicleRentConfigs(): Promise<VehicleRentConfigItem[]> {
  const configs = await prisma.adminVehicleRentConfig.findMany({
    include: {
      officeType: {
        select: { name: true },
      },
      vehicleType: {
        select: { name: true },
      },
    },
    orderBy: { id: 'asc' },
  })

  return configs.map((c) => ({
    id: Number(c.id),
    office_type_id: Number(c.officeTypeId),
    vehicle_type_id: Number(c.vehicleTypeId),
    monthly_rent_rate: Number(c.monthlyRentRate || 0),
  }))
}

export async function saveVehicleRentConfig(data: {
  id?: number
  office_type_id: number
  vehicle_type_id: number
  monthly_rent_rate: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    if (data.id) {
      await prisma.adminVehicleRentConfig.update({
        where: { id: BigInt(data.id) },
        data: {
          officeTypeId: BigInt(data.office_type_id),
          vehicleTypeId: BigInt(data.vehicle_type_id),
          monthlyRentRate: data.monthly_rent_rate,
        },
      })
    } else {
      await prisma.adminVehicleRentConfig.create({
        data: {
          officeTypeId: BigInt(data.office_type_id),
          vehicleTypeId: BigInt(data.vehicle_type_id),
          monthlyRentRate: data.monthly_rent_rate,
        },
      })
    }

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteVehicleRentConfig(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.adminVehicleRentConfig.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// ----------------------------------------------------
// Utility Types (ref_utility_types)
// ----------------------------------------------------

export interface UtilityTypeItem {
  id: number
  name: string
}

export async function getUtilityTypes(): Promise<UtilityTypeItem[]> {
  const types = await prisma.refUtilityType.findMany({
    orderBy: { id: 'asc' },
  })

  return types.map((t) => ({
    id: Number(t.id),
    name: t.name,
  }))
}

export async function saveUtilityType(data: { id?: number; name: string }) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cleanName = data.name.trim()

  try {
    if (data.id) {
      await prisma.refUtilityType.update({
        where: { id: BigInt(data.id) },
        data: { name: cleanName },
      })
    } else {
      await prisma.refUtilityType.create({
        data: { name: cleanName },
      })
    }

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteUtilityType(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.refUtilityType.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// ----------------------------------------------------
// IT Equipment Types (ref_it_equipment_types)
// ----------------------------------------------------

export interface ItEquipmentTypeItem {
  id: number
  name: string
  has_toner: boolean
  is_lumpsum: boolean
}

export async function getItEquipmentTypes(): Promise<ItEquipmentTypeItem[]> {
  const types = await prisma.refItEquipmentType.findMany({
    orderBy: { id: 'asc' },
  })

  return types.map((t) => ({
    id: Number(t.id),
    name: t.name,
    has_toner: t.hasToner,
    is_lumpsum: t.isLumpsum,
  }))
}

export async function saveItEquipmentType(data: {
  id?: number
  name: string
  has_toner: boolean
  is_lumpsum: boolean
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cleanName = data.name.trim()

  try {
    if (data.id) {
      await prisma.refItEquipmentType.update({
        where: { id: BigInt(data.id) },
        data: {
          name: cleanName,
          hasToner: data.has_toner,
          isLumpsum: data.is_lumpsum,
        },
      })
    } else {
      await prisma.refItEquipmentType.create({
        data: {
          name: cleanName,
          hasToner: data.has_toner,
          isLumpsum: data.is_lumpsum,
        },
      })
    }

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteItEquipmentType(id: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.refItEquipmentType.delete({
      where: { id: BigInt(id) },
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
