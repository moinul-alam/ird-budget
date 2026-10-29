'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_DIGIT_CAP } from '@/lib/budget/hazar'

/**
 * The digit cap the signed-in office's level sets for its amount fields. Resolving it
 * once in the office layout and reading it here keeps every form and the budget sheet
 * from having to thread the figure down through their own props.
 */
const DigitCapContext = createContext<number>(DEFAULT_DIGIT_CAP)

export function HazarProvider({
  digitCap,
  children,
}: {
  digitCap: number
  children: React.ReactNode
}) {
  return <DigitCapContext.Provider value={digitCap}>{children}</DigitCapContext.Provider>
}

export function useDigitCap(): number {
  return useContext(DigitCapContext)
}
