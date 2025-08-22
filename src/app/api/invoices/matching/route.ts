/**
 * Invoice Matching API
 * GET /api/invoices/matching - Get pending invoices with suggested matches to project estimates (LLM-powered)
 * POST /api/invoices/matching - Apply matches between invoice line items and estimates
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { SimpleLLMMatchingService } from '@/lib/simple-llm-matcher'

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
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 })
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
        return NextResponse.json({
          success: false,
          error: 'You do not have access to this project'
        }, { status: 403 })
      }
    }
    
    // Get pending invoices for this project
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        projectId,
        status: 'PENDING'
      },
      include: {
        lineItems: true,
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Get all estimate line items for this project
    const estimateLineItems = await prisma.lineItem.findMany({
      where: {
        trade: {
          projectId
        }
      },
      include: {
        trade: {
          select: {
            id: true,
            name: true
          }
        },
        invoiceItems: {
          select: {
            id: true,
            invoiceId: true,
            totalPrice: true
          }
        }
      }
    })
    
    // Prepare data for LLM matching service
    const invoicesForMatching = pendingInvoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      supplierName: invoice.supplierName,
      lineItems: invoice.lineItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        category: item.category
      }))
    }))

    const estimatesForMatching = estimateLineItems.map(item => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      materialCostEst: Number(item.materialCostEst),
      laborCostEst: Number(item.laborCostEst),
      equipmentCostEst: Number(item.equipmentCostEst),
      tradeName: item.trade.name
    }))

    // Use LLM matching service with fallbacks
    const llmMatchingService = new SimpleLLMMatchingService()
    const batchResult = await llmMatchingService.matchInvoicesToEstimates(
      invoicesForMatching,
      estimatesForMatching,
      projectId
    )

    // Convert LLM results to the expected format
    const matchingResults: MatchingResult[] = []
    
    for (const invoice of pendingInvoices) {
      const invoiceMatches = batchResult.matches
        .filter(match => {
          const lineItem = invoice.lineItems.find(item => item.id === match.invoiceLineItemId)
          return lineItem !== undefined
        })
        .map(match => ({
          invoiceLineItemId: match.invoiceLineItemId,
          estimateLineItemId: match.estimateLineItemId,
          confidence: match.confidence,
          reason: match.reasoning + (match.matchType ? ` (${match.matchType})` : ''),
          matchType: match.matchType
        }))

      matchingResults.push({
        invoiceId: invoice.id,
        matches: invoiceMatches
      })
    }
    
    // Calculate summary statistics
    const totalPendingInvoices = pendingInvoices.length
    const totalPendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    const totalLineItems = pendingInvoices.reduce((sum, inv) => sum + inv.lineItems.length, 0)
    const totalHighConfidenceMatches = matchingResults
      .flatMap(result => result.matches)
      .filter(match => match.confidence >= 0.7).length
    
    // Add LLM processing metadata
    const llmMetadata = {
      usedLLM: batchResult.success && !batchResult.fallbackUsed,
      fallbackUsed: batchResult.fallbackUsed,
      processingTime: batchResult.processingTime,
      cost: batchResult.cost,
      error: batchResult.error
    }
    
    return NextResponse.json({
      success: true,
      data: {
        pendingInvoices: pendingInvoices.map(invoice => ({
          ...invoice,
          totalAmount: Number(invoice.totalAmount),
          gstAmount: Number(invoice.gstAmount),
          lineItems: invoice.lineItems.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice)
          }))
        })),
        estimateLineItems: estimateLineItems.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          materialCostEst: Number(item.materialCostEst),
          laborCostEst: Number(item.laborCostEst),
          equipmentCostEst: Number(item.equipmentCostEst),
          markupPercent: Number(item.markupPercent),
          overheadPercent: Number(item.overheadPercent)
        })),
        matchingResults,
        summary: {
          totalPendingInvoices,
          totalPendingAmount,
          totalLineItems,
          totalHighConfidenceMatches,
          matchingRate: totalLineItems > 0 ? Math.round((totalHighConfidenceMatches / totalLineItems) * 100) : 0
        },
        llmMetadata
      }
    })
    
  } catch (error) {
    console.error('Error in invoice matching GET:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch invoice matching data'
    }, { status: 500 })
  }
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const body = await request.json()
    const { projectId, matches } = body
    
    if (!projectId || !matches || !Array.isArray(matches)) {
      return NextResponse.json({
        success: false,
        error: 'Project ID and matches array are required'
      }, { status: 400 })
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
        return NextResponse.json({
          success: false,
          error: 'You do not have access to this project'
        }, { status: 403 })
      }
    }
    
    // Apply the matches in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedItems = []
      const errors = []
      
      for (const match of matches) {
        if (!match.invoiceLineItemId) continue
        
        try {
          // Update the invoice line item with the estimate link
          const updatedItem = await tx.invoiceLineItem.update({
            where: { id: match.invoiceLineItemId },
            data: {
              lineItemId: match.estimateLineItemId || null
            },
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  supplierName: true
                }
              },
              lineItem: {
                include: {
                  trade: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          })
          
          updatedItems.push(updatedItem)
        } catch (error) {
          errors.push({
            invoiceLineItemId: match.invoiceLineItemId,
            error: error instanceof Error ? error.message : 'Unknown error'
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
        updatedItems: result.updatedItems
      }
    })
    
  } catch (error) {
    console.error('Error in invoice matching POST:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to apply invoice matches'
    }, { status: 500 })
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