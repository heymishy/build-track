/**
 * Debug endpoint to force logout and clear authentication cookies
 * GET /api/debug/force-logout
 * 
 * This forces a fresh login to sync the updated user role from database.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Force logout - clearing authentication cookies')

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful! Please log in again to sync your updated ADMIN role.',
      instructions: [
        '1. You will be redirected to the login page',
        '2. Log in with your credentials again', 
        '3. Your ADMIN permissions will now be active',
        '4. Go to Settings → Supplier Portal (should now work!)'
      ]
    })

    // Clear authentication cookies
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    })

    // Clear any other auth-related cookies
    response.cookies.set('user-data', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    // Set a redirect header to login page
    response.headers.set('X-Redirect', '/login')
    
    console.log('✅ Authentication cookies cleared successfully')

    return response

  } catch (error) {
    console.error('Error during force logout:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to logout',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}