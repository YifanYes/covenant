import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for Better Auth session cookie (crossSubDomainCookies adds __Secure- prefix)
  const sessionToken =
    request.cookies.get('__Secure-better-auth.session_token')?.value ||
    request.cookies.get('better-auth.session_token')?.value
  const hasSession = Boolean(sessionToken)

  // Public routes
  const authRoutes = ['/login', '/sign-up', '/auth/callback']
  const landingRoutes = ['/', '/news', '/mechanics', '/magic-nature', '/roadmap']
  const landingPrefixRoutes = ['/story', '/card']
  const isPublicRoute =
    authRoutes.some((r) => pathname.startsWith(r)) ||
    landingRoutes.includes(pathname) ||
    landingPrefixRoutes.some((r) => pathname.startsWith(r))

  // Redirect logic
  if (!isPublicRoute && !hasSession) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect_to', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (authRoutes.some((r) => pathname.startsWith(r)) && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
