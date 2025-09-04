/**
 * Convert InvoiceUpload to full Invoice
 * Admin endpoint to promote supplier uploads to main app
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(
  async (request: NextRequest, user: any) => {
    try {
      const { uploadId, projectId } = await request.json()

      if (!uploadId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Upload ID is required',
          },
          { status: 400 }
        )
      }

      // Get the upload record
      const upload = await prisma.invoiceUpload.findUnique({
        where: { id: uploadId },
      })

      if (!upload) {
        return NextResponse.json(
          {
            success: false,
            error: 'Upload not found',
          },
          { status: 404 }
        )
      }

      if (upload.status === 'PROCESSED') {
        return NextResponse.json(
          {
            success: false,
            error: 'Upload already processed',
          },
          { status: 400 }
        )
      }

      // Use provided project or find a default one
      let targetProjectId = projectId
      if (!targetProjectId) {
        const project = await prisma.project.findFirst({
          where: {
            status: {
              in: ['PLANNING', 'IN_PROGRESS'],
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        })
        targetProjectId = project?.id
      }

      if (!targetProjectId) {
        return NextResponse.json(
          {
            success: false,
            error: 'No available project found',
          },
          { status: 400 }
        )
      }

      // Create the invoice
      const savedInvoice = await prisma.invoice.create({
        data: {
          projectId: targetProjectId,
          userId: user.id, // Admin who processed it
          invoiceNumber: `SUPPLIER-${upload.id.slice(-8)}`,
          supplierName: upload.supplierName || 'Unknown Supplier',
          supplierABN: null,
          invoiceDate: new Date(),
          dueDate: null,
          totalAmount: 0, // Will be updated if we have line items
          gstAmount: 0,
          description: `Converted from supplier upload: ${upload.fileName}`,
          status: 'PENDING',
          filePath: upload.fileUrl,
        },
      })

      // Update the upload status
      await prisma.invoiceUpload.update({
        where: { id: uploadId },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          invoiceId: savedInvoice.id,
        },
      })

      return NextResponse.json({
        success: true,
        invoice: savedInvoice,
        message: 'Upload successfully converted to invoice',
      })
    } catch (error) {
      console.error('Error converting upload:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Conversion failed',
        },
        { status: 500 }
      )
    }
  },
  {
    resource: 'invoices',
    action: 'write',
    requireAuth: true,
  }
)
