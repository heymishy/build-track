/**
 * Enhanced Invoice Matching Service with Bulk Processing and ML Patterns
 * Adds batch optimization, pattern learning, and advanced analytics
 */

import {
  InvoiceLineItem,
  EstimateLineItem,
  Invoice,
  LLMMatchResult,
  BatchMatchingResult,
} from './simple-llm-matcher'

export interface BulkProcessingOptions {
  batchSize?: number
  maxConcurrency?: number
  enablePatternLearning?: boolean
  enableCache?: boolean
  prioritizeHighValue?: boolean
  confidenceThreshold?: number
}

export interface MatchingPattern {
  id: string
  invoiceDescriptionPattern: string
  estimateDescriptionPattern: string
  supplierName?: string
  tradeName?: string
  confidence: number
  usageCount: number
  successRate: number
  createdAt: Date
  lastUsedAt: Date
}

export interface ProcessingMetrics {
  totalItems: number
  processedItems: number
  highConfidenceMatches: number
  mediumConfidenceMatches: number
  lowConfidenceMatches: number
  noMatches: number
  averageConfidence: number
  processingTimeMs: number
  cachehits: number
  llmCalls: number
  patternMatches: number
  costEstimate: number
}

export interface BulkMatchingResult extends BatchMatchingResult {
  metrics: ProcessingMetrics
  patterns: MatchingPattern[]
  recommendations: string[]
  qualityScore: number
}

export class EnhancedInvoiceMatchingService {
  private userId?: string
  private patterns: Map<string, MatchingPattern> = new Map()
  private cache: Map<string, LLMMatchResult> = new Map()
  private readonly DEFAULT_OPTIONS: BulkProcessingOptions = {
    batchSize: 50,
    maxConcurrency: 3,
    enablePatternLearning: true,
    enableCache: true,
    prioritizeHighValue: true,
    confidenceThreshold: 0.5,
  }

  constructor(userId?: string) {
    this.userId = userId
    this.loadPatterns()
  }

  /**
   * Enhanced bulk matching with pattern learning and optimization
   */
  async bulkMatchInvoices(
    invoices: Invoice[],
    estimates: EstimateLineItem[],
    projectId: string,
    options?: BulkProcessingOptions
  ): Promise<BulkMatchingResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }
    const startTime = Date.now()
    
    const metrics: ProcessingMetrics = {
      totalItems: invoices.reduce((sum, inv) => sum + inv.lineItems.length, 0),
      processedItems: 0,
      highConfidenceMatches: 0,
      mediumConfidenceMatches: 0,
      lowConfidenceMatches: 0,
      noMatches: 0,
      averageConfidence: 0,
      processingTimeMs: 0,
      cachehits: 0,
      llmCalls: 0,
      patternMatches: 0,
      costEstimate: 0,
    }

    try {
      // Step 1: Prepare and prioritize items
      const allLineItems = this.prepareLineItems(invoices, opts)
      
      // Step 2: Try pattern matching first (fastest)
      const patternResults = await this.applyPatternMatching(allLineItems, estimates, metrics)
      
      // Step 3: Try cache for remaining items
      const cacheResults = await this.applyCachedMatching(
        allLineItems.filter(item => !patternResults.has(item.id)),
        estimates,
        metrics
      )
      
      // Step 4: Process remaining items in batches with LLM
      const remainingItems = allLineItems.filter(
        item => !patternResults.has(item.id) && !cacheResults.has(item.id)
      )
      
      const llmResults = await this.processBatchesWithLLM(
        remainingItems,
        estimates,
        invoices,
        opts,
        metrics
      )
      
      // Step 5: Combine all results
      const allMatches: LLMMatchResult[] = []
      const combinedResults = new Map([...patternResults, ...cacheResults, ...llmResults])
      
      for (const item of allLineItems) {
        const match = combinedResults.get(item.id)
        if (match) {
          allMatches.push(match)
          
          // Update metrics
          if (match.confidence >= 0.8) {
            metrics.highConfidenceMatches++
          } else if (match.confidence >= 0.5) {
            metrics.mediumConfidenceMatches++
          } else if (match.confidence >= 0.3) {
            metrics.lowConfidenceMatches++
          } else {
            metrics.noMatches++
          }
        }
      }
      
      // Step 6: Learn from results if enabled
      if (opts.enablePatternLearning) {
        await this.learnFromMatches(allMatches, invoices, estimates)
      }
      
      // Step 7: Generate insights and recommendations
      const recommendations = this.generateRecommendations(allMatches, metrics)
      const qualityScore = this.calculateQualityScore(allMatches, metrics)
      
      // Final metrics
      metrics.processingTimeMs = Date.now() - startTime
      metrics.averageConfidence = allMatches.length > 0 
        ? allMatches.reduce((sum, m) => sum + m.confidence, 0) / allMatches.length 
        : 0
      metrics.processedItems = allMatches.length

      return {
        success: true,
        matches: allMatches,
        fallbackUsed: false,
        processingTime: metrics.processingTimeMs,
        cost: metrics.costEstimate,
        metrics,
        patterns: Array.from(this.patterns.values()),
        recommendations,
        qualityScore,
      }
      
    } catch (error) {
      console.error('Bulk matching failed:', error)
      
      return {
        success: false,
        matches: [],
        fallbackUsed: true,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Bulk matching failed',
        metrics,
        patterns: [],
        recommendations: ['Review system configuration and try again'],
        qualityScore: 0,
      }
    }
  }

  /**
   * Prepare and prioritize line items for processing
   */
  private prepareLineItems(invoices: Invoice[], options: BulkProcessingOptions) {
    const allItems = invoices.flatMap(inv => 
      inv.lineItems.map(item => ({
        ...item,
        supplierName: inv.supplierName,
        invoiceNumber: inv.invoiceNumber,
        priority: this.calculateItemPriority(item, options),
      }))
    )

    // Sort by priority if enabled
    if (options.prioritizeHighValue) {
      allItems.sort((a, b) => b.priority - a.priority)
    }

    return allItems
  }

  /**
   * Calculate processing priority for an item
   */
  private calculateItemPriority(item: InvoiceLineItem, options: BulkProcessingOptions): number {
    let priority = 0
    
    // Higher value items get higher priority
    priority += Math.log(item.totalPrice + 1) * 10
    
    // Items with complex descriptions might need more attention
    if (item.description.length > 50) {
      priority += 5
    }
    
    // Material items often easier to match
    if (item.category === 'MATERIAL') {
      priority += 3
    }
    
    return priority
  }

  /**
   * Apply pattern matching for fast processing
   */
  private async applyPatternMatching(
    items: any[],
    estimates: EstimateLineItem[],
    metrics: ProcessingMetrics
  ): Promise<Map<string, LLMMatchResult>> {
    const results = new Map<string, LLMMatchResult>()
    
    for (const item of items) {
      for (const [patternId, pattern] of this.patterns) {
        if (this.matchesPattern(item, pattern)) {
          // Find matching estimate
          const estimate = estimates.find(est => 
            this.matchesEstimatePattern(est, pattern)
          )
          
          if (estimate) {
            results.set(item.id, {
              invoiceLineItemId: item.id,
              estimateLineItemId: estimate.id,
              confidence: Math.min(pattern.confidence, 0.95), // Cap pattern confidence
              reasoning: `Pattern match: ${pattern.invoiceDescriptionPattern} → ${pattern.estimateDescriptionPattern}`,
              matchType: pattern.confidence > 0.8 ? 'exact' : 'partial',
            })
            
            // Update pattern usage
            pattern.usageCount++
            pattern.lastUsedAt = new Date()
            
            metrics.patternMatches++
            break
          }
        }
      }
    }
    
    return results
  }

  /**
   * Check if item matches a learned pattern
   */
  private matchesPattern(item: any, pattern: MatchingPattern): boolean {
    const itemDesc = item.description.toLowerCase()
    const patternDesc = pattern.invoiceDescriptionPattern.toLowerCase()
    
    // Simple pattern matching - could be enhanced with regex
    if (patternDesc.includes('*')) {
      const parts = patternDesc.split('*')
      return parts.every(part => part === '' || itemDesc.includes(part))
    }
    
    return itemDesc.includes(patternDesc) || 
           this.calculateStringSimilarity(itemDesc, patternDesc) > 0.8
  }

  /**
   * Check if estimate matches pattern
   */
  private matchesEstimatePattern(estimate: EstimateLineItem, pattern: MatchingPattern): boolean {
    const estDesc = estimate.description.toLowerCase()
    const patternDesc = pattern.estimateDescriptionPattern.toLowerCase()
    
    if (pattern.tradeName && estimate.tradeName !== pattern.tradeName) {
      return false
    }
    
    return estDesc.includes(patternDesc) || 
           this.calculateStringSimilarity(estDesc, patternDesc) > 0.8
  }

  /**
   * Apply cached matching results
   */
  private async applyCachedMatching(
    items: any[],
    estimates: EstimateLineItem[],
    metrics: ProcessingMetrics
  ): Promise<Map<string, LLMMatchResult>> {
    const results = new Map<string, LLMMatchResult>()
    
    for (const item of items) {
      const cacheKey = this.generateCacheKey(item.description, item.totalPrice)
      const cached = this.cache.get(cacheKey)
      
      if (cached) {
        // Verify the estimate still exists
        const estimate = estimates.find(est => est.id === cached.estimateLineItemId)
        if (estimate) {
          results.set(item.id, {
            ...cached,
            invoiceLineItemId: item.id,
            reasoning: `${cached.reasoning} (cached)`,
          })
          
          metrics.cachehits++
        }
      }
    }
    
    return results
  }

  /**
   * Process remaining items in batches using LLM
   */
  private async processBatchesWithLLM(
    items: any[],
    estimates: EstimateLineItem[],
    originalInvoices: Invoice[],
    options: BulkProcessingOptions,
    metrics: ProcessingMetrics
  ): Promise<Map<string, LLMMatchResult>> {
    const results = new Map<string, LLMMatchResult>()
    
    if (items.length === 0) {
      return results
    }

    // Process in batches
    const batchSize = options.batchSize || 50
    const batches: any[][] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }

    // Process batches with concurrency control
    const maxConcurrency = options.maxConcurrency || 3
    const semaphore = new Array(maxConcurrency).fill(null)
    
    const processBatch = async (batch: any[]): Promise<void> => {
      try {
        // Create mock invoices for this batch
        const batchInvoices = this.createBatchInvoices(batch, originalInvoices)
        
        // Use existing LLM matching service
        const { SimpleLLMMatchingService } = await import('./simple-llm-matcher')
        const llmService = new SimpleLLMMatchingService(this.userId)
        
        const batchResult = await llmService.matchInvoicesToEstimates(
          batchInvoices,
          estimates,
          'bulk-processing'
        )
        
        if (batchResult.success) {
          // Store results and update cache
          for (const match of batchResult.matches) {
            results.set(match.invoiceLineItemId, match)
            
            // Cache successful matches
            if (match.confidence > 0.5 && match.estimateLineItemId) {
              const item = batch.find(b => b.id === match.invoiceLineItemId)
              if (item) {
                const cacheKey = this.generateCacheKey(item.description, item.totalPrice)
                this.cache.set(cacheKey, match)
              }
            }
          }
          
          metrics.llmCalls++
          metrics.costEstimate += batchResult.cost || 0.01
        }
      } catch (error) {
        console.error('Batch processing failed:', error)
        // Add empty matches for failed items
        for (const item of batch) {
          results.set(item.id, {
            invoiceLineItemId: item.id,
            estimateLineItemId: null,
            confidence: 0,
            reasoning: 'Batch processing failed',
            matchType: 'none',
          })
        }
      }
    }

    // Process batches with controlled concurrency
    const batchPromises = batches.map(async (batch, index) => {
      const semaphoreIndex = index % maxConcurrency
      await semaphore[semaphoreIndex] // Wait for slot
      semaphore[semaphoreIndex] = processBatch(batch)
      return semaphore[semaphoreIndex]
    })

    await Promise.all(batchPromises)
    
    return results
  }

  /**
   * Create mock invoices for batch processing
   */
  private createBatchInvoices(items: any[], originalInvoices: Invoice[]): Invoice[] {
    const invoiceGroups = new Map<string, any[]>()
    
    // Group items by original invoice
    for (const item of items) {
      const originalInvoice = originalInvoices.find(inv => 
        inv.lineItems.some(li => li.id === item.id)
      )
      
      if (originalInvoice) {
        const key = originalInvoice.id
        if (!invoiceGroups.has(key)) {
          invoiceGroups.set(key, [])
        }
        invoiceGroups.get(key)!.push(item)
      }
    }

    // Create batch invoices
    return Array.from(invoiceGroups.entries()).map(([invoiceId, items]) => {
      const originalInvoice = originalInvoices.find(inv => inv.id === invoiceId)!
      
      return {
        id: `batch-${invoiceId}`,
        invoiceNumber: originalInvoice.invoiceNumber,
        supplierName: originalInvoice.supplierName,
        lineItems: items,
      }
    })
  }

  /**
   * Learn patterns from successful matches
   */
  private async learnFromMatches(
    matches: LLMMatchResult[],
    invoices: Invoice[],
    estimates: EstimateLineItem[]
  ): Promise<void> {
    const highConfidenceMatches = matches.filter(m => 
      m.confidence > 0.8 && m.estimateLineItemId && m.matchType !== 'none'
    )

    for (const match of highConfidenceMatches) {
      const invoiceItem = invoices
        .flatMap(inv => inv.lineItems)
        .find(item => item.id === match.invoiceLineItemId)
        
      const estimateItem = estimates.find(est => est.id === match.estimateLineItemId)
      const invoice = invoices.find(inv => 
        inv.lineItems.some(item => item.id === match.invoiceLineItemId)
      )

      if (invoiceItem && estimateItem && invoice) {
        await this.createOrUpdatePattern({
          invoiceDescription: invoiceItem.description,
          estimateDescription: estimateItem.description,
          supplierName: invoice.supplierName,
          tradeName: estimateItem.tradeName,
          confidence: match.confidence,
        })
      }
    }
  }

  /**
   * Create or update a matching pattern
   */
  private async createOrUpdatePattern(data: {
    invoiceDescription: string
    estimateDescription: string
    supplierName: string
    tradeName: string
    confidence: number
  }): Promise<void> {
    const patternKey = `${data.supplierName}:${data.invoiceDescription}:${data.estimateDescription}`
    
    const existingPattern = this.patterns.get(patternKey)
    
    if (existingPattern) {
      // Update existing pattern
      existingPattern.confidence = Math.max(existingPattern.confidence, data.confidence)
      existingPattern.usageCount++
      existingPattern.successRate = (existingPattern.successRate + 1) / 2 // Simple smoothing
      existingPattern.lastUsedAt = new Date()
    } else {
      // Create new pattern
      const newPattern: MatchingPattern = {
        id: patternKey,
        invoiceDescriptionPattern: this.extractPattern(data.invoiceDescription),
        estimateDescriptionPattern: this.extractPattern(data.estimateDescription),
        supplierName: data.supplierName,
        tradeName: data.tradeName,
        confidence: data.confidence,
        usageCount: 1,
        successRate: 1.0,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      }
      
      this.patterns.set(patternKey, newPattern)
    }

    // Persist patterns (in real implementation, save to database)
    await this.savePatterns()
  }

  /**
   * Extract generalized pattern from description
   */
  private extractPattern(description: string): string {
    // Simple pattern extraction - could be enhanced with NLP
    return description
      .toLowerCase()
      .replace(/\d+/g, '*') // Replace numbers with wildcards
      .replace(/\b(model|type|size|grade)\s+\w+/gi, '$1 *') // Replace variable parts
      .trim()
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(matches: LLMMatchResult[], metrics: ProcessingMetrics): string[] {
    const recommendations: string[] = []

    const lowConfidenceRate = metrics.lowConfidenceMatches / Math.max(metrics.totalItems, 1)
    const noMatchRate = metrics.noMatches / Math.max(metrics.totalItems, 1)

    if (lowConfidenceRate > 0.3) {
      recommendations.push('Consider improving estimate descriptions for better matching accuracy')
    }

    if (noMatchRate > 0.2) {
      recommendations.push('Review unmatchable items - they may indicate missing estimates or new project scope')
    }

    if (metrics.patternMatches / Math.max(metrics.totalItems, 1) < 0.1) {
      recommendations.push('Enable pattern learning to improve future matching performance')
    }

    if (metrics.averageConfidence < 0.6) {
      recommendations.push('Consider manual review of matches before applying to project')
    }

    const duplicateMatches = this.findDuplicateMatches(matches)
    if (duplicateMatches.length > 0) {
      recommendations.push(`Found ${duplicateMatches.length} duplicate matches - review for accuracy`)
    }

    return recommendations
  }

  /**
   * Find potential duplicate matches (multiple invoices to same estimate)
   */
  private findDuplicateMatches(matches: LLMMatchResult[]): string[] {
    const estimateUsage = new Map<string, string[]>()
    
    for (const match of matches) {
      if (match.estimateLineItemId && match.confidence > 0.5) {
        if (!estimateUsage.has(match.estimateLineItemId)) {
          estimateUsage.set(match.estimateLineItemId, [])
        }
        estimateUsage.get(match.estimateLineItemId)!.push(match.invoiceLineItemId)
      }
    }

    return Array.from(estimateUsage.entries())
      .filter(([_, invoiceIds]) => invoiceIds.length > 1)
      .map(([estimateId, invoiceIds]) => `Estimate ${estimateId} matched to ${invoiceIds.length} invoices`)
  }

  /**
   * Calculate overall quality score for the matching results
   */
  private calculateQualityScore(matches: LLMMatchResult[], metrics: ProcessingMetrics): number {
    if (matches.length === 0) return 0

    const weights = {
      averageConfidence: 0.4,
      matchRate: 0.3,
      highConfidenceRate: 0.2,
      patternUsage: 0.1,
    }

    const matchRate = (metrics.totalItems - metrics.noMatches) / metrics.totalItems
    const highConfidenceRate = metrics.highConfidenceMatches / metrics.totalItems
    const patternUsage = metrics.patternMatches / Math.max(metrics.totalItems, 1)

    const qualityScore = 
      (metrics.averageConfidence * weights.averageConfidence) +
      (matchRate * weights.matchRate) +
      (highConfidenceRate * weights.highConfidenceRate) +
      (patternUsage * weights.patternUsage)

    return Math.round(qualityScore * 100)
  }

  // Utility methods
  private generateCacheKey(description: string, price: number): string {
    const normalizedDesc = description.toLowerCase().replace(/[^\w\s]/g, '').trim()
    const priceRange = Math.floor(price / 100) * 100 // Round to nearest $100
    return `${normalizedDesc}:${priceRange}`
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance implementation
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

  private async loadPatterns(): Promise<void> {
    // In a real implementation, load from database
    // For now, initialize with empty patterns
    this.patterns.clear()
  }

  private async savePatterns(): Promise<void> {
    // In a real implementation, save patterns to database
    console.log(`Saving ${this.patterns.size} learned patterns`)
  }
}