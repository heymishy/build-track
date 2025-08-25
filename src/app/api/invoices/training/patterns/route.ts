/**
 * Training Patterns API
 * GET /api/invoices/training/patterns - Retrieve learned patterns for server-side parsing
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
      take: 100, // Limit to recent training data
    })

    // Parse and aggregate training patterns
    const patterns = new Map<
      string,
      {
        field: string
        pattern: RegExp
        confidence: number
        examples: string[]
      }
    >()

    for (const record of trainingRecords) {
      if (!record.notes) continue

      try {
        const trainingData = JSON.parse(record.notes)
        if (trainingData.type !== 'training_data') continue

        const { originalExtraction, correctedData } = trainingData

        // Create patterns for each corrected field
        for (const [field, correctedValue] of Object.entries(correctedData)) {
          if (correctedValue && originalExtraction[field] !== correctedValue) {
            // This is a field that was corrected - learn from it
            const patternKey = `${field}_${String(correctedValue).toLowerCase()}`

            if (patterns.has(patternKey)) {
              const existing = patterns.get(patternKey)!
              existing.confidence = Math.min(1.0, existing.confidence + 0.1)
              existing.examples.push(String(correctedValue))
            } else {
              // Create simple patterns based on field type
              let pattern: RegExp

              if (field.includes('amount') || field.includes('total') || field.includes('tax')) {
                // Numeric fields - look for currency patterns
                pattern = new RegExp(`\\$?\\s*${String(correctedValue).replace('.', '\\.')}`, 'i')
              } else if (field.includes('date')) {
                // Date fields
                pattern = new RegExp(
                  String(correctedValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                  'i'
                )
              } else {
                // Text fields
                pattern = new RegExp(
                  String(correctedValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                  'i'
                )
              }

              patterns.set(patternKey, {
                field,
                pattern,
                confidence: 0.7,
                examples: [String(correctedValue)],
              })
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse training data:', e)
      }
    }

    // Convert patterns to serializable format
    const serializedPatterns = Array.from(patterns.values()).map(pattern => ({
      field: pattern.field,
      pattern: pattern.pattern.source,
      flags: pattern.pattern.flags,
      confidence: pattern.confidence,
      examples: [...new Set(pattern.examples)], // Remove duplicates
    }))

    return NextResponse.json({
      success: true,
      patterns: serializedPatterns,
      totalTrainingRecords: trainingRecords.length,
      learnedPatterns: serializedPatterns.length,
    })
  } catch (error) {
    console.error('Error retrieving training patterns:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve training patterns',
      },
      { status: 500 }
    )
  }
}
