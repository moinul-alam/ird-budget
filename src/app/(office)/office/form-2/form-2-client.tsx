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
import { saveFormStaffActiveRows, deleteFormStaffActiveRow } from '@/app/actions/forms'
import { Plus, Trash2, Edit2, Users, AlertTriangle } from 'lucide-react'
import { useState, useTransition, useMemo } from 'react'

export interface ActiveStaffRow {
  grade_id: number
  count: number
  total_basic: number
  due_salary: number
}

interface Form2ClientProps {
  initialData: ActiveStaffRow[]
  submissionId: number | null
}

const ALL_GRADES = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  label: `গ্রেড ${toBanglaNumber(i + 1)}`,
  category: i + 1 <= 10 ? 'কর্মকর্তা' : 'কর্মচারী',
}))

export function Form2Client({ initialData, submissionId }: Form2ClientProps) {
  const [rows, setRows] = useState<ActiveStaffRow[]>(() => {
    return (initialData || [])
      .filter((r) => (r.count > 0 || r.total_basic > 0 || r.due_salary > 0))
      .sort((a, b) => a.grade_id - b.grade_id)
  })

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
      rows
        .filter((r) => r.grade_id !== editingGradeId)
        .map((r) => r.grade_id)
    )
    return ALL_GRADES.filter((g) => !used.has(g.id))
  }, [rows, editingGradeId])

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

  // Save row from modal
  const handleSaveModalRow = () => {
    const gradeId = parseInt(selectedGrade, 10)
    if (!gradeId || isNaN(gradeId)) return

    const newRow: ActiveStaffRow = {
      grade_id: gradeId,
      count: parseInt(countInput, 10) || 0,
      total_basic: parseFloat(basicInput) || 0,
      due_salary: parseFloat(dueInput) || 0,
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
    setRows((prev) => prev.filter((r) => r.grade_id !== gradeId).sort((a, b) => a.grade_id - b.grade_id))
    setGradeToDelete(null)

    if (submissionId) {
      startTransition(async () => {
        await deleteFormStaffActiveRow(submissionId, gradeId)
      })
    }
  }

  // Separate sorted officer rows (Grades 1-10) and staff rows (Grades 11-20)
  const officerRows = useMemo(() => {
    return rows.filter((r) => r.grade_id <= 10).sort((a, b) => a.grade_id - b.grade_id)
  }, [rows])

  const staffRows = useMemo(() => {
    return rows.filter((r) => r.grade_id > 10).sort((a, b) => a.grade_id - b.grade_id)
  }, [rows])

  // Summary calculations
  const summary = useMemo(() => {
    let officerCount = 0
    let officerBasic = 0
    let staffCount = 0
    let staffBasic = 0

    rows.forEach((r) => {
      if (r.grade_id <= 10) {
        officerCount += r.count || 0
        officerBasic += r.total_basic || 0
      } else {
        staffCount += r.count || 0
        staffBasic += r.total_basic || 0
      }
    })

    return {
      officerCount,
      officerBasic,
      staffCount,
      staffBasic,
    }
  }, [rows])

  // Save entire form state to database
  const handleSaveAll = async () => {
    if (!submissionId) return
    await saveFormStaffActiveRows(submissionId, rows)
  }

  return (
    <FormShell
      title={strings.form2.title}
      formNumber={2}
      prevHref="/office/form-1"
      nextHref="/office/form-3"
      onSave={submissionId ? handleSaveAll : undefined}
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Top Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
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
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5"
            disabled={availableGrades.length === 0}
          >
            <Plus className="h-4 w-4" />
            {strings.form2.addButton}
          </Button>
        </div>

        {/* Data Tables or Empty State */}
        {rows.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium text-base mb-2">
              {strings.form2.emptyState}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={openAddModal}
              className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {strings.form2.addButton}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Officer Table (Grade 1 - 10) */}
            {officerRows.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
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
                        <TableCell className="font-bold font-mono text-slate-800">
                          গ্রেড {toBanglaNumber(row.grade_id)}
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
                              className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setGradeToDelete(row.grade_id)}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
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

            {/* Staff Table (Grade 11 - 20) */}
            {staffRows.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
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
                        <TableCell className="font-bold font-mono text-slate-800">
                          গ্রেড {toBanglaNumber(row.grade_id)}
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
                              className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setGradeToDelete(row.grade_id)}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
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

        {/* Summary Card */}
        {rows.length > 0 && (
          <Card className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-blue-100 shadow-xs">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                বেতন তথ্যের সারসংক্ষেপ
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium block">
                    {strings.form2.officerCountLabel}:
                  </span>
                  <span className="text-xl font-bold text-slate-800 font-mono mt-0.5 block">
                    {toBanglaNumber(summary.officerCount)} জন
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium block">
                    {strings.form2.officerBasicLabel}:
                  </span>
                  <span className="text-xl font-bold text-indigo-700 font-mono mt-0.5 block">
                    {toBanglaAmount(summary.officerBasic)}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium block">
                    {strings.form2.staffCountLabel}:
                  </span>
                  <span className="text-xl font-bold text-slate-800 font-mono mt-0.5 block">
                    {toBanglaNumber(summary.staffCount)} জন
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium block">
                    {strings.form2.staffBasicLabel}:
                  </span>
                  <span className="text-xl font-bold text-emerald-700 font-mono mt-0.5 block">
                    {toBanglaAmount(summary.staffBasic)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) handleRequestClose()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              {editingGradeId !== null ? strings.form2.editModalTitle : strings.form2.modalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Grade Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="grade_select">{strings.form2.gradeColumn}</Label>
              <Select value={selectedGrade} onValueChange={(val) => setSelectedGrade(val ?? '')}>
                <SelectTrigger id="grade_select" className="w-full">
                  <SelectValue placeholder={strings.form2.selectGrade} />
                </SelectTrigger>
                <SelectContent>
                  {availableGrades.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.label} ({g.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Count */}
            <div className="space-y-1.5">
              <Label htmlFor="count_input">{strings.form2.countColumn}</Label>
              <Input
                id="count_input"
                type="number"
                min="0"
                placeholder="যেমন: ৩"
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
              />
            </div>

            {/* Total Basic */}
            <div className="space-y-1.5">
              <Label htmlFor="basic_input">{strings.form2.basicColumn}</Label>
              <Input
                id="basic_input"
                type="number"
                min="0"
                placeholder="যেমন: ১০৫০০০"
                value={basicInput}
                onChange={(e) => setBasicInput(e.target.value)}
              />
            </div>

            {/* Due Salary */}
            <div className="space-y-1.5">
              <Label htmlFor="due_input">{strings.form2.modalDueSalaryColumn}</Label>
              <Input
                id="due_input"
                type="number"
                min="0"
                placeholder="ঐচ্ছিক (বকেয়া থাকলে)"
                value={dueInput}
                onChange={(e) => setDueInput(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestClose}
            >
              {strings.close}
            </Button>
            <Button
              type="button"
              onClick={handleSaveModalRow}
              disabled={!selectedGrade || (!countInput && !basicInput)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingGradeId !== null ? 'সংরক্ষণ করুন' : 'যোগ করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM CLOSE MODAL (Prompt when accidentally closing with entered data) */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-800">
                {strings.form2.confirmCloseTitle}
              </DialogTitle>
            </div>
            <p className="text-sm text-slate-500">
              {strings.form2.confirmCloseDesc}
            </p>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={resetModalFields}
              className="text-slate-600"
            >
              {strings.form2.discardAndClose}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowConfirmClose(false)
                handleSaveModalRow()
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {strings.form2.saveAndClose}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE MODAL */}
      <Dialog open={gradeToDelete !== null} onOpenChange={(open) => {
        if (!open) setGradeToDelete(null)
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <Trash2 className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-800">
                {strings.form2.confirmDeleteTitle}
              </DialogTitle>
            </div>
            <p className="text-sm text-slate-500">
              {gradeToDelete ? `গ্রেড ${toBanglaNumber(gradeToDelete)} এর ` : ''}{strings.form2.confirmDeleteDesc}
            </p>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGradeToDelete(null)}
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
