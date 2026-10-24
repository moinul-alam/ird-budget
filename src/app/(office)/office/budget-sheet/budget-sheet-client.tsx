'use client'

import { strings } from '@/lib/strings'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Calculator,
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Save,
  Info,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { Fragment, useState, useTransition, useMemo } from 'react'
import { recalculateBudget, saveManualValue, submitBudget, type BudgetSheetRowItem } from '@/app/actions/budget'
import { useRouter } from 'next/navigation'
import { useFormLock } from '@/components/form-lock-provider'
import { ReportDownloader } from '@/components/report-downloader'
import type { ReportRow, ReportSpec } from '@/lib/report/export'

interface BudgetSheetClientProps {
  initialRows: BudgetSheetRowItem[]
  submissionId: number | null
  initialTotalManual: number
  initialError?: string | null
  initialMissingForms?: string[]
  /** The office's level name, shown as a summary card. */
  officeLevel: string
  /** Office name for the download header. */
  officeName: string
  /** Head quarter / department for the download header. */
  headOfficeName: string
}

/** Short labels for the form hint's links. */
const SOURCE_FORM_TITLES: Record<number, string> = {
  2: strings.forms.form2.short,
  4: strings.forms.form4.short,
  5: strings.forms.form5.short,
  6: strings.forms.form6.short,
  7: strings.forms.form7.short,
  8: strings.forms.form8.short,
  9: strings.forms.form9.short,
  10: strings.forms.form10.short,
  11: strings.forms.form11.short,
  12: strings.forms.form12.short,
}

/**
 * Three tints cycling one per row (row ১ → ২ → ৩ → ১ …). Kept as pale, low-saturation
 * washes so the amber/blue entry boxes and the emerald total stay the loudest things
 * on screen, but each step is a different hue (sky → violet → rose) so a row is still
 * easy to track across the wide table.
 */
const ROW_TINTS = ['bg-sky-50/60', 'bg-violet-50/50', 'bg-rose-50/40']

/** `w-72` in px — the hint is right-aligned to its icon, so it needs the room on the left. */
const HINT_WIDTH = 288

export function BudgetSheetClient({
  initialRows,
  submissionId,
  initialTotalManual,
  initialError,
  initialMissingForms = [],
  officeLevel,
  officeName,
  headOfficeName,
}: BudgetSheetClientProps) {
  const [rows, setRows] = useState<BudgetSheetRowItem[]>(initialRows)
  const [isPending, startTransition] = useTransition()
  const [isSavingManual, setIsSavingManual] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'auto' | 'manual'>('all')
  /**
   * The form hint, pinned to the viewport at the clicked icon. It has to live outside
   * the table because the table's own scroll container would clip anything anchored
   * inside a cell.
   */
  const [hint, setHint] = useState<{ code: string; forms: number[]; top: number; left: number } | null>(null)

  const router = useRouter()
  const { locked, notice: lockNotice } = useFormLock()

  // Recalculate handler
  const handleRecalculate = () => {
    if (!submissionId) {
      setErrorMessage('দাখিল আইডি পাওয়া যায়নি। অনুগ্রহ করে লগইন করুন।')
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        const res = await recalculateBudget(submissionId)
        if (res.success && res.rows) {
          setRows(res.rows)
          setSuccessMessage('বাজেট সফলভাবে পুনর্গণনা করা হয়েছে।')
          setTimeout(() => setSuccessMessage(null), 4000)
        } else {
          setErrorMessage(res.error || 'বাজেট পুনর্গণনা ব্যর্থ হয়েছে।')
        }
      } catch (err: any) {
        setErrorMessage(`পুনর্গণনায় সমস্যা দেখা দিয়েছে: ${err?.message || 'অজ্ঞাত ত্রুটি'}`)
      }
    })
  }

  // Handle manual input change
  const handleManualChange = async (code: string, value: string) => {
    if (!submissionId) return

    setErrorMessage(null)
    const trimmed = value.trim()
    const num = trimmed === '' ? null : Number(trimmed)

    if (num !== null && (isNaN(num) || num < 0)) {
      setErrorMessage('অনুগ্রহ করে সঠিক ধনাত্মক সংখ্যা লিখুন।')
      return
    }

    // Optimistic UI update
    setRows((prev) =>
      prev.map((r) => (r.code === code ? { ...r, manual_value: num } : r))
    )

    // Save with indicator
    setIsSavingManual(code)
    try {
      const res = await saveManualValue(submissionId, code, num)
      if (!res.success) {
        setErrorMessage(res.error || 'ম্যানুয়াল বরাদ্দ সংরক্ষণ করা যায়নি।')
      }
    } catch (err: any) {
      setErrorMessage(`সংরক্ষণ ত্রুটি: ${err?.message || 'অজ্ঞাত ত্রুটি'}`)
    } finally {
      setIsSavingManual(null)
    }
  }

  // Handle Submit
  const handleSubmit = () => {
    if (!submissionId) {
      setErrorMessage('বাজেট দাখিল আইডি পাওয়া যায়নি।')
      return
    }

    setErrorMessage(null)
    startTransition(async () => {
      try {
        const res = await submitBudget(submissionId)
        if (res.success) {
          router.push('/dashboard')
        } else {
          setErrorMessage(res.error || 'বাজেট দাখিল ব্যর্থ হয়েছে।')
        }
      } catch (err: any) {
        setErrorMessage(`বাজেট দাখিলে ত্রুটি হয়েছে: ${err?.message || 'অজ্ঞাত ত্রুটি'}`)
      }
    })
  }

  // Computed total: the one figure that counts for every row.
  const totalManual = useMemo(() => {
    return rows.reduce((sum, r) => {
      const effective = r.manual_value !== null ? r.manual_value : (r.auto_value || 0)
      return sum + effective
    }, 0)
  }, [rows])

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Search match
      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        row.code.toLowerCase().includes(query) ||
        row.name.toLowerCase().includes(query)

      if (!matchesSearch) return false

      // Filter match
      if (filterType === 'auto') return !row.is_manual
      if (filterType === 'manual') return row.is_manual
      return true
    })
  }, [rows, searchQuery, filterType])

  /**
   * Visible rows broken into category groups. The sheet sorts by category already, so
   * a group is simply a run of rows sharing a `category_id` — each group is preceded by
   * its own header row, giving the long table its structure back.
   */
  const groups = useMemo(() => {
    const result: {
      category_id: number | null
      category_code: string
      category_name: string
      rows: BudgetSheetRowItem[]
    }[] = []

    for (const row of filteredRows) {
      const last = result[result.length - 1]
      if (last && last.category_id === row.category_id) {
        last.rows.push(row)
      } else {
        result.push({
          category_id: row.category_id,
          category_code: row.category_code,
          category_name: row.category_name,
          rows: [row],
        })
      }
    }

    return result
  }, [filteredRows])

  // Continuous serial across the whole table (১ … n), carried over group boundaries.
  let serial = 0

  /**
   * The downloadable report mirrors what is on screen right now: the visible rows
   * (search/filter applied) with the same category breaks, plus the grand total.
   */
  const reportSpec = useMemo<ReportSpec>(() => {
    const reportRows: ReportRow[] = []
    let index = 0

    for (const group of groups) {
      // Category break: code under the কোড column, name spanning the rest.
      if (group.category_code || group.category_name) {
        reportRows.push({
          section: { code: group.category_code, name: group.category_name },
        })
      }

      for (const row of group.rows) {
        index += 1
        const effective = row.manual_value !== null ? row.manual_value : (row.auto_value || 0)
        reportRows.push({
          cells: {
            serial: toBanglaNumber(index),
            code: row.code,
            name: row.name,
            amount: toBanglaAmount(effective),
          },
        })
      }
    }

    reportRows.push({
      emphasis: true,
      cells: {
        serial: '',
        code: '',
        name: strings.budgetSheet.totalRow,
        amount: toBanglaAmount(totalManual),
      },
    })

    return {
      title: strings.budgetSheet.title,
      officeName,
      headOfficeName,
      fileName: [strings.budgetSheet.title, officeName].filter(Boolean).join('-'),
      columns: [
        { key: 'serial', label: strings.budgetSheet.serialColumn, align: 'center', width: 0.6 },
        { key: 'code', label: strings.budgetSheet.codeColumn, align: 'left', width: 1.1 },
        { key: 'name', label: strings.budgetSheet.nameColumn, align: 'left', width: 3.4 },
        { key: 'amount', label: strings.budgetSheet.amountColumn, align: 'right', width: 1.6 },
      ],
      rows: reportRows,
    }
  }, [groups, totalManual, officeName, headOfficeName])

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {strings.budgetSheet.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 font-bold shadow-xs hover:bg-slate-50"
            onClick={handleRecalculate}
            disabled={isPending || !submissionId}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            ) : (
              <Calculator className="h-4 w-4 text-blue-600" />
            )}
            {isPending ? strings.budgetSheet.recalculating : strings.budgetSheet.recalculateButton}
          </Button>

          <ReportDownloader spec={reportSpec} />
        </div>
      </div>

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">
            <p className="font-bold">ত্রুটি পরিলক্ষিত হয়েছে:</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-700 hover:bg-red-100 text-xs font-bold"
            onClick={() => setErrorMessage(null)}
          >
            বন্ধ করুন
          </Button>
        </div>
      )}

      {/* Success Message Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-bold flex-1">{successMessage}</p>
        </div>
      )}

      {/* Missing Forms Info Banner */}
      {initialMissingForms.length > 0 && rows.length > 0 && (
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">পরামর্শ: </span>
            নিম্নোক্ত ফর্মগুলোর তথ্য এখনও খালি থাকতে পারে ({initialMissingForms.join(', ')})। সংশ্লিষ্ট ফর্মে তথ্য প্রদান করলে বাজেট শিটে স্বয়ংক্রিয়ভাবে হিসাব যোগ হবে।
          </div>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader>
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {strings.budgetSheet.officeLevelLabel}
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-800">
              {officeLevel || '—'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader>
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {strings.budgetSheet.codeCountLabel}
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-800 font-mono">
              {toBanglaNumber(rows.length)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader>
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {strings.budgetSheet.totalFinalLabel}
            </CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-700 font-mono">
              ৳ {toBanglaAmount(totalManual)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Budget Table Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3 px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <CardTitle className="text-lg font-bold text-slate-900">
                বাজেট বিবরণী ছক
              </CardTitle>
              {isSavingManual && (
                <Badge variant="outline" className="gap-1.5 bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  সংরক্ষণ হচ্ছে...
                </Badge>
              )}
            </div>

            {/* Search + filters, right-aligned with the chart title */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="কোড বা খাত খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-xs bg-white border-slate-200 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <Button
                  size="sm"
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterType('all')}
                  className="text-xs h-8 font-bold rounded-lg"
                >
                  সকল ({toBanglaNumber(rows.length)})
                </Button>
                <Button
                  size="sm"
                  variant={filterType === 'auto' ? 'default' : 'outline'}
                  onClick={() => setFilterType('auto')}
                  className="text-xs h-8 font-bold rounded-lg"
                >
                  স্বয়ংক্রিয় ({toBanglaNumber(rows.filter((r) => !r.is_manual).length)})
                </Button>
                <Button
                  size="sm"
                  variant={filterType === 'manual' ? 'default' : 'outline'}
                  onClick={() => setFilterType('manual')}
                  className="text-xs h-8 font-bold rounded-lg"
                >
                  ম্যানুয়াল এন্ট্রি ({toBanglaNumber(rows.filter((r) => r.is_manual).length)})
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">{strings.budgetSheet.serialColumn}</th>
                  <th className="py-3 px-4 w-32">{strings.budgetSheet.codeColumn}</th>
                  <th className="py-3 px-4 min-w-[240px]">{strings.budgetSheet.nameColumn}</th>
                  <th className="py-3 px-4 text-right w-48">{strings.budgetSheet.amountColumn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 px-4 text-center text-slate-500">
                      <div className="max-w-md mx-auto space-y-2">
                        <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                        <p className="font-bold text-slate-700">কোনো বাজেট কোড পাওয়া যায়নি</p>
                        <p className="text-xs text-slate-500">
                          অনুসন্ধান ফিল্টার পরিবর্তন করুন অথবা &apos;পুনরায় গণনা করুন&apos; বাটনে চাপুন।
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  groups.map((group, groupIndex) => (
                    <Fragment key={`cat-${group.category_id ?? 'none'}-${groupIndex}`}>
                      {/* Category break point: groups the codes below it and guides the
                          reader through the long sheet. */}
                      <tr className="bg-slate-100/80 border-y border-slate-200">
                        <td className="py-2 px-4" />
                        <td className="py-2 px-4 font-mono font-black text-slate-600 text-xs">
                          {group.category_code}
                        </td>
                        <td colSpan={2} className="py-2 px-4 font-black text-slate-700">
                          {group.category_name || 'অন্যান্য'}
                        </td>
                      </tr>

                      {group.rows.map((row) => {
                        const isManualType = row.is_manual
                        // Some computed codes still take an office input, because the
                        // engine can only estimate them (e.g. ডাক).
                        const canOverride = !isManualType && row.allow_manual_override
                        const effectiveValue = row.manual_value !== null ? row.manual_value : (row.auto_value || 0)
                        const hasValue = effectiveValue > 0

                        const rowIndex = serial
                        serial += 1

                        return (
                          <tr
                            key={row.code}
                            className={`transition-colors hover:bg-blue-100/80 ${ROW_TINTS[rowIndex % 3]}`}
                          >
                            {/* ক্রম */}
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-400 text-xs">
                              {toBanglaNumber(rowIndex + 1)}
                            </td>

                            {/* Code */}
                            <td className="py-3 px-4 font-mono font-bold text-slate-700 text-xs sm:text-sm">
                              {row.code}
                            </td>

                            {/* Name */}
                            <td className="py-3 px-4 text-slate-800 font-medium">
                              {row.name}
                            </td>

                            {/* বরাদ্দের পরিমাণ — একটিই cell: হয় সরাসরি এন্ট্রি, নয়তো হিসাব।
                                হিসাব করা খাতের পাশে তথ্য আইকন থাকে, যেটি কোন ফর্ম থেকে সংখ্যাটি
                                এলো সেটি দেখায়। */}
                            <td className="py-2.5 px-4">
                              <div className="flex items-center justify-end gap-2">
                                {locked ? (
                                  <span
                                    className={`font-mono font-bold px-2 text-sm ${hasValue ? 'text-slate-900' : 'text-slate-300'}`}
                                  >
                                    {toBanglaAmount(effectiveValue)}
                                  </span>
                                ) : isManualType || canOverride ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-40 text-right font-mono font-bold h-9 bg-amber-50/40 text-slate-900 border-2 border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    value={row.manual_value ?? ''}
                                    onChange={(e) => handleManualChange(row.code, e.target.value)}
                                    placeholder={canOverride ? toBanglaAmount(row.auto_value) : '০'}
                                  />
                                ) : (
                                  <span
                                    className={`font-mono font-bold px-2 text-sm ${hasValue ? 'text-slate-900' : 'text-slate-300'}`}
                                  >
                                    {toBanglaAmount(effectiveValue)}
                                  </span>
                                )}

                                {row.source_forms.length > 0 && (
                                  <button
                                    type="button"
                                    aria-label={strings.budgetSheet.formHintAria}
                                    onClick={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      setHint((prev) =>
                                        prev?.code === row.code
                                          ? null
                                          : {
                                            code: row.code,
                                            forms: row.source_forms,
                                            top: rect.bottom + 6,
                                            left: Math.max(HINT_WIDTH + 12, Math.min(rect.right, window.innerWidth - 12)),
                                          }
                                      )
                                    }}
                                    className={`shrink-0 rounded-full transition-colors ${hint?.code === row.code
                                      ? 'text-orange-500'
                                      : 'text-orange-300 hover:text-orange-500'
                                      }`}
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 text-sm">
                <tr>
                  <td colSpan={3} className="py-4 px-4 text-right">
                    {strings.budgetSheet.totalRow}:
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-800 text-base">
                    ৳ {toBanglaAmount(totalManual)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Navigation & Submit Bar */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <Link href="/office/form-12" className={buttonVariants({ variant: 'outline', className: 'gap-2 font-bold shadow-xs' })}>
          <ArrowLeft className="h-4 w-4" />
          {strings.previous} (ফরম ১২)
        </Link>

        {locked ? (
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <Lock className="h-4 w-4 shrink-0" />
            {lockNotice}
          </div>
        ) : (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-sm"
            onClick={handleSubmit}
            disabled={isPending || !submissionId || rows.length === 0}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            বাজেট দাখিল করুন
          </Button>
        )}
      </div>

      {/* ফরম হিন্ট — viewport-pinned, because the table's scroll container would clip it.
          The full-screen backdrop makes a click anywhere else dismiss it. */}
      {hint && (
        <>
          <button
            type="button"
            aria-label="বন্ধ করুন"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setHint(null)}
          />
          <div
            className="fixed z-50 w-72 -translate-x-full rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            style={{ top: hint.top, left: hint.left }}
          >
            <p className="text-[11px] font-bold leading-relaxed text-slate-700">
              পরিবর্তন করতে{' '}
              {hint.forms.map((n) => `${strings.budgetSheet.formLabel} ${toBanglaNumber(n)}`).join(' ও ')}{' '}
              সংশোধন করে পুনরায় গণনা করুন।
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hint.forms.map((formNo) => (
                <Link
                  key={formNo}
                  href={`/office/form-${formNo}`}
                  title={SOURCE_FORM_TITLES[formNo] || ''}
                  className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  {strings.budgetSheet.formLabel} {toBanglaNumber(formNo)} — সংশোধন করুন
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
