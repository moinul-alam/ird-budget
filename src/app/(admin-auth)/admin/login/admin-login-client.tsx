'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { loginAdmin } from '@/lib/actions/auth'
import { Loader2, ShieldCheck, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { strings } from '@/lib/strings'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export function AdminLoginClient() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [forgotModalOpen, setForgotModalOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await loginAdmin(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      } else if (result?.success) {
        router.push('/admin/dashboard')
        router.refresh()
      }
    } catch {
      setError(strings.errors.general)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-10">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm border border-slate-200/80 backdrop-blur-md text-sm font-semibold transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          মূল পাতায় ফিরে যান
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white/95 backdrop-blur-xl relative z-10 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 w-full" />
        
        <CardHeader className="space-y-2 pb-4 pt-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-2">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <CardTitle className="text-2xl font-extrabold text-slate-800 tracking-tight font-title">
            {strings.login.adminLoginTitle}
          </CardTitle>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-0">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="rounded-xl border-rose-200 bg-rose-50/80 text-rose-800 text-sm py-3">
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <User className="h-4 w-4 text-slate-400" />
                {strings.login.username}
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ইউজারনেম লিখুন"
                required
                disabled={loading}
                className="h-12 px-4 rounded-xl border-slate-200 bg-slate-50/50 font-medium focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-slate-400" />
                  {strings.login.password}
                </Label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline font-semibold cursor-pointer"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={strings.login.passwordPlaceholder}
                  required
                  disabled={loading}
                  className="h-12 pl-4 pr-12 rounded-xl border-slate-200 bg-slate-50/50 font-medium focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold text-white shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98] mt-2 cursor-pointer" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {strings.login.signingIn}
                </>
              ) : (
                strings.login.signIn
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Forgot Password Modal */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <DialogHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs mb-1">
              <Lock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 font-title">
              পাসওয়ার্ড পুনরুদ্ধার
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-600 pt-2">
              সিস্টেম এডমিনের সাথে যোগাযোগ করুন
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex justify-center sm:justify-center">
            <Button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="rounded-xl px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
            >
              ঠিক আছে
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
