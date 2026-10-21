import { toBanglaNumber } from '@/lib/bangla'

// Helper for Bangla Ordinal Level and Colors
export function getLevelOrderBadge(order: number | null | undefined) {
  const o = order || 1
  let label = `${toBanglaNumber(o)}ম স্তর`
  if (o === 1) label = '১ম স্তর'
  else if (o === 2) label = '২য় স্তর'
  else if (o === 3) label = '৩য় স্তর'
  else if (o === 4) label = '৪র্থ স্তর'
  else if (o === 5) label = '৫ম স্তর'
  else label = `${toBanglaNumber(o)}ম স্তর`

  // 5 distinct colors for 5 levels (and fallback)
  switch (o) {
    case 1:
      // Level 1: Indigo / Blue
      return {
        label,
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
      }
    case 2:
      // Level 2: Emerald / Teal
      return {
        label,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
      }
    case 3:
      // Level 3: Amber / Orange
      return {
        label,
        className: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
      }
    case 4:
      // Level 4: Violet / Purple
      return {
        label,
        className: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      }
    case 5:
      // Level 5: Rose / Red
      return {
        label,
        className: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
      }
    default:
      // Fallback for levels > 5: Slate
      return {
        label,
        className: 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100',
      }
  }
}
