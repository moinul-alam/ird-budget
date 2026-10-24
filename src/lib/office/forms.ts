import { strings } from '@/lib/strings'

/**
 * The twelve budget forms, in submission order — the single list the drawer and
 * the dashboard both read, so the count can never drift from the links.
 */

const FORM_ROUTES: Array<{ key: keyof typeof strings.forms; href: string }> = [
  { key: 'form1', href: '/office/form-1' },
  { key: 'form2', href: '/office/form-2' },
  { key: 'form3', href: '/office/form-3' },
  { key: 'form4', href: '/office/form-4' },
  { key: 'form5', href: '/office/form-5' },
  { key: 'form6', href: '/office/form-6' },
  { key: 'form7', href: '/office/form-7' },
  { key: 'form8', href: '/office/form-8' },
  { key: 'form9', href: '/office/form-9' },
  { key: 'form10', href: '/office/form-10' },
  { key: 'form11', href: '/office/form-11' },
  { key: 'form12', href: '/office/form-12' },
]

export interface OfficeFormItem {
  key: keyof typeof strings.forms
  num: number
  href: string
  title: string
  short: string
}

export const FORM_ITEMS: OfficeFormItem[] = FORM_ROUTES.map((f, i) => ({
  key: f.key,
  num: i + 1,
  href: f.href,
  title: strings.forms[f.key].title,
  short: strings.forms[f.key].short,
}))

export const FORM_COUNT = FORM_ITEMS.length

/**
 * One hue, twelve shades: form ১ is the lightest, form ১২ the deepest. Applied to
 * the number chip so the list reads as a single scale rather than twelve
 * unrelated colours.
 */
export const FORM_SHADES = Array.from({ length: FORM_COUNT }, (_, i) => {
  const lightness = 92 - i * 5
  return {
    background: `hsl(221 83% ${lightness}%)`,
    color: lightness <= 57 ? '#ffffff' : 'hsl(221 70% 28%)',
  }
})
