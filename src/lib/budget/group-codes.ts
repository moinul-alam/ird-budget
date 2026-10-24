/**
 * Shared grouping for the report tables. Pure — safe to import from a client
 * component. Rows are grouped by budget category and ordered the way the sheet's
 * own reference data sorts (category order, then code order).
 */

export interface GroupableCode {
  code: string
  name: string
  category_id: number | null
  category_name: string
  category_sort_order: number
  sort_order: number
  amount: number
}

export interface CodeCategoryGroup<T extends GroupableCode> {
  category_id: number | null
  category_name: string
  codes: T[]
  subtotal: number
}

export function groupCodesByCategory<T extends GroupableCode>(
  codes: T[]
): CodeCategoryGroup<T>[] {
  const sorted = [...codes].sort(
    (a, b) =>
      a.category_sort_order - b.category_sort_order || a.sort_order - b.sort_order
  )

  const groups: CodeCategoryGroup<T>[] = []
  for (const code of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.category_id === code.category_id) {
      last.codes.push(code)
      last.subtotal += code.amount
    } else {
      groups.push({
        category_id: code.category_id,
        category_name: code.category_name,
        codes: [code],
        subtotal: code.amount,
      })
    }
  }

  return groups
}
