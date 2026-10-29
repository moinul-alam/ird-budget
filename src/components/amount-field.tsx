'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { toBanglaAmount, toBanglaNumber } from '@/lib/bangla'
import { AMOUNT_DECIMALS, TAKA_PER_HAZAR, exceedsDigitCap, hazarCapCeiling } from '@/lib/budget/hazar'
import { strings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { useDigitCap } from '@/components/hazar-provider'

/** The taka figure as it reads in হাজার: 10250 → '10.25', 0 → ''. */
const draftFromTaka = (taka: number | string): string => {
  const parsed = typeof taka === 'string' ? parseFloat(taka) : taka
  if (!Number.isFinite(parsed) || parsed === 0) return ''
  return String(Math.round((parsed / TAKA_PER_HAZAR) * 100) / 100)
}

/** The taka figure a হাজার draft stands for; '' means the field holds no entry. */
const takaFromDraft = (draft: string): string => {
  const parsed = parseFloat(draft)
  if (!Number.isFinite(parsed)) return ''
  return String(Math.round(parsed * TAKA_PER_HAZAR * 100) / 100)
}

/** Keeps digits and at most one point, with the decimals clipped to what the field allows. */
const sanitize = (raw: string, allowDecimal: boolean): string => {
  const typed = raw.replace(/[^0-9.]/g, '')
  if (!allowDecimal) return typed.replace(/\./g, '')

  const firstDot = typed.indexOf('.')
  if (firstDot === -1) return typed

  const whole = typed.slice(0, firstDot)
  const fraction = typed.slice(firstDot + 1).replace(/\./g, '').slice(0, AMOUNT_DECIMALS)
  return whole + '.' + fraction
}

/**
 * An amount field in হাজার: the office types `10` and ১০,০০০ টাকা is what is meant.
 *
 * The value it is handed and the value it hands back are both in taka, so every form,
 * action and the engine keep working in the exact unit the rates are defined in — the
 * conversion lives here and nowhere else. A readout above the box spells out what the
 * typed figure is worth, always in warning red, because the whole point is that the
 * office notices the magnitude before moving on. Typing more digits than the office
 * level allows is refused outright, with the entry replaced by an explanation.
 */
export function AmountField({
  value,
  onValueChange,
  allowDecimal = true,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'inputMode'> & {
  /** The stored figure, in taka. */
  value: number | string
  /** Emits the taka figure the typed হাজার value stands for; '' clears the entry. */
  onValueChange: (taka: string) => void
  /** False keeps the entry to whole হাজার — the budget sheet's overrides. */
  allowDecimal?: boolean
}) {
  const digitCap = useDigitCap()
  const [draft, setDraft] = useState(() => draftFromTaka(value))
  const [overflowed, setOverflowed] = useState(false)
  const focused = useRef(false)

  // An existing row's figure arrives when its modal opens, so the stored value is copied
  // in while the field sits idle — a modal re-seeding itself must not clobber live typing.
  useEffect(() => {
    if (focused.current) return
    setDraft(draftFromTaka(value))
    setOverflowed(false)
  }, [value])

  const handleChange = (raw: string) => {
    const next = sanitize(raw, allowDecimal)
    if (exceedsDigitCap(parseFloat(next) || 0, digitCap)) {
      setOverflowed(true)
      return
    }
    setOverflowed(false)
    setDraft(next)
    onValueChange(takaFromDraft(next))
  }

  const taka = parseFloat(draft) * TAKA_PER_HAZAR
  const maxHazar = hazarCapCeiling(digitCap)

  return (
    <div className="space-y-1">
      {/* Reserved line, so a field never jumps as its readout appears and disappears. */}
      <div className="h-4 text-[11px] font-bold leading-4 text-rose-600">
        {draft !== '' && Number.isFinite(taka) ? strings.hazar.readout(toBanglaAmount(taka)) : ''}
      </div>

      <div className="relative">
        <Input
          {...props}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            focused.current = true
          }}
          onBlur={() => {
            focused.current = false
          }}
          className={cn(
            'pr-16',
            overflowed && 'border-rose-400 focus-visible:ring-rose-200',
            className
          )}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-bold text-slate-400">
          {strings.hazar.badge}
        </span>
      </div>

      {overflowed && (
        <p className="text-[11px] font-bold leading-4 text-rose-600">
          {strings.hazar.capExceeded(
            toBanglaNumber(digitCap),
            toBanglaNumber(maxHazar),
            toBanglaAmount(maxHazar * TAKA_PER_HAZAR)
          )}
        </p>
      )}
    </div>
  )
}
