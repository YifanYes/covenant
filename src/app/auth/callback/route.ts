import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  // Better Auth handles the OAuth callback automatically via /api/auth/callback/google
  // This route just redirects to login which will detect the session
  return NextResponse.redirect(`${origin}/login`)
}
