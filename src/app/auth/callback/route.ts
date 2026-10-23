import { NextResponse } from 'next/server'

// This application uses custom authentication for admin and office users
// via admin_users and office_users tables (Prisma ORM)
// This callback route is not used and returns an error

export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
