'use client'

import { strings } from '@/lib/strings'

/**
 * Report export used by `ReportDownloader`: turns the same column/row spec into a
 * downloaded PDF or Excel file, so a report only has to describe its data once.
 *
 * The PDF is drawn onto a canvas and wrapped into A4 pages with jsPDF rather than
 * laid out as PDF text. Bengali needs OpenType shaping (যুক্তাক্ষর, রেফ) that jsPDF
 * does not implement, so we let the browser shape the text on the canvas — where
 * shaping is correct — and embed the result as a page image.
 */

export interface ReportColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  /** Relative width weight (default 1). */
  width?: number
}

export interface ReportRow {
  /** A category/section break, rendered as one full-width row. */
  section?: string
  /** Cell text keyed by column `key`. */
  cells?: Record<string, string>
  /** Emphasised styling, e.g. a grand total. */
  emphasis?: boolean
}

export interface ReportSpec {
  /** Report name shown in the header, e.g. চূড়ান্ত বাজেট. */
  title: string
  officeName: string
  /** Head office / department the office belongs to. */
  headOfficeName?: string
  columns: ReportColumn[]
  rows: ReportRow[]
  /** File name without extension. */
  fileName: string
}

const LOGO_SRC = '/images/bdgovlogo.png'
const FONT = "'Anek Bangla', 'Tiro Bangla', sans-serif"

/** Canvas pixels per millimetre — 6 keeps text crisp at print size (~152 dpi). */
const PX_PER_MM = 6
const PAGE_W = 210 * PX_PER_MM
const PAGE_H = 297 * PX_PER_MM
const MARGIN = 12 * PX_PER_MM
const CONTENT_W = PAGE_W - MARGIN * 2

const CELL_PAD_X = 12
const CELL_PAD_Y = 9
const LINE_H = 28
const TABLE_HEAD_H = 46

const COLORS = {
  ink: '#0f172a',
  body: '#1e293b',
  muted: '#64748b',
  line: '#cbd5e1',
  headerBg: '#e2e8f0',
  sectionBg: '#f1f5f9',
  totalBg: '#d1fae5',
  totalInk: '#065f46',
}

interface LaidOutRow {
  row: ReportRow
  height: number
  cellLines?: string[][]
  sectionLines?: string[]
}

// --- canvas helpers ---------------------------------------------------------

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(w))
  canvas.height = Math.max(1, Math.ceil(h))
  return canvas
}

function contextOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!
  ctx.textBaseline = 'top'
  return ctx
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Web fonts must be loaded before measuring/drawing, or the canvas falls back. */
async function waitForFonts(): Promise<void> {
  try {
    await document.fonts?.ready
  } catch {
    /* fonts API unavailable — the fallback stack still renders */
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text ?? '').split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  lines.push(line)
  return lines
}

function columnWidths(columns: ReportColumn[]): number[] {
  const weight = columns.reduce((sum, c) => sum + (c.width ?? 1), 0)
  const widths = columns.map((c) => Math.floor((CONTENT_W * (c.width ?? 1)) / weight))
  widths[widths.length - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0)
  return widths
}

function layoutRows(columns: ReportColumn[], widths: number[], rows: ReportRow[]): LaidOutRow[] {
  const measure = contextOf(createCanvas(8, 8))
  const inner = widths.map((w) => w - CELL_PAD_X * 2)

  return rows.map((row) => {
    if (row.section !== undefined) {
      measure.font = `700 19px ${FONT}`
      const sectionLines = wrapText(measure, row.section, CONTENT_W - CELL_PAD_X * 2)
      return { row, sectionLines, height: sectionLines.length * LINE_H + CELL_PAD_Y * 2 }
    }

    measure.font = row.emphasis ? `700 19px ${FONT}` : `400 19px ${FONT}`
    const cellLines = columns.map((c, i) => wrapText(measure, row.cells?.[c.key] ?? '', inner[i]))
    const lineCount = Math.max(1, ...cellLines.map((l) => l.length))
    return { row, cellLines, height: lineCount * LINE_H + CELL_PAD_Y * 2 }
  })
}

// --- header blocks (pure geometry when ctx is null, so pagination can measure) ---

function drawFirstPageHeader(
  ctx: CanvasRenderingContext2D | null,
  spec: ReportSpec,
  logo: HTMLImageElement | null
): number {
  const logoSize = 84
  if (ctx) {
    if (logo) ctx.drawImage(logo, (PAGE_W - logoSize) / 2, MARGIN, logoSize, logoSize)
    ctx.textAlign = 'center'
  }
  let y = MARGIN + logoSize + 8

  if (ctx) {
    ctx.fillStyle = COLORS.ink
    ctx.font = `700 24px ${FONT}`
    ctx.fillText(strings.report.departmentName, PAGE_W / 2, y)
  }
  y += 34

  if (ctx) {
    ctx.font = `700 26px ${FONT}`
    ctx.fillText(spec.officeName, PAGE_W / 2, y)
  }
  y += 38

  if (spec.headOfficeName) {
    if (ctx) {
      ctx.fillStyle = COLORS.muted
      ctx.font = `400 20px ${FONT}`
      ctx.fillText(spec.headOfficeName, PAGE_W / 2, y)
    }
    y += 30
  }

  if (ctx) {
    ctx.fillStyle = COLORS.ink
    ctx.font = `700 22px ${FONT}`
    ctx.fillText(`${strings.report.reportLabel}: ${spec.title}`, PAGE_W / 2, y)
  }
  y += 36

  if (ctx) {
    ctx.strokeStyle = COLORS.line
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(MARGIN, y)
    ctx.lineTo(PAGE_W - MARGIN, y)
    ctx.stroke()
    ctx.textAlign = 'left'
  }
  return y + 20
}

function drawContinuationHeader(ctx: CanvasRenderingContext2D | null, spec: ReportSpec): number {
  if (ctx) {
    ctx.textAlign = 'center'
    ctx.fillStyle = COLORS.muted
    ctx.font = `700 18px ${FONT}`
    ctx.fillText(`${strings.report.reportLabel}: ${spec.title}`, PAGE_W / 2, MARGIN)
    ctx.strokeStyle = COLORS.line
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(MARGIN, MARGIN + 28)
    ctx.lineTo(PAGE_W - MARGIN, MARGIN + 28)
    ctx.stroke()
    ctx.textAlign = 'left'
  }
  return MARGIN + 48
}

function drawTableHeader(
  ctx: CanvasRenderingContext2D,
  columns: ReportColumn[],
  widths: number[],
  y: number
): number {
  ctx.fillStyle = COLORS.headerBg
  ctx.fillRect(MARGIN, y, CONTENT_W, TABLE_HEAD_H)
  ctx.fillStyle = COLORS.ink
  ctx.font = `700 19px ${FONT}`

  let x = MARGIN
  columns.forEach((column, i) => {
    const w = widths[i]
    const align = column.align ?? 'left'
    ctx.textAlign = align
    const tx = align === 'right' ? x + w - CELL_PAD_X : align === 'center' ? x + w / 2 : x + CELL_PAD_X
    ctx.fillText(column.label, tx, y + (TABLE_HEAD_H - 24) / 2)
    x += w
  })
  ctx.textAlign = 'left'

  strokeGrid(ctx, widths, y, TABLE_HEAD_H)
  return y + TABLE_HEAD_H
}

function strokeGrid(ctx: CanvasRenderingContext2D, widths: number[], y: number, h: number): void {
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MARGIN, y)
  ctx.lineTo(PAGE_W - MARGIN, y)
  ctx.moveTo(MARGIN, y + h)
  ctx.lineTo(PAGE_W - MARGIN, y + h)
  let x = MARGIN
  widths.forEach((w) => {
    x += w
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + h)
  })
  ctx.stroke()
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  laid: LaidOutRow,
  columns: ReportColumn[],
  widths: number[],
  y: number
): void {
  const { row, height } = laid
  ctx.fillStyle =
    row.section !== undefined ? COLORS.sectionBg : row.emphasis ? COLORS.totalBg : '#ffffff'
  ctx.fillRect(MARGIN, y, CONTENT_W, height)

  if (row.section !== undefined) {
    ctx.fillStyle = COLORS.ink
    ctx.font = `700 19px ${FONT}`
    ctx.textAlign = 'left'
    laid.sectionLines?.forEach((line, i) => {
      ctx.fillText(line, MARGIN + CELL_PAD_X, y + CELL_PAD_Y + i * LINE_H)
    })
  } else {
    ctx.fillStyle = row.emphasis ? COLORS.totalInk : COLORS.body
    ctx.font = row.emphasis ? `700 19px ${FONT}` : `400 19px ${FONT}`
    let x = MARGIN
    columns.forEach((column, i) => {
      const w = widths[i]
      const align = column.align ?? 'left'
      ctx.textAlign = align
      const tx = align === 'right' ? x + w - CELL_PAD_X : align === 'center' ? x + w / 2 : x + CELL_PAD_X
      laid.cellLines?.[i].forEach((line, k) => {
        ctx.fillText(line, tx, y + CELL_PAD_Y + k * LINE_H)
      })
      x += w
    })
    ctx.textAlign = 'left'
  }

  strokeGrid(ctx, widths, y, height)
}

/** Builds the A4 page canvases, paginating only at row boundaries. */
function renderPages(spec: ReportSpec, widths: number[], rows: LaidOutRow[], logo: HTMLImageElement | null): HTMLCanvasElement[] {
  const bottomLimit = PAGE_H - MARGIN

  const pageStartY = (index: number) =>
    (index === 0 ? drawFirstPageHeader(null, spec, logo) : drawContinuationHeader(null, spec)) +
    TABLE_HEAD_H

  const pages: LaidOutRow[][] = []
  let current: LaidOutRow[] = []
  let y = pageStartY(0)

  for (const laid of rows) {
    if (y + laid.height > bottomLimit && current.length > 0) {
      pages.push(current)
      current = []
      y = pageStartY(pages.length)
    }
    current.push(laid)
    y += laid.height
  }
  pages.push(current)

  return pages.map((pageRows, index) => {
    const canvas = createCanvas(PAGE_W, PAGE_H)
    const ctx = contextOf(canvas)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, PAGE_W, PAGE_H)

    let cursor =
      index === 0 ? drawFirstPageHeader(ctx, spec, logo) : drawContinuationHeader(ctx, spec)
    cursor = drawTableHeader(ctx, spec.columns, widths, cursor)
    for (const laid of pageRows) {
      drawRow(ctx, laid, spec.columns, widths, cursor)
      cursor += laid.height
    }

    // Page number
    ctx.fillStyle = COLORS.muted
    ctx.font = `400 17px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(`${index + 1} / ${pages.length}`, PAGE_W / 2, PAGE_H - MARGIN + 6)
    ctx.textAlign = 'left'

    return canvas
  })
}

// --- public API -------------------------------------------------------------

export async function downloadReportPdf(spec: ReportSpec): Promise<void> {
  if (typeof window === 'undefined') return

  const [{ jsPDF }, , logo] = await Promise.all([
    import('jspdf'),
    waitForFonts(),
    loadImage(LOGO_SRC),
  ])

  const widths = columnWidths(spec.columns)
  const laid = layoutRows(spec.columns, widths, spec.rows)
  const pages = renderPages(spec, widths, laid, logo)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  pdf.setProperties({ title: spec.title })

  pages.forEach((canvas, index) => {
    if (index > 0) pdf.addPage()
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST')
  })

  pdf.save(`${spec.fileName}.pdf`)
}

export async function downloadReportExcel(spec: ReportSpec): Promise<void> {
  if (typeof window === 'undefined') return

  const XLSX = await import('xlsx')

  const sheet: (string | number)[][] = [
    [strings.report.departmentName],
    [`${strings.report.reportLabel}: ${spec.title}`],
    [spec.officeName],
  ]
  if (spec.headOfficeName) sheet.push([spec.headOfficeName])
  sheet.push([])
  sheet.push(spec.columns.map((c) => c.label))

  spec.rows.forEach((row) => {
    if (row.section !== undefined) {
      sheet.push([row.section])
      return
    }
    sheet.push(spec.columns.map((c) => row.cells?.[c.key] ?? ''))
  })

  const worksheet = XLSX.utils.aoa_to_sheet(sheet)
  worksheet['!cols'] = spec.columns.map((c) => ({ wch: Math.max(16, Math.round((c.width ?? 1) * 22)) }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, (spec.title || 'Report').slice(0, 31))
  XLSX.writeFile(workbook, `${spec.fileName}.xlsx`)
}
