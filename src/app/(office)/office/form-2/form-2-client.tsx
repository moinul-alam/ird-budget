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
import { saveFormStaffActiveRows, deleteFormStaffActiveRow } from '@/lib/actions/forms/staff'
import { Plus, Trash2, Edit2, Users, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useTransition, useMemo, useCallback } from 'react'

export interface ActiveStaffRow {
  grade_id: number
  count: number
  total_basic: number
  due_salary: number
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

interface Form2ClientProps {
  initialData: ActiveStaffRow[]
  submissionId: number | null
  grades: GradeRow[]
}

/**
 * Colour profile of this form. Forms 2, 3 and 4 share one layout — only these
 * class strings differ, so the three stay structurally identical while reading
 * as distinct colours (2 blue, 3 orange, 4 green).
 */
const accent = {
  solidButton: 'bg-blue-600 hover:bg-blue-700 text-white',
  softIcon: 'bg-blue-100 text-blue-600',
  emptyButton: 'text-blue-600 border-blue-200 hover:bg-blue-50',
  rowAction: 'text-slate-500 hover:text-blue-600 hover:bg-blue-50',
  focus: 'focus-visible:border-blue-500 focus-visible:ring-blue-500/25',
  officerDot: 'bg-blue-600',
  staffDot: 'bg-blue-300',
  officerHeader: 'bg-blue-50/70 border-blue-100',
  staffHeader: 'bg-slate-100/80 border-slate-200',
  card: 'bg-gradient-to-br from-slate-50 to-blue-50/40 border-blue-100',
  officerRow: 'border-blue-200/70 bg-blue-50/40',
  staffRow: 'border-slate-200 bg-slate-50/70',
  officerValue: 'text-blue-700',
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

export function Form2Client({ initialData, submissionId, grades }: Form2ClientProps) {
  const gradeById = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades])

  const initialRows = useMemo(
    () =>
      (initialData || [])
        .filter((r) => r.count > 0 || r.total_basic > 0 || r.due_salary > 0)
        .sort((a, b) => a.grade_id - b.grade_id),
    [initialData]
  )

  const [rows, setRows] = useState<ActiveStaffRow[]>(initialRows)
  // Last state known to be stored in the database — the diff against `rows`
  // is what tells the shell there is something worth saving.
  const [savedRows, setSavedRows] = useState<ActiveStaffRow[]>(initialRows)

  const [, startTransition] = useTransition()

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

  // Available grades for adding (excluding already added grades, except the one currently editing)
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

  const openEditModal = (row: ActiveStaffRow) => {
    setEditingGradeId(row.grade_id)
    setSelectedGrade(String(row.grade_id))
    setCountInput(row.count ? String(row.count) : '')
    setBasicInput(row.total_basic ? String(row.total_basic) : '')
    setDueInput(row.due_salary ? String(row.due_salary) : '')
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

  // The modal's inputs as a row, or null when the grade is not usable yet.
  const modalRowFromInputs = (): ActiveStaffRow | null => {
    const gradeId = parseInt(selectedGrade, 10)
    if (!gradeId || isNaN(gradeId)) return null
    return {
      grade_id: gradeId,
      count: parseInt(countInput, 10) || 0,
      total_basic: parseFloat(basicInput) || 0,
      due_salary: parseFloat(dueInput) || 0,
    }
  }

  // Rows are keyed by grade, so a save replaces that grade's row and re-sorts.
  // Pure, so both save buttons commit through exactly the same rule.
  const rowsWithSaved = (newRow: ActiveStaffRow) => {
    const gradeId = newRow.grade_id
    const base =
      editingGradeId !== null && editingGradeId !== gradeId
        ? rows.filter((r) => r.grade_id !== editingGradeId)
        : rows

    const existsIndex = base.findIndex((r) => r.grade_id === gradeId)
    const next =
      existsIndex >= 0
        ? base.map((r, i) => (i === existsIndex ? newRow : r))
        : [...base, newRow]
    return [...next].sort((a, b) => a.grade_id - b.grade_id)
  }

  // Save row from modal
  const handleSaveModalRow = () => {
    const newRow = modalRowFromInputs()
    if (!newRow) return
    setRows(rowsWithSaved(newRow))
    resetModalFields()
  }

  // Save row and stay open on the next unused grade, so a run of grades can be
  // entered without reopening the modal for each one.
  const handleSaveAndAddMore = () => {
    const newRow = modalRowFromInputs()
    if (!newRow) return
    const nextRows = rowsWithSaved(newRow)
    setRows(nextRows)

    setEditingGradeId(null)
    setCountInput('')
    setBasicInput('')
    setDueInput('')
    setShowConfirmClose(false)

    const used = new Set(nextRows.map((r) => r.grade_id))
    const nextGrade = grades.find((g) => !used.has(g.id))
    setSelectedGrade(nextGrade ? String(nextGrade.id) : '')
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
        await deleteFormStaffActiveRow(submissionId, gradeId)
      })
    }
  }

  // Officers and staff are told apart by the grade's own category, and the
  // grade number is read from the reference row rather than assumed from the id.
  // Memoised on `gradeById` so the derived lists below stay stable on renders that
  // only touch `rows`.
  const gradeNoOf = useCallback(
    (row: ActiveStaffRow) => gradeById.get(row.grade_id)?.grade_no ?? row.grade_id,
    [gradeById]
  )
  const isOfficer = useCallback(
    (row: ActiveStaffRow) => gradeById.get(row.grade_id)?.category === 'officer',
    [gradeById]
  )

  const officerRows = useMemo(
    () => rows.filter(isOfficer).sort((a, b) => gradeNoOf(a) - gradeNoOf(b)),
    [rows, isOfficer, gradeNoOf]
  )

  const staffRows = useMemo(
    () => rows.filter((r) => !isOfficer(r)).sort((a, b) => gradeNoOf(a) - gradeNoOf(b)),
    [rows, isOfficer, gradeNoOf]
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
        officerCount += r.count || 0
        officerBasic += r.total_basic || 0
        officerDue += r.due_salary || 0
      } else {
        staffCount += r.count || 0
        staffBasic += r.total_basic || 0
        staffDue += r.due_salary || 0
      }
    })

    return { officerCount, officerBasic, officerDue, staffCount, staffBasic, staffDue }
  }, [rows, isOfficer])

  // Save entire form state to database
  const handleSaveAll = async () => {
    if (!submissionId) return
    const result = await saveFormStaffActiveRows(submissionId, rows)
    if (!result || typeof result !== 'object' || !('error' in result) || !result.error) {
      setSavedRows(rows)
    }
    return result
  }

  return (
    <FormShell
      title={strings.form2.title}
      formNumber={2}
      prevHref="/office/form-1"
      nextHref="/office/form-3"
      onSave={submissionId ? handleSaveAll : undefined}
      dirty={dirty}
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Top Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              কর্মকর্তা ও কর্মচারীর বেতন বিবরণী (কর্মরত)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              প্রয়োজনীয় গ্রেড নির্বাচন করে কর্মকর্তা ও কর্মচারীর সংখ্যা ও মাসিক মোট মূল বেতন যোগ করুন।
            </p>
          </div>
          <Button
            type="button"
            onClick={openAddModal}
            className={cn('shrink-0 gap-1.5 rounded-xl', accent.solidButton)}
            disabled={availableGrades.length === 0}
          >
            <Plus className="h-4 w-4" />
            {strings.form2.addButton}
          </Button>
        </div>

        {/* Data Tables or Empty State */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium text-base mb-2">
              {strings.form2.emptyState}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={openAddModal}
              className={cn('mt-2 rounded-xl', accent.emptyButton)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {strings.form2.addButton}
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
                    {strings.form2.officerTableTitle}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    মোট: {toBanglaNumber(officerRows.length)} টি গ্রেড
                  </span>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-28 font-bold text-slate-700">{strings.form2.gradeColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form2.officerCountColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form2.basicColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form2.tableDueSalaryColumn}</TableHead>
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
                          {toBanglaNumber(row.count)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-slate-800">
                          {toBanglaAmount(row.total_basic)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {row.due_salary ? toBanglaAmount(row.due_salary) : '—'}
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
                    {strings.form2.staffTableTitle}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    মোট: {toBanglaNumber(staffRows.length)} টি গ্রেড
                  </span>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-28 font-bold text-slate-700">{strings.form2.gradeColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form2.staffCountColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form2.basicColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form2.tableDueSalaryColumn}</TableHead>
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
                          {toBanglaNumber(row.count)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-slate-800">
                          {toBanglaAmount(row.total_basic)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {row.due_salary ? toBanglaAmount(row.due_salary) : '—'}
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
                {strings.form2.summaryTitle}
              </h3>

              {/* কর্মকর্তা */}
              <div className={cn('rounded-2xl border p-3.5', accent.officerRow)}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', accent.officerDot)} />
                  <span className="text-xs font-bold text-slate-700">
                    {strings.form2.officerRowLabel}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SummaryBox
                    label={strings.form2.officerCountLabel}
                    value={`${toBanglaNumber(summary.officerCount)} ${strings.form2.personUnit}`}
                  />
                  <SummaryBox
                    label={strings.form2.monthlyBasicSummaryLabel}
                    value={`${toBanglaAmount(summary.officerBasic)} টাকা`}
                    valueClass={accent.officerValue}
                  />
                  <SummaryBox
                    label={strings.form2.dueSummaryLabel}
                    value={summary.officerDue ? `${toBanglaAmount(summary.officerDue)} টাকা` : '—'}
                  />
                </div>
              </div>

              {/* কর্মচারী */}
              <div className={cn('rounded-2xl border p-3.5', accent.staffRow)}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', accent.staffDot)} />
                  <span className="text-xs font-bold text-slate-700">
                    {strings.form2.staffRowLabel}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SummaryBox
                    label={strings.form2.staffCountLabel}
                    value={`${toBanglaNumber(summary.staffCount)} ${strings.form2.personUnit}`}
                  />
                  <SummaryBox
                    label={strings.form2.monthlyBasicSummaryLabel}
                    value={`${toBanglaAmount(summary.staffBasic)} টাকা`}
                    valueClass={accent.staffValue}
                  />
                  <SummaryBox
                    label={strings.form2.dueSummaryLabel}
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
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-extrabold text-slate-900">
                {editingGradeId !== null ? strings.form2.editModalTitle : strings.form2.modalTitle}
              </DialogTitle>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {strings.form2.modalSubtitle}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Grade Selector — grouped by employee category */}
            <div className="space-y-1.5">
              <Label htmlFor="grade_select" className="text-xs font-bold text-slate-700">
                {strings.form2.gradeColumn}
              </Label>
              <Select value={selectedGrade} onValueChange={(val) => setSelectedGrade(val ?? '')}>
                <SelectTrigger id="grade_select" className={cn('h-10 w-full rounded-xl', accent.focus)}>
                  <SelectValue placeholder={strings.form2.selectGrade}>
                    {(value: unknown) => {
                      const grade = value ? gradeById.get(Number(value)) : undefined
                      return grade ? gradeLabel(grade) : strings.form2.selectGrade
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {officerGrades.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="font-bold text-slate-500">
                        {strings.form2.officerRowLabel}
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
                        {strings.form2.staffRowLabel}
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
                <Label htmlFor="count_input" className="text-xs font-bold text-slate-700">
                  {strings.form2.countColumn}
                </Label>
                <Input
                  id="count_input"
                  type="number"
                  min="0"
                  placeholder="যেমন: ৩"
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                  className={cn('h-10 rounded-xl font-mono', accent.focus)}
                />
              </div>

              {/* Total Basic */}
              <div className="space-y-1.5">
                <Label htmlFor="basic_input" className="text-xs font-bold text-slate-700">
                  {strings.form2.basicColumn}
                </Label>
                <Input
                  id="basic_input"
                  type="number"
                  min="0"
                  placeholder="যেমন: ১০৫০০০"
                  value={basicInput}
                  onChange={(e) => setBasicInput(e.target.value)}
                  className={cn('h-10 rounded-xl font-mono', accent.focus)}
                />
              </div>
            </div>

            {/* Due Salary */}
            <div className="space-y-1.5">
              <Label htmlFor="due_input" className="text-xs font-bold text-slate-700">
                {strings.form2.modalDueSalaryColumn}
              </Label>
              <Input
                id="due_input"
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
            {editingGradeId === null && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndAddMore}
                disabled={!selectedGrade || (!countInput && !basicInput)}
                className={cn('rounded-xl text-xs font-bold', accent.emptyButton)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {strings.saveAndAddMore}
              </Button>
            )}
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

      {/* CONFIRM CLOSE MODAL (Prompt when accidentally closing with entered data) */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-2xl bg-amber-100 p-2.5 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-extrabold text-slate-900">
                {strings.form2.confirmCloseTitle}
              </DialogTitle>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {strings.form2.confirmCloseDesc}
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
              {strings.form2.discardAndClose}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowConfirmClose(false)
                handleSaveModalRow()
              }}
              className={cn('rounded-xl text-xs font-bold', accent.solidButton)}
            >
              {strings.form2.saveAndClose}
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
                {strings.form2.confirmDeleteTitle}
              </DialogTitle>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {gradeToDelete
                  ? `গ্রেড ${toBanglaNumber(gradeById.get(gradeToDelete)?.grade_no ?? gradeToDelete)} এর `
                  : ''}
                {strings.form2.confirmDeleteDesc}
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
