/**
 * Token validation API route
 * GET /api/auth/validate
 * Validates the current JWT token and returns user data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid authentication token',
          authenticated: false,
        },
        { status: 401 }
      )
    }

    // Return user data if token is valid
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid or expired token',
        authenticated: false,
      },
      { status: 401 }
    )
  }
}
