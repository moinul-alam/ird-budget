import { describe, expect, it } from 'vitest'

import {
  toBanglaAmount,
  toBanglaAmountCompact,
  toBanglaCurrency,
  toBanglaDate,
  toBanglaDateTime,
  toBanglaDateShort,
  toBanglaHazarWords,
  toBanglaNumber,
  toBanglaPercent,
  toBanglaTime,
  toEnglishNumber,
} from '@/lib/bangla'

describe('toBanglaNumber', () => {
  it('transliterates every ASCII digit', () => {
    expect(toBanglaNumber(1234567890)).toBe('১২৩৪৫৬৭৮৯০')
  })

  it('keeps non-digit characters untouched', () => {
    expect(toBanglaNumber('2025-26')).toBe('২০২৫-২৬')
  })

  it('returns an empty string for absent values', () => {
    expect(toBanglaNumber(null)).toBe('')
    expect(toBanglaNumber(undefined)).toBe('')
    expect(toBanglaNumber('')).toBe('')
  })
})

describe('toEnglishNumber', () => {
  it('is the inverse of toBanglaNumber', () => {
    expect(toEnglishNumber('১২৩৪৫৬৭৮৯০')).toBe('1234567890')
    expect(toEnglishNumber(toBanglaNumber(987654))).toBe('987654')
  })

  it('returns an empty string for absent values', () => {
    expect(toEnglishNumber(null)).toBe('')
    expect(toEnglishNumber('')).toBe('')
  })
})

describe('toBanglaCurrency', () => {
  it('groups on the lakh/crore scale, not thousands', () => {
    expect(toBanglaCurrency(1234567)).toBe('১২,৩৪,৫৬৭ টাকা')
  })

  it('leaves figures up to three digits ungrouped', () => {
    expect(toBanglaCurrency(0)).toBe('০ টাকা')
    expect(toBanglaCurrency(999)).toBe('৯৯৯ টাকা')
    expect(toBanglaCurrency(1000)).toBe('১,০০০ টাকা')
  })

  it('rounds to whole taka', () => {
    expect(toBanglaCurrency(1500.6)).toBe('১,৫০১ টাকা')
  })

  it('keeps the sign outside the digits', () => {
    expect(toBanglaCurrency(-1500)).toBe('-১,৫০০ টাকা')
  })

  it('omits the unit when asked', () => {
    expect(toBanglaAmount(1500)).toBe('১,৫০০')
  })

  it('renders an em dash for missing or non-numeric values', () => {
    expect(toBanglaCurrency(null)).toBe('—')
    expect(toBanglaCurrency('abc')).toBe('—')
  })
})

describe('toBanglaAmountCompact', () => {
  it('shortens crore-scale figures to two decimals', () => {
    expect(toBanglaAmountCompact(12345678)).toBe('১.২৩ কোটি')
  })

  it('shortens lakh-scale figures and trims trailing zeros', () => {
    expect(toBanglaAmountCompact(150000)).toBe('১.৫ লক্ষ')
  })

  it('leaves figures below a lakh as plain rounded numbers', () => {
    expect(toBanglaAmountCompact(50000)).toBe('৫০০০০')
  })

  it('renders an em dash for missing values', () => {
    expect(toBanglaAmountCompact(null)).toBe('—')
  })
})

describe('toBanglaHazarWords', () => {
  it('speaks a figure in হাজার words, as the amount field does', () => {
    expect(toBanglaHazarWords(10000)).toBe('১০ হাজার')
    expect(toBanglaHazarWords(100000)).toBe('১ লক্ষ')
    expect(toBanglaHazarWords(110000)).toBe('১ লক্ষ ১০ হাজার')
  })

  it('reads higher caps as লক্ষ and কোটি', () => {
    expect(toBanglaHazarWords(999000)).toBe('৯ লক্ষ ৯৯ হাজার')
    expect(toBanglaHazarWords(9999000)).toBe('৯৯ লক্ষ ৯৯ হাজার')
    expect(toBanglaHazarWords(99999000)).toBe('৯ কোটি ৯৯ লক্ষ ৯৯ হাজার')
  })

  it('keeps a typed fraction on the হাজার it landed in', () => {
    expect(toBanglaHazarWords(110500)).toBe('১ লক্ষ ১০.৫ হাজার')
    expect(toBanglaHazarWords(10050)).toBe('১০.০৫ হাজার')
  })

  it('reads zero as হাজার and missing values as an em dash', () => {
    expect(toBanglaHazarWords(0)).toBe('০ হাজার')
    expect(toBanglaHazarWords(null)).toBe('—')
    expect(toBanglaHazarWords('abc')).toBe('—')
  })
})

describe('Bangla date and time formatting', () => {
  it('formats a local date with the Bangla month name', () => {
    expect(toBanglaDate(new Date(2026, 0, 5))).toBe('৫ জানুয়ারি ২০২৬')
  })

  it('formats a 24-hour clock into a Bangla 12-hour period', () => {
    expect(toBanglaTime(new Date(2026, 0, 5, 14, 30))).toBe('০২:৩০ অপরাহ্ন')
    expect(toBanglaTime(new Date(2026, 0, 5, 9, 5))).toBe('০৯:০৫ পূর্বাহ্ন')
    expect(toBanglaTime(new Date(2026, 0, 5, 0, 0))).toBe('১২:০০ পূর্বাহ্ন')
  })

  it('joins date and time for a full timestamp', () => {
    expect(toBanglaDateTime(new Date(2026, 0, 5, 14, 30))).toBe('৫ জানুয়ারি ২০২৬, ০২:৩০ অপরাহ্ন')
  })

  it('renders a stored date as dd-mm-yyyy', () => {
    expect(toBanglaDateShort('2026-07-01')).toBe('০১-০৭-২০২৬')
    expect(toBanglaDateShort(new Date(2026, 0, 5))).toBe('০৫-০১-২০২৬')
    expect(toBanglaDateShort(null)).toBe('—')
    expect(toBanglaDateShort('not-a-date')).toBe('—')
  })

  it('renders an em dash for missing or invalid dates', () => {
    expect(toBanglaDate(null)).toBe('—')
    expect(toBanglaDate('not-a-date')).toBe('—')
    expect(toBanglaTime(undefined)).toBe('—')
  })
})

describe('toBanglaPercent', () => {
  it('appends the percent sign after the Bangla digits', () => {
    expect(toBanglaPercent(45.5)).toBe('৪৫.৫%')
  })

  it('renders an em dash for missing values', () => {
    expect(toBanglaPercent(null)).toBe('—')
  })
})
