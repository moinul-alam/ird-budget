import { NextResponse } from 'next/server'

// NOTE: This file uses Supabase Auth which is not used in this application.
// Custom auth is implemented for admin and office users.
// Keeping this file commented out in case Supabase Auth is needed in the future.

/*
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
*/

export async function GET(request: Request) {
  // Return error since Supabase Auth is not configured
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
