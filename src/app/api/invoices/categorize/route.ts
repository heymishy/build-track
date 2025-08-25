/**
 * API Route: /api/invoices/categorize
 * Auto-categorizes invoice line items to estimate trade categories using LLM
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import {
  categorizeInvoiceItems,
  generateFallbackCategorization,
} from '@/lib/llm-parsers/invoice-categorizer'

interface CategorizationRequest {
  invoiceId: string
  projectId: string
  useAI?: boolean
  provider?: 'anthropic' | 'openai' | 'gemini'
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body: CategorizationRequest = await request.json()
    const { invoiceId, projectId, useAI = true, provider = 'anthropic' } = body

    if (!invoiceId || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID and Project ID are required' },
        { status: 400 }
      )
    }

    // Fetch invoice with line items
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        project: {
          include: {
            trades: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.projectId !== projectId) {
      return NextResponse.json(
        { success: false, error: 'Invoice does not belong to this project' },
        { status: 403 }
      )
    }

    const lineItems = invoice.lineItems.map(item => ({
      description: item.description,
      supplierName: invoice.supplierName,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    }))

    const tradeCategories = invoice.project.trades.map(trade => ({
      id: trade.id,
      name: trade.name,
      description: trade.description || undefined,
    }))

    if (tradeCategories.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No trade categories found for this project. Please create estimate trades first.',
        },
        { status: 400 }
      )
    }

    let categorizationResults
    let usedAI = false
    let cost = 0

    if (useAI) {
      try {
        const aiResult = await categorizeInvoiceItems(lineItems, tradeCategories, provider)

        if (aiResult.success && aiResult.results.length > 0) {
          categorizationResults = aiResult.results
          usedAI = true
          cost = aiResult.cost
        } else {
          console.warn(
            'AI categorization failed, falling back to keyword matching:',
            aiResult.error
          )
          categorizationResults = generateFallbackCategorization(lineItems, tradeCategories)
        }
      } catch (error) {
        console.error('AI categorization error, using fallback:', error)
        categorizationResults = generateFallbackCategorization(lineItems, tradeCategories)
      }
    } else {
      categorizationResults = generateFallbackCategorization(lineItems, tradeCategories)
    }

    // Update invoice line items with categorization results
    const updatePromises = invoice.lineItems
      .map((item, index) => {
        const categorization = categorizationResults[index]
        if (!categorization) return null

        return prisma.invoiceLineItem.update({
          where: { id: item.id },
          data: {
            category: categorization.category,
            // Store trade mapping in a way that can be used for reporting
            description: `${item.description} [${categorization.tradeName}]`,
          },
        })
      })
      .filter(Boolean)

    await Promise.all(updatePromises)

    // Calculate summary by trade
    const tradeSummary = tradeCategories
      .map(trade => {
        const matchingResults = categorizationResults.filter(r => r.tradeId === trade.id)
        const totalAmount = matchingResults.reduce((sum, result, index) => {
          const lineItem = lineItems[index]
          return lineItem ? sum + lineItem.totalPrice : sum
        }, 0)

        return {
          tradeId: trade.id,
          tradeName: trade.name,
          itemCount: matchingResults.length,
          totalAmount,
          averageConfidence:
            matchingResults.length > 0
              ? matchingResults.reduce((sum, r) => sum + r.confidence, 0) / matchingResults.length
              : 0,
          items: matchingResults.map((result, index) => ({
            description: lineItems[index]?.description || '',
            amount: lineItems[index]?.totalAmount || 0,
            confidence: result.confidence,
            reasoning: result.reasoning,
            category: result.category,
          })),
        }
      })
      .filter(summary => summary.itemCount > 0)

    const overallStats = {
      totalItems: lineItems.length,
      categorizedItems: categorizationResults.length,
      averageConfidence:
        categorizationResults.reduce((sum, r) => sum + r.confidence, 0) /
        categorizationResults.length,
      usedAI,
      cost,
      provider: usedAI ? provider : 'keyword',
    }

    return NextResponse.json({
      success: true,
      data: {
        invoiceId,
        tradeSummary,
        stats: overallStats,
        categorizations: categorizationResults,
      },
    })
  } catch (error) {
    console.error('Invoice categorization API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

async function GET(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')
    const projectId = searchParams.get('projectId')

    if (!invoiceId || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID and Project ID are required' },
        { status: 400 }
      )
    }

    // Get current categorization summary
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        project: {
          include: {
            trades: {
              include: {
                lineItems: {
                  include: {
                    invoiceItems: {
                      where: { invoiceId },
                    },
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
    }

    // Build summary by analyzing current line item categorizations
    const tradeSummary = invoice.project.trades
      .map(trade => {
        const relatedItems = invoice.lineItems.filter(item =>
          item.description.includes(`[${trade.name}]`)
        )

        const totalAmount = relatedItems.reduce((sum, item) => sum + Number(item.totalPrice), 0)

        return {
          tradeId: trade.id,
          tradeName: trade.name,
          itemCount: relatedItems.length,
          totalAmount,
          items: relatedItems.map(item => ({
            description: item.description.replace(`[${trade.name}]`, '').trim(),
            amount: Number(item.totalPrice),
            category: item.category,
          })),
        }
      })
      .filter(summary => summary.itemCount > 0)

    return NextResponse.json({
      success: true,
      data: {
        invoiceId,
        tradeSummary,
        totalAmount: Number(invoice.totalAmount),
        supplierName: invoice.supplierName,
      },
    })
  } catch (error) {
    console.error('Get categorization API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Apply authentication middleware
const protectedPOST = withAuth(POST, {
  resource: 'invoices',
  action: 'update',
  requireAuth: true,
})

const protectedGET = withAuth(GET, {
  resource: 'invoices',
  action: 'read',
  requireAuth: true,
})

export { protectedPOST as POST, protectedGET as GET }
