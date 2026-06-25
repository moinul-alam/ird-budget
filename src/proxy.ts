import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Protect Office routes (cookie-based auth only — no Supabase round-trip)
  if (path.startsWith('/office') || path.startsWith('/dashboard')) {
    const officeSession = request.cookies.get('office_session')
    if (!officeSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // Skip Supabase auth entirely for office routes — blazing fast
    return NextResponse.next()
  }

  // Only run expensive Supabase auth session refresh for admin routes
  if (path.startsWith('/admin') || path.startsWith('/superadmin') || path.startsWith('/auth')) {
    return updateSession(request)
  }

  // Public routes — no auth needed
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
