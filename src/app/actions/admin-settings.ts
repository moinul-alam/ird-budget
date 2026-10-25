'use server'

import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth-admin'
import { revalidatePath, updateTag } from 'next/cache'
import { ADMIN_DATA_TAG } from '@/lib/budget/fetcher'

const SETTINGS_PATH = '/admin/settings'

// ----------------------------------------------------
// Salary & allowance configuration (admin_salary_config + admin_salary_slabs)
// ----------------------------------------------------
// Every tile of the "বেতন-ভাতা ও অন্যান্য" tab is a row of admin_salary_config,
// so the tab renders whatever the table holds and nothing is hardcoded.
// `input_type` picks the editor the tile opens:
//   number -> a single value
//   grade  -> a value plus the grade band it applies to
//   slab   -> a grade-banded table held in admin_salary_slabs

export type SalaryInputType = 'number' | 'grade' | 'slab'
export type SalaryValueFormat = 'number' | 'amount' | 'percent'

export interface SalaryTileItem {
  id: number
  key: string
  label_bn: string
  description_bn: string | null
  unit_bn: string
  input_type: SalaryInputType
  value_format: SalaryValueFormat
  value: number
  from_grade: number | null
  to_grade: number | null
  /**
   * Set when the card holds a rate × quantity pair (e.g. ডাক = cost per notice ×
   * notices). It names the second field; a card without it renders one input.
   */
  secondary_label_bn: string | null
  secondary_unit_bn: string
  secondary_value: number
  sort_order: number
}

export interface SalarySlabItem {
  id: number
  config_key: string
  from_grade: number
  to_grade: number
  value: number
  sort_order: number
}

export interface SalaryConfig {
  tiles: SalaryTileItem[]
  slabs: SalarySlabItem[]
}

export async function getSalaryConfig(): Promise<SalaryConfig> {
  const [tiles, slabs] = await Promise.all([
    prisma.adminSalaryConfig.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.adminSalarySlab.findMany({
      orderBy: [{ configKey: 'asc' }, { sortOrder: 'asc' }],
    }),
  ])

  return {
    tiles: tiles.map((t) => ({
      id: Number(t.id),
      key: t.key,
      label_bn: t.labelBn,
      description_bn: t.descriptionBn,
      unit_bn: t.unitBn,
      input_type: t.inputType as SalaryInputType,
      value_format: t.valueFormat as SalaryValueFormat,
      value: Number(t.value),
      from_grade: t.fromGrade,
      to_grade: t.toGrade,
      secondary_label_bn: t.secondaryLabelBn,
      secondary_unit_bn: t.secondaryUnitBn,
      secondary_value: Number(t.secondaryValue),
      sort_order: t.sortOrder,
    })),
    slabs: slabs.map((s) => ({
      id: Number(s.id),
      config_key: s.configKey,
      from_grade: s.fromGrade,
      to_grade: s.toGrade,
      value: Number(s.value),
      sort_order: s.sortOrder,
    })),
  }
}

export async function saveSalaryTile(input: {
  id: number
  value: number
  /** The second field of a rate × quantity card (e.g. ডাকের সংখ্যা). */
  secondary_value?: number
  from_grade?: number | null
  to_grade?: number | null
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.adminSalaryConfig.update({
      where: { id: BigInt(input.id) },
      data: {
        value: input.value,
        ...(input.secondary_value !== undefined
          ? { secondaryValue: input.secondary_value }
          : {}),
        ...(input.from_grade !== undefined ? { fromGrade: input.from_grade } : {}),
        ...(input.to_grade !== undefined ? { toGrade: input.to_grade } : {}),
      },
    })

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
    return { success: true }
  } catch (error: any) {
    return { error: 'সংরক্ষণ ব্যর্থ হয়েছে: ' + error.message }
  }
}

export async function saveSalarySlabs(input: {
  config_key: string
  slabs: Array<{ from_grade: number; to_grade: number; value: number }>
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  try {
    await prisma.$transaction([
      prisma.adminSalarySlab.deleteMany({ where: { configKey: input.config_key } }),
      prisma.adminSalarySlab.createMany({
        data: input.slabs.map((s, i) => ({
          configKey: input.config_key,
          fromGrade: s.from_grade,
          toGrade: s.to_grade,
          value: s.value,
          sortOrder: i + 1,
        })),
      }),
    ])

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
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

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
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

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// ----------------------------------------------------
// Fuel Types (ref_fuel_types) — the price lives on the row
// ----------------------------------------------------

/**
 * A fuel category (তেল / গ্যাস) from `ref_fuel_categories`. Each one is charged to a
 * different economic code — `oil` → 3243301 পেট্রোল, অয়েল ও লুব্রিকেন্ট, `gas` → 3243302
 * গ্যাস ও জ্বালানী. Seeded rather than editable, so the engine can rely on `name`.
 */
export interface FuelCategoryItem {
  id: number
  name: string
  name_bn: string
}

export async function getFuelCategories(): Promise<FuelCategoryItem[]> {
  const categories = await prisma.refFuelCategory.findMany({ orderBy: { id: 'asc' } })

  return categories.map((c) => ({
    id: Number(c.id),
    name: c.categoryName,
    name_bn: c.categoryNameBn,
  }))
}

export interface FuelTypeItem {
  id: number
  name: string
  unit_price: number
  category_id: number
  /** The Bengali label of the fuel's category, for the table on /admin/settings. */
  category_name_bn: string
}

export async function getFuelTypes(): Promise<FuelTypeItem[]> {
  const types = await prisma.refFuelType.findMany({
    orderBy: { id: 'asc' },
    include: { category: { select: { categoryNameBn: true } } },
  })

  return types.map((t) => ({
    id: Number(t.id),
    name: t.name,
    unit_price: Number(t.unitPrice),
    category_id: Number(t.categoryId),
    category_name_bn: t.category.categoryNameBn,
  }))
}

export async function saveFuelType(data: {
  id?: number
  name: string
  unit_price: number
  category_id: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cleanName = data.name.trim()

  try {
    if (data.id) {
      await prisma.refFuelType.update({
        where: { id: BigInt(data.id) },
        data: {
          name: cleanName,
          unitPrice: data.unit_price,
          categoryId: BigInt(data.category_id),
        },
      })
    } else {
      await prisma.refFuelType.create({
        data: {
          name: cleanName,
          unitPrice: data.unit_price,
          categoryId: BigInt(data.category_id),
        },
      })
    }

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
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

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// ----------------------------------------------------
// Vehicle Config (admin_vehicle_config)
// ----------------------------------------------------
// A NULL office type means the row is a global default that every office type
// inherits; the settings page only ever writes global rows.
//
// A row is one vehicle type on one fuel *category*, not on one fuel: the category is
// what sends the fuel cost to 3243301 (তেল) or 3243302 (গ্যাস), and the office's own
// fuel declaration on form 7 supplies the per-litre price.
//
// The settings page presents a vehicle type as *one* configuration covering every fuel
// category: lubricant and maintenance are read from and written to
// admin_vehicle_allowance_config (one row per vehicle type), while only the monthly litre
// quota varies by category on the rows below.

export interface VehicleFuelQuotaItem {
  fuel_category_id: number
  /** The Bengali label of the fuel category (তেল / গ্যাস). */
  fuel_category_name_bn: string
  monthly_fuel_quota_liter: number
}

/** A vehicle type as the settings page shows it: one row, its fuel quotas inside. */
export interface VehicleConfigItem {
  vehicle_type_id: number
  vehicle_type_name: string
  /** এক ধরনের যানবাহনের জন্য একটিই — জ্বালানি (তেল / গ্যাস) ভেদে আলাদা নয়। */
  annual_lube_allowance: number
  annual_maintenance_allowance: number
  fuel_quotas: VehicleFuelQuotaItem[]
}

export async function getVehicleConfigs(): Promise<VehicleConfigItem[]> {
  const configs = await prisma.adminVehicleConfig.findMany({
    include: {
      vehicleType: { include: { allowanceConfig: true } },
      fuelCategory: { select: { id: true, categoryNameBn: true } },
    },
    orderBy: { id: 'asc' },
  })

  const byType = new Map<number, VehicleConfigItem>()
  for (const config of configs) {
    const vehicleTypeId = Number(config.vehicleTypeId)
    let row = byType.get(vehicleTypeId)
    if (!row) {
      row = {
        vehicle_type_id: vehicleTypeId,
        vehicle_type_name: config.vehicleType.name,
        annual_lube_allowance: Number(config.vehicleType.allowanceConfig?.annualLubeAllowance || 0),
        annual_maintenance_allowance: Number(
          config.vehicleType.allowanceConfig?.annualMaintenanceAllowance || 0
        ),
        fuel_quotas: [],
      }
      byType.set(vehicleTypeId, row)
    }
    row.fuel_quotas.push({
      fuel_category_id: Number(config.fuelCategoryId),
      fuel_category_name_bn: config.fuelCategory.categoryNameBn,
      monthly_fuel_quota_liter: Number(config.monthlyFuelQuotaLiter || 0),
    })
  }

  return Array.from(byType.values())
}

/** One fuel category's monthly litre quota inside the vehicle type's single form. */
export interface VehicleFuelQuotaInput {
  fuel_category_id: number
  monthly_fuel_quota_liter: number
}

/**
 * Saves a whole vehicle type at once: its per-type allowances plus one fuel-quota row per
 * category, all in one transaction. Categories the admin left at zero are still written,
 * so every type carries a complete set rather than a partial one.
 */
export async function saveVehicleConfigForType(data: {
  vehicle_type_id: number
  annual_lube_allowance: number
  annual_maintenance_allowance: number
  fuel_quotas: VehicleFuelQuotaInput[]
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }
  if (data.fuel_quotas.length === 0) return { error: 'কোনো জ্বালানির ধরন পাওয়া যায়নি।' }

  const vehicleTypeId = BigInt(data.vehicle_type_id)

  try {
    await prisma.$transaction([
      prisma.adminVehicleAllowanceConfig.upsert({
        where: { vehicleTypeId },
        create: {
          vehicleTypeId,
          annualLubeAllowance: data.annual_lube_allowance,
          annualMaintenanceAllowance: data.annual_maintenance_allowance,
        },
        update: {
          annualLubeAllowance: data.annual_lube_allowance,
          annualMaintenanceAllowance: data.annual_maintenance_allowance,
        },
      }),
      ...data.fuel_quotas.map((quota) => {
        const fuelCategoryId = BigInt(quota.fuel_category_id)
        return prisma.adminVehicleConfig.upsert({
          where: {
            vehicleTypeId_fuelCategoryId: { vehicleTypeId, fuelCategoryId },
          },
          create: {
            officeTypeId: null,
            vehicleTypeId,
            fuelCategoryId,
            monthlyFuelQuotaLiter: quota.monthly_fuel_quota_liter,
          },
          update: {
            monthlyFuelQuotaLiter: quota.monthly_fuel_quota_liter,
          },
        })
      }),
    ])

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

/** Removes the vehicle type's configuration: its allowances and every category quota. */
export async function deleteVehicleConfigForType(vehicleTypeId: number) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const id = BigInt(vehicleTypeId)

  try {
    await prisma.$transaction([
      prisma.adminVehicleConfig.deleteMany({ where: { vehicleTypeId: id } }),
      prisma.adminVehicleAllowanceConfig.deleteMany({ where: { vehicleTypeId: id } }),
    ])

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
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
  office_type_id: number | null
  vehicle_type_id: number
  vehicle_type_name: string
  monthly_rent_rate: number
}

export async function getVehicleRentConfigs(): Promise<VehicleRentConfigItem[]> {
  const configs = await prisma.adminVehicleRentConfig.findMany({
    include: {
      vehicleType: { select: { name: true } },
    },
    orderBy: { id: 'asc' },
  })

  return configs.map((c) => ({
    id: Number(c.id),
    office_type_id: c.officeTypeId === null ? null : Number(c.officeTypeId),
    vehicle_type_id: Number(c.vehicleTypeId),
    vehicle_type_name: c.vehicleType.name,
    monthly_rent_rate: Number(c.monthlyRentRate || 0),
  }))
}

export async function saveVehicleRentConfig(data: {
  id?: number
  vehicle_type_id: number
  monthly_rent_rate: number
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const payload = {
    officeTypeId: null,
    vehicleTypeId: BigInt(data.vehicle_type_id),
    monthlyRentRate: data.monthly_rent_rate,
  }

  try {
    if (data.id) {
      await prisma.adminVehicleRentConfig.update({
        where: { id: BigInt(data.id) },
        data: payload,
      })
    } else {
      await prisma.adminVehicleRentConfig.create({ data: payload })
    }

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
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

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

// ----------------------------------------------------
// Utility Types (ref_utility_types)
// ----------------------------------------------------
// A utility is not identified by its Bengali name — the engine sends a bill to
// whichever economic code (`ref_utility_types.economic_code_id`) the administrator
// binds the utility to. So বিদ্যুৎ may feed 3211113 and পানি 3211115 without the
// engine ever matching on a name.

/** One economic code, offered to any settings form that must bind a row to a code. */
export interface EconomicCodeOption {
  id: number
  code: string
  name: string
}

export async function getEconomicCodeOptions(): Promise<EconomicCodeOption[]> {
  const codes = await prisma.refEconomicCode.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, code: true, name: true },
  })

  return codes.map((c) => ({
    id: Number(c.id),
    code: c.code,
    name: c.name,
  }))
}

export interface UtilityTypeItem {
  id: number
  name: string
  /** The economic code this utility's bill lands in; null leaves it unbound. */
  economic_code_id: number | null
  /** The code itself, so the table can show it without another lookup. */
  economic_code: string | null
}

export async function getUtilityTypes(): Promise<UtilityTypeItem[]> {
  const types = await prisma.refUtilityType.findMany({
    orderBy: { id: 'asc' },
    include: { economicCode: { select: { code: true } } },
  })

  return types.map((t) => ({
    id: Number(t.id),
    name: t.name,
    economic_code_id: t.economicCodeId === null ? null : Number(t.economicCodeId),
    economic_code: t.economicCode?.code ?? null,
  }))
}

export async function saveUtilityType(data: {
  id?: number
  name: string
  economic_code_id: number | null
}) {
  const session = await getAdminSession()
  if (!session) return { error: 'অননুমোদিত প্রবেশাধিকার' }

  const cleanName = data.name.trim()
  const economicCodeId = data.economic_code_id === null ? null : BigInt(data.economic_code_id)

  try {
    if (data.id) {
      await prisma.refUtilityType.update({
        where: { id: BigInt(data.id) },
        data: { name: cleanName, economicCodeId },
      })
    } else {
      await prisma.refUtilityType.create({
        data: { name: cleanName, economicCodeId },
      })
    }

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
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

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
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
  unit_price: number
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
    unit_price: Number(t.unitPrice),
    has_toner: t.hasToner,
    is_lumpsum: t.isLumpsum,
  }))
}

export async function saveItEquipmentType(data: {
  id?: number
  name: string
  unit_price: number
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
          unitPrice: data.unit_price,
          hasToner: data.has_toner,
          isLumpsum: data.is_lumpsum,
        },
      })
    } else {
      await prisma.refItEquipmentType.create({
        data: {
          name: cleanName,
          unitPrice: data.unit_price,
          hasToner: data.has_toner,
          isLumpsum: data.is_lumpsum,
        },
      })
    }

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
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

    revalidatePath(SETTINGS_PATH)
    updateTag(ADMIN_DATA_TAG)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
