import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Protect Office routes (cookie-based auth only)
  if (path.startsWith('/office') || path.startsWith('/dashboard')) {
    const officeSession = request.cookies.get('office_session')
    if (!officeSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Admin routes protection
  if (path.startsWith('/admin')) {
    const isLogin = path === '/admin/login'
    const adminSession = request.cookies.get('admin_session')

    // Only a presence check is possible here (no signature verification in the
    // edge proxy), so never redirect *away* from the login page — the admin
    // layout validates the session and handles the authenticated case. Blindly
    // bouncing /admin/login -> /admin/dashboard on a stale cookie causes an
    // infinite redirect loop with the layout's validity check.
    if (!adminSession && !isLogin) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return NextResponse.next()
  }

  // Redirect legacy /superadmin paths to /admin/login
  if (path.startsWith('/superadmin')) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
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
