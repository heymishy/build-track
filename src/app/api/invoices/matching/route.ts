/**
 * Invoice Matching API
 * GET /api/invoices/matching - Get pending invoices with suggested matches to project estimates (LLM-powered)
 * POST /api/invoices/matching - Apply matches between invoice line items and estimates
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { EnhancedInvoiceMatchingService } from '@/lib/enhanced-invoice-matcher'

interface InvoiceLineItemMatch {
  invoiceLineItemId: string
  estimateLineItemId: string | null
  confidence: number
  reason: string
  matchType?: string
}

interface MatchingResult {
  invoiceId: string
  matches: InvoiceLineItemMatch[]
}

async function GET(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        { status: 400 }
      )
    }

    // Verify user has access to this project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
        },
      })

      if (!projectAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have access to this project',
          },
          { status: 403 }
        )
      }
    }

    // Get all invoices for this project - include all statuses for review
    const invoices = await prisma.invoice.findMany({
      where: {
        projectId,
        status: {
          in: ['PENDING', 'APPROVED', 'PAID'], // Allow users to review and modify all invoice matches
        },
      },
      include: {
        lineItems: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get all estimate line items for this project
    const estimateLineItems = await prisma.lineItem.findMany({
      where: {
        trade: {
          projectId,
        },
      },
      include: {
        trade: {
          select: {
            id: true,
            name: true,
          },
        },
        invoiceItems: {
          select: {
            id: true,
            invoiceId: true,
            totalPrice: true,
          },
        },
      },
    })

    // Check if we need to run LLM matching by finding unmatched items
    const unmatchedItems = invoices.flatMap(invoice =>
      invoice.lineItems.filter(item => !item.lineItemId)
    )

    // Run LLM matching only for unmatched items, but show all invoices in interface
    let batchResult
    if (unmatchedItems.length > 0) {
      console.log(`Found ${unmatchedItems.length} unmatched items, running LLM matching...`)

      // Prepare data for LLM matching service - only unmatched items
      const invoicesForMatching = invoices
        .map(invoice => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          supplierName: invoice.supplierName,
          lineItems: invoice.lineItems
            .filter(item => !item.lineItemId) // Only unmatched items for LLM
            .map(item => ({
              id: item.id,
              description: item.description,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.totalPrice),
              category: item.category,
            })),
        }))
        .filter(invoice => invoice.lineItems.length > 0) // Only invoices with unmatched items

      const estimatesForMatching = estimateLineItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        materialCostEst: Number(item.materialCostEst),
        laborCostEst: Number(item.laborCostEst),
        equipmentCostEst: Number(item.equipmentCostEst),
        tradeName: item.trade.name,
      }))

      // Use enhanced matching service with bulk processing and ML patterns
      const enhancedMatchingService = new EnhancedInvoiceMatchingService(user.id)
      batchResult = await enhancedMatchingService.bulkMatchInvoices(
        invoicesForMatching,
        estimatesForMatching,
        projectId,
        {
          enablePatternLearning: true,
          enableCache: true,
          concurrency: 3,
          qualityThreshold: 0.7,
          timeoutMs: 30000,
        }
      )
    } else {
      console.log('All items already matched, skipping LLM processing')
      // Create empty result when no LLM processing is needed
      batchResult = {
        success: true,
        matches: [],
        fallbackUsed: false,
        processingTime: 0,
        cost: 0,
        error: null,
      }
    }

    // Debug: Log invoice counts and check for uploads
    console.log(`Processing ${invoices.length} invoices for project ${projectId}:`)
    invoices.forEach(inv => {
      console.log(`- Invoice ${inv.invoiceNumber}: ${inv.lineItems.length} line items, status: ${inv.status}, PDF: ${inv.pdfUrl ? 'yes' : 'no'}`)
    })

    // Check if there are unprocessed uploads that need to be converted
    const pendingUploads = await prisma.invoiceUpload.count({
      where: {
        projectId,
        status: 'PENDING'
      }
    })
    console.log(`Found ${pendingUploads} pending invoice uploads that may need processing`)

    // Convert results to the expected format, prioritizing existing matches from DB
    const matchingResults: MatchingResult[] = []

    for (const invoice of invoices) {
      const invoiceMatches: InvoiceLineItemMatch[] = []

      for (const invoiceLineItem of invoice.lineItems) {
        // Check if there's an existing match in the database
        if (invoiceLineItem.lineItemId) {
          // Existing match from database - show as high confidence
          invoiceMatches.push({
            invoiceLineItemId: invoiceLineItem.id,
            estimateLineItemId: invoiceLineItem.lineItemId,
            confidence: 1.0, // Database matches are 100% confident
            reason: 'Previously matched (database)',
            matchType: 'existing',
          })
        } else {
          // Look for LLM suggestion for unmatched items
          const llmMatch = batchResult.matches.find(
            match => match.invoiceLineItemId === invoiceLineItem.id
          )

          if (llmMatch) {
            invoiceMatches.push({
              invoiceLineItemId: llmMatch.invoiceLineItemId,
              estimateLineItemId: llmMatch.estimateLineItemId,
              confidence: llmMatch.confidence,
              reason: llmMatch.reasoning + (llmMatch.matchType ? ` (${llmMatch.matchType})` : ''),
              matchType: llmMatch.matchType || 'suggested',
            })
          } else {
            // No match found - add as unmatched for manual override
            invoiceMatches.push({
              invoiceLineItemId: invoiceLineItem.id,
              estimateLineItemId: null,
              confidence: 0,
              reason: 'No match found',
              matchType: 'unmatched',
            })
          }
        }
      }

      matchingResults.push({
        invoiceId: invoice.id,
        matches: invoiceMatches,
      })
    }

    // Calculate summary statistics
    const totalInvoices = invoices.length
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    const totalLineItems = invoices.reduce((sum, inv) => sum + inv.lineItems.length, 0)
    const totalHighConfidenceMatches = matchingResults
      .flatMap(result => result.matches)
      .filter(match => match.confidence >= 0.7).length

    // Add enhanced processing metadata
    const enhancedMetadata = {
      usedEnhancedMatching:
        batchResult.success && !batchResult.fallbackUsed && unmatchedItems.length > 0,
      fallbackUsed: batchResult.fallbackUsed,
      processingTime: batchResult.processingTime,
      cost: batchResult.cost,
      error: batchResult.error,
      cacheHit: unmatchedItems.length === 0,
      unmatchedItemsCount: unmatchedItems.length,
      // Enhanced metadata
      patternsLearned: batchResult.metrics?.patternsLearned || 0,
      cacheUtilization: batchResult.metrics?.cacheHits || 0,
      avgConfidence: batchResult.metrics?.averageConfidence || 0,
      qualityScore: batchResult.metrics?.qualityScore || 0,
      batchEfficiency: batchResult.metrics?.batchEfficiency || 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoices.map(invoice => ({
          ...invoice,
          totalAmount: Number(invoice.totalAmount),
          gstAmount: Number(invoice.gstAmount),
          lineItems: invoice.lineItems.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
        })),
        estimateLineItems: estimateLineItems.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          materialCostEst: Number(item.materialCostEst),
          laborCostEst: Number(item.laborCostEst),
          equipmentCostEst: Number(item.equipmentCostEst),
          markupPercent: Number(item.markupPercent),
          overheadPercent: Number(item.overheadPercent),
          tradeName: item.trade.name,
          tradeId: item.trade.id,
        })),
        matchingResults,
        summary: {
          totalInvoices,
          totalAmount,
          totalLineItems,
          totalHighConfidenceMatches,
          matchingRate:
            totalLineItems > 0
              ? Math.round((totalHighConfidenceMatches / totalLineItems) * 100)
              : 0,
        },
        enhancedMetadata,
      },
    })
  } catch (error) {
    console.error('Error in invoice matching GET:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch invoice matching data',
      },
      { status: 500 }
    )
  }
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const { projectId, matches } = body

    if (!projectId || !matches || !Array.isArray(matches)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID and matches array are required',
        },
        { status: 400 }
      )
    }

    // Verify user has access to this project
    if (user.role !== 'ADMIN') {
      const projectAccess = await prisma.projectUser.findFirst({
        where: {
          userId: user.id,
          projectId,
        },
      })

      if (!projectAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have access to this project',
          },
          { status: 403 }
        )
      }
    }

    // Apply the matches in a transaction
    const result = await prisma.$transaction(async tx => {
      const updatedItems = []
      const errors = []

      for (const match of matches) {
        if (!match.invoiceLineItemId) continue

        try {
          // Update the invoice line item with the estimate link
          const updatedItem = await tx.invoiceLineItem.update({
            where: { id: match.invoiceLineItemId },
            data: {
              lineItemId: match.estimateLineItemId || null,
            },
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  supplierName: true,
                },
              },
              lineItem: {
                include: {
                  trade: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          })

          updatedItems.push(updatedItem)
        } catch (error) {
          errors.push({
            invoiceLineItemId: match.invoiceLineItemId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return { updatedItems, errors }
    })

    return NextResponse.json({
      success: true,
      data: {
        matchedItems: result.updatedItems.length,
        errors: result.errors,
        updatedItems: result.updatedItems,
      },
    })
  } catch (error) {
    console.error('Error in invoice matching POST:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to apply invoice matches',
      },
      { status: 500 }
    )
  }
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'invoices',
  action: 'read',
  requireAuth: true,
})

const protectedPOST = withAuth(POST, {
  resource: 'invoices',
  action: 'update',
  requireAuth: true,
})

export { protectedGET as GET, protectedPOST as POST }
