import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // Check for authentication cookie and log for debugging
  const token = request.cookies.get('auth_token')?.value
  const path = request.nextUrl.pathname
  
  console.log(`🔒 Middleware: Checking path ${path}`);
  
  if (token) {
    console.log(`🔑 Token found for path ${path}`);
  } else {
    console.log(`⚠️ No token found for path ${path}`);
  }

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/analytics', '/create-calls', '/call-history', '/agents', '/settings']
  const loginPath = '/login'

  // If trying to access a protected route without authentication
  if (protectedRoutes.includes(path)) {
    // Verify token and Azure AD authentication
    const isValidToken = token ? await verifyToken(token) : null

    console.log(`🔍 Token validation result for ${path}: ${isValidToken ? 'Valid' : 'Invalid'}`);

    if (!isValidToken) {
      // Redirect to login if not authenticated
      console.log(`🔄 Redirecting to login from ${path}`);
      return NextResponse.redirect(new URL(loginPath, request.url))
    }
  }

  // If already logged in and trying to access login page, redirect to dashboard
  if (path === loginPath && token) {
    const isValidToken = await verifyToken(token)
    console.log(`🔍 Login page token validation: ${isValidToken ? 'Valid' : 'Invalid'}`);

    if (isValidToken) {
      console.log('🔄 Already logged in, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

// Updated matcher to include all protected routes
export const config = {
  matcher: [
    '/login',
    '/dashboard',
    '/analytics',
    '/create-calls',
    '/call-history',
    '/agents',
    '/settings'
  ]
}