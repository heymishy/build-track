/**
 * AI Preview API for Supplier Portal
 * Provides real-time AI processing preview for uploaded invoices
 */

import { NextRequest, NextResponse } from 'next/server'
import { SimpleLLMMatchingService } from '@/lib/simple-llm-matcher'
import { prisma } from '@/lib/prisma'

// Helper function to parse PDF buffer using advanced LLM processing
async function parsePDF(buffer: Buffer, supplierEmail: string) {
  try {
    console.log('🚀 Starting advanced LLM-first PDF processing for supplier portal...')

    // Use the same advanced processing as the dashboard
    const { processInvoicePdfWithLLM } = await import('@/lib/llm-pdf-processor')
    const result = await processInvoicePdfWithLLM(buffer, { 
      userId: `supplier:${supplierEmail}`,
      projectId: undefined 
    })

    console.log('✅ Advanced LLM processing completed')
    console.log('   - Method:', result.parsingStats?.strategy || 'llm-first')
    console.log('   - Invoices found:', result.totalInvoices)
    console.log('   - Accuracy:', (result.qualityMetrics?.overallAccuracy || 0) * 100, '%')

    // Transform the advanced result to match expected format
    if (result.invoices && result.invoices.length > 0) {
      const invoice = result.invoices[0] // Take first invoice for single processing

      return {
        success: true,
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.date,
          supplierName: invoice.vendorName,
          totalAmount: invoice.total || 0,
          lineItems: invoice.lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.total,
            category: 'MATERIAL', // Default category
          })),
        },
        // Include advanced processing metadata
        processingMetadata: {
          strategy: result.parsingStats?.strategy,
          confidence: result.qualityMetrics?.overallAccuracy,
          cost: result.parsingStats?.totalCost,
          processingTime: result.parsingStats?.totalTime,
          accuracy: result.qualityMetrics?.overallAccuracy,
          qualityScore: result.qualityMetrics?.qualityScore,
        }
      }
    } else {
      return {
        success: false,
        error: 'No invoices found in PDF',
      }
    }
  } catch (error) {
    console.error('❌ Advanced LLM processing failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Advanced PDF parsing failed',
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const email = formData.get('email') as string
    const previewOnly = formData.get('previewOnly') as string

    if (!file || !email) {
      return NextResponse.json({
        success: false,
        error: 'File and email are required',
      })
    }

    // Validate supplier email
    const supplier = await prisma.supplierAccess.findUnique({
      where: {
        email: email.toLowerCase().trim(),
        isActive: true,
      },
    })

    if (!supplier) {
      return NextResponse.json({
        success: false,
        error: 'Email not authorized for portal access',
      })
    }

    // Get available projects for this supplier
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        totalBudget: true,
        trades: {
          include: {
            lineItems: {
              select: {
                id: true,
                description: true,
                quantity: true,
                unit: true,
                materialCostEst: true,
                laborCostEst: true,
                equipmentCostEst: true,
              },
            },
          },
        },
      },
      where: {
        status: {
          in: ['PLANNING', 'IN_PROGRESS'],
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Parse PDF with advanced LLM processing
    const startTime = Date.now()
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsedInvoice = await parsePDF(buffer, email)

    if (!parsedInvoice.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse PDF invoice',
      })
    }

    const invoice = parsedInvoice.invoice!

    // Generate AI project suggestions
    const projectSuggestions = await generateProjectSuggestions(invoice, projects, supplier.name)

    // Calculate extracted data metrics
    const extractedLineItems = invoice.lineItems?.length || 0
    const totalAmount =
      invoice.totalAmount ||
      invoice.lineItems?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) ||
      0

    // Create enhanced preview response with advanced processing metadata
    const preview = {
      parsedInvoice: invoice,
      confidence: parsedInvoice.processingMetadata?.confidence || calculateExtractionConfidence(invoice),
      projectSuggestions: projectSuggestions.slice(0, 3), // Top 3 suggestions
      extractedLineItems,
      totalAmount,
      processingTime: Date.now() - startTime,
      // Include advanced LLM processing insights
      advancedProcessing: {
        strategy: parsedInvoice.processingMetadata?.strategy || 'advanced-llm',
        accuracy: parsedInvoice.processingMetadata?.accuracy,
        qualityScore: parsedInvoice.processingMetadata?.qualityScore,
        llmCost: parsedInvoice.processingMetadata?.cost,
        llmProcessingTime: parsedInvoice.processingMetadata?.processingTime,
      }
    }

    // If this is preview-only, don't store anything
    if (previewOnly === 'true') {
      return NextResponse.json({
        success: true,
        preview,
      })
    }

    return NextResponse.json({
      success: true,
      preview,
    })
  } catch (error) {
    console.error('AI preview error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'AI preview processing failed',
    })
  }
}

/**
 * Generate intelligent project suggestions based on invoice content
 */
async function generateProjectSuggestions(invoice: any, projects: any[], supplierName: string) {
  const suggestions = []

  for (const project of projects) {
    try {
      // Calculate confidence based on multiple factors
      let confidence = 0
      let reasoning = ''
      let estimatedMatches = 0

      // Factor 1: Supplier name matching (if invoice has supplier info)
      if (invoice.supplierName && supplierName) {
        const supplierMatch = calculateStringSimilarity(
          invoice.supplierName.toLowerCase(),
          supplierName.toLowerCase()
        )
        confidence += supplierMatch * 0.2
        if (supplierMatch > 0.8) {
          reasoning += `Supplier name matches. `
        }
      }

      // Factor 2: Content analysis - match invoice line items with project estimates
      if (invoice.lineItems && project.trades) {
        const allEstimates = project.trades.flatMap(trade =>
          trade.lineItems.map(item => ({
            ...item,
            tradeName: trade.name,
          }))
        )

        let totalMatches = 0
        let strongMatches = 0

        for (const invoiceItem of invoice.lineItems) {
          const bestMatch = findBestEstimateMatch(invoiceItem, allEstimates)
          if (bestMatch.confidence > 0.5) {
            totalMatches++
            if (bestMatch.confidence > 0.7) {
              strongMatches++
            }
          }
        }

        estimatedMatches = totalMatches
        const matchRatio = totalMatches / Math.max(invoice.lineItems.length, 1)
        const strongMatchRatio = strongMatches / Math.max(invoice.lineItems.length, 1)

        confidence += matchRatio * 0.6 + strongMatchRatio * 0.2

        if (strongMatches > 0) {
          reasoning += `${strongMatches} strong content matches found. `
        }
        if (totalMatches > strongMatches) {
          reasoning += `${totalMatches - strongMatches} additional potential matches. `
        }
      }

      // Factor 3: Project budget alignment
      if (invoice.totalAmount && project.totalBudget) {
        const budgetRatio = invoice.totalAmount / project.totalBudget
        if (budgetRatio < 0.5 && budgetRatio > 0.01) {
          confidence += 0.1
          reasoning += `Invoice amount aligns with project budget. `
        }
      }

      // Only include suggestions with reasonable confidence
      if (confidence > 0.3 || estimatedMatches > 0) {
        if (!reasoning) {
          reasoning = 'General project compatibility based on available information.'
        }

        suggestions.push({
          projectId: project.id,
          projectName: project.name,
          confidence: Math.min(confidence, 0.95), // Cap at 95%
          reasoning: reasoning.trim(),
          estimatedMatches,
        })
      }
    } catch (error) {
      console.error(`Error analyzing project ${project.id}:`, error)
      continue
    }
  }

  // Sort by confidence (highest first)
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Find the best matching estimate for an invoice line item
 */
function findBestEstimateMatch(invoiceItem: any, estimates: any[]) {
  let bestMatch = { confidence: 0, estimate: null }

  const invoiceDesc = (invoiceItem.description || '').toLowerCase()
  const invoiceCategory = (invoiceItem.category || '').toLowerCase()

  for (const estimate of estimates) {
    const estimateDesc = (estimate.description || '').toLowerCase()

    // Calculate text similarity
    const descSimilarity = calculateStringSimilarity(invoiceDesc, estimateDesc)

    // Boost confidence for category matches
    let categoryBonus = 0
    if (invoiceCategory && invoiceCategory !== 'other') {
      const tradeName = (estimate.tradeName || '').toLowerCase()
      if (tradeName.includes(invoiceCategory) || invoiceCategory.includes(tradeName)) {
        categoryBonus = 0.2
      }
    }

    // Boost confidence for quantity/unit similarities
    let quantityBonus = 0
    if (invoiceItem.quantity && estimate.quantity && invoiceItem.unit && estimate.unit) {
      const unitSim = calculateStringSimilarity(
        invoiceItem.unit.toLowerCase(),
        estimate.unit.toLowerCase()
      )
      if (unitSim > 0.7) {
        quantityBonus = 0.1
      }
    }

    const totalConfidence = descSimilarity + categoryBonus + quantityBonus

    if (totalConfidence > bestMatch.confidence) {
      bestMatch = {
        confidence: Math.min(totalConfidence, 0.95),
        estimate,
      }
    }
  }

  return bestMatch
}

/**
 * Calculate confidence score for data extraction quality
 */
function calculateExtractionConfidence(invoice: any): number {
  let confidence = 0

  // Required fields
  if (invoice.invoiceNumber) confidence += 0.25
  if (invoice.invoiceDate) confidence += 0.15
  if (invoice.supplierName) confidence += 0.15
  if (invoice.totalAmount && invoice.totalAmount > 0) confidence += 0.2

  // Line items quality
  if (invoice.lineItems && invoice.lineItems.length > 0) {
    confidence += 0.15

    // Bonus for well-structured line items
    const wellStructuredItems = invoice.lineItems.filter(
      item => item.description && (item.totalPrice > 0 || (item.quantity && item.unitPrice))
    )

    const structureRatio = wellStructuredItems.length / invoice.lineItems.length
    confidence += structureRatio * 0.1
  }

  return Math.min(confidence, 0.95)
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const matrix: number[][] = []
  const n = str1.length
  const m = str2.length

  if (n === 0) return m === 0 ? 1 : 0
  if (m === 0) return 0

  for (let i = 0; i <= n; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= m; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const maxLength = Math.max(n, m)
  return (maxLength - matrix[n][m]) / maxLength
}
