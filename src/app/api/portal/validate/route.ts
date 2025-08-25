/**
 * API Route: /api/portal/validate
 * Validate supplier email for portal access (PUBLIC endpoint)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Find active supplier with this email
    const supplier = await prisma.supplierAccess.findUnique({
      where: {
        email: email.toLowerCase().trim()
      },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        isActive: true
      }
    })

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Email address not authorized for portal access' },
        { status: 404 }
      )
    }

    if (!supplier.isActive) {
      return NextResponse.json(
        { success: false, error: 'Portal access has been deactivated for this email' },
        { status: 403 }
      )
    }

    // Get available projects (simplified - all active projects for now)
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['PLANNING', 'IN_PROGRESS'] }
      },
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      supplier: {
        name: supplier.name,
        type: supplier.type,
        email: supplier.email
      },
      projects
    })

  } catch (error) {
    console.error('Portal validation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}