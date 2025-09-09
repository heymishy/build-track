/**
 * API Route: /api/portal/upload
 * Upload invoice files via supplier portal (PUBLIC endpoint)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadFile, validateFile, generateSecureFilename } from '@/lib/file-storage'
import { notifyProjectManagers } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const projectId = formData.get('projectId') as string
    const supplierName = formData.get('supplierName') as string
    const notes = formData.get('notes') as string
    const file = formData.get('file') as File

    // Validation
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 })
    }

    // Validate file using our validation service
    const validation = validateFile(file, {
      allowedTypes: ['application/pdf'],
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      minSizeBytes: 1024, // 1KB minimum
    })

    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.errors[0] }, { status: 400 })
    }

    // Verify supplier access
    const supplier = await prisma.supplierAccess.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    })

    if (!supplier || !supplier.isActive) {
      return NextResponse.json(
        { success: false, error: 'Email address not authorized for portal access' },
        { status: 403 }
      )
    }

    // Verify project exists if provided
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      })

      if (!project) {
        return NextResponse.json(
          { success: false, error: 'Invalid project selected' },
          { status: 400 }
        )
      }
    }

    // Generate secure filename and upload to storage
    const secureFileName = generateSecureFilename(file.name, 'invoice')

    try {
      const uploadResult = await uploadFile(file, secureFileName, {
        access: 'private', // Private access for invoices
        contentType: file.type,
      })

      const fileUrl = uploadResult.url
      const fileSize = uploadResult.size

      // Create invoice upload record
      const invoiceUpload = await prisma.invoiceUpload.create({
        data: {
          supplierEmail: supplier.email,
          projectId: projectId || null,
          fileName: secureFileName, // Use secure filename
          fileUrl,
          fileSize,
          supplierName: supplierName || supplier.name,
          notes: notes || null,
          status: 'PENDING',
        },
      })

      // Notify project managers about the new upload
      await notifyProjectManagers({
        id: invoiceUpload.id,
        supplierEmail: invoiceUpload.supplierEmail,
        projectId: invoiceUpload.projectId,
        fileName: file.name, // Use original filename for display
        supplierName: invoiceUpload.supplierName,
        notes: invoiceUpload.notes,
      })

      return NextResponse.json({
        success: true,
        message: 'Invoice uploaded successfully',
        upload: {
          id: invoiceUpload.id,
          fileName: file.name, // Return original filename for user
          uploadedAt: invoiceUpload.createdAt,
          status: invoiceUpload.status,
        },
      })
    } catch (uploadError) {
      console.error('File upload failed:', uploadError)
      return NextResponse.json(
        {
          success: false,
          error: uploadError instanceof Error ? uploadError.message : 'File upload failed',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Portal upload API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    // Verify supplier access
    const supplier = await prisma.supplierAccess.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    })

    if (!supplier || !supplier.isActive) {
      return NextResponse.json(
        { success: false, error: 'Email address not authorized for portal access' },
        { status: 403 }
      )
    }

    // Get upload history for this supplier
    const uploads = await prisma.invoiceUpload.findMany({
      where: {
        supplierEmail: supplier.email,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit to recent uploads
    })

    return NextResponse.json({
      success: true,
      uploads,
    })
  } catch (error) {
    console.error('Portal upload history API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
