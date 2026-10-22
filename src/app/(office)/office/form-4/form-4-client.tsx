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
import { saveFormNewStaffRows, NewStaffRecord } from '@/app/actions/forms'
import { Plus, Trash2, Edit2, UserPlus, AlertTriangle } from 'lucide-react'
import { useState, useTransition, useMemo } from 'react'

interface Form4ClientProps {
  initialData: NewStaffRecord[]
  submissionId: number | null
  fiscalYear: string
}

const ALL_GRADES = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  label: `গ্রেড ${toBanglaNumber(i + 1)}`,
  category: i + 1 <= 10 ? 'কর্মকর্তা' : 'কর্মচারী',
}))

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

export function Form4Client({ initialData, submissionId, fiscalYear }: Form4ClientProps) {
  const [rows, setRows] = useState<NewStaffRecord[]>(() => initialData || [])
  const [isPending, startTransition] = useTransition()

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

  // Compute remaining months live for modal
  const modalDateInfo = useMemo(() => {
    return calculateRemainingMonths(dateInput, fiscalYear)
  }, [dateInput, fiscalYear])

  const modalTotalSalary = useMemo(() => {
    const c = parseInt(countInput, 10) || 0
    const b = parseFloat(basicInput) || 0
    return c * b * modalDateInfo.months
  }, [countInput, basicInput, modalDateInfo.months])

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
    setSelectedGrade(String(ALL_GRADES[0].id))
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

  const handleRequestClose = () => {
    if (hasModalDirtyData) {
      setShowConfirmClose(true)
    } else {
      resetModalFields()
    }
  }

  const handleSaveModalRow = () => {
    const gradeId = parseInt(selectedGrade, 10)
    if (!gradeId || isNaN(gradeId)) return

    const count = parseInt(countInput, 10) || 0
    const monthlyBasic = parseFloat(basicInput) || 0
    const { months } = calculateRemainingMonths(dateInput, fiscalYear)
    const totalSalary = count * monthlyBasic * months

    const newRow: NewStaffRecord = {
      grade_id: gradeId,
      count,
      monthly_basic: monthlyBasic,
      expected_date: dateInput,
      remaining_months: months,
      total_salary: totalSalary,
    }

    let nextRows: NewStaffRecord[] = []
    if (editingIndex !== null) {
      nextRows = [...rows]
      nextRows[editingIndex] = newRow
    } else {
      nextRows = [...rows, newRow]
    }

    setRows(nextRows)
    resetModalFields()

    if (submissionId) {
      startTransition(async () => {
        await saveFormNewStaffRows(submissionId, nextRows)
      })
    }
  }

  const handleConfirmDelete = () => {
    if (deleteIndex === null) return
    const nextRows = rows.filter((_, idx) => idx !== deleteIndex)
    setRows(nextRows)
    setDeleteIndex(null)

    if (submissionId) {
      startTransition(async () => {
        await saveFormNewStaffRows(submissionId, nextRows)
      })
    }
  }

  // Separation into Officers (1-10) and Staff (11-20)
  const officerRows = useMemo(() => rows.filter((r) => r.grade_id <= 10), [rows])
  const staffRows = useMemo(() => rows.filter((r) => r.grade_id > 10), [rows])

  const totals = useMemo(() => {
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

  const handleSaveAll = async () => {
    if (!submissionId) return
    await saveFormNewStaffRows(submissionId, rows)
  }

  return (
    <FormShell
      title={strings.forms.form4.title}
      formNumber={4}
      prevHref="/office/form-3"
      nextHref="/office/form-5"
      onSave={submissionId ? handleSaveAll : undefined}
    >
      <div className="p-6 lg:p-8 space-y-6">
        {/* Top Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              বেতন বিবরণী (নবনিয়োগপ্রাপ্ত কর্মচারী)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              অর্থবছর {toBanglaNumber(fiscalYear)}-এ সম্ভাব্য নিয়োগপ্রাপ্তদের নিয়োগের তারিখ ও মূল বেতন প্রদান করুন।
            </p>
          </div>
          <Button
            type="button"
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            নতুন নিয়োগ যোগ করুন
          </Button>
        </div>

        {/* Empty State or Tables */}
        {rows.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/20">
            <UserPlus className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">কোনো নবনিয়োগ তথ্য যোগ করা হয়নি</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              চলতি অর্থবছরে সম্ভাব্য কোনো নতুন কর্মচারী নিয়োগ থাকলে উপরে &quot;নতুন নিয়োগ যোগ করুন&quot; বাটনে ক্লিক করে যোগ করুন।
            </p>
            <Button
              type="button"
              onClick={openAddModal}
              variant="outline"
              className="mt-4 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              নিয়োগ তথ্য যোগ করুন
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Officers Table */}
            {officerRows.length > 0 && (
              <Card className="border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-emerald-50/70 border-b border-emerald-100 px-5 py-3 font-semibold text-emerald-900 text-sm flex items-center justify-between">
                  <span>কর্মকর্তা (গ্রেড ১ - ১০)</span>
                  <span className="text-xs font-normal text-emerald-700">
                    মোট পদ: {toBanglaNumber(totals.officers.count)} টি
                  </span>
                </div>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50 text-xs">
                      <TableRow>
                        <TableHead className="w-12 text-center">ক্র. নং</TableHead>
                        <TableHead>গ্রেড</TableHead>
                        <TableHead className="text-right">পদের সংখ্যা</TableHead>
                        <TableHead className="text-right">মাসিক মূল বেতন</TableHead>
                        <TableHead className="text-center">সম্ভাব্য নিয়োগের তারিখ</TableHead>
                        <TableHead className="text-center">অবশিষ্ট মাস</TableHead>
                        <TableHead className="text-right">মোট সম্ভাব্য বেতন (টাকা)</TableHead>
                        <TableHead className="w-24 text-center">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-sm">
                      {officerRows.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/60">
                          <TableCell className="text-center font-mono text-xs">{toBanglaNumber(idx + 1)}</TableCell>
                          <TableCell className="font-medium text-slate-800">গ্রেড {toBanglaNumber(row.grade_id)}</TableCell>
                          <TableCell className="text-right font-mono">{toBanglaNumber(row.count)}</TableCell>
                          <TableCell className="text-right font-mono">{toBanglaAmount(row.monthly_basic)}</TableCell>
                          <TableCell className="text-center font-mono text-xs">{row.expected_date ? toBanglaNumber(row.expected_date) : '—'}</TableCell>
                          <TableCell className="text-center font-semibold text-emerald-700 font-mono">
                            {toBanglaNumber(row.remaining_months)} মাস
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-slate-900">
                            {toBanglaAmount(row.total_salary)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-500 hover:text-emerald-600"
                                onClick={() => openEditModal(rows.indexOf(row))}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-red-600"
                                onClick={() => setDeleteIndex(rows.indexOf(row))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-bold text-slate-800 border-t-2">
                        <TableCell colSpan={2} className="text-right pr-4">উপমোট (কর্মকর্তা):</TableCell>
                        <TableCell className="text-right font-mono">{toBanglaNumber(totals.officers.count)}</TableCell>
                        <TableCell className="text-right font-mono">—</TableCell>
                        <TableCell colSpan={2} className="text-center">—</TableCell>
                        <TableCell className="text-right font-mono text-emerald-700">{toBanglaAmount(totals.officers.total_salary)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Staff Table */}
            {staffRows.length > 0 && (
              <Card className="border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-emerald-50/70 border-b border-emerald-100 px-5 py-3 font-semibold text-emerald-900 text-sm flex items-center justify-between">
                  <span>কর্মচারী (গ্রেড ১১ - ২০)</span>
                  <span className="text-xs font-normal text-emerald-700">
                    মোট পদ: {toBanglaNumber(totals.staff.count)} টি
                  </span>
                </div>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50 text-xs">
                      <TableRow>
                        <TableHead className="w-12 text-center">ক্র. নং</TableHead>
                        <TableHead>গ্রেড</TableHead>
                        <TableHead className="text-right">পদের সংখ্যা</TableHead>
                        <TableHead className="text-right">মাসিক মূল বেতন</TableHead>
                        <TableHead className="text-center">সম্ভাব্য নিয়োগের তারিখ</TableHead>
                        <TableHead className="text-center">অবশিষ্ট মাস</TableHead>
                        <TableHead className="text-right">মোট সম্ভাব্য বেতন (টাকা)</TableHead>
                        <TableHead className="w-24 text-center">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-sm">
                      {staffRows.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/60">
                          <TableCell className="text-center font-mono text-xs">{toBanglaNumber(idx + 1)}</TableCell>
                          <TableCell className="font-medium text-slate-800">গ্রেড {toBanglaNumber(row.grade_id)}</TableCell>
                          <TableCell className="text-right font-mono">{toBanglaNumber(row.count)}</TableCell>
                          <TableCell className="text-right font-mono">{toBanglaAmount(row.monthly_basic)}</TableCell>
                          <TableCell className="text-center font-mono text-xs">{row.expected_date ? toBanglaNumber(row.expected_date) : '—'}</TableCell>
                          <TableCell className="text-center font-semibold text-emerald-700 font-mono">
                            {toBanglaNumber(row.remaining_months)} মাস
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-slate-900">
                            {toBanglaAmount(row.total_salary)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-500 hover:text-emerald-600"
                                onClick={() => openEditModal(rows.indexOf(row))}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-red-600"
                                onClick={() => setDeleteIndex(rows.indexOf(row))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-bold text-slate-800 border-t-2">
                        <TableCell colSpan={2} className="text-right pr-4">উপমোট (কর্মচারী):</TableCell>
                        <TableCell className="text-right font-mono">{toBanglaNumber(totals.staff.count)}</TableCell>
                        <TableCell className="text-right font-mono">—</TableCell>
                        <TableCell colSpan={2} className="text-center">—</TableCell>
                        <TableCell className="text-right font-mono text-emerald-700">{toBanglaAmount(totals.staff.total_salary)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Grand Summary */}
            <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-semibold text-slate-200">সর্বমোট প্রাক্কলিত নবনিয়োগ বেতন:</span>
              <div className="flex items-center gap-6">
                <span className="text-xs text-slate-400">
                  মোট পদ: <strong className="text-white font-mono">{toBanglaNumber(totals.grand.count)}</strong> টি
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {toBanglaAmount(totals.grand.total_salary)} টাকা
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleRequestClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">
              {editingIndex !== null ? 'নিয়োগ তথ্য সম্পাদন' : 'নতুন নিয়োগ যোগ করুন'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Grade Selection */}
            <div>
              <Label htmlFor="grade" className="text-xs font-semibold text-slate-700">গ্রেড নির্বাচন</Label>
              <Select value={selectedGrade} onValueChange={(val) => setSelectedGrade(val ?? '')}>
                <SelectTrigger id="grade" className="mt-1">
                  <SelectValue placeholder="গ্রেড বাছাই করুন" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_GRADES.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.label} ({g.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Count */}
            <div>
              <Label htmlFor="count" className="text-xs font-semibold text-slate-700">পদের সংখ্যা</Label>
              <Input
                id="count"
                type="number"
                min="1"
                placeholder="যেমন: ৩"
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Monthly Basic Salary */}
            <div>
              <Label htmlFor="basic" className="text-xs font-semibold text-slate-700">জনপ্রতি মাসিক মূল বেতন (টাকা)</Label>
              <Input
                id="basic"
                type="number"
                min="0"
                placeholder="যেমন: ২২০০০"
                value={basicInput}
                onChange={(e) => setBasicInput(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>

            {/* Expected Appointment Date */}
            <div>
              <Label htmlFor="expected_date" className="text-xs font-semibold text-slate-700">
                সম্ভাব্য নিয়োগের তারিখ
              </Label>
              <Input
                id="expected_date"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="mt-1 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                অর্থবছর: {toBanglaNumber(fiscalYear)}
              </p>
            </div>

            {/* Live Calculation preview */}
            {dateInput && (
              <div className={`p-3 rounded-lg text-xs space-y-1 ${modalDateInfo.inRange ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-amber-50 border border-amber-200 text-amber-900'}`}>
                <div className="flex justify-between">
                  <span>অর্থবছরের অবস্থান:</span>
                  <span className="font-semibold">{modalDateInfo.inRange ? 'চলতি অর্থবছরে অন্তর্ভূক্ত' : 'অর্থবছরের বাইরে (০ মাস)'}</span>
                </div>
                <div className="flex justify-between">
                  <span>অবশিষ্ট মাস:</span>
                  <span className="font-bold font-mono">{toBanglaNumber(modalDateInfo.months)} মাস</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-200">
                  <span className="font-bold">সম্ভাব্য মোট ব্যয়:</span>
                  <span className="font-bold font-mono">{toBanglaAmount(modalTotalSalary)} টাকা</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleRequestClose}>
              বাতিল
            </Button>
            <Button
              type="button"
              onClick={handleSaveModalRow}
              disabled={!selectedGrade || !countInput || !basicInput || !dateInput || !modalDateInfo.inRange}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation on close dirty modal */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="sm:max-w-xs">
          <div className="text-center pt-2">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
            <h4 className="font-semibold text-slate-800">অসংরক্ষিত পরিবর্তন</h4>
            <p className="text-xs text-slate-500 mt-1">
              আপনার প্রবেশ করানো তথ্য সংরক্ষণ করা হয়নি। আপনি কি নিশ্চিতভাবে বন্ধ করতে চান?
            </p>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfirmClose(false)} className="flex-1">
              না, ফিরে যান
            </Button>
            <Button variant="destructive" size="sm" onClick={resetModalFields} className="flex-1">
              হ্যাঁ, বাতিল করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation on delete */}
      <Dialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <DialogContent className="sm:max-w-xs">
          <div className="text-center pt-2">
            <Trash2 className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <h4 className="font-semibold text-slate-800">মুছে ফেলতে চান?</h4>
            <p className="text-xs text-slate-500 mt-1">
              এই নিয়োগ তথ্যটি স্থায়ীভাবে মুছে ফেলা হবে।
            </p>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteIndex(null)} className="flex-1">
              বাতিল
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete} className="flex-1">
              মুছে ফেলুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormShell>
  )
}
