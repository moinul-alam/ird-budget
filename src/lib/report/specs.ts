import { toBanglaHazar, toBanglaNumber } from '@/lib/bangla'
import { groupCodesByCategory, type GroupableCode } from '@/lib/budget/group-codes'
import { strings } from '@/lib/strings'
import type { ReportColumn, ReportRow, ReportSpec } from '@/lib/report/export'

/**
 * Spec builders shared by every report screen, so a downloaded file always mirrors the
 * table it came from: same rows, same order, same category breaks, same totals.
 *
 * Pure and deliberately free of `'use client'`, so a server page can build a spec and
 * hand it to the client-side `ReportDownloader` as plain serialisable data.
 */

const COLUMNS = strings.reports
const TOTAL_ROW = strings.budgetSheet.totalRow

const CODE_COLUMNS: ReportColumn[] = [
  { key: 'serial', label: COLUMNS.serialColumn, align: 'center', width: 0.6 },
  { key: 'code', label: COLUMNS.codeColumn, align: 'left', width: 1.1 },
  { key: 'name', label: COLUMNS.codeNameColumn, align: 'left', width: 3.4 },
  { key: 'amount', label: COLUMNS.amountColumn, align: 'right', width: 1.6 },
]

const OFFICE_TOTAL_COLUMNS: ReportColumn[] = [
  { key: 'serial', label: COLUMNS.serialColumn, align: 'center', width: 0.6 },
  { key: 'budgetId', label: COLUMNS.budgetIdColumn, align: 'left', width: 1.5 },
  { key: 'officeName', label: COLUMNS.officeNameColumn, align: 'left', width: 3.2 },
  { key: 'status', label: COLUMNS.statusColumn, align: 'center', width: 1.2 },
  { key: 'total', label: COLUMNS.officeTotalColumn, align: 'right', width: 1.6 },
]

const OFFICE_LIST_COLUMNS: ReportColumn[] = [
  { key: 'serial', label: COLUMNS.serialColumn, align: 'center', width: 0.6 },
  { key: 'budgetId', label: COLUMNS.budgetIdColumn, align: 'left', width: 1.5 },
  { key: 'officeName', label: COLUMNS.officeNameColumn, align: 'left', width: 3 },
  { key: 'department', label: COLUMNS.departmentColumn, align: 'left', width: 1.8 },
  { key: 'officeType', label: COLUMNS.officeTypeColumn, align: 'left', width: 1.8 },
  { key: 'status', label: COLUMNS.statusColumn, align: 'center', width: 1.2 },
]

/** The হাজার cell text for a report table, matching how the screens blank out zeroes. */
function amountCell(amount: number): string {
  return amount ? toBanglaHazar(amount) : '—'
}

export function reportStatusLabel(status: 'submitted' | 'draft' | 'not_started'): string {
  return status === 'submitted' ? 'দাখিলকৃত' : status === 'draft' ? 'খসড়া' : 'শুরু করেনি'
}

/**
 * Code rows with their category breaks, in exactly the order `groupCodesByCategory`
 * renders them, so the file groups the same way the screen does.
 */
function buildCodeRows<T extends GroupableCode>(codes: T[]): ReportRow[] {
  const rows: ReportRow[] = []
  let index = 0

  for (const group of groupCodesByCategory(codes)) {
    rows.push({ section: { name: group.category_name || 'অন্যান্য' } })
    for (const code of group.codes) {
      index += 1
      rows.push({
        cells: {
          serial: toBanglaNumber(index),
          code: code.code,
          name: code.name,
          amount: amountCell(code.amount),
        },
      })
    }
  }

  return rows
}

function specHeader(title: string, scopeName: string, headOfficeName?: string) {
  return { title, officeName: scopeName, headOfficeName }
}

export interface CodeWiseSpecInput {
  /** Report name shown in the file header. */
  title: string
  /** The level, group or office the figures belong to. */
  scopeName: string
  headOfficeName?: string
  fileName: string
  codes: GroupableCode[]
  grandTotal: number
}

/** One table of codes summed across the offices in scope. */
export function buildCodeWiseSpec(input: CodeWiseSpecInput): ReportSpec {
  const rows = buildCodeRows(input.codes)
  rows.push({
    emphasis: true,
    cells: {
      serial: '',
      code: '',
      name: TOTAL_ROW,
      amount: toBanglaHazar(input.grandTotal),
    },
  })

  return { ...specHeader(input.title, input.scopeName, input.headOfficeName), fileName: input.fileName, columns: CODE_COLUMNS, rows }
}

export interface OfficeTotalRow {
  budget_id: string
  name: string
  status: 'submitted' | 'draft' | 'not_started'
  total: number
}

export interface OfficeTotalsSpecInput {
  title: string
  scopeName: string
  headOfficeName?: string
  fileName: string
  offices: OfficeTotalRow[]
  grandTotal: number
}

/** One table of the offices in scope with their own grand totals. */
export function buildOfficeTotalsSpec(input: OfficeTotalsSpecInput): ReportSpec {
  const rows: ReportRow[] = input.offices.map((office, idx) => ({
    cells: {
      serial: toBanglaNumber(idx + 1),
      budgetId: office.budget_id,
      officeName: office.name,
      status: reportStatusLabel(office.status),
      total: amountCell(office.total),
    },
  }))

  rows.push({
    emphasis: true,
    cells: { serial: '', budgetId: '', officeName: TOTAL_ROW, status: '', total: toBanglaHazar(input.grandTotal) },
  })

  return { ...specHeader(input.title, input.scopeName, input.headOfficeName), fileName: input.fileName, columns: OFFICE_TOTAL_COLUMNS, rows }
}

export interface OfficeListRow {
  budget_id: string
  name: string
  department_name: string
  office_type_name: string
  status: 'submitted' | 'draft' | 'not_started'
}

export interface OfficeListSpecInput {
  title: string
  /** Sits under the department name — the cycle the list was taken from. */
  scopeName: string
  fileName: string
  offices: OfficeListRow[]
}

/** The office directory behind the individual report, one row per office. */
export function buildOfficeListSpec(input: OfficeListSpecInput): ReportSpec {
  const rows: ReportRow[] = input.offices.map((office, idx) => ({
    cells: {
      serial: toBanglaNumber(idx + 1),
      budgetId: office.budget_id,
      officeName: office.name,
      department: office.department_name,
      officeType: office.office_type_name,
      status: reportStatusLabel(office.status),
    },
  }))

  return {
    ...specHeader(input.title, input.scopeName),
    fileName: input.fileName,
    columns: OFFICE_LIST_COLUMNS,
    rows,
  }
}
