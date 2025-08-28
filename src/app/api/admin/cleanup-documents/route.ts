/**
 * Admin cleanup endpoint to remove sample/dummy documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db-pool'

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase()

    // Get all documents to see what we're working with
    const allDocuments = await db.projectDocument.findMany({
      include: {
        project: {
          select: { name: true },
        },
      },
    })

    console.log(
      'Found documents:',
      allDocuments.map(d => ({
        id: d.id,
        name: d.name,
        fileName: d.fileName,
        project: d.project?.name,
        createdAt: d.createdAt,
      }))
    )

    // Delete sample documents that look like dummy data
    const sampleDocuments = allDocuments.filter(
      doc =>
        doc.fileName.includes('Architectural Plans v2.pdf') ||
        doc.fileName.includes('Building Permit - City Council.pdf') ||
        doc.name.includes('Architectural Plans') ||
        doc.name.includes('Building Permit')
    )

    if (sampleDocuments.length > 0) {
      const deleteResult = await db.projectDocument.deleteMany({
        where: {
          id: {
            in: sampleDocuments.map(d => d.id),
          },
        },
      })

      console.log(`Deleted ${deleteResult.count} sample documents`)

      return NextResponse.json({
        success: true,
        message: `Cleaned up ${deleteResult.count} sample documents`,
        deletedDocuments: sampleDocuments.map(d => ({
          name: d.name,
          fileName: d.fileName,
          size: d.fileSize,
        })),
      })
    } else {
      return NextResponse.json({
        success: true,
        message: 'No sample documents found to clean up',
        allDocuments: allDocuments.map(d => ({
          name: d.name,
          fileName: d.fileName,
          size: d.fileSize,
          project: d.project?.name,
        })),
      })
    }
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
