/**
 * Google Drive Import API
 * Allows users to import files from Google Drive
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { getGoogleDriveService, GoogleDriveService } from '@/lib/google-drive-service'
import { getUserGoogleServiceAccountKey } from '@/lib/settings-service'

export const POST = withAuth(
  async (request: NextRequest, user: any) => {
    try {
      const { fileUrl, projectId } = await request.json()

      if (!fileUrl) {
        return NextResponse.json(
          {
            success: false,
            error: 'Google Drive file URL is required',
          },
          { status: 400 }
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

      // Get user-specific Google service account key
      const userCredentials = await getUserGoogleServiceAccountKey(user.id)
      const driveService = getGoogleDriveService(userCredentials)

      // Get file metadata
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

      // Validate file type (PDF only for invoices)
      if (!fileMetadata.mimeType?.includes('pdf')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Only PDF files are supported for invoice processing',
          },
          { status: 400 }
        )
      }

      // Download file content
      const fileBuffer = await driveService.downloadFile(fileId)
      if (!fileBuffer) {
        return NextResponse.json(
          {
            success: false,
            error: 'Could not download file from Google Drive',
          },
          { status: 500 }
        )
      }

      // Process the PDF using the same logic as regular uploads
      const { processInvoicePdfWithLLM } = await import('@/lib/llm-pdf-processor')

      console.log(`🚀 Processing Google Drive file: ${fileMetadata.name} (${fileId})`)

      const result = await processInvoicePdfWithLLM(fileBuffer, {
        userId: user.id,
        projectId: projectId || undefined,
      })

      if (!result.success || !result.invoices || result.invoices.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Could not extract invoice data from the PDF',
            processingResult: result,
          },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        file: fileMetadata,
        processingResult: result,
        message: `Successfully imported and processed ${fileMetadata.name}`,
      })
    } catch (error) {
      console.error('Google Drive import error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Google Drive import failed',
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
