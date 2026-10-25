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
import { saveFormUtilityRow, deleteFormUtilityRow } from '@/app/actions/forms'
import { Plus, Trash2, Edit2, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useState, useTransition, useMemo } from 'react'

export interface Form11UtilityRow {
  utility_type_id: number
  utility_type_name: string
  annual_cost: number
  due: number
}

export interface Form11ClientProps {
  submissionId: number | null
  utilityTypes: Array<{ id: number; name: string }>
  initialData: any[]
}

export function Form11Client({
  submissionId,
  utilityTypes,
  initialData,
}: Form11ClientProps) {
  // Map rows from initialData, only keeping items with values or matching records
  const [rows, setRows] = useState<Form11UtilityRow[]>(() => {
    return (initialData || [])
      .filter((item) => (item.annual_cost || 0) > 0 || (item.due || 0) > 0)
      .map((item) => {
        const typeObj = utilityTypes.find((t) => t.id === item.utility_type_id)
        return {
          utility_type_id: item.utility_type_id,
          utility_type_name: cleanTypeName(typeObj?.name || `ইউটিলিটি #${item.utility_type_id}`),
          annual_cost: Number(item.annual_cost || 0),
          due: Number(item.due || 0),
        }
      })
      .sort((a, b) => a.utility_type_id - b.utility_type_id)
  })

  const [isPending, startTransition] = useTransition()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [annualCostInput, setAnnualCostInput] = useState('')
  const [dueInput, setDueInput] = useState('')

  // Delete Confirmation State
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  // Filter out utility types that are already added (except the one currently being edited)
  const availableUtilityTypes = useMemo(() => {
    const usedTypeIds = new Set(
      rows
        .map((r, idx) => (idx === editingIndex ? null : r.utility_type_id))
        .filter(Boolean)
    )
    return utilityTypes.filter((t) => !usedTypeIds.has(t.id))
  }, [utilityTypes, rows, editingIndex])

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingIndex(null)
    // Pre-select the first utility type that has not been added yet
    const usedTypeIds = new Set(rows.map((r) => r.utility_type_id))
    const firstAvailable = utilityTypes.find((t) => !usedTypeIds.has(t.id))
    setSelectedTypeId(firstAvailable ? firstAvailable.id.toString() : '')
    setAnnualCostInput('')
    setDueInput('')
    setIsModalOpen(true)
  }

  // Open modal for edit
  const handleOpenEdit = (index: number) => {
    const item = rows[index]
    setEditingIndex(index)
    setSelectedTypeId(item.utility_type_id.toString())
    setAnnualCostInput(item.annual_cost ? item.annual_cost.toString() : '')
    setDueInput(item.due ? item.due.toString() : '')
    setIsModalOpen(true)
  }

  // Save modal handler
  const handleSaveModal = () => {
    if (!selectedTypeId) return
    const typeId = parseInt(selectedTypeId, 10)
    const typeObj = utilityTypes.find((t) => t.id === typeId)
    const name = cleanTypeName(typeObj?.name || `ইউটিলিটি #${typeId}`)

    const annualCost = parseInt(annualCostInput, 10) || 0
    const due = parseInt(dueInput, 10) || 0

    const updatedRow: Form11UtilityRow = {
      utility_type_id: typeId,
      utility_type_name: name,
      annual_cost: annualCost,
      due: due,
    }

    startTransition(async () => {
      if (submissionId) {
        await saveFormUtilityRow(submissionId, typeId, {
          annual_cost: annualCost,
          due: due,
        })
      }

      setRows((prev) => {
        let newRows: Form11UtilityRow[]
        if (editingIndex !== null) {
          newRows = [...prev]
          newRows[editingIndex] = updatedRow
        } else {
          newRows = [...prev, updatedRow]
        }
        return newRows.sort((a, b) => a.utility_type_id - b.utility_type_id)
      })

      setIsModalOpen(false)
    })
  }

  // Confirm delete handler
  const handleConfirmDelete = () => {
    if (deleteIndex === null) return
    const target = rows[deleteIndex]

    startTransition(async () => {
      if (submissionId && target) {
        await deleteFormUtilityRow(submissionId, target.utility_type_id)
      }

      setRows((prev) => prev.filter((_, idx) => idx !== deleteIndex))
      setDeleteIndex(null)
    })
  }

  const handleSaveAll = async () => {
    if (!submissionId) return
    for (const row of rows) {
      const res = await saveFormUtilityRow(submissionId, row.utility_type_id, {
        annual_cost: row.annual_cost,
        due: row.due,
      })
      if (res && 'error' in res && res.error) return res
    }
  }

  return (
    <FormShell
      title={strings.forms.form11.title}
      formNumber={11}
      prevHref="/office/form-10"
      nextHref="/office/form-12"
      onSave={submissionId ? handleSaveAll : undefined}
    >
      <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
        {/* Top Header & Action (Form 5 style) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {strings.form11.title}
            </h2>
          </div>
          <Button
            type="button"
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5 rounded-xl font-medium shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            {strings.form11.addUtility}
          </Button>
        </div>

        {/* Empty State or Table */}
        {rows.length === 0 ? (
          <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Zap className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium text-base mb-2">
              {strings.form11.noUtility}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenAdd}
              className="mt-2 text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {strings.form11.addUtility}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="w-16 text-center font-bold text-slate-700">#</TableHead>
                    <TableHead className="font-bold text-slate-700 min-w-[200px]">{strings.form11.utilityType}</TableHead>
                    <TableHead className="text-right font-bold text-slate-700 min-w-[180px]">{strings.form11.annualCost}</TableHead>
                    <TableHead className="text-right font-bold text-slate-700 min-w-[180px]">{strings.form11.dueIfAny}</TableHead>
                    <TableHead className="w-28 text-center font-bold text-slate-700">কার্যক্রম</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => (
                    <TableRow key={row.utility_type_id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell className="text-center font-medium text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>{row.utility_type_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900 font-mono">
                        {toBanglaAmount(row.annual_cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700 font-mono">
                        {row.due > 0 ? (
                          <span className="text-rose-600 font-semibold">{toBanglaAmount(row.due)}</span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(idx)}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600"
                            title={strings.form11.editUtility}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteIndex(idx)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                            title={strings.form11.deleteUtility}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {editingIndex !== null
                ? strings.form11.editModalTitle
                : strings.form11.modalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* ইউটিলিটির ধরন (dropdown) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form11.utilityType} <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={selectedTypeId}
                onValueChange={(val) => setSelectedTypeId(val || '')}
                disabled={editingIndex !== null}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={strings.form11.selectUtilityType}>
                    {cleanTypeName(utilityTypes.find((t) => String(t.id) === selectedTypeId)?.name)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableUtilityTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {cleanTypeName(type.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* বার্ষিক ব্যয় (টাকা) manually entered */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form11.annualCost} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ১২০০০০"
                value={annualCostInput}
                onChange={(e) => setAnnualCostInput(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* বকেয়া (যদি থাকে) manually entered */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form11.dueIfAny}
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="যেমন: ১৫০০০"
                value={dueInput}
                onChange={(e) => setDueInput(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isPending}
            >
              {strings.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSaveModal}
              disabled={!selectedTypeId || isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? strings.saving : strings.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={deleteIndex !== null}
        onOpenChange={(open) => !open && setDeleteIndex(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              {strings.form11.confirmDeleteTitle}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            {strings.form11.confirmDeleteDesc}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteIndex(null)}
              disabled={isPending}
            >
              {strings.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              {isPending ? strings.saving : strings.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormShell>
  )
}
