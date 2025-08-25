/**
 * Training Statistics API
 * GET /api/invoices/training/stats - Get training statistics for client display
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get all training records from the database
    const trainingRecords = await prisma.invoice.findMany({
      where: {
        supplierName: 'Training Data', // Special marker for training records
      },
      select: {
        id: true,
        notes: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Parse and count training data
    let totalExamples = 0
    const fieldCounts: Record<string, number> = {}
    const invoiceTypes: string[] = []

    for (const record of trainingRecords) {
      if (!record.notes) continue

      try {
        const trainingData = JSON.parse(record.notes)
        if (trainingData.type !== 'training_data') continue

        totalExamples++

        const { originalExtraction, correctedData } = trainingData

        // Count corrections by field
        for (const [field, correctedValue] of Object.entries(correctedData)) {
          if (correctedValue && originalExtraction[field] !== correctedValue) {
            fieldCounts[field] = (fieldCounts[field] || 0) + 1
          }
        }

        // Track invoice types if available
        if (trainingData.invoiceType && !invoiceTypes.includes(trainingData.invoiceType)) {
          invoiceTypes.push(trainingData.invoiceType)
        }
      } catch (e) {
        console.warn('Failed to parse training data:', e)
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalExamples,
        fieldCounts,
        learnedPatterns: Object.values(fieldCounts).reduce((sum, count) => sum + count, 0),
        templates: 0, // Not implemented yet
        invoiceTypes,
      },
    })
  } catch (error) {
    console.error('Error retrieving training stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve training stats',
      },
      { status: 500 }
    )
  }
}
