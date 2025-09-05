/**
 * Debug endpoint to promote current user to ADMIN role via GET request
 * GET /api/debug/promote-admin-get
 * 
 * This is a workaround for POST request issues in production.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get user from request
    const user = getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found. Please make sure you are logged in.',
      }, { status: 401 })
    }

    console.log(`🔧 Promoting user ${user.id} (${user.email}) to ADMIN role`)

    // Update user role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    })

    console.log(`✅ Successfully promoted user to ADMIN:`, updatedUser)

    return NextResponse.json({
      success: true,
      message: 'User promoted to ADMIN role successfully! You can now access supplier management.',
      user: updatedUser,
      previousRole: user.role,
      newRole: updatedUser.role,
      instructions: 'Please refresh the page and try accessing Settings → Supplier Portal again.'
    })

  } catch (error) {
    console.error('Error promoting user to admin:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to promote user to admin',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      details: 'Database update failed. Please check logs for more details.'
    }, { status: 500 })
  }
}