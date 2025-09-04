/**
 * API Route: /api/portal/save-preview
 * Save already-processed AI preview data to database
 * Avoids duplicate LLM processing when user has already seen preview
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, supplierName, projectId, notes, aiPreviewData, fileName, fileSize } = body

    console.log('🔄 Saving AI preview data to database without re-processing...')

    // Validate required fields
    if (!email || !aiPreviewData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and AI preview data are required',
        },
        { status: 400 }
      )
    }

    // Verify supplier access
    const supplier = await prisma.supplierAccess.findUnique({
      where: {
        email: email.toLowerCase().trim(),
        isActive: true,
      },
    })

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email address not authorized for portal access',
        },
        { status: 403 }
      )
    }

    // Create InvoiceUpload record (for tracking)
    const mockFileUrl = `/uploads/preview-${Date.now()}-${fileName || 'invoice.pdf'}`

    const invoiceUpload = await prisma.invoiceUpload.create({
      data: {
        supplierEmail: supplier.email,
        projectId: projectId || null,
        fileName: fileName || 'preview-upload.pdf',
        fileUrl: mockFileUrl,
        fileSize: fileSize || 0,
        supplierName: supplierName || supplier.name,
        notes: notes || null,
        status: 'PROCESSED', // Mark as processed since we already have the data
        processedAt: new Date(),
      },
    })

    // Save invoices to main app using the preview data
    const savedInvoices = []
    const invoices = aiPreviewData.allInvoices || [aiPreviewData.parsedInvoice]

    for (const invoice of invoices) {
      try {
        // Create main app Invoice record
        const savedInvoice = await prisma.invoice.create({
          data: {
            projectId: projectId || null,
            invoiceNumber: invoice.invoiceNumber || `AI-${Date.now()}`,
            supplierName: invoice.supplierName || supplierName || supplier.name,
            supplierABN: invoice.supplierABN || '',
            invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date(),
            dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
            totalAmount: invoice.totalAmount || 0,
            gstAmount: invoice.gstAmount || 0,
            notes: `AI processed upload by ${supplier.email}. Original: ${fileName || 'preview-upload.pdf'}`,
            status: 'PENDING',
          },
        })

        // Create line items if they exist
        if (invoice.lineItems && invoice.lineItems.length > 0) {
          await prisma.invoiceLineItem.createMany({
            data: invoice.lineItems.map((item: any) => ({
              invoiceId: savedInvoice.id,
              lineItemId: null,
              description: item.description || 'No description',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || item.unitPrice || 0,
              category: item.category || 'MATERIAL',
            })),
          })
        }

        // Link the upload to the invoice
        await prisma.invoiceUpload.update({
          where: { id: invoiceUpload.id },
          data: { invoiceId: savedInvoice.id },
        })

        savedInvoices.push(savedInvoice)
        console.log(`✅ Saved AI preview invoice: ${savedInvoice.id}`)
      } catch (error) {
        console.error('Error saving individual invoice:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedInvoices.length} invoices from AI preview`,
      invoicesProcessed: savedInvoices.length,
      upload: {
        id: invoiceUpload.id,
        fileName: invoiceUpload.fileName,
        status: invoiceUpload.status,
      },
    })
  } catch (error) {
    console.error('Save preview API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save preview data',
      },
      { status: 500 }
    )
  }
}
