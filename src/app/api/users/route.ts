/**
 * API Route: /api/users
 * Manage users - list all users with their project permissions
 */

import { NextRequest } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import {
  validateRequestBody,
  CreateUserSchema,
  createAPIResponse,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/validation'

async function GET(request: NextRequest, user: AuthUser) {
  try {
    // Only ADMIN users can view all users
    if (user.role !== 'ADMIN') {
      return createErrorResponse('Only administrators can view user list', 403)
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

    return createSuccessResponse({ users: transformedUsers })
  } catch (error) {
    console.error('Get users error:', error)
    return createErrorResponse('Failed to fetch users', 500)
  }
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    // Only ADMIN users can create users
    if (user.role !== 'ADMIN') {
      return createErrorResponse('Only administrators can create users', 403)
    }

    // Validate request body
    const validation = await validateRequestBody(request, CreateUserSchema)
    if (!validation.success) {
      return createErrorResponse(validation.error, 400)
    }

    const { email, name, role, password } = validation.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return createErrorResponse('User with this email already exists', 400)
    }

    // Create new user with secure password hashing
    const hashedPassword = require('bcryptjs').hashSync(password, 12) // Increased salt rounds for security

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

    return createSuccessResponse(
      {
        user: {
          ...newUser,
          createdAt: newUser.createdAt.toISOString(),
          updatedAt: newUser.updatedAt.toISOString(),
          projects: [],
        },
      },
      undefined,
      201
    )
  } catch (error) {
    console.error('Create user error:', error)
    return createErrorResponse('Failed to create user', 500)
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
