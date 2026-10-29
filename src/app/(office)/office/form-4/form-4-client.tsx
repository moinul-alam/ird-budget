'use client'

import { FormShell } from '@/components/form-shell'
import { strings } from '@/lib/strings'
import { toBanglaHazar, toBanglaNumber } from '@/lib/bangla'
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
import { saveFormNewStaffRows, NewStaffRecord } from '@/lib/actions/forms/staff'
import { Plus, Trash2, Edit2, UserPlus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useTransition, useMemo, useCallback } from 'react'

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

interface Form4ClientProps {
  initialData: NewStaffRecord[]
  submissionId: number | null
  fiscalYear: string
  grades: GradeRow[]
}

/**
 * Colour profile of this form. Forms 2, 3 and 4 share one layout — only these
 * class strings differ, so the three stay structurally identical while reading
 * as distinct colours (2 blue, 3 orange, 4 green).
 */
const accent = {
  solidButton: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  softIcon: 'bg-emerald-100 text-emerald-600',
  emptyButton: 'text-emerald-600 border-emerald-200 hover:bg-emerald-50',
  rowAction: 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50',
  focus: 'focus-visible:border-emerald-500 focus-visible:ring-emerald-500/25',
  officerDot: 'bg-emerald-600',
  staffDot: 'bg-emerald-300',
  officerHeader: 'bg-emerald-50/70 border-emerald-100',
  staffHeader: 'bg-slate-100/80 border-slate-200',
  card: 'bg-gradient-to-br from-slate-50 to-emerald-50/40 border-emerald-100',
  officerRow: 'border-emerald-200/70 bg-emerald-50/40',
  staffRow: 'border-slate-200 bg-slate-50/70',
  officerValue: 'text-emerald-700',
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

/**
 * Calculates remaining months in a Bangladesh fiscal year (July 1 to June 30).
 * E.g. FY 2026-2027:
 * - 2027-02-15 is in FY -> remaining months in FY (Feb, Mar, Apr, May, Jun) = 5
 * - If outside the FY range -> returns 0
 */
function calculateRemainingMonths(dateStr: string, fiscalYear: string): { months: number; inRange: boolean } {
  if (!dateStr) return { months: 0, inRange: false }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { months: 0, inRange: false }

  const year = d.getFullYear()
  const month = d.getMonth() + 1 // 1-12

  // Parse fiscal year e.g. "2026-2027" or "2026-27"
  const parts = fiscalYear.split(/[-–/]/).map((p) => parseInt(p.trim(), 10))
  let startYear = 2026
  let endYear = 2027
  if (parts.length >= 2 && !isNaN(parts[0])) {
    startYear = parts[0]
    endYear = parts[1] < 100 ? Math.floor(startYear / 100) * 100 + parts[1] : parts[1]
  }

  // FY runs from July 1, startYear to June 30, endYear
  const isFirstHalf = year === startYear && month >= 7 && month <= 12
  const isSecondHalf = year === endYear && month >= 1 && month <= 6

  if (!isFirstHalf && !isSecondHalf) {
    return { months: 0, inRange: false }
  }

  // If July - Dec of startYear: months = (12 - month + 1) + 6 = 19 - month
  // If Jan - Jun of endYear: months = 6 - month + 1 = 7 - month
  const months = isFirstHalf ? 19 - month : 7 - month
  return { months, inRange: true }
}

export function Form4Client({ initialData, submissionId, fiscalYear, grades }: Form4ClientProps) {
  const gradeById = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades])

  const initialRows = useMemo(
    () =>
      (initialData || [])
        .filter((r) => r.count > 0 || r.monthly_basic > 0 || r.total_salary > 0)
        .sort((a, b) => a.grade_id - b.grade_id),
    [initialData]
  )

  const [rows, setRows] = useState<NewStaffRecord[]>(initialRows)
  // Last state known to be stored in the database — the diff against `rows`
  // is what tells the shell there is something worth saving.
  const [savedRows, setSavedRows] = useState<NewStaffRecord[]>(initialRows)
  const [, startTransition] = useTransition()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [countInput, setCountInput] = useState('')
  const [basicInput, setBasicInput] = useState('')
  const [dateInput, setDateInput] = useState('')

  // Confirmation on accidental close
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  // Confirmation on delete
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  const dirty = useMemo(
    () => JSON.stringify(rows) !== JSON.stringify(savedRows),
    [rows, savedRows]
  )

  // নবনিয়োগ is staff-only: grades 11–20, i.e. every grade whose category is
  // not কর্মকর্তা, as resolved from the reference table — never a grade guess.
  const staffGrades = useMemo(() => grades.filter((g) => g.category !== 'officer'), [grades])
  const gradeLabel = (g: GradeRow) => `গ্রেড ${toBanglaNumber(g.grade_no)} (${g.category_bn})`

  // Compute remaining months live for modal
  const modalDateInfo = useMemo(() => {
    return calculateRemainingMonths(dateInput, fiscalYear)
  }, [dateInput, fiscalYear])

  const modalTotalSalary = useMemo(() => {
    const b = parseFloat(basicInput) || 0
    return b * modalDateInfo.months
  }, [basicInput, modalDateInfo.months])

  const hasModalDirtyData = useMemo(() => {
    return Boolean(
      selectedGrade ||
      countInput.trim() ||
      basicInput.trim() ||
      dateInput.trim()
    )
  }, [selectedGrade, countInput, basicInput, dateInput])

  const openAddModal = () => {
    setEditingIndex(null)
    setSelectedGrade(staffGrades[0]?.id ? String(staffGrades[0].id) : '')
    setCountInput('')
    setBasicInput('')
    setDateInput('')
    setIsModalOpen(true)
  }

  const openEditModal = (index: number) => {
    const row = rows[index]
    if (!row) return
    setEditingIndex(index)
    setSelectedGrade(String(row.grade_id))
    setCountInput(row.count ? String(row.count) : '')
    setBasicInput(row.monthly_basic ? String(row.monthly_basic) : '')
    setDateInput(row.expected_date || '')
    setIsModalOpen(true)
  }

  const resetModalFields = () => {
    setEditingIndex(null)
    setSelectedGrade('')
    setCountInput('')
    setBasicInput('')
    setDateInput('')
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
  const modalRowFromInputs = (): NewStaffRecord | null => {
    const gradeId = parseInt(selectedGrade, 10)
    if (!gradeId || isNaN(gradeId)) return null
    const { months } = calculateRemainingMonths(dateInput, fiscalYear)
    const monthlyBasic = parseFloat(basicInput) || 0
    return {
      grade_id: gradeId,
      count: parseInt(countInput, 10) || 0,
      monthly_basic: monthlyBasic,
      expected_date: dateInput,
      remaining_months: months,
      total_salary: monthlyBasic * months,
    }
  }

  // Save row from modal — kept in local state, persisted by the shell save.
  const handleSaveModalRow = () => {
    const newRow = modalRowFromInputs()
    if (!newRow) return

    setRows((prev) => {
      if (editingIndex !== null) {
        const next = [...prev]
        next[editingIndex] = newRow
        return next
      }
      return [...prev, newRow]
    })

    resetModalFields()
  }

  // Save row and stay open on cleared fields, so a run of new recruits can be
  // entered without reopening the modal for each one. Several rows may share a
  // grade, so the same grade stays selectable.
  const handleSaveAndAddMore = () => {
    const newRow = modalRowFromInputs()
    if (!newRow) return
    setRows((prev) => [...prev, newRow])

    setEditingIndex(null)
    setCountInput('')
    setBasicInput('')
    setDateInput('')
    setShowConfirmClose(false)
    setSelectedGrade(staffGrades[0]?.id ? String(staffGrades[0].id) : '')
  }

  // Delete row with confirmation — removed from the database right away.
  const handleConfirmDelete = () => {
    if (deleteIndex === null) return
    const nextRows = rows.filter((_, idx) => idx !== deleteIndex)
    setRows(nextRows)
    setSavedRows(nextRows)
    setDeleteIndex(null)

    if (submissionId) {
      startTransition(async () => {
        await saveFormNewStaffRows(submissionId, nextRows)
      })
    }
  }

  // The officer/staff split comes from `ref_grades.category`, not a fixed
  // grade-number range, so it stays correct if the admin edits the grade list.
  // Memoised on `gradeById` so the derived lists below stay stable on renders that
  // only touch `rows`.
  const gradeNoOf = useCallback(
    (row: NewStaffRecord) => gradeById.get(row.grade_id)?.grade_no ?? row.grade_id,
    [gradeById]
  )
  const isOfficer = useCallback(
    (row: NewStaffRecord) => gradeById.get(row.grade_id)?.category === 'officer',
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

  const totals = useMemo(() => {
    // `monthly_basic` is the grade's total monthly basic — the same figure forms
    // 2 and 3 store — so the one-month total is a plain sum. `total_salary` is
    // that figure stretched over the row's remaining months.
    const sumOfficers = officerRows.reduce(
      (acc, r) => ({
        count: acc.count + (r.count || 0),
        monthly_basic: acc.monthly_basic + (r.monthly_basic || 0),
        total_salary: acc.total_salary + (r.total_salary || 0),
      }),
      { count: 0, monthly_basic: 0, total_salary: 0 }
    )

    const sumStaff = staffRows.reduce(
      (acc, r) => ({
        count: acc.count + (r.count || 0),
        monthly_basic: acc.monthly_basic + (r.monthly_basic || 0),
        total_salary: acc.total_salary + (r.total_salary || 0),
      }),
      { count: 0, monthly_basic: 0, total_salary: 0 }
    )

    return {
      officers: sumOfficers,
      staff: sumStaff,
      grand: {
        count: sumOfficers.count + sumStaff.count,
        monthly_basic: sumOfficers.monthly_basic + sumStaff.monthly_basic,
        total_salary: sumOfficers.total_salary + sumStaff.total_salary,
      },
    }
  }, [officerRows, staffRows])

  // Rows may carry different dates, so the summary shows the range.
  const expectedDateText = useMemo(() => {
    const dates = rows.map((r) => r.expected_date).filter(Boolean).sort()
    if (dates.length === 0) return ''
    if (dates.length === 1) return toBanglaNumber(dates[0])
    return `${toBanglaNumber(dates[0])} – ${toBanglaNumber(dates[dates.length - 1])}`
  }, [rows])

  // Save entire form state to database
  const handleSaveAll = async () => {
    if (!submissionId) return
    const result = await saveFormNewStaffRows(submissionId, rows)
    if (!result || typeof result !== 'object' || !('error' in result) || !result.error) {
      setSavedRows(rows)
    }
    return result
  }

  return (
    <FormShell
      title={strings.form4.title}
      formNumber={4}
      prevHref="/office/form-3"
      nextHref="/office/form-5"
      onSave={submissionId ? handleSaveAll : undefined}
      dirty={dirty}
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Top Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">{strings.form4.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              অর্থবছর {toBanglaNumber(fiscalYear)}-এ {strings.form4.subtitle}
            </p>
          </div>
          <Button
            type="button"
            onClick={openAddModal}
            className={cn('shrink-0 gap-1.5 rounded-xl', accent.solidButton)}
            disabled={staffGrades.length === 0}
          >
            <Plus className="h-4 w-4" />
            {strings.form4.addButton}
          </Button>
        </div>

        {/* Data Tables or Empty State */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium text-base mb-2">{strings.form4.emptyState}</p>
            <Button
              type="button"
              variant="outline"
              onClick={openAddModal}
              className={cn('mt-2 rounded-xl', accent.emptyButton)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {strings.form4.addButtonEmpty}
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
                    {strings.form4.officerRowLabel}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    মোট পদ: {toBanglaNumber(totals.officers.count)} টি
                  </span>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-16 text-center font-bold text-slate-700">ক্রম</TableHead>
                      <TableHead className="w-28 font-bold text-slate-700">{strings.form4.gradeColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form4.countColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form4.basicColumn} ({strings.hazar.unit})</TableHead>
                      <TableHead className="text-center font-bold text-slate-700">{strings.form4.dateColumn}</TableHead>
                      <TableHead className="text-center font-bold text-slate-700">{strings.form4.monthsColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form4.totalSalaryColumn} ({strings.hazar.unit})</TableHead>
                      <TableHead className="w-24 text-center font-bold text-slate-700">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {officerRows.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/70">
                        <TableCell className="text-center font-mono text-xs text-slate-500">
                          {toBanglaNumber(idx + 1)}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-800">
                          গ্রেড {toBanglaNumber(gradeNoOf(row))}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">{toBanglaNumber(row.count)}</TableCell>
                        <TableCell className="text-right font-mono font-medium text-slate-800">
                          {toBanglaHazar(row.monthly_basic)}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {row.expected_date ? toBanglaNumber(row.expected_date) : '—'}
                        </TableCell>
                        <TableCell className={cn('text-center font-mono font-semibold', accent.officerValue)}>
                          {toBanglaNumber(row.remaining_months)} মাস
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-900">
                          {toBanglaHazar(row.total_salary)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(rows.indexOf(row))}
                              className={cn('h-8 w-8 p-0', accent.rowAction)}
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteIndex(rows.indexOf(row))}
                              className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t bg-slate-50/90 font-bold text-slate-800">
                      <TableCell colSpan={2} className="text-right pr-4">{strings.form4.subTotalOfficer}</TableCell>
                      <TableCell className="text-right font-mono">{toBanglaNumber(totals.officers.count)}</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell colSpan={2} className="text-center">—</TableCell>
                      <TableCell className={cn('text-right font-mono font-extrabold', accent.officerValue)}>
                        {toBanglaHazar(totals.officers.total_salary)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
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
                    {strings.form4.staffRowLabel}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    মোট পদ: {toBanglaNumber(totals.staff.count)} টি
                  </span>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-16 text-center font-bold text-slate-700">ক্রম</TableHead>
                      <TableHead className="w-28 font-bold text-slate-700">{strings.form4.gradeColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form4.countColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form4.basicColumn} ({strings.hazar.unit})</TableHead>
                      <TableHead className="text-center font-bold text-slate-700">{strings.form4.dateColumn}</TableHead>
                      <TableHead className="text-center font-bold text-slate-700">{strings.form4.monthsColumn}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{strings.form4.totalSalaryColumn} ({strings.hazar.unit})</TableHead>
                      <TableHead className="w-24 text-center font-bold text-slate-700">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffRows.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/70">
                        <TableCell className="text-center font-mono text-xs text-slate-500">
                          {toBanglaNumber(idx + 1)}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-800">
                          গ্রেড {toBanglaNumber(gradeNoOf(row))}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">{toBanglaNumber(row.count)}</TableCell>
                        <TableCell className="text-right font-mono font-medium text-slate-800">
                          {toBanglaHazar(row.monthly_basic)}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {row.expected_date ? toBanglaNumber(row.expected_date) : '—'}
                        </TableCell>
                        <TableCell className={cn('text-center font-mono font-semibold', accent.staffValue)}>
                          {toBanglaNumber(row.remaining_months)} মাস
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-900">
                          {toBanglaHazar(row.total_salary)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(rows.indexOf(row))}
                              className={cn('h-8 w-8 p-0', accent.rowAction)}
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteIndex(rows.indexOf(row))}
                              className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t bg-slate-50/90 font-bold text-slate-800">
                      <TableCell colSpan={2} className="text-right pr-4">{strings.form4.subTotalStaff}</TableCell>
                      <TableCell className="text-right font-mono">{toBanglaNumber(totals.staff.count)}</TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                      <TableCell colSpan={2} className="text-center">—</TableCell>
                      <TableCell className="text-right font-mono font-extrabold text-slate-900">
                        {toBanglaHazar(totals.staff.total_salary)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Summary Card */}
            <Card className={cn('border shadow-xs', accent.card)}>
              <CardContent className="space-y-4 p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  {strings.form4.summaryTitle}
                </h3>
                <div className={cn('rounded-2xl border p-3.5', accent.officerRow)}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', accent.officerDot)} />
                    <span className="text-xs font-bold text-slate-700">
                      {strings.form4.staffRowLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <SummaryBox
                      label={strings.form4.summaryCountLabel}
                      value={`${toBanglaNumber(totals.grand.count)} ${strings.form4.personUnit}`}
                    />
                    <SummaryBox
                      label={strings.form4.summaryBasicLabel}
                      value={`${toBanglaHazar(totals.grand.monthly_basic)} ${strings.hazar.unit}`}
                      valueClass={accent.officerValue}
                    />
                    <SummaryBox
                      label={strings.form4.summaryDateLabel}
                      value={expectedDateText || '—'}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleRequestClose()}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <div className="flex items-start gap-3">
            <div className={cn('shrink-0 rounded-2xl p-2.5', accent.softIcon)}>
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-extrabold text-slate-900">
                {editingIndex !== null ? strings.form4.editModalTitle : strings.form4.modalTitle}
              </DialogTitle>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {strings.form4.modalSubtitle}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Grade Selector — কর্মচারী grades only (১১ - ২০) */}
            <div className="space-y-1.5">
              <Label htmlFor="grade_select" className="text-xs font-bold text-slate-700">
                {strings.form4.gradeColumn}
              </Label>
              <Select value={selectedGrade} onValueChange={(val) => setSelectedGrade(val ?? '')}>
                <SelectTrigger id="grade_select" className={cn('h-10 w-full rounded-xl', accent.focus)}>
                  <SelectValue placeholder={strings.form4.selectGrade}>
                    {(value: unknown) => {
                      const grade = value ? gradeById.get(Number(value)) : undefined
                      return grade ? gradeLabel(grade) : strings.form4.selectGrade
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {staffGrades.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="font-bold text-slate-500">
                        {strings.form4.staffRowLabel}
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
                  {strings.form4.countColumn}
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

              {/* Monthly Basic Salary */}
              <div className="space-y-1.5">
                <Label htmlFor="basic_input" className="text-xs font-bold text-slate-700">
                  {strings.form4.basicColumn}
                </Label>
                <AmountField
                  id="basic_input"
                  placeholder="যেমন: ২২"
                  value={basicInput}
                  onValueChange={(taka) => setBasicInput(taka)}
                  className={cn('h-10 rounded-xl font-mono', accent.focus)}
                />
              </div>
            </div>

            {/* Expected Appointment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="expected_date" className="text-xs font-bold text-slate-700">
                {strings.form4.dateColumn}
              </Label>
              <Input
                id="expected_date"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className={cn('h-10 rounded-xl font-mono', accent.focus)}
              />
              <p className="text-[11px] text-slate-400">
                {strings.form4.fiscalYearLabel} {toBanglaNumber(fiscalYear)}
              </p>
            </div>

            {/* Live Calculation preview */}
            {dateInput && (
              <div
                className={cn(
                  'rounded-xl border p-3 text-xs space-y-1',
                  modalDateInfo.inRange
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                )}
              >
                <div className="flex justify-between">
                  <span>{strings.form4.rangeLabel}</span>
                  <span className="font-semibold">
                    {modalDateInfo.inRange ? strings.form4.inRange : strings.form4.outOfRange}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{strings.form4.remainingLabel}</span>
                  <span className="font-mono font-bold">
                    {toBanglaNumber(modalDateInfo.months)} {strings.form4.monthsUnit}
                  </span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-1">
                  <span className="font-bold">{strings.form4.estimatedCost}</span>
                  <span className="font-mono font-bold">{toBanglaHazar(modalTotalSalary)} {strings.hazar.unit}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="rounded-b-3xl gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestClose}
              className="rounded-xl text-xs font-semibold"
            >
              {strings.cancel}
            </Button>
            {editingIndex === null && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndAddMore}
                disabled={!selectedGrade || !countInput || !basicInput || !dateInput || !modalDateInfo.inRange}
                className={cn('rounded-xl text-xs font-bold', accent.emptyButton)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {strings.saveAndAddMore}
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSaveModalRow}
              disabled={!selectedGrade || !countInput || !basicInput || !dateInput || !modalDateInfo.inRange}
              className={cn('rounded-xl text-xs font-bold', accent.solidButton)}
            >
              {editingIndex !== null ? 'সংরক্ষণ করুন' : 'যোগ করুন'}
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
                {strings.form4.confirmCloseTitle}
              </DialogTitle>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {strings.form4.confirmCloseDesc}
              </p>
            </div>
          </div>

          <DialogFooter className="rounded-b-3xl gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmClose(false)}
              className="rounded-xl text-xs font-semibold"
            >
              {strings.form4.confirmCloseStay}
            </Button>
            <Button
              type="button"
              onClick={resetModalFields}
              className="rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700"
            >
              {strings.form4.confirmCloseLeave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE MODAL */}
      <Dialog
        open={deleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIndex(null)
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-2xl bg-red-100 p-2.5 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-extrabold text-slate-900">
                {strings.form4.confirmDeleteTitle}
              </DialogTitle>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {strings.form4.confirmDeleteDesc}
              </p>
            </div>
          </div>

          <DialogFooter className="rounded-b-3xl gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteIndex(null)}
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
