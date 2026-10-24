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
import { useState, useTransition, useMemo } from 'react'
import { recalculateBudget, saveManualValue, submitBudget, type BudgetSheetRowItem } from '@/app/actions/budget'
import { useRouter } from 'next/navigation'
import { useFormLock } from '@/components/form-lock-provider'

interface BudgetSheetClientProps {
  initialRows: BudgetSheetRowItem[]
  submissionId: number | null
  initialTotalAuto: number
  initialTotalManual: number
  initialError?: string | null
  initialMissingForms?: string[]
}

export function BudgetSheetClient({
  initialRows,
  submissionId,
  initialTotalAuto,
  initialTotalManual,
  initialError,
  initialMissingForms = [],
}: BudgetSheetClientProps) {
  const [rows, setRows] = useState<BudgetSheetRowItem[]>(initialRows)
  const [isPending, startTransition] = useTransition()
  const [isSavingManual, setIsSavingManual] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'auto' | 'manual' | 'has_value'>('all')

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

  // Computed totals
  const totalAuto = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.auto_value || 0), 0)
  }, [rows])

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
      if (filterType === 'has_value') {
        const effective = row.manual_value !== null ? row.manual_value : (row.auto_value || 0)
        return effective > 0
      }
      return true
    })
  }, [rows, searchQuery, filterType])

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {strings.budgetSheet.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {strings.budgetSheet.autoNote} • মোট {toBanglaNumber(rows.length)} টি কোড সংযুক্ত
          </p>
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
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              স্বয়ংক্রিয় প্রাক্কলন (অটো)
            </CardDescription>
            <CardTitle className="text-2xl font-black text-blue-700 font-mono">
              ৳ {toBanglaAmount(totalAuto)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 font-medium">
            ফর্মের ইনপুট ও সূত্রের ভিত্তিতে গণনাকৃত
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              সর্বমোট চূড়ান্ত বরাদ্দ
            </CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-700 font-mono">
              ৳ {toBanglaAmount(totalManual)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 font-medium">
            ম্যানুয়াল পরিবর্তন ও স্বয়ংক্রিয় বরাদ্দের মোট যোগফল
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              বরাদ্দযুক্ত খাতের সংখ্যা
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-800 font-mono">
              {toBanglaNumber(rows.filter((r) => (r.manual_value ?? r.auto_value ?? 0) > 0).length)} / {toBanglaNumber(rows.length)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 font-medium">
            টাকা বরাদ্দ রয়েছে এমন খাতের হিসাব
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="কোড বা ব্যয়ের খাত অনুসন্ধান করুন (যেমন: ৩১১১১০১ বা বিদ্যুৎ)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs sm:text-sm bg-slate-50/50 border-slate-200 focus:bg-white"
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
            variant={filterType === 'has_value' ? 'default' : 'outline'}
            onClick={() => setFilterType('has_value')}
            className="text-xs h-8 font-bold rounded-lg"
          >
            বরাদ্দযুক্ত ({toBanglaNumber(rows.filter((r) => (r.manual_value ?? r.auto_value ?? 0) > 0).length)})
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
            ম্যানুয়াল ({toBanglaNumber(rows.filter((r) => r.is_manual).length)})
          </Button>
        </div>
      </div>

      {/* Budget Table Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                বাজেট বিবরণী ছক
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                স্বয়ংক্রিয় কোডগুলোতে সরাসরি ফর্ম থেকে হিসাব প্রদর্শিত হচ্ছে এবং ম্যানুয়াল কোডে প্রয়োজনানুযায়ী বরাদ্দ পূরণ করতে পারেন। কিছু স্বয়ংক্রিয় খাতে (যেমন ডাক) প্রাক্কলিত হিসাব দেখানো হয়, প্রয়োজনে সেটিও সংশোধন করা যাবে।
              </CardDescription>
            </div>
            {isSavingManual && (
              <Badge variant="outline" className="gap-1.5 bg-blue-50 text-blue-700 border-blue-200 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                সংরক্ষণ হচ্ছে...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-32">{strings.budgetSheet.codeColumn}</th>
                  <th className="py-3 px-4 min-w-[240px]">{strings.budgetSheet.nameColumn}</th>
                  <th className="py-3 px-4 text-center w-28">ধরন</th>
                  <th className="py-3 px-4 text-right w-44">{strings.budgetSheet.calculatedColumn}</th>
                  <th className="py-3 px-4 text-right w-48">{strings.budgetSheet.finalColumn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 px-4 text-center text-slate-500">
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
                  filteredRows.map((row) => {
                    const isManualType = row.is_manual
                    // Some computed codes still take an office input, because the
                    // engine can only estimate them (e.g. ডাক).
                    const canOverride = !isManualType && row.allow_manual_override
                    const effectiveValue = row.manual_value !== null ? row.manual_value : (row.auto_value || 0)

                    return (
                      <tr
                        key={row.code}
                        className={`transition-colors hover:bg-slate-50/70 ${
                          effectiveValue > 0 ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        {/* Code */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 text-xs sm:text-sm">
                          {row.code}
                        </td>

                        {/* Name */}
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {row.name}
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isManualType
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-blue-50 text-blue-800 border-blue-300'
                            }`}
                          >
                            {isManualType ? 'ম্যানুয়াল' : 'স্বয়ংক্রিয়'}
                          </Badge>
                        </td>

                        {/* Auto Value */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-600">
                          {isManualType ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <span>{toBanglaAmount(row.auto_value)}</span>
                          )}
                        </td>

                        {/* Final / Manual Entry */}
                        <td className="py-2.5 px-4 text-right">
                          {locked ? (
                            <div className="font-mono font-bold px-2 text-slate-900 text-sm">
                              {toBanglaAmount(effectiveValue)}
                            </div>
                          ) : isManualType ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Input
                                type="number"
                                min="0"
                                className="w-36 text-right font-mono font-bold h-9 bg-white text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                value={row.manual_value ?? ''}
                                onChange={(e) => handleManualChange(row.code, e.target.value)}
                                placeholder="০"
                              />
                            </div>
                          ) : canOverride ? (
                            <div className="flex flex-col items-end gap-1">
                              <Input
                                type="number"
                                min="0"
                                className="w-36 text-right font-mono font-bold h-9 bg-white text-slate-900 border-dashed border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                value={row.manual_value ?? ''}
                                onChange={(e) => handleManualChange(row.code, e.target.value)}
                                placeholder={toBanglaAmount(row.auto_value)}
                              />
                              <span className="text-[10px] font-semibold text-slate-400">
                                স্বয়ংক্রিয় হিসাব: {toBanglaAmount(row.auto_value)}
                              </span>
                            </div>
                          ) : (
                            <div className="font-mono font-bold px-2 text-slate-900 text-sm">
                              {toBanglaAmount(effectiveValue)}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 text-sm">
                <tr>
                  <td colSpan={3} className="py-4 px-4 text-right">
                    {strings.budgetSheet.totalRow}:
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-blue-800">
                    ৳ {toBanglaAmount(totalAuto)}
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
            বাজেট দাখিল করুন (Submit Budget)
          </Button>
        )}
      </div>
    </div>
  )
}
