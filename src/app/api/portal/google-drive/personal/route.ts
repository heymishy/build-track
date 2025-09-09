/**
 * Personal Google Drive API for Supplier Portal
 * Handles OAuth2-based access to user's personal Google Drive
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGoogleDriveServiceForUser } from '@/lib/google-drive-service'
import { processInvoicePdfWithLLM } from '@/lib/llm-pdf-processor'
import { SettingsService } from '@/lib/settings-service'

// For supplier portal, we need to determine user context differently
// Since suppliers may not have full user accounts, we'll use email-based lookup
async function getSupplierUserId(email: string): Promise<string | null> {
  // This is a simplified approach - in production, you'd want proper supplier user management
  return `supplier:${email}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const folderId = searchParams.get('folderId')

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email parameter is required',
        },
        { status: 400 }
      )
    }

    // Get user ID for supplier
    const userId = await getSupplierUserId(email)
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supplier not found',
        },
        { status: 404 }
      )
    }

    // Check if user has OAuth2 tokens configured
    const settingsService = new SettingsService(userId)
    const oauth2Tokens = await settingsService.getGoogleOAuth2Tokens()

    if (!oauth2Tokens) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please connect your Google account first',
          requiresAuth: true,
        },
        { status: 401 }
      )
    }

    try {
      // Create service with OAuth2 authentication
      const driveService = await createGoogleDriveServiceForUser(userId, true)

      let files = []
      if (folderId) {
        // List files in specific folder
        files = await driveService.listPdfFilesInFolder(folderId)
      } else {
        // Get recent PDF files from user's Drive (last 50)
        const recentFiles = await driveService.drive.files.list({
          q: "mimeType='application/pdf'",
          orderBy: 'modifiedTime desc',
          pageSize: 50,
          fields: 'files(id,name,mimeType,size,webViewLink,modifiedTime)',
        })

        files = (recentFiles.data.files || [])
          .filter(file => file.id && file.name)
          .map(file => ({
            id: file.id!,
            name: file.name!,
            mimeType: file.mimeType || 'application/pdf',
            size: file.size || '0',
            webViewLink: file.webViewLink || undefined,
          }))
      }

      return NextResponse.json({
        success: true,
        files,
        authType: 'oauth2',
        message: `Found ${files.length} PDF files`,
      })
    } catch (error) {
      console.error('Personal Google Drive API error:', error)

      if (error instanceof Error && error.message.includes('expired')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Your Google account access has expired. Please reconnect your account.',
            requiresReauth: true,
          },
          { status: 401 }
        )
      }

      throw error
    }
  } catch (error) {
    console.error('Personal Google Drive GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to access your Google Drive',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, selectedFileIds, projectId, supplierName, notes } = await request.json()

    if (
      !email ||
      !selectedFileIds ||
      !Array.isArray(selectedFileIds) ||
      selectedFileIds.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and selected file IDs are required',
        },
        { status: 400 }
      )
    }

    // Get user ID for supplier
    const userId = await getSupplierUserId(email)
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supplier not found',
        },
        { status: 404 }
      )
    }

    // Check OAuth2 tokens
    const settingsService = new SettingsService(userId)
    const oauth2Tokens = await settingsService.getGoogleOAuth2Tokens()

    if (!oauth2Tokens) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please connect your Google account first',
          requiresAuth: true,
        },
        { status: 401 }
      )
    }

    try {
      // Create service with OAuth2 authentication
      const driveService = await createGoogleDriveServiceForUser(userId, true)

      let processedFiles = 0
      let errors = []

      for (const fileId of selectedFileIds) {
        try {
          console.log(`Processing personal Google Drive file: ${fileId}`)

          // Download file from user's Drive
          const fileBuffer = await driveService.downloadFile(fileId)
          if (!fileBuffer) {
            errors.push(`Failed to download file ${fileId}`)
            continue
          }

          // Get file metadata
          const fileInfo = await driveService.getFile(fileId)
          if (!fileInfo) {
            errors.push(`Failed to get metadata for file ${fileId}`)
            continue
          }

          // Process with LLM (use null userId to force environment variable usage)
          const result = await processInvoicePdfWithLLM(fileBuffer, {
            userId: null, // Force environment variable usage for supplier portal
            projectId: projectId || undefined,
          })

          if (result.invoices.length > 0) {
            // Save processed invoice data to database via supplier upload system
            try {
              for (const invoice of result.invoices) {
                const invoiceUpload = await prisma.invoiceUpload.create({
                  data: {
                    supplierEmail: email,
                    projectId: projectId || null,
                    fileName: fileInfo.name,
                    fileUrl: fileInfo.id, // Google Drive file ID can be used as reference
                    fileSize: fileInfo.size || 0,
                    supplierName: null, // Will be populated from supplier access if available
                    notes: `Imported from Google Drive: ${fileInfo.name}`,
                    status: 'PROCESSED', // Mark as processed since we already parsed it
                  },
                })

                // Create the full invoice record if we have sufficient data
                if (invoice.invoiceNumber && invoice.totalAmount) {
                  await prisma.invoice.create({
                    data: {
                      invoiceNumber: invoice.invoiceNumber,
                      supplierName: invoice.supplierName || 'Google Drive Import',
                      issueDate: invoice.issueDate ? new Date(invoice.issueDate) : new Date(),
                      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
                      subtotal: invoice.subtotal || 0,
                      tax: invoice.tax || 0,
                      total: invoice.totalAmount,
                      currency: invoice.currency || 'NZD',
                      status: 'PENDING',
                      projectId: projectId || null,
                      uploadedById: userId,
                      fileUrl: fileInfo.id,
                      metadata: JSON.stringify({
                        source: 'google-drive',
                        originalFileName: fileInfo.name,
                        driveFileId: fileInfo.id,
                        importedAt: new Date().toISOString(),
                      }),
                    },
                  })

                  // Update the upload record with the invoice reference
                  await prisma.invoiceUpload.update({
                    where: { id: invoiceUpload.id },
                    data: { status: 'PROCESSED' },
                  })
                }
              }

              console.log(
                `Successfully processed ${fileInfo.name}: ${result.invoices.length} invoices saved to database`
              )
            } catch (saveError) {
              console.error(`Error saving invoices from ${fileInfo.name}:`, saveError)
              // Continue processing other files even if one fails
            }
            processedFiles++
          } else {
            errors.push(`No invoice data found in ${fileInfo.name}`)
          }
        } catch (fileError) {
          console.error(`Error processing file ${fileId}:`, fileError)
          errors.push(
            `Error processing file ${fileId}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
          )
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${processedFiles} of ${selectedFileIds.length} files from your Google Drive`,
        processedFiles,
        totalFiles: selectedFileIds.length,
        errors: errors.length > 0 ? errors : undefined,
      })
    } catch (error) {
      console.error('Personal Google Drive processing error:', error)

      if (error instanceof Error && error.message.includes('expired')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Your Google account access has expired. Please reconnect your account.',
            requiresReauth: true,
          },
          { status: 401 }
        )
      }

      throw error
    }
  } catch (error) {
    console.error('Personal Google Drive POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process files from your Google Drive',
      },
      { status: 500 }
    )
  }
}
