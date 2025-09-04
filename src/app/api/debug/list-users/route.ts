/**
 * Debug endpoint to list all users and their roles
 * GET /api/debug/list-users
 * 
 * This helps diagnose user role issues in production.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Listing all users from database...')

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const adminUsers = users.filter(u => u.role === 'ADMIN')
    
    const summary = {
      totalUsers: users.length,
      adminUsers: adminUsers.length,
      hasAdminUsers: adminUsers.length > 0,
      adminEmails: adminUsers.map(u => u.email),
    }

    console.log(`📊 User Summary:`, summary)
    
    return NextResponse.json({
      success: true,
      summary,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created: user.createdAt.toISOString(),
        isAdmin: user.role === 'ADMIN'
      })),
    })

  } catch (error) {
    console.error('Error listing users:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to list users',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}