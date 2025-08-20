/**
 * API Route: /api/invoices
 * Handles CRUD operations for invoices
 */

import { NextRequest } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// GET /api/invoices - List invoices with filtering and search
async function GET(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build query filters
    const whereClause: any = {
      AND: [],
    }

    // Add user access control (user can only see invoices from projects they have access to)
    if (user.role !== 'ADMIN') {
      whereClause.AND.push({
        project: {
          users: {
            some: {
              userId: user.id,
            },
          },
        },
      })
    }

    // Add project filter if provided
    if (projectId) {
      whereClause.AND.push({ projectId })
    }

    // Add status filter if provided
    if (status) {
      whereClause.AND.push({ status })
    }

    // Add search filter if provided
    if (search) {
      whereClause.AND.push({
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { supplierName: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      const dateFilter: any = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      whereClause.AND.push({ invoiceDate: dateFilter })
    }

    // Get invoices with related data
    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause.AND.length > 0 ? whereClause : undefined,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          lineItems: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              category: true,
            },
          },
          _count: {
            select: {
              lineItems: true,
            },
          },
        },
        orderBy: {
          invoiceDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.invoice.count({
        where: whereClause.AND.length > 0 ? whereClause : undefined,
      }),
    ])

    // Calculate summary statistics
    const statusSummary = await prisma.invoice.groupBy({
      by: ['status'],
      where: whereClause.AND.length > 0 ? whereClause : undefined,
      _count: { status: true },
      _sum: { totalAmount: true },
    })

    const summary = {
      total: totalCount,
      pending: statusSummary.find(s => s.status === 'PENDING')?._count?.status || 0,
      approved: statusSummary.find(s => s.status === 'APPROVED')?._count?.status || 0,
      paid: statusSummary.find(s => s.status === 'PAID')?._count?.status || 0,
      disputed: statusSummary.find(s => s.status === 'DISPUTED')?._count?.status || 0,
      rejected: statusSummary.find(s => s.status === 'REJECTED')?._count?.status || 0,
      totalAmount: statusSummary.reduce((sum, s) => sum + Number(s._sum.totalAmount || 0), 0),
      paidAmount: Number(statusSummary.find(s => s.status === 'PAID')?._sum?.totalAmount || 0),
      pendingAmount: Number(
        statusSummary.find(s => s.status === 'PENDING')?._sum?.totalAmount || 0
      ),
    }

    // Format invoices for response
    const formattedInvoices = invoices.map(invoice => ({
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      gstAmount: Number(invoice.gstAmount),
      lineItems: invoice.lineItems.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }))

    return Response.json({
      success: true,
      invoices: formattedInvoices,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
      },
      summary,
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return Response.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

// POST /api/invoices - Create a new invoice from parsed data
async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const {
      projectId,
      invoiceNumber,
      supplierName,
      supplierABN,
      invoiceDate,
      dueDate,
      totalAmount,
      gstAmount = 0,
      status = 'PENDING',
      notes,
      lineItems = [],
    } = body

    // Validate required fields
    if (!projectId || !invoiceNumber || !supplierName || !invoiceDate || !totalAmount) {
      return Response.json(
        {
          success: false,
          error:
            'Missing required fields: projectId, invoiceNumber, supplierName, invoiceDate, totalAmount',
        },
        { status: 400 }
      )
    }

    // Verify user has access to the project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
        },
      })

      if (!projectAccess) {
        return Response.json(
          { success: false, error: 'You do not have access to this project' },
          { status: 403 }
        )
      }
    }

    // Check for duplicate invoice number in the same project
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        projectId,
        invoiceNumber,
      },
    })

    if (existingInvoice) {
      return Response.json(
        { success: false, error: 'An invoice with this number already exists in this project' },
        { status: 409 }
      )
    }

    // Create invoice with line items
    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        userId: user.id,
        invoiceNumber,
        supplierName,
        supplierABN,
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        totalAmount: Number(totalAmount),
        gstAmount: Number(gstAmount),
        status,
        notes,
        lineItems: {
          create: lineItems.map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || item.total || 0),
            totalPrice: Number(item.total || item.totalPrice || 0),
            category: item.category || 'MATERIAL',
          })),
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        lineItems: true,
      },
    })

    return Response.json(
      {
        success: true,
        invoice: {
          ...invoice,
          totalAmount: Number(invoice.totalAmount),
          gstAmount: Number(invoice.gstAmount),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating invoice:', error)
    return Response.json({ success: false, error: 'Failed to create invoice' }, { status: 500 })
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'invoices',
  action: 'read',
  requireAuth: true,
})

const protectedPOST = withAuth(POST, {
  resource: 'invoices',
  action: 'create',
  requireAuth: true,
})

export { protectedGET as GET, protectedPOST as POST }
