'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Save, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { strings } from '@/lib/strings'

/** What a form tells the guard about itself so leaving it can be safe. */
export interface FormGuard {
  /** True while the form holds edits that are not yet stored. */
  isDirty: () => boolean
  /** Persists the form; returns an error message, or null on success. */
  save: () => Promise<string | null>
}

interface FormGuardValue {
  /** The mounted form registers itself here; pass null to unregister. */
  registerGuard: (guard: FormGuard | null) => void
  /**
   * Navigates to `href`, unless the mounted form has unsaved edits — in which
   * case it asks first. Every link that leaves a form goes through this.
   */
  requestNavigation: (href: string) => void
}

const FormGuardContext = createContext<FormGuardValue>({
  registerGuard: () => {},
  requestNavigation: () => {},
})

/**
 * Watches over in-progress form edits: whichever form is on screen registers
 * itself, and any navigation away from it — the form's own Prev/Next buttons or
 * the drawer's form list — is held back until the office decides whether to save
 * or discard what they typed.
 */
export function FormGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const guardRef = useRef<FormGuard | null>(null)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const registerGuard = useCallback((guard: FormGuard | null) => {
    guardRef.current = guard
  }, [])

  const requestNavigation = useCallback(
    (href: string) => {
      const guard = guardRef.current
      if (!guard || !guard.isDirty()) {
        router.push(href)
        return
      }
      setSaveError(null)
      setPendingHref(href)
    },
    [router]
  )

  const leave = useCallback(
    (href: string) => {
      setPendingHref(null)
      setSaveError(null)
      router.push(href)
    },
    [router]
  )

  const handleSaveAndLeave = async () => {
    const href = pendingHref
    const guard = guardRef.current
    if (!href) return

    if (!guard) {
      leave(href)
      return
    }

    setIsSaving(true)
    try {
      const error = await guard.save()
      if (error) {
        setSaveError(error)
        setIsSaving(false)
        return
      }
      setIsSaving(false)
      leave(href)
    } catch (e: any) {
      setSaveError(e?.message || strings.saveFailed)
      setIsSaving(false)
    }
  }

  return (
    <FormGuardContext.Provider value={{ registerGuard, requestNavigation }}>
      {children}

      <Dialog
        open={pendingHref !== null}
        onOpenChange={(open) => {
          if (!open && !isSaving) setPendingHref(null)
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 rounded-xl bg-amber-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {strings.unsavedChanges.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed pt-1">
              {strings.unsavedChanges.message}
            </DialogDescription>
          </DialogHeader>

          {saveError && (
            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {saveError}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingHref(null)}
              disabled={isSaving}
              className="rounded-xl text-xs font-semibold"
            >
              {strings.unsavedChanges.stay}
            </Button>
            <Button
              type="button"
              onClick={() => pendingHref && leave(pendingHref)}
              disabled={isSaving}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold gap-1.5"
            >
              {strings.unsavedChanges.leave}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndLeave}
              disabled={isSaving}
              className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {strings.unsavedChanges.saveAndLeave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormGuardContext.Provider>
  )
}

export function useFormGuard(): FormGuardValue {
  return useContext(FormGuardContext)
}

/**
 * Registers a form with the guard for as long as it is mounted. The accessors are
 * kept in refs so a form can re-render freely without re-registering.
 */
export function useRegisterFormGuard(guard: FormGuard) {
  const { registerGuard } = useFormGuard()
  const guardRef = useRef(guard)
  guardRef.current = guard

  useEffect(() => {
    registerGuard({
      isDirty: () => guardRef.current.isDirty(),
      save: () => guardRef.current.save(),
    })
    return () => registerGuard(null)
  }, [registerGuard])
}
