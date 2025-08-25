/**
 * API Route: /api/users
 * Manage users - list all users with their project permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(request: NextRequest, user: AuthUser) {
  try {
    // Only ADMIN users can view all users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only administrators can view user list',
        },
        { status: 403 }
      )
    }

    // Get all users with their project access
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        projects: {
          select: {
            projectId: true,
            role: true,
            createdAt: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transform the data to match our interface
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      projects: user.projects.map(p => ({
        projectId: p.projectId,
        projectName: p.project.name,
        role: p.role,
        addedAt: p.createdAt.toISOString(),
      })),
    }))

    return NextResponse.json({
      success: true,
      users: transformedUsers,
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
      },
      { status: 500 }
    )
  }
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    // Only ADMIN users can create users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only administrators can create users',
        },
        { status: 403 }
      )
    }

    const { email, name, role, password } = await request.json()

    if (!email || !name || !role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email, name, and role are required',
        },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'User with this email already exists',
        },
        { status: 400 }
      )
    }

    // Create new user
    const hashedPassword = password
      ? require('bcryptjs').hashSync(password, 10)
      : require('bcryptjs').hashSync('defaultPassword123', 10) // Temporary password

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        ...newUser,
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString(),
        projects: [],
      },
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create user',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'users',
  action: 'read',
  requireAuth: true,
})

const protectedPOST = withAuth(POST, {
  resource: 'users',
  action: 'create',
  requireAuth: true,
})

export { protectedGET as GET, protectedPOST as POST }
