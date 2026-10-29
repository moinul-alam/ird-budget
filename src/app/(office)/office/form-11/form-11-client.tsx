'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaNumber, cleanTypeName } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AmountField } from '@/components/amount-field'
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
import { Card, CardContent } from '@/components/ui/card'
import { saveFormUtilityRow, deleteFormUtilityRow } from '@/lib/actions/forms/utilities'
import { Plus, Trash2, Edit2, Zap, AlertTriangle, Info } from 'lucide-react'
import type { FormUtilitiesInitial } from '@/lib/office/load-form-data'
import { useState, useTransition, useMemo } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { HazarAmount } from '@/components/hazar-amount'

export interface Form11UtilityRow {
  utility_type_id: number
  utility_type_name: string
  annual_cost: number
  due: number
}

export interface Form11ClientProps {
  submissionId: number | null
  utilityTypes: Array<{ id: number; name: string }>
  initialData: FormUtilitiesInitial
}

/**
 * Colour profile of this form — its own amber hue (the utility / electricity bolt),
 * kept distinct from the blue of Form 2. Only these class strings carry the colour;
 * the layout below is the shared master pattern.
 */
const accent = {
  solidButton: 'bg-amber-600 hover:bg-amber-700 text-white',
  rowAction: 'text-slate-500 hover:text-amber-600 hover:bg-amber-50',
  header: 'bg-amber-50/70 border-amber-100',
  dot: 'bg-amber-500',
  card: 'bg-gradient-to-br from-slate-50 to-amber-50/40 border-amber-100',
}

/** One cell of the bottom সারসংক্ষেপ. */
function SummaryBox({
  label,
  value,
  valueClass,
}: {
  label: string
  value: ReactNode
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
      <span className="block text-[11px] font-medium text-slate-500">{label}</span>
      <span className={cn('mt-0.5 block font-mono text-lg font-bold text-slate-800', valueClass)}>
        {value}
      </span>
    </div>
  )
}

/** The quiet uppercase heading every column shares; only the alignment varies. */
const COL_HEAD = 'px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500'

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

  // Everything the modal needs to put a row into the list and persist it, kept in
  // one place so the save buttons cannot diverge.
  const commitModalRow = (): Form11UtilityRow | null => {
    if (!selectedTypeId) return null
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
    })

    return updatedRow
  }

  // Save modal handler
  const handleSaveModal = () => {
    if (!commitModalRow()) return
    setIsModalOpen(false)
  }

  // Save and stay open on the next unused utility type, so a run of types can be
  // entered without reopening the modal for each one.
  const handleSaveAndAddMore = () => {
    const row = commitModalRow()
    if (!row) return

    const used = new Set([...rows.map((r) => r.utility_type_id), row.utility_type_id])
    const next = utilityTypes.find((t) => !used.has(t.id))

    setEditingIndex(null)
    setSelectedTypeId(next ? String(next.id) : '')
    setAnnualCostInput('')
    setDueInput('')
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

  // Summary calculations — both figures are sums of what the table already shows:
  // the annual costs and the arrears the office entered.
  const summaryAnnual = useMemo(
    () => rows.reduce((sum, r) => sum + (r.annual_cost || 0), 0),
    [rows]
  )
  const summaryDue = useMemo(() => rows.reduce((sum, r) => sum + (r.due || 0), 0), [rows])

  // Arrears only earn their space when someone actually has them — with none entered
  // the বকেয়া column and its summary card are dropped, never shown as a row of '—'.
  const hasDue = rows.some((r) => (r.due || 0) > 0)

  return (
    <FormShell
      title={strings.forms.form11.title}
      formNumber={11}
      prevHref="/office/form-10"
      nextHref="/office/form-12"
      onSave={submissionId ? handleSaveAll : undefined}
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Toolbar — the one entry point for a new utility row, with the হাজার-unit
            convention spelled out beside it. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* Height-matched to the button (h-8) so the toolbar reads as one strip. */}
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 shadow-sm sm:h-8 sm:py-0">
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs font-medium leading-snug text-amber-900 sm:text-sm sm:whitespace-nowrap">
              {strings.hazar.hint}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleOpenAdd}
            className={cn('shrink-0 gap-1.5 rounded-xl', accent.solidButton)}
          >
            <Plus className="h-4 w-4" />
            {strings.form11.addUtility}
          </Button>
        </div>

        {/* Empty State or Table */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center">
            <Zap className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-base font-medium text-slate-600">{strings.form11.noUtility}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className={cn('flex items-center gap-2 border-b px-4 py-2.5', accent.header)}>
              <span className={cn('h-2 w-2 rounded-full', accent.dot)} />
              <h3 className="text-sm font-bold text-slate-800">{strings.form11.subtitle}</h3>
            </div>

            <Table className="min-w-[640px] table-fixed">
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className={cn(COL_HEAD, 'text-center', hasDue ? 'w-[8%]' : 'w-[10%]')}>{strings.form11.serialColumn}</TableHead>
                  <TableHead className={cn(COL_HEAD, 'text-center', hasDue ? 'w-[36%]' : 'w-[48%]')}>{strings.form11.utilityType}</TableHead>
                  <TableHead className={cn(COL_HEAD, 'text-center', hasDue ? 'w-[22%]' : 'w-[27%]')}>{strings.form11.annualCost}</TableHead>
                  {hasDue && (
                    <TableHead className={cn(COL_HEAD, 'w-[22%] text-center')}>{strings.form11.due}</TableHead>
                  )}
                  <TableHead className={cn(COL_HEAD, 'text-center', hasDue ? 'w-[12%]' : 'w-[15%]')}>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.utility_type_id} className="border-slate-100 even:bg-slate-50/50 hover:bg-slate-50">
                    <TableCell className="px-4 py-2.5 text-center text-slate-400">
                      {toBanglaNumber(idx + 1)}
                    </TableCell>
                    <TableCell className="px-4 py-2.5 text-center font-semibold text-slate-800">
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', accent.dot)} />
                        {row.utility_type_name}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-2.5 text-center font-semibold text-slate-900">
                      <HazarAmount taka={row.annual_cost} />
                    </TableCell>
                    {hasDue && (
                      <TableCell className="px-4 py-2.5 text-center font-medium text-slate-600">
                        <HazarAmount taka={row.due} />
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(idx)}
                          className={cn('h-8 w-8 p-0', accent.rowAction)}
                          title={strings.form11.editUtility}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteIndex(idx)}
                          className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title={strings.form11.deleteUtility}
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

        {/* Summary Card — the two readouts the office checks at a glance */}
        {rows.length > 0 && (
          <Card className={cn('border shadow-xs', accent.card)}>
            <CardContent className="space-y-4 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                {strings.form11.title}
              </h3>
              <div className={cn('grid grid-cols-1 gap-3', hasDue ? 'sm:grid-cols-2' : 'sm:grid-cols-1')}>
                <SummaryBox
                  label={strings.form11.summaryAnnual}
                  value={<HazarAmount taka={summaryAnnual} />}
                />
                {hasDue && (
                  <SummaryBox
                    label={strings.form11.summaryDue}
                    value={<HazarAmount taka={summaryDue} />}
                  />
                )}
              </div>
            </CardContent>
          </Card>
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
              <AmountField
                placeholder="যেমন: ১২০"
                value={annualCostInput}
                onValueChange={(taka) => setAnnualCostInput(taka)}
                className="bg-white"
              />
            </div>

            {/* বকেয়া (যদি থাকে) manually entered */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {strings.form11.dueIfAny}
              </Label>
              <AmountField
                placeholder="যেমন: ১৫"
                value={dueInput}
                onValueChange={(taka) => setDueInput(taka)}
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
            {editingIndex === null && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndAddMore}
                disabled={!selectedTypeId || isPending}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {strings.saveAndAddMore}
              </Button>
            )}
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
