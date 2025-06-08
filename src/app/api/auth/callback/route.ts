import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// This route is now a fallback for handling redirects if needed
export async function GET(request: NextRequest) {
  try {
    // Extract authentication code from query parameters
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return NextResponse.redirect(new URL('/login?error=invalid_request', request.url))
    }

    // Redirect back to login page to handle the code
    return NextResponse.redirect(new URL(`/login?code=${code}&state=${state}`, request.url))
  } catch (error) {
    console.error('Azure AD Callback Error:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}

// Helper function to generate token (you'll need to import this from your existing auth library)
async function generateToken(payload: any): Promise<string> {
  return generateToken(payload)
} 