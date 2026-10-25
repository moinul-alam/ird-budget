'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { saveFormStaffSuspendedRows, deleteFormStaffSuspendedRow } from '@/app/actions/forms'
import { Plus, Trash2, Edit2, UserX, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useTransition, useMemo } from 'react'

export interface SuspendedStaffRow {
  grade_id: number
  suspended_count: number
  suspended_total_basic: number
  suspended_due_salary: number
}

/**
 * One row of `ref_grades`. The grade list is administrator-controlled, so the
 * form never assumes a fixed 1–20 range or that the row id equals the grade
 * number. `category_bn` is the Bengali label of the grade's employee category
 * (কর্মকর্তা / কর্মচারী) read from `ref_employee_categories` through the FK.
 */
export interface GradeRow {
  id: number
  grade_no: number
  category: string
  category_bn: string
}

interface Form3ClientProps {
  initialData: any[]
  submissionId: number | null
  grades: GradeRow[]
}

/**
 * Colour profile of this form. Forms 2, 3 and 4 share one layout — only these
 * class strings differ, so the three stay structurally identical while reading
 * as distinct colours (2 blue, 3 orange, 4 green).
 */
const accent = {
  solidButton: 'bg-orange-600 hover:bg-orange-700 text-white',
  softIcon: 'bg-orange-100 text-orange-600',
  emptyButton: 'text-orange-600 border-orange-200 hover:bg-orange-50',
  rowAction: 'text-slate-500 hover:text-orange-600 hover:bg-orange-50',
  focus: 'focus-visible:border-orange-500 focus-visible:ring-orange-500/25',
  officerDot: 'bg-orange-600',
  staffDot: 'bg-orange-300',
  officerHeader: 'bg-orange-50/70 border-orange-100',
  staffHeader: 'bg-slate-100/80 border-slate-200',
  card: 'bg-gradient-to-br from-slate-50 to-orange-50/40 border-orange-100',
  officerRow: 'border-orange-200/70 bg-orange-50/40',
  staffRow: 'border-slate-200 bg-slate-50/70',
  officerValue: 'text-orange-700',
  staffValue: 'text-slate-800',
}

/** One cell of the bottom সারসংক্ষেপ. */
function SummaryBox({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
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

export function Form3Client({ initialData, submissionId, grades }: Form3ClientProps) {
  const gradeById = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades])

  const initialRows = useMemo<SuspendedStaffRow[]>(
    () =>
      (initialData || [])
        .filter(
          (r) =>
            r.suspended_count > 0 || r.suspended_total_basic > 0 || r.suspended_due_salary > 0
        )
        .map((r) => ({
          grade_id: r.grade_id,
          suspended_count: r.suspended_count || 0,
          suspended_total_basic: r.suspended_total_basic || 0,
          suspended_due_salary: r.suspended_due_salary || 0,
        }))
        .sort((a, b) => a.grade_id - b.grade_id),
    [initialData]
  )

  const [rows, setRows] = useState<SuspendedStaffRow[]>(initialRows)
  // Last state known to be stored in the database — the diff against `rows`
  // is what tells the shell there is something worth saving.
  const [savedRows, setSavedRows] = useState<SuspendedStaffRow[]>(initialRows)

  const [isPending, startTransition] = useTransition()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGradeId, setEditingGradeId] = useState<number | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [countInput, setCountInput] = useState('')
  const [basicInput, setBasicInput] = useState('')
  const [dueInput, setDueInput] = useState('')

  // Confirmation on accidental close
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  // Confirmation on delete
  const [gradeToDelete, setGradeToDelete] = useState<number | null>(null)

  const dirty = useMemo(
    () => JSON.stringify(rows) !== JSON.stringify(savedRows),
    [rows, savedRows]
  )

  // Has user typed anything in modal
  const hasModalDirtyData = useMemo(() => {
    return Boolean(
      selectedGrade ||
      countInput.trim() ||
      basicInput.trim() ||
      dueInput.trim()
    )
  }, [selectedGrade, countInput, basicInput, dueInput])

  // Available grades (not yet added, except currently editing)
  const availableGrades = useMemo(() => {
    const used = new Set(
      rows.filter((r) => r.grade_id !== editingGradeId).map((r) => r.grade_id)
    )
    return grades.filter((g) => !used.has(g.id))
  }, [grades, rows, editingGradeId])

  // The dropdown is grouped by the employee category that comes from the
  // reference table, so the boundary is never a guess at a grade number here.
  const officerGrades = availableGrades.filter((g) => g.category === 'officer')
  const staffGrades = availableGrades.filter((g) => g.category !== 'officer')

  const gradeLabel = (g: GradeRow) => `গ্রেড ${toBanglaNumber(g.grade_no)} (${g.category_bn})`

  const openAddModal = () => {
    setEditingGradeId(null)
    setSelectedGrade(availableGrades[0]?.id ? String(availableGrades[0].id) : '')
    setCountInput('')
    setBasicInput('')
    setDueInput('')
    setIsModalOpen(true)
  }

  const openEditModal = (row: SuspendedStaffRow) => {
    setEditingGradeId(row.grade_id)
    setSelectedGrade(String(row.grade_id))
    setCountInput(row.suspended_count ? String(row.suspended_count) : '')
    setBasicInput(row.suspended_total_basic ? String(row.suspended_total_basic) : '')
    setDueInput(row.suspended_due_salary ? String(row.suspended_due_salary) : '')
    setIsModalOpen(true)
  }

  const resetModalFields = () => {
    setEditingGradeId(null)
    setSelectedGrade('')
    setCountInput('')
    setBasicInput('')
    setDueInput('')
    setIsModalOpen(false)
    setShowConfirmClose(false)
  }

  // Handle modal close request
  const handleRequestClose = () => {
    if (hasModalDirtyData) {
      setShowConfirmClose(true)
    } else {
      resetModalFields()
    }
  }

  // Save row from modal
  const handleSaveModalRow = () => {
    const gradeId = parseInt(selectedGrade, 10)
    if (!gradeId || isNaN(gradeId)) return

    const newRow: SuspendedStaffRow = {
      grade_id: gradeId,
      suspended_count: parseInt(countInput, 10) || 0,
      suspended_total_basic: parseFloat(basicInput) || 0,
      suspended_due_salary: parseFloat(dueInput) || 0,
    }

    setRows((prev) => {
      // Remove previous entry if editing different grade
      const filtered = editingGradeId !== null && editingGradeId !== gradeId
        ? prev.filter((r) => r.grade_id !== editingGradeId)
        : prev

      const existsIndex = filtered.findIndex((r) => r.grade_id === gradeId)
      if (existsIndex >= 0) {
        const next = [...filtered]
        next[existsIndex] = newRow
        return next.sort((a, b) => a.grade_id - b.grade_id)
      }
      return [...filtered, newRow].sort((a, b) => a.grade_id - b.grade_id)
    })

    resetModalFields()
  }

  // Delete row with confirmation
  const handleConfirmDelete = () => {
    if (!gradeToDelete) return
    const gradeId = gradeToDelete
    const next = rows
      .filter((r) => r.grade_id !== gradeId)
      .sort((a, b) => a.grade_id - b.grade_id)
    setRows(next)
    // The row is removed from the database right away, so it is not an unsaved
    // change once the request lands.
    setSavedRows(next)
    setGradeToDelete(null)

    if (submissionId) {
      startTransition(async () => {
        await deleteFormStaffSuspendedRow(submissionId, gradeId)
      })
    }
  }

  // Officers and staff are told apart by the grade's own category, and the
  // grade number is read from the reference row rather than assumed from the id.
  const gradeNoOf = (row: SuspendedStaffRow) =>
    gradeById.get(row.grade_id)?.grade_no ?? row.grade_id
  const isOfficer = (row: SuspendedStaffRow) =>
    gradeById.get(row.grade_id)?.category === 'officer'

  const officerRows = useMemo(
    () => rows.filter(isOfficer).sort((a, b) => gradeNoOf(a) - gradeNoOf(b)),
    [rows, gradeById]
  )

  const staffRows = useMemo(
    () => rows.filter((r) => !isOfficer(r)).sort((a, b) => gradeNoOf(a) - gradeNoOf(b)),
    [rows, gradeById]
  )

  // Summary calculations
  const summary = useMemo(() => {
    let officerCount = 0
    let officerBasic = 0
    let officerDue = 0
    let staffCount = 0
    let staffBasic = 0
    let staffDue = 0

    rows.forEach((r) => {
      if (isOfficer(r)) {
        officerCount += r.suspended_count || 0
        officerBasic += r.suspended_total_basic || 0
        officerDue += r.suspended_due_salary || 0
      } else {
        staffCount += r.suspended_count || 0
        staffBasic += r.suspended_total_basic || 0
        staffDue += r.suspended_due_salary || 0
      }
    })

    return { officerCount, officerBasic, officerDue, staffCount, staffBasic, staffDue }
  }, [rows, gradeById])

  // Save entire form state to database
  const handleSaveAll = async () => {
    if (!submissionId) return
    const result = await saveFormStaffSuspendedRows(submissionId, rows)
    if (!result || typeof result !== 'object' || !('error' in result) || !result.error) {
      setSavedRows(rows)
    }
    return result
  }

  return (
    <FormShell
      title={strings.form3.title}
      formNumber={3}
      prevHref="/office/form-2"
      nextHref="/office/form-4"
      onSave={submissionId ? handleSaveAll : undefined}
      dirty={dirty}
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Top Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              সাময়িক বরখাস্তকৃত কর্মকর্তা ও কর্মচারীর বেতন বিবরণী
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              অফিসে বর্তমানে কোনো সাময়িক বরখাস্তকৃত কর্মকর্তা বা কর্মচারী থাকলে নিচে তথ্য যোগ করুন। না থাকলে কোনো তথ্য যোগ করার প্রয়োজন নেই।
            </p>
          </div>
          <Button
            type="button"
            onClick={openAddModal}
            className={cn('shrink-0 gap-1.5 rounded-xl', accent.solidButton)}
            disabled={availableGrades.length === 0}
          >
            <Plus className="h-4 w-4" />
            {strings.form3.addButton}
          </Button>
        </div>

        {/* Data Tables or Empty State */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center">
            <UserX className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium text-base mb-2">
              {strings.form3.emptyState}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={openAddModal}
              className={cn('mt-2 rounded-xl', accent.emptyButton)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {strings.form3.addButton}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Officer Table */}
            {officerRows.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className={cn('flex items-center justify-between border-b px-4 py-2.5', accent.officerHeader)}>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <span className={cn('h-2 w-2 rounded-full', accent.officerDot)} />
                    {strings.form3.officerTableTitle}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    মোট: {toBanglaNumber(officerRows.length)} টি গ্রেড
                  </span>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-28 font-bold text-slate-700">{strings.form3.gradeColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form3.officerCountColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form3.basicColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form3.tableDueSalaryColumn}</TableHead>
                      <TableHead className="w-24 text-center font-bold text-slate-700">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {officerRows.map((row) => (
                      <TableRow key={row.grade_id} className="hover:bg-slate-50/70">
                        <TableCell className="font-mono font-bold text-slate-800">
                          গ্রেড {toBanglaNumber(gradeNoOf(row))}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {toBanglaNumber(row.suspended_count)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-slate-800">
                          {toBanglaAmount(row.suspended_total_basic)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {row.suspended_due_salary ? toBanglaAmount(row.suspended_due_salary) : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(row)}
                              className={cn('h-8 w-8 p-0', accent.rowAction)}
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setGradeToDelete(row.grade_id)}
                              className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="মুছে ফেলুন"
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

            {/* Staff Table */}
            {staffRows.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className={cn('flex items-center justify-between border-b px-4 py-2.5', accent.staffHeader)}>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <span className={cn('h-2 w-2 rounded-full', accent.staffDot)} />
                    {strings.form3.staffTableTitle}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    মোট: {toBanglaNumber(staffRows.length)} টি গ্রেড
                  </span>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-28 font-bold text-slate-700">{strings.form3.gradeColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form3.staffCountColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form3.basicColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form3.tableDueSalaryColumn}</TableHead>
                      <TableHead className="w-24 text-center font-bold text-slate-700">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffRows.map((row) => (
                      <TableRow key={row.grade_id} className="hover:bg-slate-50/70">
                        <TableCell className="font-mono font-bold text-slate-800">
                          গ্রেড {toBanglaNumber(gradeNoOf(row))}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {toBanglaNumber(row.suspended_count)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-slate-800">
                          {toBanglaAmount(row.suspended_total_basic)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {row.suspended_due_salary ? toBanglaAmount(row.suspended_due_salary) : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(row)}
                              className={cn('h-8 w-8 p-0', accent.rowAction)}
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setGradeToDelete(row.grade_id)}
                              className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="মুছে ফেলুন"
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
          </div>
        )}

        {/* Summary Card — one row per employee category, three boxes inside each */}
        {rows.length > 0 && (
          <Card className={cn('border shadow-xs', accent.card)}>
            <CardContent className="space-y-4 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                {strings.form3.summaryTitle}
              </h3>

              {/* কর্মকর্তা */}
              <div className={cn('rounded-2xl border p-3.5', accent.officerRow)}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', accent.officerDot)} />
                  <span className="text-xs font-bold text-slate-700">
                    {strings.form3.officerRowLabel}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SummaryBox
                    label={strings.form3.officerCountLabel}
                    value={`${toBanglaNumber(summary.officerCount)} ${strings.form3.personUnit}`}
                  />
                  <SummaryBox
                    label={strings.form3.monthlyBasicSummaryLabel}
                    value={`${toBanglaAmount(summary.officerBasic)} টাকা`}
                    valueClass={accent.officerValue}
                  />
                  <SummaryBox
                    label={strings.form3.dueSummaryLabel}
                    value={summary.officerDue ? `${toBanglaAmount(summary.officerDue)} টাকা` : '—'}
                  />
                </div>
              </div>

              {/* কর্মচারী */}
              <div className={cn('rounded-2xl border p-3.5', accent.staffRow)}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', accent.staffDot)} />
                  <span className="text-xs font-bold text-slate-700">
                    {strings.form3.staffRowLabel}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SummaryBox
                    label={strings.form3.staffCountLabel}
                    value={`${toBanglaNumber(summary.staffCount)} ${strings.form3.personUnit}`}
                  />
                  <SummaryBox
                    label={strings.form3.monthlyBasicSummaryLabel}
                    value={`${toBanglaAmount(summary.staffBasic)} টাকা`}
                    valueClass={accent.staffValue}
                  />
                  <SummaryBox
                    label={strings.form3.dueSummaryLabel}
                    value={summary.staffDue ? `${toBanglaAmount(summary.staffDue)} টাকা` : '—'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) handleRequestClose()
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <div className="flex items-start gap-3">
            <div className={cn('shrink-0 rounded-2xl p-2.5', accent.softIcon)}>
              <UserX className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-extrabold text-slate-900">
                {editingGradeId !== null ? strings.form3.editModalTitle : strings.form3.modalTitle}
              </DialogTitle>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {strings.form3.modalSubtitle}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Grade Selector — grouped by employee category */}
            <div className="space-y-1.5">
              <Label htmlFor="grade_select_2b" className="text-xs font-bold text-slate-700">
                {strings.form3.gradeColumn}
              </Label>
              <Select value={selectedGrade} onValueChange={(val) => setSelectedGrade(val ?? '')}>
                <SelectTrigger id="grade_select_2b" className={cn('h-10 w-full rounded-xl', accent.focus)}>
                  <SelectValue placeholder={strings.form3.selectGrade}>
                    {(value: any) => {
                      const grade = value ? gradeById.get(Number(value)) : undefined
                      return grade ? gradeLabel(grade) : strings.form3.selectGrade
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {officerGrades.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="font-bold text-slate-500">
                        {strings.form3.officerRowLabel}
                      </SelectLabel>
                      {officerGrades.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)} className="rounded-lg py-2">
                          {gradeLabel(g)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {staffGrades.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="font-bold text-slate-500">
                        {strings.form3.staffRowLabel}
                      </SelectLabel>
                      {staffGrades.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)} className="rounded-lg py-2">
                          {gradeLabel(g)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Count */}
              <div className="space-y-1.5">
                <Label htmlFor="count_input_2b" className="text-xs font-bold text-slate-700">
                  {strings.form3.countColumn}
                </Label>
                <Input
                  id="count_input_2b"
                  type="number"
                  min="0"
                  placeholder="যেমন: ১"
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                  className={cn('h-10 rounded-xl font-mono', accent.focus)}
                />
              </div>

              {/* Total Basic */}
              <div className="space-y-1.5">
                <Label htmlFor="basic_input_2b" className="text-xs font-bold text-slate-700">
                  {strings.form3.basicColumn}
                </Label>
                <Input
                  id="basic_input_2b"
                  type="number"
                  min="0"
                  placeholder="যেমন: ৩৫০০০"
                  value={basicInput}
                  onChange={(e) => setBasicInput(e.target.value)}
                  className={cn('h-10 rounded-xl font-mono', accent.focus)}
                />
              </div>
            </div>

            {/* Due Salary */}
            <div className="space-y-1.5">
              <Label htmlFor="due_input_2b" className="text-xs font-bold text-slate-700">
                {strings.form3.modalDueSalaryColumn}
              </Label>
              <Input
                id="due_input_2b"
                type="number"
                min="0"
                placeholder="ঐচ্ছিক (বকেয়া থাকলে)"
                value={dueInput}
                onChange={(e) => setDueInput(e.target.value)}
                className={cn('h-10 rounded-xl font-mono', accent.focus)}
              />
            </div>
          </div>

          <DialogFooter className="rounded-b-3xl gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestClose}
              className="rounded-xl text-xs font-semibold"
            >
              {strings.close}
            </Button>
            <Button
              type="button"
              onClick={handleSaveModalRow}
              disabled={!selectedGrade || (!countInput && !basicInput)}
              className={cn('rounded-xl text-xs font-bold', accent.solidButton)}
            >
              {editingGradeId !== null ? 'সংরক্ষণ করুন' : 'যোগ করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM CLOSE MODAL */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-2xl bg-amber-100 p-2.5 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-extrabold text-slate-900">
                {strings.form3.confirmCloseTitle}
              </DialogTitle>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {strings.form3.confirmCloseDesc}
              </p>
            </div>
          </div>

          <DialogFooter className="rounded-b-3xl gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={resetModalFields}
              className="rounded-xl text-xs font-semibold"
            >
              {strings.form3.discardAndClose}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowConfirmClose(false)
                handleSaveModalRow()
              }}
              className={cn('rounded-xl text-xs font-bold', accent.solidButton)}
            >
              {strings.form3.saveAndClose}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE MODAL */}
      <Dialog
        open={gradeToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setGradeToDelete(null)
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-2xl bg-red-100 p-2.5 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-extrabold text-slate-900">
                {strings.form3.confirmDeleteTitle}
              </DialogTitle>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {gradeToDelete
                  ? `গ্রেড ${toBanglaNumber(gradeById.get(gradeToDelete)?.grade_no ?? gradeToDelete)} এর `
                  : ''}
                {strings.form3.confirmDeleteDesc}
              </p>
            </div>
          </div>

          <DialogFooter className="rounded-b-3xl gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGradeToDelete(null)}
              className="rounded-xl text-xs font-semibold"
            >
              {strings.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700"
            >
              মুছে ফেলুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormShell>
  )
}
