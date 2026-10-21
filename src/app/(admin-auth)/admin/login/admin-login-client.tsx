'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { loginAdmin } from '@/app/actions/auth'
import { Loader2, ShieldCheck, Lock, User, ArrowLeft } from 'lucide-react'
import { strings } from '@/lib/strings'
import Link from 'next/link'

export function AdminLoginClient() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('superadmin')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await loginAdmin(formData)
      if (result?.error) {
        setError(result.error)
      }
    } catch {
      setError(strings.errors.general)
    } finally {
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
        
        <CardHeader className="space-y-2 pb-6 pt-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-2">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <CardTitle className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {strings.login.adminLoginTitle}
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium text-sm">
            {strings.login.adminLoginSubtitle}
          </CardDescription>
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
                placeholder={strings.login.usernamePlaceholder}
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
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={strings.login.passwordPlaceholder}
                required
                disabled={loading}
                className="h-12 px-4 rounded-xl border-slate-200 bg-slate-50/50 font-medium focus:bg-white transition-colors"
              />
              <p className="text-xs text-slate-400 mt-1">ডিফল্ট পাসওয়ার্ড: <span className="font-mono font-semibold text-slate-600">123456</span></p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold text-white shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98] mt-2" 
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
    </div>
  )
}
