'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

/**
 * Numeric field that keeps its own text draft.
 *
 * Binding `value` straight to a number fights the user: the box starts at "0" and
 * the digits typed after it are appended ("01000"). The draft holds exactly what
 * was typed — an empty box when the value is zero — and still allows decimals.
 * The incoming value is only copied back in while the field is unfocused, so a
 * modal opening re-seeds it without clobbering live typing.
 */
export function NumberField({
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
  value: number
  onValueChange: (value: number) => void
}) {
  const [draft, setDraft] = useState(value === 0 ? '' : String(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(value === 0 ? '' : String(value))
  }, [value])

  return (
    <Input
      {...props}
      type="number"
      value={draft}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        const parsed = parseFloat(e.target.value)
        onValueChange(Number.isFinite(parsed) ? parsed : 0)
      }}
    />
  )
}
