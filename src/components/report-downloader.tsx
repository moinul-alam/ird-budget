'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { strings } from '@/lib/strings'
import { downloadReportExcel, downloadReportPdf, type ReportSpec } from '@/lib/report/export'

/**
 * The app-wide report download button. Give it a `ReportSpec` and it offers PDF and
 * Excel; the same component is reused by every report and by the budget sheet.
 */
export function ReportDownloader({
  spec,
  label = strings.report.download,
  className,
}: {
  spec: ReportSpec
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'pdf' | 'excel' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function run(kind: 'pdf' | 'excel') {
    setOpen(false)
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'pdf') await downloadReportPdf(spec)
      else await downloadReportExcel(spec)
    } catch (err) {
      console.error('Report download failed', err)
      setError(strings.report.failed)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={cn('relative flex flex-col items-end', className)} ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        disabled={busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-8 gap-1.5 rounded-lg font-bold"
      >
        {busy ? <Loader2 className="animate-spin" /> : <Download />}
        {busy ? strings.report.preparing : label}
        {!busy && <ChevronDown className="opacity-70" />}
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => run('pdf')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <FileText className="h-4 w-4 text-rose-500" />
            {strings.report.asPdf}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run('excel')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            {strings.report.asExcel}
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  )
}
