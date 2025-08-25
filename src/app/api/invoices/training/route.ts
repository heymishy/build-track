/**
 * Invoice Training Data API
 * POST /api/invoices/training - Store training data from approval corrections
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

interface TrainingData {
  invoiceText: string
  originalExtraction: Record<string, any>
  correctedData: Record<string, any>
  userConfidence: Record<string, number>
  pdfMetadata: {
    filename: string
    pageCount: number
    fileSize: number
  }
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body: TrainingData = await request.json()
    const { invoiceText, originalExtraction, correctedData, userConfidence, pdfMetadata } = body

    // Validate required fields
    if (!invoiceText || !originalExtraction || !correctedData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required training data fields',
        },
        { status: 400 }
      )
    }

    // Calculate improvement metrics
    const corrections = Object.keys(correctedData).filter(
      key => originalExtraction[key] !== correctedData[key]
    )

    const accuracyBefore =
      Object.keys(originalExtraction).reduce((acc, key) => {
        return acc + (originalExtraction[key] === correctedData[key] ? 1 : 0)
      }, 0) / Object.keys(originalExtraction).length

    // First, ensure we have a training project or find an existing project
    let trainingProject
    try {
      // Try to find an existing project for this user, or use the first available project
      const userProjects = await prisma.project.findMany({
        where: {
          projectUsers: {
            some: {
              userId: user.id,
            },
          },
        },
        take: 1,
      })

      if (userProjects.length > 0) {
        trainingProject = userProjects[0]
      } else {
        // Create a default training project if none exists
        trainingProject = await prisma.project.create({
          data: {
            name: 'Training Data Project',
            description: 'System-generated project for storing training data',
            status: 'PLANNING',
            totalBudget: 0,
            currency: 'NZD',
            projectUsers: {
              create: {
                userId: user.id,
                role: 'OWNER',
              },
            },
          },
        })
      }
    } catch (error) {
      console.error('Error finding/creating training project:', error)
      throw new Error('Failed to setup training project')
    }

    // Store training data as a special type of invoice record
    const trainingRecord = await prisma.invoice.create({
      data: {
        projectId: trainingProject.id,
        userId: user.id,
        invoiceNumber: `TRAINING-${Date.now()}`,
        supplierName: 'Training Data',
        invoiceDate: new Date(),
        totalAmount: 0,
        status: 'PENDING',
        notes: JSON.stringify({
          type: 'training_data',
          originalExtraction,
          correctedData,
          userConfidence,
          corrections: corrections.length,
          accuracyBefore,
          pdfMetadata,
          trainingDate: new Date().toISOString(),
          userId: user.id,
        }),
      },
    })

    // Log training data for analysis (in production, you'd send this to your ML pipeline)
    console.log('Training data collected:', {
      trainingRecordId: trainingRecord.id,
      correctionsCount: corrections.length,
      accuracyBefore,
      correctedFields: corrections,
      userId: user.id,
      timestamp: new Date().toISOString(),
    })

    // In a real implementation, you might:
    // 1. Send data to ML training pipeline
    // 2. Queue for batch processing
    // 3. Update model confidence scores
    // 4. Trigger retraining if enough new data

    return NextResponse.json({
      success: true,
      trainingId: trainingRecord.id,
      corrections: corrections.length,
      accuracyImprovement: 1.0 - accuracyBefore,
      message: 'Training data collected successfully',
    })
  } catch (error) {
    console.error('Error storing training data:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to store training data',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'invoices',
  action: 'create',
  requireAuth: true,
})

export { protectedPOST as POST }
