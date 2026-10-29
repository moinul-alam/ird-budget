'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { toBanglaHazarWords } from '@/lib/bangla'
import { AMOUNT_DECIMALS, TAKA_PER_HAZAR, exceedsDigitCap } from '@/lib/budget/hazar'
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
 * conversion lives here and nowhere else. A readout spells out what the typed figure is
 * worth, spoken in হাজার words ('১০ হাজার' / '১ লক্ষ' / '১ লক্ষ ১০ হাজার') and always in
 * warning red, because the whole point is that the office notices the magnitude before
 * moving on. It tracks every keystroke rather than waiting to be left behind, and it
 * floats above the box rather than taking a line of its own, so the fields in a row
 * still line up. Typing more digits than the office level allows is refused outright,
 * with the entry replaced by an explanation.
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
  // The readout is a hint, not a marker: it shows while the field is being worked in and
  // lets go the moment the office moves on.
  const [active, setActive] = useState(false)
  // A modal re-seeding itself may arrive while the office is typing, and that must not
  // clobber the draft — hence the ref rather than a plain `value` comparison.
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
  const showReadout = active && draft !== '' && Number.isFinite(taka) && !overflowed

  return (
    <>
      <div className="relative">
        {/* Overlay, not a layout line: it floats over the top edge of the box so a row of
            fields stays aligned, and it follows the entry as it is typed. */}
        {showReadout && (
          <span className="pointer-events-none absolute -top-5 right-1 z-10 whitespace-nowrap rounded bg-white/95 px-1 text-[11px] font-bold leading-4 text-rose-600">
            {toBanglaHazarWords(taka)}
          </span>
        )}

        <Input
          {...props}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            focused.current = true
            setActive(true)
          }}
          onBlur={() => {
            focused.current = false
            setActive(false)
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
        <p className="mt-1 text-[11px] font-bold leading-4 text-rose-600">
          {strings.hazar.capExceeded}
        </p>
      )}
    </>
  )
}
