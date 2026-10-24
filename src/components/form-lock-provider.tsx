'use client'

import { createContext, useContext } from 'react'

export interface FormLockState {
  /** True when the forms must not be edited or saved. */
  locked: boolean
  /** Why they are locked — shown to the office in place of the save actions. */
  notice: string
}

/**
 * Shares the "submission is locked, forms are read-only" state with every form
 * shell beneath the office layout, so the individual form clients need no new
 * props to become read-only.
 */
const FormLockContext = createContext<FormLockState>({ locked: false, notice: '' })

export function FormLockProvider({
  locked,
  notice,
  children,
}: FormLockState & { children: React.ReactNode }) {
  return (
    <FormLockContext.Provider value={{ locked, notice }}>{children}</FormLockContext.Provider>
  )
}

export function useFormLock(): FormLockState {
  return useContext(FormLockContext)
}
