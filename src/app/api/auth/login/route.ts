/**
 * User login API route
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing email or password',
        },
        { status: 400 }
      )
    }

    // Authenticate user
    const result = await authenticateUser(email, password)

    if (result.success && result.user) {
      // Create JWT token
      const token = jwt.sign(
        {
          userId: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      // Create response with user data and token
      const response = NextResponse.json(
        {
          ...result,
          token,
        },
        { status: 200 }
      )

      // Set token as httpOnly cookie for security
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })

      return response
    } else {
      return NextResponse.json(result, { status: 401 })
    }
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON',
      },
      { status: 400 }
    )
  }
}
