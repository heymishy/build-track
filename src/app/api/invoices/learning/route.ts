/**
 * API Route: /api/invoices/learning
 * Handles invoice matching learning and pattern suggestions
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { InvoiceLearningService } from '@/lib/invoice-learning-service'

// POST /api/invoices/learning - Learn from a user mapping
async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const { 
      action,
      invoiceLineItemId,
      supplierName,
      lineItemDescription,
      amount,
      tradeId,
      estimateLineItemId,
      matchingHistoryId,
      correctTradeId,
      correctEstimateLineItemId,
    } = body

    const learningService = new InvoiceLearningService(user.id)

    switch (action) {
      case 'learn':
        // Learn from a manual mapping
        if (!invoiceLineItemId || !supplierName || !lineItemDescription || !amount || !tradeId) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields for learning' },
            { status: 400 }
          )
        }

        await learningService.learnFromMapping(
          invoiceLineItemId,
          supplierName,
          lineItemDescription,
          Number(amount),
          tradeId,
          estimateLineItemId
        )

        return NextResponse.json({
          success: true,
          message: 'Pattern learned successfully',
        })

      case 'confirm':
        // Confirm a pattern-based match was correct
        if (!matchingHistoryId) {
          return NextResponse.json(
            { success: false, error: 'Missing matching history ID' },
            { status: 400 }
          )
        }

        await learningService.confirmMatch(matchingHistoryId)

        return NextResponse.json({
          success: true,
          message: 'Match confirmed successfully',
        })

      case 'correct':
        // Correct a pattern-based match
        if (!matchingHistoryId || !correctTradeId) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields for correction' },
            { status: 400 }
          )
        }

        await learningService.correctMatch(
          matchingHistoryId,
          correctTradeId,
          correctEstimateLineItemId
        )

        return NextResponse.json({
          success: true,
          message: 'Match corrected and pattern updated',
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Invoice learning API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/invoices/learning - Get suggestions for an invoice line item
async function GET(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierName = searchParams.get('supplierName')
    const lineItemDescription = searchParams.get('lineItemDescription')
    const amount = searchParams.get('amount')
    const projectId = searchParams.get('projectId')

    if (!supplierName || !lineItemDescription || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const learningService = new InvoiceLearningService(user.id, projectId || undefined)
    const suggestions = await learningService.getSuggestions(
      supplierName,
      lineItemDescription,
      Number(amount)
    )

    return NextResponse.json({
      success: true,
      suggestions,
    })
  } catch (error) {
    console.error('Invoice learning suggestions API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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

const protectedGET = withAuth(GET, {
  resource: 'invoices',
  action: 'read',
  requireAuth: true,
})

export { protectedPOST as POST, protectedGET as GET }