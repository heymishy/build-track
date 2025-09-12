/**
 * Invoice Learning Service
 * Learns from user matching patterns to automatically suggest future matches
 */

import { prisma } from './prisma'

export interface MatchingPattern {
  id: string
  supplierPattern?: string
  lineItemPattern?: string
  amountRangeMin?: number
  amountRangeMax?: number
  tradeId: string
  estimateLineItemId?: string
  patternType:
    | 'SUPPLIER_TO_TRADE'
    | 'LINEITEM_TO_TRADE'
    | 'LINEITEM_TO_ESTIMATE'
    | 'AMOUNT_TO_TRADE'
  confidence: number
  usageCount: number
  successCount: number
}

export interface PatternSuggestion {
  patternId?: string
  tradeId: string
  tradeName: string
  estimateLineItemId?: string
  estimateDescription?: string
  confidence: number
  matchingMethod: 'PATTERN' | 'LLM' | 'FUZZY' | 'AMOUNT'
  reason: string
}

export class InvoiceLearningService {
  private userId: string
  private projectId?: string

  constructor(userId: string, projectId?: string) {
    this.userId = userId
    this.projectId = projectId
  }

  /**
   * Learn from a manual user mapping to create or strengthen patterns
   */
  async learnFromMapping(
    invoiceLineItemId: string,
    supplierName: string,
    lineItemDescription: string,
    amount: number,
    tradeId: string,
    estimateLineItemId?: string
  ): Promise<void> {
    try {
      // Record the matching history
      await prisma.matchingHistory.create({
        data: {
          userId: this.userId,
          invoiceId: await this.getInvoiceId(invoiceLineItemId),
          invoiceLineItemId,
          supplierName,
          lineItemDescription,
          amount,
          tradeId,
          estimateLineItemId,
          confidence: 1.0, // Manual mapping is 100% confident
          matchingMethod: 'MANUAL',
          userConfirmed: true,
        },
      })

      // Create or update patterns based on this mapping
      await Promise.all([
        this.createOrUpdateSupplierPattern(supplierName, tradeId),
        this.createOrUpdateLineItemPattern(lineItemDescription, tradeId, estimateLineItemId),
        this.createOrUpdateAmountPattern(amount, tradeId),
      ])

      console.log(
        `✅ Learned from mapping: ${supplierName} → ${lineItemDescription} → Trade ${tradeId}`
      )
    } catch (error) {
      console.error('Failed to learn from mapping:', error)
      throw error
    }
  }

  /**
   * Get pattern-based suggestions for an invoice line item
   */
  async getSuggestions(
    supplierName: string,
    lineItemDescription: string,
    amount: number
  ): Promise<PatternSuggestion[]> {
    const suggestions: PatternSuggestion[] = []

    try {
      // Get patterns that might match this invoice line item
      const patterns = await prisma.matchingPattern.findMany({
        where: {
          OR: [
            // Match by supplier name (fuzzy)
            {
              patternType: 'SUPPLIER_TO_TRADE',
              supplierPattern: {
                contains: this.extractKeywords(supplierName),
                mode: 'insensitive',
              },
            },
            // Match by line item description (fuzzy)
            {
              patternType: 'LINEITEM_TO_TRADE',
              lineItemPattern: {
                contains: this.extractKeywords(lineItemDescription),
                mode: 'insensitive',
              },
            },
            // Match by amount range
            {
              patternType: 'AMOUNT_TO_TRADE',
              amountRangeMin: { lte: amount },
              amountRangeMax: { gte: amount },
            },
          ],
          // Scope to user and project
          userId: this.userId,
          ...(this.projectId && { projectId: this.projectId }),
        },
        include: {
          trade: true,
          estimateLineItem: true,
        },
        orderBy: [{ confidence: 'desc' }, { usageCount: 'desc' }, { successCount: 'desc' }],
        take: 5, // Top 5 suggestions
      })

      // Convert patterns to suggestions
      for (const pattern of patterns) {
        suggestions.push({
          patternId: pattern.id,
          tradeId: pattern.tradeId,
          tradeName: pattern.trade.name,
          estimateLineItemId: pattern.estimateLineItemId || undefined,
          estimateDescription: pattern.estimateLineItem?.description,
          confidence: Number(pattern.confidence),
          matchingMethod: 'PATTERN',
          reason: this.generatePatternReason(pattern, supplierName, lineItemDescription, amount),
        })
      }

      // If no strong patterns, use fuzzy matching
      if (suggestions.length === 0) {
        const fuzzyMatches = await this.getFuzzyMatches(supplierName, lineItemDescription, amount)
        suggestions.push(...fuzzyMatches)
      }

      console.log(
        `💡 Generated ${suggestions.length} suggestions for: ${supplierName} - ${lineItemDescription}`
      )
      return suggestions
    } catch (error) {
      console.error('Failed to get suggestions:', error)
      return []
    }
  }

  /**
   * Confirm a pattern-based match worked correctly
   */
  async confirmMatch(matchingHistoryId: string): Promise<void> {
    await prisma.matchingHistory.update({
      where: { id: matchingHistoryId },
      data: { userConfirmed: true },
    })

    // Update pattern success count
    const history = await prisma.matchingHistory.findUnique({
      where: { id: matchingHistoryId },
    })

    if (history?.matchingPatternId) {
      await prisma.matchingPattern.update({
        where: { id: history.matchingPatternId },
        data: {
          successCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      })
    }
  }

  /**
   * Mark a pattern-based match as incorrect
   */
  async correctMatch(
    matchingHistoryId: string,
    correctTradeId: string,
    correctEstimateLineItemId?: string
  ): Promise<void> {
    await prisma.matchingHistory.update({
      where: { id: matchingHistoryId },
      data: {
        userCorrected: true,
        // Store the correction for learning
      },
    })

    // Decrease pattern confidence if it was wrong
    const history = await prisma.matchingHistory.findUnique({
      where: { id: matchingHistoryId },
    })

    if (history?.matchingPatternId) {
      await prisma.matchingPattern.update({
        where: { id: history.matchingPatternId },
        data: {
          confidence: { multiply: 0.9 }, // Reduce confidence by 10%
        },
      })

      // Create new pattern from the correction
      if (history.supplierName && history.lineItemDescription) {
        await this.learnFromMapping(
          history.invoiceLineItemId,
          history.supplierName,
          history.lineItemDescription,
          Number(history.amount),
          correctTradeId,
          correctEstimateLineItemId
        )
      }
    }
  }

  /**
   * Get learning analytics
   */
  async getLearningStats(): Promise<{
    totalPatterns: number
    patternsByType: Record<string, number>
    accuracyRate: number
    topSuppliers: Array<{ supplier: string; tradeId: string; tradeName: string; count: number }>
  }> {
    const [totalPatterns, patternsByType, matchingHistory, topSuppliers] = await Promise.all([
      prisma.matchingPattern.count({
        where: { userId: this.userId },
      }),
      prisma.matchingPattern.groupBy({
        by: ['patternType'],
        where: { userId: this.userId },
        _count: true,
      }),
      prisma.matchingHistory.aggregate({
        where: { userId: this.userId },
        _count: {
          userConfirmed: true,
        },
        _sum: {
          userConfirmed: true,
        },
      }),
      prisma.matchingHistory.groupBy({
        by: ['supplierName', 'tradeId'],
        where: {
          userId: this.userId,
          userConfirmed: true,
        },
        _count: true,
        orderBy: {
          _count: { supplierName: 'desc' },
        },
        take: 10,
      }),
    ])

    // Get trade names for top suppliers
    const tradeIds = topSuppliers.map(s => s.tradeId)
    const trades = await prisma.trade.findMany({
      where: { id: { in: tradeIds } },
      select: { id: true, name: true },
    })

    const topSuppliersWithNames = topSuppliers.map(supplier => ({
      supplier: supplier.supplierName,
      tradeId: supplier.tradeId,
      tradeName: trades.find(t => t.id === supplier.tradeId)?.name || 'Unknown',
      count: supplier._count,
    }))

    return {
      totalPatterns,
      patternsByType: Object.fromEntries(patternsByType.map(p => [p.patternType, p._count])),
      accuracyRate:
        matchingHistory._count.userConfirmed > 0
          ? (matchingHistory._sum.userConfirmed || 0) / matchingHistory._count.userConfirmed
          : 0,
      topSuppliers: topSuppliersWithNames,
    }
  }

  // Private helper methods

  private async getInvoiceId(invoiceLineItemId: string): Promise<string> {
    const lineItem = await prisma.invoiceLineItem.findUnique({
      where: { id: invoiceLineItemId },
      select: { invoiceId: true },
    })
    return lineItem?.invoiceId || ''
  }

  private async createOrUpdateSupplierPattern(
    supplierName: string,
    tradeId: string
  ): Promise<void> {
    const keywords = this.extractKeywords(supplierName)

    const existing = await prisma.matchingPattern.findFirst({
      where: {
        userId: this.userId,
        patternType: 'SUPPLIER_TO_TRADE',
        supplierPattern: keywords,
        tradeId,
      },
    })

    if (existing) {
      // Update existing pattern
      await prisma.matchingPattern.update({
        where: { id: existing.id },
        data: {
          usageCount: { increment: 1 },
          confidence: Math.min(1.0, Number(existing.confidence) + 0.1), // Increase confidence
          lastUsedAt: new Date(),
        },
      })
    } else {
      // Create new pattern
      await prisma.matchingPattern.create({
        data: {
          userId: this.userId,
          projectId: this.projectId,
          patternType: 'SUPPLIER_TO_TRADE',
          supplierPattern: keywords,
          tradeId,
          confidence: 0.7, // Start with good confidence for manual matches
          usageCount: 1,
          successCount: 1,
        },
      })
    }
  }

  private async createOrUpdateLineItemPattern(
    description: string,
    tradeId: string,
    estimateLineItemId?: string
  ): Promise<void> {
    const keywords = this.extractKeywords(description)

    const existing = await prisma.matchingPattern.findFirst({
      where: {
        userId: this.userId,
        patternType: estimateLineItemId ? 'LINEITEM_TO_ESTIMATE' : 'LINEITEM_TO_TRADE',
        lineItemPattern: keywords,
        tradeId,
        ...(estimateLineItemId && { estimateLineItemId }),
      },
    })

    if (existing) {
      await prisma.matchingPattern.update({
        where: { id: existing.id },
        data: {
          usageCount: { increment: 1 },
          confidence: Math.min(1.0, Number(existing.confidence) + 0.1),
          lastUsedAt: new Date(),
        },
      })
    } else {
      await prisma.matchingPattern.create({
        data: {
          userId: this.userId,
          projectId: this.projectId,
          patternType: estimateLineItemId ? 'LINEITEM_TO_ESTIMATE' : 'LINEITEM_TO_TRADE',
          lineItemPattern: keywords,
          tradeId,
          estimateLineItemId,
          confidence: 0.7,
          usageCount: 1,
          successCount: 1,
        },
      })
    }
  }

  private async createOrUpdateAmountPattern(amount: number, tradeId: string): Promise<void> {
    // Create amount ranges (e.g., $0-$100, $100-$500, etc.)
    const rangeSize = amount < 100 ? 50 : amount < 1000 ? 200 : 1000
    const rangeMin = Math.floor(amount / rangeSize) * rangeSize
    const rangeMax = rangeMin + rangeSize

    const existing = await prisma.matchingPattern.findFirst({
      where: {
        userId: this.userId,
        patternType: 'AMOUNT_TO_TRADE',
        amountRangeMin: rangeMin,
        amountRangeMax: rangeMax,
        tradeId,
      },
    })

    if (existing) {
      await prisma.matchingPattern.update({
        where: { id: existing.id },
        data: {
          usageCount: { increment: 1 },
          confidence: Math.min(1.0, Number(existing.confidence) + 0.05), // Smaller increase for amount patterns
          lastUsedAt: new Date(),
        },
      })
    } else {
      await prisma.matchingPattern.create({
        data: {
          userId: this.userId,
          projectId: this.projectId,
          patternType: 'AMOUNT_TO_TRADE',
          amountRangeMin: rangeMin,
          amountRangeMax: rangeMax,
          tradeId,
          confidence: 0.5, // Lower initial confidence for amount patterns
          usageCount: 1,
          successCount: 1,
        },
      })
    }
  }

  private extractKeywords(text: string): string {
    // Extract meaningful keywords from text for pattern matching
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'ltd', 'limited', 'inc', 'corp'].includes(word))
      .slice(0, 3) // Take first 3 meaningful words
      .join(' ')
  }

  private generatePatternReason(
    pattern: any,
    supplierName: string,
    lineItemDescription: string,
    amount: number
  ): string {
    switch (pattern.patternType) {
      case 'SUPPLIER_TO_TRADE':
        return `Supplier "${supplierName}" previously matched to ${pattern.trade.name} (${pattern.usageCount} times)`
      case 'LINEITEM_TO_TRADE':
        return `Similar items matched to ${pattern.trade.name} (${Math.round(Number(pattern.confidence) * 100)}% confidence)`
      case 'LINEITEM_TO_ESTIMATE':
        return `Item matches specific estimate: ${pattern.estimateLineItem?.description}`
      case 'AMOUNT_TO_TRADE':
        return `Amount $${amount} typically matches ${pattern.trade.name} range`
      default:
        return `Pattern match (${Math.round(Number(pattern.confidence) * 100)}% confidence)`
    }
  }

  private async getFuzzyMatches(
    supplierName: string,
    lineItemDescription: string,
    amount: number
  ): Promise<PatternSuggestion[]> {
    // Simple fuzzy matching based on historical data
    const recentHistory = await prisma.matchingHistory.findMany({
      where: {
        userId: this.userId,
        userConfirmed: true,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        trade: true,
        estimateLineItem: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const suggestions: PatternSuggestion[] = []

    for (const history of recentHistory) {
      let confidence = 0

      // Simple similarity scoring
      if (this.similarity(supplierName, history.supplierName) > 0.6) {
        confidence += 0.4
      }
      if (this.similarity(lineItemDescription, history.lineItemDescription) > 0.5) {
        confidence += 0.4
      }
      if (
        Math.abs(amount - Number(history.amount)) / Math.max(amount, Number(history.amount)) <
        0.3
      ) {
        confidence += 0.2
      }

      if (confidence > 0.3) {
        suggestions.push({
          tradeId: history.tradeId,
          tradeName: history.trade.name,
          estimateLineItemId: history.estimateLineItemId || undefined,
          estimateDescription: history.estimateLineItem?.description,
          confidence,
          matchingMethod: 'FUZZY',
          reason: `Similar to previous: "${history.lineItemDescription}" → ${history.trade.name}`,
        })
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
  }

  private similarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const set1 = new Set(str1.toLowerCase().split(/\s+/))
    const set2 = new Set(str2.toLowerCase().split(/\s+/))
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    return intersection.size / union.size
  }
}
