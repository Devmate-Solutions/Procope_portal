import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple token decode function for middleware
function decodeTokenForMiddleware(token: string) {
  try {
    if (!token) return null

    // Try base64 decoding first
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString())
      return payload
    } catch {
      // Try parsing as plain JSON
      return JSON.parse(token)
    }
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/login'
  ) {
    return NextResponse.next()
  }

  // Check for auth token in cookies
  const token = request.cookies.get('auth_token')?.value

  // If no token and not on login page, redirect to login
  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If token exists and on login page, redirect based on user permissions
  if (token && pathname === '/login') {
    const user = decodeTokenForMiddleware(token)
    const hasHotelAccess = user?.allowedPages?.includes('hotel')

    // Redirect hotel users to analytics, others to dashboard
    const redirectPath = hasHotelAccess ? '/analytics' : '/dashboard'
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
