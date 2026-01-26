import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for Better Auth session cookie
  const sessionToken = request.cookies.get('better-auth.session_token')?.value
  const hasSession = Boolean(sessionToken)

  // Public routes (login, sign-up, auth callback)
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/sign-up') || pathname.startsWith('/auth/callback')

  // Protected routes
  const isProtectedRoute = !isAuthRoute && pathname !== '/'

  // Redirect logic
  if (isProtectedRoute && !hasSession) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect_to', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
