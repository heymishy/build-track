/**
 * Supplier Portal Google Drive Import API
 * Allows suppliers to import invoices from Google Drive
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveService, GoogleDriveService } from '@/lib/google-drive-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, email, projectId, supplierName, notes } = await request.json()

    if (!fileUrl || !email) {
      return NextResponse.json({
        success: false,
        error: 'Google Drive file URL and email are required',
      }, { status: 400 })
    }

    // Validate supplier email
    const supplier = await prisma.supplierAccess.findUnique({
      where: {
        email: email.toLowerCase().trim(),
        isActive: true,
      },
    })

    if (!supplier) {
      return NextResponse.json({
        success: false,
        error: 'Email not authorized for portal access',
      }, { status: 403 })
    }

    // Extract file ID from URL
    const fileId = GoogleDriveService.extractFileId(fileUrl)
    if (!fileId) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Google Drive URL',
      }, { status: 400 })
    }

    const driveService = getGoogleDriveService()

    // Get file metadata
    const fileMetadata = await driveService.getFile(fileId)
    if (!fileMetadata) {
      return NextResponse.json({
        success: false,
        error: 'Could not access Google Drive file. Please check sharing permissions.',
      }, { status: 404 })
    }

    // Validate file type (PDF only)
    if (!fileMetadata.mimeType?.includes('pdf')) {
      return NextResponse.json({
        success: false,
        error: 'Only PDF files are supported for invoice processing',
      }, { status: 400 })
    }

    // Download file content
    const fileBuffer = await driveService.downloadFile(fileId)
    if (!fileBuffer) {
      return NextResponse.json({
        success: false,
        error: 'Could not download file from Google Drive',
      }, { status: 500 })
    }

    console.log(`🚀 Processing Google Drive file for supplier: ${fileMetadata.name} (${email})`)

    // Process the PDF using advanced LLM processing
    const { processInvoicePdfWithLLM } = await import('@/lib/llm-pdf-processor')
    const result = await processInvoicePdfWithLLM(fileBuffer, { 
      userId: `supplier:${email}`,
      projectId: projectId || undefined
    })

    if (result.success && result.invoices && result.invoices.length > 0) {
      // Save the processed invoice to main app
      const invoice = result.invoices[0]
      
      // Find project for invoice
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

      if (targetProjectId) {
        // Save to main Invoice table
        const savedInvoice = await prisma.invoice.create({
          data: {
            projectId: targetProjectId,
            userId: null,
            invoiceNumber: invoice.invoiceNumber || `GDRIVE-${fileId.slice(-8)}`,
            supplierName: invoice.vendorName || supplierName || supplier.name,
            supplierABN: null,
            invoiceDate: invoice.date ? new Date(invoice.date) : new Date(),
            dueDate: null,
            totalAmount: invoice.total || 0,
            gstAmount: 0,
            description: `Google Drive import by ${email}: ${fileMetadata.name}`,
            status: 'PENDING',
            filePath: fileMetadata.webViewLink,
          },
        })

        // Create line items
        if (invoice.lineItems && invoice.lineItems.length > 0) {
          await prisma.invoiceLineItem.createMany({
            data: invoice.lineItems.map((item: any) => ({
              invoiceId: savedInvoice.id,
              lineItemId: null,
              description: item.description || 'No description',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.total || 0,
              category: 'MATERIAL',
              createdAt: new Date(),
            })),
          })
        }

        console.log(`✅ Saved Google Drive invoice to main app: ${savedInvoice.id}`)

        return NextResponse.json({
          success: true,
          file: fileMetadata,
          invoice: {
            id: savedInvoice.id,
            invoiceNumber: savedInvoice.invoiceNumber,
            projectId: savedInvoice.projectId,
          },
          processingResult: result,
          message: `Successfully imported and processed ${fileMetadata.name} from Google Drive`,
        })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Could not process invoice from Google Drive file',
      processingResult: result,
    }, { status: 400 })

  } catch (error) {
    console.error('Supplier portal Google Drive import error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Google Drive import failed',
    }, { status: 500 })
  }
}