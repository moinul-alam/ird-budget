'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaNumber } from '@/lib/bangla'
import { AmountField } from '@/components/amount-field'
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
import { saveFormStaffSuspendedRows, deleteFormStaffSuspendedRow } from '@/lib/actions/forms/staff'
import type { FormStaffSuspendedInitial } from '@/lib/office/load-form-data'
import { Plus, Trash2, Edit2, UserX, Users, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useTransition, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import { HazarAmount } from '@/components/hazar-amount'

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
  initialData: FormStaffSuspendedInitial
  submissionId: number | null
  grades: GradeRow[]
  /**
   * The cycle's বেতন-মাস — the engine's own annualising multiplier. The summary's
   * বার্ষিক box is computed with it so the figure the office sees is the one the
   * sheet will carry, never a month count this form assumed.
   */
  salaryMonths: number
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

/**
 * One grade table. Officers and staff differ only in wording and tint, so both render
 * through this one shell — fixed column widths and a centered numeric edge, which
 * is what keeps the figures in a straight line down the table.
 */
function GradeTable({
  title,
  dotClass,
  headerClass,
  countColumnLabel,
  rows,
  gradeNoOf,
  rowAction,
  showDue,
  onEdit,
  onDelete,
}: {
  title: string
  dotClass: string
  headerClass: string
  countColumnLabel: string
  rows: SuspendedStaffRow[]
  gradeNoOf: (row: SuspendedStaffRow) => number
  rowAction: string
  /** Arrears are the exception, not the rule — with none entered the column is just
   *  noise, so it is dropped and the remaining columns take back its width. */
  showDue: boolean
  onEdit: (row: SuspendedStaffRow) => void
  onDelete: (gradeId: number) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className={cn('flex items-center gap-2 border-b px-4 py-2.5', headerClass)}>
        <span className={cn('h-2 w-2 rounded-full', dotClass)} />
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>

      <Table className="min-w-[640px] table-fixed">
        <TableHeader>
          <TableRow className="border-slate-100 hover:bg-transparent">
            <TableHead className={cn(COL_HEAD, 'text-center', showDue ? 'w-[8%]' : 'w-[10%]')}>{strings.form3.serialColumn}</TableHead>
            <TableHead className={cn(COL_HEAD, 'text-center', showDue ? 'w-[16%]' : 'w-[20%]')}>{strings.form3.gradeColumn}</TableHead>
            <TableHead className={cn(COL_HEAD, 'text-center', showDue ? 'w-[16%]' : 'w-[20%]')}>{countColumnLabel}</TableHead>
            <TableHead className={cn(COL_HEAD, 'text-center', showDue ? 'w-[24%]' : 'w-[30%]')}>{strings.form3.basicColumn}</TableHead>
            {showDue && (
              <TableHead className={cn(COL_HEAD, 'w-[24%] text-center')}>{strings.form3.tableDueSalaryColumn}</TableHead>
            )}
            <TableHead className={cn(COL_HEAD, 'text-center', showDue ? 'w-[12%]' : 'w-[20%]')}>অ্যাকশন</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={row.grade_id} className="border-slate-100 even:bg-slate-50/50 hover:bg-orange-50/40">
              <TableCell className="px-4 py-2.5 text-center text-slate-400">
                {toBanglaNumber(idx + 1)}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-center font-bold text-slate-800">
                গ্রেড {toBanglaNumber(gradeNoOf(row))}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-center font-semibold text-slate-700">
                {toBanglaNumber(row.suspended_count)} {strings.form3.personUnit}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-center font-semibold text-slate-900">
                <HazarAmount taka={row.suspended_total_basic} />
              </TableCell>
              {showDue && (
                <TableCell className="px-4 py-2.5 text-center font-medium text-slate-600">
                  <HazarAmount taka={row.suspended_due_salary} />
                </TableCell>
              )}
              <TableCell className="px-4 py-2.5">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(row)}
                    className={cn('h-8 w-8 p-0', rowAction)}
                    title="সম্পাদনা করুন"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(row.grade_id)}
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
  )
}

export function Form3Client({ initialData, submissionId, grades, salaryMonths }: Form3ClientProps) {
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

  // The count as the row will hold it, and whether a figure was typed without one. A
  // salary is what the headcount is paid for, so a row carrying one with no count would
  // be stored against nobody: the modal refuses to commit it, and `guardStaffCount`
  // re-applies the same rule on the server.
  const countValue = parseInt(countInput, 10) || 0
  const countMissing = Boolean(basicInput.trim() || dueInput.trim()) && countValue <= 0
  const canCommitRow = Boolean(selectedGrade) && countValue > 0

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

  // The modal's inputs as a row, or null when the grade is not usable yet — which
  // includes a row with no headcount, since the salary would then belong to nobody.
  const modalRowFromInputs = (): SuspendedStaffRow | null => {
    const gradeId = parseInt(selectedGrade, 10)
    if (!gradeId || isNaN(gradeId) || countValue <= 0) return null
    return {
      grade_id: gradeId,
      suspended_count: countValue,
      suspended_total_basic: parseFloat(basicInput) || 0,
      suspended_due_salary: parseFloat(dueInput) || 0,
    }
  }

  // Rows are keyed by grade, so a save replaces that grade's row and re-sorts.
  // Pure, so both save buttons commit through exactly the same rule.
  const rowsWithSaved = (newRow: SuspendedStaffRow) => {
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
        await deleteFormStaffSuspendedRow(submissionId, gradeId)
      })
    }
  }

  // Officers and staff are told apart by the grade's own category, and the
  // grade number is read from the reference row rather than assumed from the id.
  // Memoised on `gradeById` so the derived lists below stay stable on renders that
  // only touch `rows`.
  const gradeNoOf = useCallback(
    (row: SuspendedStaffRow) => gradeById.get(row.grade_id)?.grade_no ?? row.grade_id,
    [gradeById]
  )
  const isOfficer = useCallback(
    (row: SuspendedStaffRow) => gradeById.get(row.grade_id)?.category === 'officer',
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
    let officerAnnual = 0
    let staffCount = 0
    let staffBasic = 0
    let staffDue = 0
    let staffAnnual = 0

    rows.forEach((r) => {
      // The engine's own salary formula: a month of basic stretched over বেতন-মাস,
      // plus the arrears, which are added once and never multiplied.
      const annual = (r.suspended_total_basic || 0) * salaryMonths + (r.suspended_due_salary || 0)
      if (isOfficer(r)) {
        officerCount += r.suspended_count || 0
        officerBasic += r.suspended_total_basic || 0
        officerDue += r.suspended_due_salary || 0
        officerAnnual += annual
      } else {
        staffCount += r.suspended_count || 0
        staffBasic += r.suspended_total_basic || 0
        staffDue += r.suspended_due_salary || 0
        staffAnnual += annual
      }
    })

    return {
      officerCount,
      officerBasic,
      officerDue,
      officerAnnual,
      staffCount,
      staffBasic,
      staffDue,
      staffAnnual,
    }
  }, [rows, isOfficer, salaryMonths])

  // Arrears only earn their space when someone actually has them.
  const hasDue = summary.officerDue > 0 || summary.staffDue > 0

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
        {/* Toolbar — the one entry point for a new grade row, with the হাজার-unit
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
            <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-base font-medium text-slate-600">{strings.form3.emptyState}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Officer Table */}
            {officerRows.length > 0 && (
              <GradeTable
                title={strings.form3.officerTableTitle}
                dotClass={accent.officerDot}
                headerClass={accent.officerHeader}
                countColumnLabel={strings.form3.officerCountColumn}
                rows={officerRows}
                gradeNoOf={gradeNoOf}
                rowAction={accent.rowAction}
                showDue={hasDue}
                onEdit={openEditModal}
                onDelete={setGradeToDelete}
              />
            )}

            {/* Staff Table */}
            {staffRows.length > 0 && (
              <GradeTable
                title={strings.form3.staffTableTitle}
                dotClass={accent.staffDot}
                headerClass={accent.staffHeader}
                countColumnLabel={strings.form3.staffCountColumn}
                rows={staffRows}
                gradeNoOf={gradeNoOf}
                rowAction={accent.rowAction}
                showDue={hasDue}
                onEdit={openEditModal}
                onDelete={setGradeToDelete}
              />
            )}
          </div>
        )}

        {/* Summary Card — one row per employee category, four boxes inside each */}
        {rows.length > 0 && (
          <Card className={cn('border shadow-xs', accent.card)}>
            <CardContent className="space-y-4 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                {strings.form3.summaryTitle}
              </h3>

              {/* A category with no rows has nothing to summarise, so its block is
                  simply absent — the office only ever sees what it actually entered. */}
              {officerRows.length > 0 && (
                <div className={cn('rounded-2xl border p-3.5', accent.officerRow)}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', accent.officerDot)} />
                    <span className="text-xs font-bold text-slate-700">
                      {strings.form3.officerRowLabel}
                    </span>
                  </div>
                  <div className={cn('grid grid-cols-1 gap-3', hasDue ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
                    <SummaryBox
                      label={strings.form3.officerCountLabel}
                      value={`${toBanglaNumber(summary.officerCount)} ${strings.form3.personUnit}`}
                    />
                    <SummaryBox
                      label={strings.form3.monthlyBasicSummaryLabel}
                      value={<HazarAmount taka={summary.officerBasic} />}
                      valueClass={accent.officerValue}
                    />
                    {hasDue && (
                      <SummaryBox
                        label={strings.form3.dueSummaryLabel}
                        value={<HazarAmount taka={summary.officerDue} />}
                      />
                    )}
                    <SummaryBox
                      label={strings.form3.annualSummaryLabel}
                      value={<HazarAmount taka={summary.officerAnnual} />}
                    />
                  </div>
                </div>
              )}

              {staffRows.length > 0 && (
                <div className={cn('rounded-2xl border p-3.5', accent.staffRow)}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', accent.staffDot)} />
                    <span className="text-xs font-bold text-slate-700">
                      {strings.form3.staffRowLabel}
                    </span>
                  </div>
                  <div className={cn('grid grid-cols-1 gap-3', hasDue ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
                    <SummaryBox
                      label={strings.form3.staffCountLabel}
                      value={`${toBanglaNumber(summary.staffCount)} ${strings.form3.personUnit}`}
                    />
                    <SummaryBox
                      label={strings.form3.monthlyBasicSummaryLabel}
                      value={<HazarAmount taka={summary.staffBasic} />}
                      valueClass={accent.staffValue}
                    />
                    {hasDue && (
                      <SummaryBox
                        label={strings.form3.dueSummaryLabel}
                        value={<HazarAmount taka={summary.staffDue} />}
                      />
                    )}
                    <SummaryBox
                      label={strings.form3.annualSummaryLabel}
                      value={<HazarAmount taka={summary.staffAnnual} />}
                    />
                  </div>
                </div>
              )}
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
                    {(value: unknown) => {
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
                {countMissing && (
                  <p className="text-[11px] font-bold leading-4 text-rose-600">
                    {strings.countMissing}
                  </p>
                )}
              </div>

              {/* Total Basic */}
              <div className="space-y-1.5">
                <Label htmlFor="basic_input_2b" className="text-xs font-bold text-slate-700">
                  {strings.form3.basicColumn}
                </Label>
                <AmountField
                  id="basic_input_2b"
                  placeholder="যেমন: ৩৫"
                  value={basicInput}
                  onValueChange={(taka) => setBasicInput(taka)}
                  className={cn('h-10 rounded-xl font-mono', accent.focus)}
                />
              </div>
            </div>

            {/* Due Salary */}
            <div className="space-y-1.5">
              <Label htmlFor="due_input_2b" className="text-xs font-bold text-slate-700">
                {strings.form3.modalDueSalaryColumn}
              </Label>
              <AmountField
                id="due_input_2b"
                placeholder="ঐচ্ছিক (বকেয়া থাকলে)"
                value={dueInput}
                onValueChange={(taka) => setDueInput(taka)}
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
                disabled={!canCommitRow}
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
