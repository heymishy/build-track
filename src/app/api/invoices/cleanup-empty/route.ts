/**
 * Clean up empty invoices (0 line items) API endpoint
 * DELETE /api/invoices/cleanup-empty
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export const DELETE = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const projectId = searchParams.get('projectId')

      if (!projectId || projectId === 'undefined') {
        return NextResponse.json(
          { success: false, error: 'Project ID is required' },
          { status: 400 }
        )
      }

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      })

      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      // Find invoices with 0 line items
      const emptyInvoices = await prisma.invoice.findMany({
        where: {
          projectId: projectId,
        },
        include: {
          lineItems: true,
          _count: {
            select: {
              lineItems: true,
            },
          },
        },
      })

      // Filter to only those with 0 line items
      const invoicesToDelete = emptyInvoices.filter(invoice => invoice._count.lineItems === 0)

      console.log(`Found ${invoicesToDelete.length} empty invoices to delete:`)
      invoicesToDelete.forEach(inv => {
        console.log(
          `- Invoice ${inv.invoiceNumber}: ${inv._count.lineItems} line items, PDF: ${inv.pdfUrl ? 'yes' : 'no'}`
        )
      })

      // Delete empty invoices
      if (invoicesToDelete.length > 0) {
        const invoiceIds = invoicesToDelete.map(inv => inv.id)

        const deletedCount = await prisma.invoice.deleteMany({
          where: {
            id: {
              in: invoiceIds,
            },
          },
        })

        return NextResponse.json({
          success: true,
          deletedCount: deletedCount.count,
          invoiceNumbers: invoicesToDelete.map(inv => inv.invoiceNumber),
          message: `Deleted ${deletedCount.count} empty invoices from project: ${project.name}`,
        })
      } else {
        return NextResponse.json({
          success: true,
          deletedCount: 0,
          message: `No empty invoices found in project: ${project.name}`,
        })
      }
    } catch (error) {
      console.error('Cleanup empty invoices error:', error)
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
  },
  {
    resource: 'invoices',
    action: 'delete',
    requireAuth: true,
  }
)
