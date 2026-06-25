import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { strings } from '@/lib/strings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { BarChart3, ArrowRight } from 'lucide-react'

const FORM_LIST = [
  { key: 'form1' as const, href: '/office/form-1' },
  { key: 'form2' as const, href: '/office/form-2' },
  { key: 'form3' as const, href: '/office/form-3' },
  { key: 'form4' as const, href: '/office/form-4' },
  { key: 'form5' as const, href: '/office/form-5' },
  { key: 'form6' as const, href: '/office/form-6' },
  { key: 'form7' as const, href: '/office/form-7' },
  { key: 'form8' as const, href: '/office/form-8' },
  { key: 'form9' as const, href: '/office/form-9' },
  { key: 'form10' as const, href: '/office/form-10' },
] as const

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const sessionStr = cookieStore.get('office_session')?.value
  
  if (!sessionStr) {
    redirect('/')
  }

  let office
  try {
    office = JSON.parse(sessionStr)
  } catch (e) {
    redirect('/')
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{strings.dashboard.title}</h1>
        <p className="text-slate-500 mt-1">{strings.dashboard.welcome}</p>
      </div>

      {/* Form Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{strings.dashboard.formProgress}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FORM_LIST.map((form, idx) => (
              <Link
                key={form.key}
                href={form.href}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
              >
                <div className="h-10 w-10 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-sm font-bold text-slate-600 group-hover:text-blue-700 transition-colors font-mono shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {strings.forms[form.key].title}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {strings.dashboard.formNotStarted}
                </Badge>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Budget Sheet Link */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{strings.budgetSheet.title}</h3>
                <p className="text-sm text-slate-500">{strings.budgetSheet.autoNote}</p>
              </div>
            </div>
            <Link href="/office/budget-sheet" className={buttonVariants({ variant: "default" })}>
                {strings.dashboard.viewBudgetSheet}
                <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
