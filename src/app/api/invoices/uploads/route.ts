/**
 * API Route: /api/invoices/uploads
 * Manage invoice uploads from supplier portal
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function GET(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const supplierEmail = searchParams.get('supplierEmail')
    const projectId = searchParams.get('projectId')

    const where: any = {}

    if (status && ['PENDING', 'PROCESSED', 'REJECTED'].includes(status)) {
      where.status = status
    }

    if (supplierEmail) {
      where.supplierEmail = supplierEmail
    }

    if (projectId) {
      where.projectId = projectId
    }

    const uploads = await prisma.invoiceUpload.findMany({
      where,
      include: {
        supplier: {
          select: { name: true, type: true },
        },
        project: {
          select: { id: true, name: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit results
    })

    return NextResponse.json({
      success: true,
      uploads,
    })
  } catch (error) {
    console.error('Invoice uploads GET API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

async function PATCH(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const { uploadId, status, projectId, notes } = body

    if (!uploadId) {
      return NextResponse.json({ success: false, error: 'Upload ID is required' }, { status: 400 })
    }

    if (status && !['PENDING', 'PROCESSED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (projectId) updateData.projectId = projectId
    if (notes !== undefined) updateData.notes = notes

    if (status === 'PROCESSED') {
      updateData.processedAt = new Date()
    }

    const upload = await prisma.invoiceUpload.update({
      where: { id: uploadId },
      data: updateData,
      include: {
        supplier: {
          select: { name: true, type: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      upload,
    })
  } catch (error) {
    console.error('Invoice uploads PATCH API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Convert upload to full invoice
async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const { uploadId, invoiceData } = body

    if (!uploadId) {
      return NextResponse.json({ success: false, error: 'Upload ID is required' }, { status: 400 })
    }

    // Get the upload
    const upload = await prisma.invoiceUpload.findUnique({
      where: { id: uploadId },
      include: {
        supplier: true,
        project: true,
      },
    })

    if (!upload) {
      return NextResponse.json({ success: false, error: 'Upload not found' }, { status: 404 })
    }

    if (!upload.project) {
      return NextResponse.json(
        { success: false, error: 'Upload must be assigned to a project' },
        { status: 400 }
      )
    }

    // Create full invoice from upload
    const invoice = await prisma.invoice.create({
      data: {
        projectId: upload.projectId!,
        userId: user.id,
        invoiceNumber: invoiceData.invoiceNumber || `UPLOAD-${upload.id.slice(-8)}`,
        supplierName: upload.supplierName || upload.supplier.name,
        supplierABN: invoiceData.supplierABN || '',
        invoiceDate: invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : new Date(),
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
        totalAmount: invoiceData.totalAmount || 0,
        gstAmount: invoiceData.gstAmount || 0,
        status: 'PENDING',
        pdfUrl: upload.fileUrl,
        notes: upload.notes || invoiceData.notes || null,
      },
    })

    // Update upload to mark as processed
    await prisma.invoiceUpload.update({
      where: { id: uploadId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        invoiceId: invoice.id,
      },
    })

    return NextResponse.json({
      success: true,
      invoice,
      message: 'Upload successfully converted to invoice',
    })
  } catch (error) {
    console.error('Invoice upload conversion error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'invoices',
  action: 'read',
  requireAuth: true,
})

const protectedPATCH = withAuth(PATCH, {
  resource: 'invoices',
  action: 'update',
  requireAuth: true,
})

const protectedPOST = withAuth(POST, {
  resource: 'invoices',
  action: 'create',
  requireAuth: true,
})

export { protectedGET as GET, protectedPATCH as PATCH, protectedPOST as POST }
