/**
 * User registration API route
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      )
    }

    // Create user with default role
    const result = await createUser({
      email,
      password,
      name,
      role: 'USER',
    })

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
        { status: 201 }
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
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('Registration error:', error)

    // Provide more detailed error information in development
    const errorMessage =
      process.env.NODE_ENV === 'development'
        ? error instanceof Error
          ? error.message
          : 'Unknown error'
        : 'Registration failed'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    )
  }
}
