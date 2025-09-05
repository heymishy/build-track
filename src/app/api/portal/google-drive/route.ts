/**
 * Supplier Portal Google Drive Import API
 * Allows suppliers to import invoices from Google Drive
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleDriveService, GoogleDriveService } from '@/lib/google-drive-service'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('fileUrl')
    const email = searchParams.get('email')

    if (!fileUrl || !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Drive file URL and email are required',
        },
        { status: 400 }
      )
    }

    // Validate supplier email
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
          error: 'Email not authorized for portal access',
        },
        { status: 403 }
      )
    }

    // Extract file ID from URL
    const fileId = GoogleDriveService.extractFileId(fileUrl)
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Google Drive URL',
        },
        { status: 400 }
      )
    }

    const driveService = getGoogleDriveService()

    // Check if it's a folder or file
    const isFolder = await driveService.isFolder(fileId)
    let availableFiles = []

    if (isFolder) {
      console.log(`📁 Listing PDF files in Google Drive folder...`)
      const folderFiles = await driveService.listPdfFilesInFolder(fileId)

      if (folderFiles.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No PDF files found in the shared folder',
          },
          { status: 400 }
        )
      }

      availableFiles = folderFiles
      console.log(`📄 Found ${folderFiles.length} PDF files in folder`)
    } else {
      // Single file
      const fileMetadata = await driveService.getFile(fileId)
      if (!fileMetadata) {
        return NextResponse.json(
          {
            success: false,
            error: 'Could not access Google Drive file. Please check sharing permissions.',
          },
          { status: 404 }
        )
      }

      // Validate file type (PDF only)
      if (!fileMetadata.mimeType?.includes('pdf')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Only PDF files are supported for invoice processing',
          },
          { status: 400 }
        )
      }

      availableFiles = [fileMetadata]
    }

    return NextResponse.json({
      success: true,
      isFolder,
      files: availableFiles,
      message: `Found ${availableFiles.length} PDF file${availableFiles.length > 1 ? 's' : ''} available for processing`,
    })
  } catch (error) {
    console.error('Google Drive file listing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list Google Drive files',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, email, projectId, supplierName, notes, selectedFileIds } = await request.json()

    if (!fileUrl || !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Drive file URL and email are required',
        },
        { status: 400 }
      )
    }

    if (!selectedFileIds || !Array.isArray(selectedFileIds) || selectedFileIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one file must be selected for processing',
        },
        { status: 400 }
      )
    }

    // Validate supplier email
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
          error: 'Email not authorized for portal access',
        },
        { status: 403 }
      )
    }

    // Extract file ID from URL
    const fileId = GoogleDriveService.extractFileId(fileUrl)
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Google Drive URL',
        },
        { status: 400 }
      )
    }

    const driveService = getGoogleDriveService()

    // Process only the selected files
    const filesToProcess = []
    
    console.log(`📁 Processing ${selectedFileIds.length} selected files...`)
    
    // Get metadata for each selected file
    for (const selectedFileId of selectedFileIds) {
      try {
        const fileMetadata = await driveService.getFile(selectedFileId)
        if (fileMetadata && fileMetadata.mimeType?.includes('pdf')) {
          filesToProcess.push(fileMetadata)
        } else {
          console.warn(`⚠️ Skipping invalid or non-PDF file: ${selectedFileId}`)
        }
      } catch (error) {
        console.warn(`⚠️ Could not access file: ${selectedFileId}`, error)
        continue
      }
    }

    if (filesToProcess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid PDF files found in selection',
        },
        { status: 400 }
      )
    }

    // Process each selected file
    const processedInvoices = []
    const { processInvoicePdfWithLLM } = await import('@/lib/llm-pdf-processor')
    
    console.log(`🚀 Processing ${filesToProcess.length} selected PDF files for supplier: ${email}`)

    for (const file of filesToProcess) {
      try {
        console.log(`🚀 Processing file: ${file.name} for supplier: ${email}`)

        // Download file content
        const fileBuffer = await driveService.downloadFile(file.id)
        if (!fileBuffer) {
          console.warn(`⚠️ Could not download file: ${file.name}`)
          continue
        }

        // Process the PDF using advanced LLM processing
        // Use null userId to force environment variable usage for supplier portal
        const result = await processInvoicePdfWithLLM(fileBuffer, {
          userId: null,
          projectId: projectId || undefined,
        })

        if (result.success && result.invoices && result.invoices.length > 0) {
          processedInvoices.push({
            file,
            result,
            invoice: result.invoices[0],
          })
        }
      } catch (error) {
        console.error(`❌ Error processing file ${file.name}:`, error)
      }
    }

    if (processedInvoices.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not process any invoices from the provided Google Drive location',
        },
        { status: 400 }
      )
    }

    // Find project for invoices
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
          error: 'No active project found to assign invoices',
        },
        { status: 400 }
      )
    }

    // Save all processed invoices to main app
    const savedInvoices = []

    for (const processedInvoice of processedInvoices) {
      try {
        const { file, invoice } = processedInvoice

        const savedInvoice = await prisma.invoice.create({
          data: {
            projectId: targetProjectId,
            userId: null,
            invoiceNumber: invoice.invoiceNumber || `GDRIVE-${file.id.slice(-8)}`,
            supplierName: invoice.vendorName || supplierName || supplier.name,
            supplierABN: null,
            invoiceDate: invoice.date ? new Date(invoice.date) : new Date(),
            dueDate: null,
            totalAmount: invoice.total || 0,
            gstAmount: 0,
            notes: `Google Drive import by ${email}: ${file.name}`,
            status: 'PENDING',
            filePath: file.webViewLink,
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
            })),
          })
        }

        savedInvoices.push({
          id: savedInvoice.id,
          invoiceNumber: savedInvoice.invoiceNumber,
          projectId: savedInvoice.projectId,
          fileName: file.name,
        })

        console.log(`✅ Saved Google Drive invoice to main app: ${savedInvoice.id} (${file.name})`)
      } catch (error) {
        console.error(`❌ Error saving invoice from file ${processedInvoice.file.name}:`, error)
      }
    }

    const totalSaved = savedInvoices.length
    const location = isFolder ? 'folder' : 'file'

    return NextResponse.json({
      success: true,
      invoicesProcessed: totalSaved,
      invoices: savedInvoices,
      message: `Successfully imported and processed ${totalSaved} invoice${totalSaved > 1 ? 's' : ''} from Google Drive ${location}`,
    })
  } catch (error) {
    console.error('Supplier portal Google Drive import error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Google Drive import failed',
      },
      { status: 500 }
    )
  }
}
