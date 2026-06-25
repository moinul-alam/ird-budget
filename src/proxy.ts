import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Update Supabase session (for Admin routes)
  const supabaseResponse = await updateSession(request)
  
  const path = request.nextUrl.pathname

  // Protect Office routes
  if (path.startsWith('/office') || path.startsWith('/dashboard')) {
    const officeSession = request.cookies.get('office_session')
    if (!officeSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
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
