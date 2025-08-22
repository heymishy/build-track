/**
 * API Route: /api/users/[id]
 * Manage individual user operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(
  request: NextRequest, 
  user: AuthUser,
  context?: { params: { id: string } }
) {
  try {
    // Get user ID from URL path
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const userId = pathSegments[pathSegments.length - 1]

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    // Users can view their own profile, admins can view any user
    if (user.role !== 'ADMIN' && user.id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'You can only view your own profile'
      }, { status: 403 })
    }

    // Get user with project access
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
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
                description: true
              }
            }
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    // Transform the data
    const transformedUser = {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      createdAt: targetUser.createdAt.toISOString(),
      updatedAt: targetUser.updatedAt.toISOString(),
      projects: targetUser.projects.map(p => ({
        projectId: p.projectId,
        projectName: p.project.name,
        projectDescription: p.project.description,
        role: p.role,
        addedAt: p.createdAt.toISOString()
      }))
    }

    return NextResponse.json({
      success: true,
      user: transformedUser
    })

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user'
    }, { status: 500 })
  }
}

async function PUT(
  request: NextRequest,
  user: AuthUser,
  context?: { params: { id: string } }
) {
  try {
    // Get user ID from URL path
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const userId = pathSegments[pathSegments.length - 1]

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    const { name, role } = await request.json()

    // Users can edit their own profile (but not role), admins can edit any user
    if (user.role !== 'ADMIN' && user.id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'You can only edit your own profile'
      }, { status: 403 })
    }

    // Non-admins cannot change roles
    if (user.role !== 'ADMIN' && role && role !== user.role) {
      return NextResponse.json({
        success: false,
        error: 'You cannot change user roles'
      }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    if (name) updateData.name = name
    if (role && user.role === 'ADMIN') updateData.role = role

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update user'
    }, { status: 500 })
  }
}

async function DELETE(
  request: NextRequest,
  user: AuthUser,
  context?: { params: { id: string } }
) {
  try {
    // Get user ID from URL path
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const userId = pathSegments[pathSegments.length - 1]

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    // Only admins can delete users
    if (user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Only administrators can delete users'
      }, { status: 403 })
    }

    // Prevent deleting yourself
    if (user.id === userId) {
      return NextResponse.json({
        success: false,
        error: 'You cannot delete your own account'
      }, { status: 400 })
    }

    // Check if user exists and get their project ownership
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          where: { role: 'OWNER' },
          include: {
            project: {
              select: { name: true }
            }
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    // Check if user owns any projects
    const ownedProjects = targetUser.projects.filter(p => p.role === 'OWNER')
    if (ownedProjects.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete user who owns ${ownedProjects.length} project(s). Transfer ownership first.`,
        ownedProjects: ownedProjects.map(p => p.project.name)
      }, { status: 400 })
    }

    // Delete user and all their project associations
    await prisma.$transaction([
      // Remove user from all projects
      prisma.projectUser.deleteMany({
        where: { userId }
      }),
      // Delete the user
      prisma.user.delete({
        where: { id: userId }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete user'
    }, { status: 500 })
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'users',
  action: 'read',
  requireAuth: true,
})

const protectedPUT = withAuth(PUT, {
  resource: 'users',
  action: 'update',
  requireAuth: true,
})

const protectedDELETE = withAuth(DELETE, {
  resource: 'users',
  action: 'read', // Use 'read' since delete permission is handled internally
  requireAuth: true,
})

export { protectedGET as GET, protectedPUT as PUT, protectedDELETE as DELETE }