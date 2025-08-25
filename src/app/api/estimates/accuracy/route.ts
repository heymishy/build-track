/**
 * API Route: POST /api/estimates/accuracy
 * Measure accuracy of LLM processed estimate imports
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'

interface AccuracyMeasureRequest {
  projectId?: string
  expectedTotal?: number
  expectedLineItems?: number
  actualTotal?: number
  actualLineItems?: number
  trades?: Array<{
    name: string
    expectedAmount: number
    actualAmount?: number
    found: boolean
  }>
  importMethod: 'llm' | 'regex' | 'manual'
  filename?: string
}

interface AccuracyResult {
  overallAccuracy: number
  totalAccuracy: number
  lineItemAccuracy: number
  tradeAccuracy: number
  missingTrades: string[]
  incorrectAmounts: Array<{
    trade: string
    expected: number
    actual: number
    difference: number
    percentError: number
  }>
  accuracyGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  recommendations: string[]
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body: AccuracyMeasureRequest = await request.json()

    console.log('Measuring estimate import accuracy:', body)

    // Calculate various accuracy metrics
    const accuracy: AccuracyResult = {
      overallAccuracy: 0,
      totalAccuracy: 0,
      lineItemAccuracy: 0,
      tradeAccuracy: 0,
      missingTrades: [],
      incorrectAmounts: [],
      accuracyGrade: 'F',
      recommendations: [],
    }

    // 1. Total Amount Accuracy
    if (body.expectedTotal && body.actualTotal) {
      const totalDifference = Math.abs(body.expectedTotal - body.actualTotal)
      const totalPercentError = (totalDifference / body.expectedTotal) * 100
      accuracy.totalAccuracy = Math.max(0, 100 - totalPercentError)

      if (totalPercentError > 20) {
        accuracy.recommendations.push(
          `Total amount has ${totalPercentError.toFixed(1)}% error - consider improving parsing patterns`
        )
      }
    }

    // 2. Line Item Count Accuracy
    if (body.expectedLineItems && body.actualLineItems) {
      const lineItemDifference = Math.abs(body.expectedLineItems - body.actualLineItems)
      const lineItemPercentError = (lineItemDifference / body.expectedLineItems) * 100
      accuracy.lineItemAccuracy = Math.max(0, 100 - lineItemPercentError)

      if (body.actualLineItems < body.expectedLineItems) {
        const missing = body.expectedLineItems - body.actualLineItems
        accuracy.recommendations.push(`Missing ${missing} line items - check for parsing gaps`)
      } else if (body.actualLineItems > body.expectedLineItems) {
        const extra = body.actualLineItems - body.expectedLineItems
        accuracy.recommendations.push(
          `${extra} extra line items detected - may include totals or duplicates`
        )
      }
    }

    // 3. Trade-Level Accuracy
    if (body.trades && body.trades.length > 0) {
      const totalTrades = body.trades.length
      const foundTrades = body.trades.filter(trade => trade.found).length
      accuracy.tradeAccuracy = (foundTrades / totalTrades) * 100

      // Track missing trades
      accuracy.missingTrades = body.trades.filter(trade => !trade.found).map(trade => trade.name)

      // Track amount discrepancies
      body.trades.forEach(trade => {
        if (trade.found && trade.actualAmount && trade.expectedAmount) {
          const difference = Math.abs(trade.expectedAmount - trade.actualAmount)
          const percentError = (difference / trade.expectedAmount) * 100

          if (percentError > 10) {
            // More than 10% error
            accuracy.incorrectAmounts.push({
              trade: trade.name,
              expected: trade.expectedAmount,
              actual: trade.actualAmount,
              difference,
              percentError,
            })
          }
        }
      })

      if (accuracy.missingTrades.length > 0) {
        accuracy.recommendations.push(`Missing trades: ${accuracy.missingTrades.join(', ')}`)
      }

      if (accuracy.incorrectAmounts.length > 0) {
        accuracy.recommendations.push(
          `${accuracy.incorrectAmounts.length} trades have significant amount errors`
        )
      }
    }

    // 4. Calculate Overall Accuracy (weighted average)
    const weights = {
      total: 0.4, // Total amount is most important
      lineItems: 0.3, // Line item count is important
      trades: 0.3, // Trade detection is important
    }

    accuracy.overallAccuracy =
      accuracy.totalAccuracy * weights.total +
      accuracy.lineItemAccuracy * weights.lineItems +
      accuracy.tradeAccuracy * weights.trades

    // 5. Assign Grade
    if (accuracy.overallAccuracy >= 95) accuracy.accuracyGrade = 'A'
    else if (accuracy.overallAccuracy >= 85) accuracy.accuracyGrade = 'B'
    else if (accuracy.overallAccuracy >= 75) accuracy.accuracyGrade = 'C'
    else if (accuracy.overallAccuracy >= 65) accuracy.accuracyGrade = 'D'
    else accuracy.accuracyGrade = 'F'

    // 6. Method-specific recommendations
    if (body.importMethod === 'llm') {
      if (accuracy.overallAccuracy < 80) {
        accuracy.recommendations.push('Consider improving LLM prompt with specific examples')
        accuracy.recommendations.push('Verify PDF quality and text extraction clarity')
      }
      if (accuracy.totalAccuracy < accuracy.lineItemAccuracy) {
        accuracy.recommendations.push('LLM is finding items but amounts may be inaccurate')
      }
    } else if (body.importMethod === 'regex') {
      if (accuracy.tradeAccuracy < 70) {
        accuracy.recommendations.push('Regex patterns may be too restrictive - add more variations')
      }
      if (accuracy.lineItemAccuracy < accuracy.tradeAccuracy) {
        accuracy.recommendations.push(
          'Found trades but missing line items - check item extraction logic'
        )
      }
    }

    // 7. General recommendations
    if (accuracy.overallAccuracy < 85) {
      accuracy.recommendations.push('Consider hybrid approach: LLM + regex validation')
      accuracy.recommendations.push('Review document structure and formatting patterns')
    }

    // Log the accuracy measurement
    console.log(`Accuracy measurement completed:`, {
      method: body.importMethod,
      filename: body.filename,
      overallAccuracy: accuracy.overallAccuracy.toFixed(1) + '%',
      grade: accuracy.accuracyGrade,
      totalAccuracy: accuracy.totalAccuracy.toFixed(1) + '%',
      lineItemAccuracy: accuracy.lineItemAccuracy.toFixed(1) + '%',
      tradeAccuracy: accuracy.tradeAccuracy.toFixed(1) + '%',
    })

    return NextResponse.json({
      success: true,
      accuracy,
      summary: {
        filename: body.filename,
        method: body.importMethod,
        overallAccuracy: Number(accuracy.overallAccuracy.toFixed(1)),
        grade: accuracy.accuracyGrade,
        totalDifference:
          body.expectedTotal && body.actualTotal
            ? Math.abs(body.expectedTotal - body.actualTotal)
            : 0,
        missingItems:
          body.expectedLineItems && body.actualLineItems
            ? Math.max(0, body.expectedLineItems - body.actualLineItems)
            : 0,
      },
    })
  } catch (error) {
    console.error('Accuracy measurement error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to measure accuracy',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'projects',
  action: 'read',
  requireAuth: true,
})

export { protectedPOST as POST }
