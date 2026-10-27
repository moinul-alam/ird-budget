'use client'

import { useState, useTransition } from 'react'
import { strings } from '@/lib/strings'
import { toBanglaDateTime } from '@/lib/bangla'
import { changeOwnPassword } from '@/app/actions/admin-profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Shield,
  ShieldCheck,
} from 'lucide-react'

interface AdminProfileClientProps {
  username: string
  role: 'admin' | 'superadmin'
  createdAt: string | null
}

/**
 * One password box with its own show/hide toggle. All three fields on this page behave
 * identically, so the toggle logic lives here once instead of three times over.
 */
function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  hint,
  hintInvalid,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  hint?: string
  hintInvalid?: boolean
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-bold text-slate-700">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-12 pl-4 pr-12 rounded-xl border-slate-200 bg-slate-50/50 font-medium focus:bg-white transition-colors"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={
            visible ? strings.admin.profile.hidePassword : strings.admin.profile.showPassword
          }
          disabled={disabled}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && (
        <p className={`text-xs ${hintInvalid ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
          {hint}
        </p>
      )}
    </div>
  )
}

export function AdminProfileClient({ username, role, createdAt }: AdminProfileClientProps) {
  const isSuperAdmin = role === 'superadmin'
  const text = strings.admin.profile

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Checked here as well as on the server so the office sees the mismatch the moment it
  // happens, instead of after a round trip.
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const canSubmit =
    !isPending &&
    !mismatch &&
    currentPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        const res = await changeOwnPassword(currentPassword, newPassword, confirmPassword)

        if (res.success) {
          // The old password is gone the moment this returns, so the fields are emptied
          // rather than left holding values that no longer authenticate anything.
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setSuccess(text.successMessage)
          setTimeout(() => setSuccess(null), 6000)
        } else {
          setError(res.error || strings.errors.general)
        }
      } catch (err: any) {
        setError(`${strings.errors.general} (${err?.message || ''})`)
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Identity card — role-tinted so the two admin levels are told apart at a glance. */}
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div
          className={`px-6 py-6 ${isSuperAdmin
            ? 'bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900'
            : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900'
            }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur-sm">
              {isSuperAdmin ? (
                <ShieldCheck className="h-7 w-7 text-white" />
              ) : (
                <Shield className="h-7 w-7 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black leading-snug text-white">{username}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-white ring-1 ring-inset ring-white/20">
                <ShieldCheck className="h-3 w-3" />
                {isSuperAdmin ? text.roleSuperAdmin : text.roleAdmin}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {text.usernameLabel}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800 font-mono break-all">
              {username}
            </p>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {text.roleLabel}
            </p>
            <p className="mt-1 text-sm font-bold leading-5 text-slate-800">
              {isSuperAdmin ? text.roleSuperAdmin : text.roleAdmin}
            </p>
          </div>

          {createdAt && (
            <>
              <div className="h-px bg-slate-100" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {text.memberSinceLabel}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {toBanglaDateTime(createdAt)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Password card */}
      <Card className="lg:col-span-2 rounded-2xl border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-start gap-2.5">
            <span
              className={`p-2 rounded-xl shrink-0 ${isSuperAdmin ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'
                }`}
            >
              <KeyRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base font-bold">{text.passwordTitle}</CardTitle>
              <CardDescription className="text-xs leading-relaxed mt-1">
                {text.passwordSubtitle}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5 text-xs font-medium leading-relaxed">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-2.5 text-xs font-bold leading-relaxed">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <PasswordField
              id="current-password"
              label={text.currentPasswordLabel}
              placeholder={text.currentPasswordPlaceholder}
              value={currentPassword}
              onChange={setCurrentPassword}
              disabled={isPending}
            />

            <div className="h-px bg-slate-100" />

            <PasswordField
              id="new-password"
              label={text.newPasswordLabel}
              placeholder={text.newPasswordPlaceholder}
              value={newPassword}
              onChange={setNewPassword}
              disabled={isPending}
              hint={text.passwordRule}
            />

            <PasswordField
              id="confirm-password"
              label={text.confirmPasswordLabel}
              placeholder={text.confirmPasswordPlaceholder}
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={isPending}
              hint={mismatch ? text.mismatchHint : text.passwordRule}
              hintInvalid={mismatch}
            />

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-sm cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {text.submitting}
                </>
              ) : (
                text.submit
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
