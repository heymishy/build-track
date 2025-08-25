/**
 * API Route: /api/suppliers/[id]
 * Individual supplier management operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

async function GET(request: NextRequest, user: AuthUser, { params }: RouteParams) {
  try {
    // Only admins can manage suppliers
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const supplier = await prisma.supplierAccess.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        invoiceUploads: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { invoiceUploads: true },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      supplier,
    })
  } catch (error) {
    console.error('Supplier GET API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

async function PATCH(request: NextRequest, user: AuthUser, { params }: RouteParams) {
  try {
    // Only admins can manage suppliers
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, type, isActive } = body

    // Validate type if provided
    if (type && !['SUPPLIER', 'SUBCONTRACTOR'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be SUPPLIER or SUBCONTRACTOR' },
        { status: 400 }
      )
    }

    // Check if email already exists for other suppliers
    if (email) {
      const existing = await prisma.supplierAccess.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          id: { not: params.id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Email address already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: any = {}
    if (email) updateData.email = email.toLowerCase().trim()
    if (name) updateData.name = name.trim()
    if (type) updateData.type = type
    if (typeof isActive === 'boolean') updateData.isActive = isActive

    const supplier = await prisma.supplierAccess.update({
      where: { id: params.id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { invoiceUploads: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      supplier,
    })
  } catch (error) {
    console.error('Supplier PATCH API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

async function DELETE(request: NextRequest, user: AuthUser, { params }: RouteParams) {
  try {
    // Only admins can manage suppliers
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    // Check if supplier exists and get upload count
    const supplier = await prisma.supplierAccess.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { invoiceUploads: true },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }

    // Delete supplier and all associated uploads (cascade)
    await prisma.supplierAccess.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: `Supplier deleted successfully. ${supplier._count.invoiceUploads} associated uploads were also removed.`,
    })
  } catch (error) {
    console.error('Supplier DELETE API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'suppliers',
  action: 'read',
  requireAuth: true,
})

const protectedPATCH = withAuth(PATCH, {
  resource: 'suppliers',
  action: 'update',
  requireAuth: true,
})

const protectedDELETE = withAuth(DELETE, {
  resource: 'suppliers',
  action: 'delete',
  requireAuth: true,
})

export { protectedGET as GET, protectedPATCH as PATCH, protectedDELETE as DELETE }
