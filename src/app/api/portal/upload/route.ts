/**
 * API Route: /api/portal/upload
 * Upload invoice files via supplier portal (PUBLIC endpoint)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Validate file type and size
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { success: false, error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
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

    // In production, you would upload to cloud storage (Vercel Blob, AWS S3, etc.)
    // For development, we'll simulate the storage
    const fileBuffer = await file.arrayBuffer()
    const fileName = file.name
    const fileSize = file.size

    // TODO: Upload to actual storage and get URL
    // const fileUrl = await uploadToStorage(fileBuffer, fileName)
    const fileUrl = `/uploads/${Date.now()}-${fileName}` // Placeholder

    // Create invoice upload record
    const invoiceUpload = await prisma.invoiceUpload.create({
      data: {
        supplierEmail: supplier.email,
        projectId: projectId || null,
        fileName,
        fileUrl,
        fileSize,
        supplierName: supplierName || supplier.name,
        notes: notes || null,
        status: 'PENDING',
      },
    })

    // TODO: In production, trigger notification to project managers
    // notifyProjectManagers(invoiceUpload)

    return NextResponse.json({
      success: true,
      message: 'Invoice uploaded successfully',
      upload: {
        id: invoiceUpload.id,
        fileName: invoiceUpload.fileName,
        uploadedAt: invoiceUpload.createdAt,
        status: invoiceUpload.status,
      },
    })
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
