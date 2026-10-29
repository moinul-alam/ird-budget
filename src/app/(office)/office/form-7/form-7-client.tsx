'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaHazar, toBanglaNumber, cleanTypeName } from '@/lib/bangla'
import { AmountField } from '@/components/amount-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { saveFormVehicleRow, deleteFormVehicleRow } from '@/lib/actions/forms/vehicles'
import type { VehicleTypeItem, FuelTypeItem } from '@/lib/actions/admin-settings'
import type {
  FormVehiclesGovtInitial,
  VehicleFuelConfigRow,
} from '@/lib/office/load-form-data'
import { Plus, Trash2, Edit2, Car, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HazarAmount } from '@/components/hazar-amount'
import { useState, useTransition, useMemo } from 'react'

export interface Form7VehicleRow {
  id?: number
  vehicle_fuel_config_id: number
  /** অফিস যে নির্দিষ্ট জ্বালানি নির্বাচন করেছে — দরটি এর থেকেই আসে। */
  fuel_type_id: number
  vehicle_type_name: string
  fuel_type_name: string
  count: number
  maintenance_cost: number
  additional_expense: number
}

export interface Form7ClientProps {
  submissionId: number | null
  initialData: FormVehiclesGovtInitial
  carTypes: VehicleTypeItem[]
  fuelTypes: FuelTypeItem[]
  fuelConfigs: VehicleFuelConfigRow[]
}

/**
 * Colour profile of this form — its own emerald hue, kept distinct from the
 * blue of Form 2. Only these class strings carry the colour; the layout below
 * is the shared master pattern.
 */
const accent = {
  solidButton: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  rowAction: 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50',
  header: 'bg-emerald-50/70 border-emerald-100',
  dot: 'bg-emerald-500',
}

/** The quiet uppercase heading every column shares; only the alignment varies. */
const COL_HEAD = 'px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500'

export function Form7Client({
  submissionId,
  initialData,
  carTypes,
  fuelTypes,
  fuelConfigs,
}: Form7ClientProps) {
  // Map rows from initialData
  const [rows, setRows] = useState<Form7VehicleRow[]>(() => {
    return (initialData || []).map((v) => {
      const cfg = v.vehicle_fuel_config || fuelConfigs.find((c) => c.id === v.vehicle_fuel_config_id)
      const carName = cleanTypeName(cfg?.car_type?.name || '')
      // The fuel is the office's own declaration, not the config's: a config names only
      // the category, so the exact fuel has to be read from the row.
      const fuel = v.fuel_type || fuelTypes.find((f) => f.id === v.fuel_type_id)
      const fuelName = cleanTypeName(fuel?.name || '')
      return {
        id: v.id,
        vehicle_fuel_config_id: v.vehicle_fuel_config_id,
        fuel_type_id: v.fuel_type_id,
        vehicle_type_name: carName,
        fuel_type_name: fuelName,
        count: v.count || 0,
        maintenance_cost: Number(
          v.maintenance_cost ??
            (cfg && 'annual_maintenance_allowance' in cfg ? cfg.annual_maintenance_allowance : 0)
        ),
        additional_expense: Number(v.additional_expense || 0),
      }
    })
  })

  const [, startTransition] = useTransition()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [selectedCarTypeId, setSelectedCarTypeId] = useState<string>('')
  const [selectedFuelTypeId, setSelectedFuelTypeId] = useState<string>('')
  const [countInput, setCountInput] = useState('')
  const [additionalInput, setAdditionalInput] = useState('')

  // Delete Confirmation State
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  // Find matching vehicle_fuel_config for the chosen car and fuel. The config names the
  // fuel category, so the fuel's category is what locates it — ডিজেল and অকটেন both
  // resolve to the same oil config.
  const currentConfig = useMemo(() => {
    if (!selectedCarTypeId || !selectedFuelTypeId) return null
    const carId = parseInt(selectedCarTypeId, 10)
    const fuelCategoryId = fuelTypes.find((f) => f.id === parseInt(selectedFuelTypeId, 10))?.category_id
    if (!fuelCategoryId) return null
    return (
      fuelConfigs.find(
        (c) => c.car_type_id === carId && c.fuel_category_id === fuelCategoryId
      ) || null
    )
  }, [selectedCarTypeId, selectedFuelTypeId, fuelConfigs, fuelTypes])

  // Maintenance cost is auto-filled from config
  const autoMaintenanceCost = useMemo(() => {
    if (!currentConfig) return 0
    return Number(currentConfig.annual_maintenance_allowance || 0)
  }, [currentConfig])

  const openAddModal = () => {
    setEditingIndex(null)
    const defaultCarId = carTypes[0]?.id ? String(carTypes[0].id) : ''
    const defaultFuelId = fuelTypes[0]?.id ? String(fuelTypes[0].id) : ''
    setSelectedCarTypeId(defaultCarId)
    setSelectedFuelTypeId(defaultFuelId)
    setCountInput('')
    setAdditionalInput('')
    setIsModalOpen(true)
  }

  const openEditModal = (row: Form7VehicleRow, index: number) => {
    setEditingIndex(index)
    const cfg = fuelConfigs.find((c) => c.id === row.vehicle_fuel_config_id)
    if (cfg) {
      setSelectedCarTypeId(String(cfg.car_type_id))
    }
    setSelectedFuelTypeId(String(row.fuel_type_id))
    setCountInput(row.count ? String(row.count) : '')
    setAdditionalInput(row.additional_expense ? String(row.additional_expense) : '')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIndex(null)
    setSelectedCarTypeId('')
    setSelectedFuelTypeId('')
    setCountInput('')
    setAdditionalInput('')
  }

  // Everything the modal needs to put a row into the list and persist it, kept in
  // one place so the save buttons cannot diverge. Returns the row, or null when
  // the selection has no allowance config to attach it to.
  const commitModalRow = (): Form7VehicleRow | null => {
    if (!selectedCarTypeId || !selectedFuelTypeId) return null
    const carId = parseInt(selectedCarTypeId, 10)
    const fuelId = parseInt(selectedFuelTypeId, 10)

    // The config carries the litre quota, lube and maintenance for this vehicle on this
    // fuel's category; without one there is no allowance to attach the row to.
    const configId = currentConfig?.id
    if (!configId) return null

    const carObj = carTypes.find((c) => c.id === carId)
    const fuelObj = fuelTypes.find((f) => f.id === fuelId)
    const count = parseInt(countInput, 10) || 0
    const additional = parseFloat(additionalInput) || 0
    const maintenance = autoMaintenanceCost

    const isEdit = editingIndex !== null
    const existingRow = isEdit ? rows[editingIndex] : null

    const newRow: Form7VehicleRow = {
      id: existingRow?.id,
      vehicle_fuel_config_id: configId,
      fuel_type_id: fuelId,
      vehicle_type_name: cleanTypeName(carObj?.name || ''),
      fuel_type_name: cleanTypeName(fuelObj?.name || ''),
      count,
      maintenance_cost: maintenance,
      additional_expense: additional,
    }

    if (isEdit) {
      setRows((prev) => {
        const next = [...prev]
        next[editingIndex] = newRow
        return next
      })
    } else {
      setRows((prev) => [...prev, newRow])
    }

    if (submissionId) {
      startTransition(async () => {
        const res = await saveFormVehicleRow(submissionId, {
          id: existingRow?.id,
          vehicle_fuel_config_id: configId,
          fuel_type_id: fuelId,
          count,
          maintenance_cost: maintenance,
          additional_expense: additional,
        })
        // Stamp the row with the id the database gave it, matched by the config +
        // fuel pair that identifies the row, so the form's Save can update it
        // instead of trying to insert it a second time.
        if ('success' in res && res.success && res.id) {
          const savedId = res.id
          const key = `${newRow.vehicle_fuel_config_id}:${newRow.fuel_type_id}`
          setRows((prev) =>
            prev.map((r) =>
              `${r.vehicle_fuel_config_id}:${r.fuel_type_id}` === key ? { ...r, id: savedId } : r
            )
          )
        }
      })
    }

    return newRow
  }

  const handleSaveModal = () => {
    if (!commitModalRow()) return
    closeModal()
  }

  // Save and stay on the add form, cleared, so several vehicles can be entered in
  // one run without reopening the modal each time.
  const handleSaveAndAddMore = () => {
    if (!commitModalRow()) return
    openAddModal()
  }

  const handleConfirmDelete = async () => {
    if (deleteIndex === null) return
    const rowToDelete = rows[deleteIndex]
    setRows((prev) => prev.filter((_, i) => i !== deleteIndex))
    setDeleteIndex(null)

    if (submissionId && rowToDelete.id) {
      startTransition(async () => {
        await deleteFormVehicleRow(rowToDelete.id!)
      })
    }
  }

  // The per-vehicle annual rate lives on the vehicle type's allowance config,
  // which is what the budget engine multiplies by the vehicle count. Reading the
  // same source here keeps the table from drifting away from the sheet.
  const perVehicleMaintenance = (row: Form7VehicleRow) =>
    Number(
      fuelConfigs.find((c) => c.id === row.vehicle_fuel_config_id)?.annual_maintenance_allowance ??
        row.maintenance_cost ??
        0
    )

  const handleSaveAll = async () => {
    if (!submissionId) return
    for (const row of rows) {
      const res = await saveFormVehicleRow(submissionId, {
        id: row.id,
        vehicle_fuel_config_id: row.vehicle_fuel_config_id,
        fuel_type_id: row.fuel_type_id,
        count: row.count,
        maintenance_cost: row.maintenance_cost,
        additional_expense: row.additional_expense,
      })
      if (res && 'error' in res && res.error) return res
    }
  }

  return (
    <FormShell
      title={strings.forms.form7.title}
      formNumber={7}
      prevHref="/office/form-6"
      nextHref="/office/form-8"
      onSave={submissionId ? handleSaveAll : undefined}
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Toolbar — the one entry point for a new vehicle row, with the হাজার-unit
            convention spelled out beside it. The form's own subtitle rides on its
            own full-width line above the strip so it is never squeezed out. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 sm:w-full">{strings.form7.subtitle}</p>
          {/* Height-matched to the button (h-8) so the toolbar reads as one strip. */}
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 shadow-sm sm:h-8 sm:py-0">
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs font-medium leading-snug text-amber-900 sm:text-sm sm:whitespace-nowrap">
              {strings.hazar.hint}
            </p>
          </div>
          <Button
            type="button"
            onClick={openAddModal}
            className={cn('shrink-0 gap-1.5 rounded-xl', accent.solidButton)}
          >
            <Plus className="h-4 w-4" />
            {strings.form7.addVehicle}
          </Button>
        </div>

        {/* Data Table or Empty State */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center">
            <Car className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-base font-medium text-slate-600">{strings.form7.noVehicle}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className={cn('flex items-center gap-2 border-b px-4 py-2.5', accent.header)}>
              <span className={cn('h-2 w-2 rounded-full', accent.dot)} />
              <h3 className="text-sm font-bold text-slate-800">{strings.form7.title}</h3>
            </div>

            <Table className="min-w-[640px] table-fixed">
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className={cn(COL_HEAD, 'w-[8%] text-center')}>{strings.form7.serialColumn}</TableHead>
                  <TableHead className={cn(COL_HEAD, 'w-[20%] text-center')}>{strings.form7.vehicleType}</TableHead>
                  <TableHead className={cn(COL_HEAD, 'w-[16%] text-center')}>{strings.form7.fuelType}</TableHead>
                  <TableHead className={cn(COL_HEAD, 'w-[14%] text-center')}>{strings.form7.countLabel}</TableHead>
                  <TableHead className={cn(COL_HEAD, 'w-[18%] text-center')}>{strings.form7.maintenanceTotal} ({strings.hazar.unit})</TableHead>
                  <TableHead className={cn(COL_HEAD, 'w-[14%] text-center')}>{strings.form7.additionalExpense} ({strings.hazar.unit})</TableHead>
                  <TableHead className={cn(COL_HEAD, 'w-[10%] text-center')}>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const maintenanceTotal = perVehicleMaintenance(row) * row.count

                  return (
                    <TableRow key={row.id || idx} className="border-slate-100 even:bg-slate-50/50 hover:bg-slate-50">
                      <TableCell className="px-4 py-2.5 text-center text-slate-400">
                        {toBanglaNumber(idx + 1)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-center font-bold text-slate-800">
                        {row.vehicle_type_name || '—'}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-center">
                        <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          {row.fuel_type_name || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-center font-semibold text-slate-700">
                        {toBanglaNumber(row.count)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-center font-semibold text-slate-900">
                        <HazarAmount taka={maintenanceTotal} />
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-center font-medium text-slate-600">
                        <HazarAmount taka={row.additional_expense} />
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(row, idx)}
                            className={cn('h-8 w-8 p-0', accent.rowAction)}
                            title={strings.form7.editVehicle}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteIndex(idx)}
                            className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title={strings.form7.deleteVehicle}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) closeModal()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              {editingIndex !== null ? strings.form7.editModalTitle : strings.form7.modalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Vehicle Type Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="car_type_select">{strings.form7.vehicleType}</Label>
              <Select
                value={selectedCarTypeId}
                onValueChange={(val) => setSelectedCarTypeId(val ?? '')}
              >
                <SelectTrigger id="car_type_select" className="w-full">
                  <SelectValue placeholder={strings.form7.selectVehicleType}>
                    {cleanTypeName(carTypes.find((c) => String(c.id) === selectedCarTypeId)?.name)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {carTypes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {cleanTypeName(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fuel Type Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="fuel_type_select">{strings.form7.fuelType}</Label>
              <Select
                value={selectedFuelTypeId}
                onValueChange={(val) => setSelectedFuelTypeId(val ?? '')}
              >
                <SelectTrigger id="fuel_type_select" className="w-full">
                  <SelectValue placeholder={strings.form7.selectFuelType}>
                    {cleanTypeName(fuelTypes.find((f) => String(f.id) === selectedFuelTypeId)?.name)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {fuelTypes.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {cleanTypeName(f.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle Count */}
            <div className="space-y-1.5">
              <Label htmlFor="vehicle_count">{strings.form7.countLabel}</Label>
              <Input
                id="vehicle_count"
                type="number"
                min="0"
                placeholder="যেমন: ১"
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
              />
            </div>

            {/* Auto Filled Maintenance Cost */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="maintenance_cost">{strings.form7.maintenanceCost} ({strings.hazar.unit})</Label>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  স্বয়ংক্রিয় নির্ধারিত
                </span>
              </div>
              <Input
                id="maintenance_cost"
                type="text"
                readOnly
                value={autoMaintenanceCost ? `${toBanglaHazar(autoMaintenanceCost)}` : '০'}
                className="bg-slate-50 text-slate-700 font-mono font-medium border-slate-200"
              />
            </div>

            {/* Additional Expense (user entered) */}
            <div className="space-y-1.5">
              <Label htmlFor="additional_expense">{strings.form7.additionalExpense}</Label>
              <AmountField
                id="additional_expense"
                min="0"
                placeholder="যেমন: ৫ (ঐচ্ছিক)"
                value={additionalInput}
                onValueChange={(taka) => setAdditionalInput(taka)}
              />
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
            >
              {strings.close}
            </Button>
            {editingIndex === null && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndAddMore}
                disabled={!selectedCarTypeId || !selectedFuelTypeId || !countInput}
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              >
                {strings.saveAndAddMore}
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSaveModal}
              disabled={!selectedCarTypeId || !selectedFuelTypeId || !countInput}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {editingIndex !== null ? 'সংরক্ষণ করুন' : 'যোগ করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={deleteIndex !== null} onOpenChange={(open) => {
        if (!open) setDeleteIndex(null)
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <Trash2 className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-800">
                {strings.form7.confirmDeleteTitle}
              </DialogTitle>
            </div>
            <p className="text-sm text-slate-500">
              {strings.form7.confirmDeleteDesc}
            </p>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteIndex(null)}
              className="text-slate-600"
            >
              {strings.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              মুছে ফেলুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormShell>
  )
}
