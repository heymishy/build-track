/**
 * Debug endpoint to promote current user to ADMIN role
 * POST /api/debug/promote-admin
 * 
 * This is a one-time fix for production deployment issues.
 * Should be removed after fixing the admin role issue.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Get user from request
    const user = getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found',
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
      message: 'User promoted to ADMIN role successfully',
      user: updatedUser,
      previousRole: user.role,
      newRole: updatedUser.role,
    })

  } catch (error) {
    console.error('Error promoting user to admin:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to promote user to admin',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}