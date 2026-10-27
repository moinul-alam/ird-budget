import { describe, expect, it } from 'vitest'

import { strings } from '@/lib/strings'
import { FORM_COUNT, FORM_ITEMS, FORM_SHADES } from '@/lib/office/form-nav'

describe('FORM_ITEMS', () => {
  it('lists all twelve budget forms', () => {
    expect(FORM_COUNT).toBe(12)
    expect(FORM_ITEMS).toHaveLength(FORM_COUNT)
  })

  it('numbers the forms sequentially from one', () => {
    expect(FORM_ITEMS.map((f) => f.num)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('pairs each form with its own route', () => {
    FORM_ITEMS.forEach((item) => {
      expect(item.href).toBe(`/office/form-${item.num}`)
    })
  })

  it('carries a non-empty title and short label for every form', () => {
    FORM_ITEMS.forEach((item) => {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.short.length).toBeGreaterThan(0)
    })
  })

  it('resolves every key against the strings registry', () => {
    FORM_ITEMS.forEach((item) => {
      expect(item.title).toBe(strings.forms[item.key].title)
      expect(item.short).toBe(strings.forms[item.key].short)
    })
  })
})

describe('FORM_SHADES', () => {
  it('produces exactly one shade per form', () => {
    expect(FORM_SHADES).toHaveLength(FORM_COUNT)
  })

  it('darkens monotonically so the list reads as a single scale', () => {
    const lightnesses = FORM_SHADES.map((shade) =>
      Number(shade.background.match(/hsl\(\d+ \d+% ([\d.]+)%\)/)?.[1]),
    )
    lightnesses.forEach((value) => expect(Number.isNaN(value)).toBe(false))
    for (let i = 1; i < lightnesses.length; i += 1) {
      expect(lightnesses[i]).toBeLessThan(lightnesses[i - 1])
    }
  })

  it('flips the text colour to white once the shade is dark enough', () => {
    FORM_SHADES.forEach((shade) => {
      const lightness = Number(shade.background.match(/hsl\(\d+ \d+% ([\d.]+)%\)/)?.[1])
      expect(shade.color).toBe(lightness <= 57 ? '#ffffff' : 'hsl(221 70% 28%)')
    })
  })
})
