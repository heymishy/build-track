/**
 * API Route: POST /api/projects/[id]/fix-ownership
 * Fix missing project ownership for current user (development helper)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function POST(request: NextRequest, user: AuthUser, context?: { params: { id: string } }) {
  try {
    // Get project ID from URL pathname since context.params might be undefined
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const projectId = pathSegments[pathSegments.length - 2] // Get the ID from /api/projects/{id}/fix-ownership

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        { status: 400 }
      )
    }

    console.log(`Fixing ownership for project: ${projectId}, user: ${user.id}`)

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        users: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      )
    }

    // Check if user already has access
    const existingAccess = project.users.find(u => u.userId === user.id)

    if (existingAccess) {
      return NextResponse.json({
        success: true,
        message: `User already has ${existingAccess.role} access to project`,
        currentRole: existingAccess.role,
      })
    }

    // Add user as owner
    await prisma.projectUser.create({
      data: {
        userId: user.id,
        projectId: projectId,
        role: 'OWNER',
      },
    })

    console.log(`Added user ${user.id} as OWNER of project ${projectId}`)

    return NextResponse.json({
      success: true,
      message: 'User added as project owner',
      role: 'OWNER',
    })
  } catch (error) {
    console.error('Fix ownership error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix project ownership',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'projects',
  action: 'update',
  requireAuth: true,
})

export { protectedPOST as POST }
