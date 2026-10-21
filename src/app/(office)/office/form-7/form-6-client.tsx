'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaAmount, toBanglaNumber, cleanTypeName } from '@/lib/bangla'
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
import { saveFormVehicleRentRow, deleteFormVehicleRentRow } from '@/app/actions/forms'
import { Plus, Trash2, Edit2, CarFront } from 'lucide-react'
import { useState, useTransition, useMemo } from 'react'

export interface Form6VehicleRentRow {
  id?: number
  vehicle_rent_config_id: number
  vehicle_type_name: string
  count: number
  monthly_allowance: number
  annual_total: number
}

export interface Form6ClientProps {
  submissionId: number | null
  initialData: any[]
  carTypes: any[]
  rentConfigs: any[]
}

export function Form6Client({
  submissionId,
  initialData,
  carTypes,
  rentConfigs,
}: Form6ClientProps) {
  // Map rows from initialData
  const [rows, setRows] = useState<Form6VehicleRentRow[]>(() => {
    return (initialData || []).map((v) => {
      const cfg = v.vehicle_rent_config || rentConfigs.find((c) => c.id === v.vehicle_rent_config_id)
      const carName = cleanTypeName(cfg?.car_type?.name || '')
      const monthly = Number(cfg?.monthly_rent_allowance || 0)
      const count = Number(v.count || 0)
      return {
        id: v.id,
        vehicle_rent_config_id: v.vehicle_rent_config_id,
        vehicle_type_name: carName,
        count,
        monthly_allowance: monthly,
        annual_total: monthly * count * 12,
      }
    })
  })

  const [isPending, startTransition] = useTransition()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [selectedCarTypeId, setSelectedCarTypeId] = useState<string>('')
  const [countInput, setCountInput] = useState('')

  // Delete Confirmation State
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  // Find matching rent config
  const currentConfig = useMemo(() => {
    if (!selectedCarTypeId) return null
    const carId = parseInt(selectedCarTypeId, 10)
    return rentConfigs.find((c) => c.car_type_id === carId) || null
  }, [selectedCarTypeId, rentConfigs])

  const autoMonthlyAllowance = useMemo(() => {
    if (!currentConfig) return 0
    return Number(currentConfig.monthly_rent_allowance || 0)
  }, [currentConfig])

  const openAddModal = () => {
    setEditingIndex(null)
    const defaultCarId = carTypes[0]?.id ? String(carTypes[0].id) : ''
    setSelectedCarTypeId(defaultCarId)
    setCountInput('')
    setIsModalOpen(true)
  }

  const openEditModal = (row: Form6VehicleRentRow, index: number) => {
    setEditingIndex(index)
    const cfg = rentConfigs.find((c) => c.id === row.vehicle_rent_config_id)
    if (cfg) {
      setSelectedCarTypeId(String(cfg.car_type_id))
    }
    setCountInput(row.count ? String(row.count) : '')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIndex(null)
    setSelectedCarTypeId('')
    setCountInput('')
  }

  const handleSaveModal = async () => {
    if (!selectedCarTypeId) return
    const carId = parseInt(selectedCarTypeId, 10)

    let configId = currentConfig?.id
    if (!configId) {
      const match = rentConfigs.find((c) => c.car_type_id === carId)
      configId = match?.id
    }
    if (!configId) return

    const carObj = carTypes.find((c) => c.id === carId)
    const count = parseInt(countInput, 10) || 0
    const monthly = autoMonthlyAllowance
    const annual = monthly * count * 12

    const isEdit = editingIndex !== null
    const existingRow = isEdit ? rows[editingIndex] : null

    const newRow: Form6VehicleRentRow = {
      id: existingRow?.id,
      vehicle_rent_config_id: configId,
      vehicle_type_name: cleanTypeName(carObj?.name || ''),
      count,
      monthly_allowance: monthly,
      annual_total: annual,
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

    closeModal()

    if (submissionId) {
      startTransition(async () => {
        const res = await saveFormVehicleRentRow(submissionId, {
          id: existingRow?.id,
          vehicle_rent_config_id: configId,
          count,
        })
        if (res.success && res.id && !existingRow?.id) {
          setRows((prev) =>
            prev.map((r, i) =>
              i === prev.length - 1 ? { ...r, id: res.id } : r
            )
          )
        }
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (deleteIndex === null) return
    const rowToDelete = rows[deleteIndex]
    setRows((prev) => prev.filter((_, i) => i !== deleteIndex))
    setDeleteIndex(null)

    if (submissionId && rowToDelete.id) {
      startTransition(async () => {
        await deleteFormVehicleRentRow(rowToDelete.id!)
      })
    }
  }

  return (
    <FormShell
      title={strings.forms.form7.title}
      formNumber={7}
      prevHref="/office/form-6"
      nextHref="/office/form-8"
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Top Header & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {strings.form6.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {strings.form6.subtitle}
            </p>
          </div>
          <Button
            type="button"
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {strings.form6.addVehicle}
          </Button>
        </div>

        {/* Empty State or Table */}
        {rows.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <CarFront className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium text-base mb-2">
              {strings.form6.noVehicle}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={openAddModal}
              className="mt-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {strings.form6.addVehicle}
            </Button>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-48 font-bold text-slate-700">{strings.form6.vehicleType}</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">{strings.form6.countLabel}</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">{strings.form6.monthlyAllowance}</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">বার্ষিক মোট ব্যয়</TableHead>
                  <TableHead className="w-24 text-center font-bold text-slate-700">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.id || idx} className="hover:bg-slate-50/70">
                    <TableCell className="font-bold text-slate-800">
                      {row.vehicle_type_name || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {toBanglaNumber(row.count)} টি
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-slate-800">
                      {toBanglaAmount(row.monthly_allowance)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-indigo-700">
                      {toBanglaAmount(row.annual_total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(row, idx)}
                          className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 h-8 w-8 p-0"
                          title={strings.form6.editVehicle}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteIndex(idx)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                          title={strings.form6.deleteVehicle}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-slate-400">
          * {strings.form6.calculationNote}
        </p>
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) closeModal()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              {editingIndex !== null ? strings.form6.editModalTitle : strings.form6.modalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Vehicle Type Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="car_type_rent_select">{strings.form6.vehicleType}</Label>
              <Select
                value={selectedCarTypeId}
                onValueChange={(val) => setSelectedCarTypeId(val ?? '')}
              >
                <SelectTrigger id="car_type_rent_select" className="w-full">
                  <SelectValue placeholder={strings.form6.selectVehicleType}>
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

            {/* Vehicle Count */}
            <div className="space-y-1.5">
              <Label htmlFor="rent_count">{strings.form6.countLabel}</Label>
              <Input
                id="rent_count"
                type="number"
                min="0"
                placeholder="যেমন: ১"
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
              />
            </div>

            {/* Auto Filled Monthly Allowance */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="monthly_allowance">{strings.form6.monthlyAllowance}</Label>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  স্বয়ংক্রিয় নির্ধারিত
                </span>
              </div>
              <Input
                id="monthly_allowance"
                type="text"
                readOnly
                value={autoMonthlyAllowance ? `${toBanglaAmount(autoMonthlyAllowance)}` : '০ টাকা'}
                className="bg-slate-50 text-slate-700 font-mono font-medium border-slate-200"
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
            <Button
              type="button"
              onClick={handleSaveModal}
              disabled={!selectedCarTypeId || !countInput}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
                {strings.form6.confirmDeleteTitle}
              </DialogTitle>
            </div>
            <p className="text-sm text-slate-500">
              {strings.form6.confirmDeleteDesc}
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
