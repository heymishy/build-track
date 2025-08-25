/**
 * API Route: /api/suppliers
 * CRUD operations for supplier portal access management
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(request: NextRequest, user: AuthUser) {
  try {
    // Only admins can manage suppliers
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const suppliers = await prisma.supplierAccess.findMany({
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { invoiceUploads: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      suppliers,
    })
  } catch (error) {
    console.error('Suppliers GET API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    // Only admins can manage suppliers
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, type } = body

    if (!email || !name || !type) {
      return NextResponse.json(
        { success: false, error: 'Email, name, and type are required' },
        { status: 400 }
      )
    }

    if (!['SUPPLIER', 'SUBCONTRACTOR'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be SUPPLIER or SUBCONTRACTOR' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await prisma.supplierAccess.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email address already exists' },
        { status: 409 }
      )
    }

    const supplier = await prisma.supplierAccess.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        type,
        createdBy: user.id,
      },
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
    console.error('Suppliers POST API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'suppliers',
  action: 'read',
  requireAuth: true,
})

const protectedPOST = withAuth(POST, {
  resource: 'suppliers',
  action: 'create',
  requireAuth: true,
})

export { protectedGET as GET, protectedPOST as POST }
