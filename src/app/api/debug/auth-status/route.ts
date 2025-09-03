/**
 * Debug endpoint to check authentication status
 * GET /api/debug/auth-status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    // Get user from request without middleware protection
    const user = getUserFromRequest(request)

    // Get cookies for debugging
    const cookies = request.cookies.getAll()
    const authToken = request.cookies.get('auth-token')?.value
    const authHeader = request.headers.get('authorization')

    // Debug info
    const debugInfo = {
      timestamp: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          }
        : null,
      authentication: {
        hasAuthToken: !!authToken,
        authTokenLength: authToken ? authToken.length : 0,
        authTokenPreview: authToken ? authToken.substring(0, 20) + '...' : null,
        hasAuthHeader: !!authHeader,
        authHeader: authHeader ? authHeader.substring(0, 30) + '...' : null,
        cookieCount: cookies.length,
        cookieNames: cookies.map(c => c.name),
      },
      request: {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent')?.substring(0, 50) + '...',
      },
    }

    return NextResponse.json({
      success: true,
      authenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      debug: debugInfo,
    })
  } catch (error) {
    console.error('Debug auth status error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug authentication failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      authenticated: false,
      isAdmin: false,
    })
  }
}
