/**
 * Simple LLM-Powered Invoice Matching Service
 * Direct LLM calls for invoice-to-estimate matching
 */

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category: string
}

export interface EstimateLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  materialCostEst: number
  laborCostEst: number
  equipmentCostEst: number
  tradeName: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  supplierName: string
  lineItems: InvoiceLineItem[]
}

export interface LLMMatchResult {
  invoiceLineItemId: string
  estimateLineItemId: string | null
  confidence: number
  reasoning: string
  matchType: 'exact' | 'partial' | 'conceptual' | 'none'
}

export interface BatchMatchingResult {
  success: boolean
  matches: LLMMatchResult[]
  error?: string
  fallbackUsed: boolean
  processingTime: number
  cost?: number
}

export class SimpleLLMMatchingService {
  /**
   * Try LLM matching with fallback to logic-based matching
   */
  async matchInvoicesToEstimates(
    invoices: Invoice[],
    estimates: EstimateLineItem[],
    projectId: string
  ): Promise<BatchMatchingResult> {
    const startTime = Date.now()

    try {
      // Try LLM first
      const llmResult = await this.tryLLMMatching(invoices, estimates)
      
      if (llmResult.success) {
        return {
          ...llmResult,
          fallbackUsed: false,
          processingTime: Date.now() - startTime
        }
      }

      console.log('LLM matching failed, falling back to logic-based matching')
      
      // Fallback to logic-based matching
      const logicResult = await this.logicBasedMatching(invoices, estimates)
      
      return {
        ...logicResult,
        fallbackUsed: true,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      console.error('All matching methods failed:', error)
      
      // Return empty matches for manual processing
      const allLineItems = invoices.flatMap(inv => inv.lineItems)
      const emptyMatches: LLMMatchResult[] = allLineItems.map(item => ({
        invoiceLineItemId: item.id,
        estimateLineItemId: null,
        confidence: 0,
        reasoning: 'Automatic matching failed - manual review required',
        matchType: 'none' as const
      }))

      return {
        success: true,
        matches: emptyMatches,
        fallbackUsed: true,
        processingTime: Date.now() - startTime,
        error: 'All automatic matching failed, manual review required'
      }
    }
  }

  /**
   * Try LLM matching with Gemini
   */
  private async tryLLMMatching(
    invoices: Invoice[],
    estimates: EstimateLineItem[]
  ): Promise<BatchMatchingResult> {
    try {
      console.log('Attempting LLM matching with Gemini...')
      
      const prompt = this.buildMatchingPrompt(invoices, estimates)
      
      // Make direct API call to Gemini
      const result = await this.callGeminiAPI(prompt)
      
      if (result.success && result.data) {
        const matches = this.parseLLMResponse(result.data, invoices, estimates)
        
        return {
          success: true,
          matches,
          fallbackUsed: false,
          processingTime: 0,
          cost: result.cost
        }
      }
      
      return {
        success: false,
        matches: [],
        error: result.error || 'LLM parsing failed',
        fallbackUsed: false,
        processingTime: 0
      }
    } catch (error) {
      console.error('LLM matching error:', error)
      return {
        success: false,
        matches: [],
        error: error instanceof Error ? error.message : 'LLM matching failed',
        fallbackUsed: false,
        processingTime: 0
      }
    }
  }

  /**
   * Build the LLM prompt for matching invoices to estimates
   */
  private buildMatchingPrompt(invoices: Invoice[], estimates: EstimateLineItem[]): string {
    const invoiceData = invoices.map(inv => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      supplier: inv.supplierName,
      lineItems: inv.lineItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        category: item.category
      }))
    }))

    const estimateData = estimates.map(est => ({
      id: est.id,
      description: est.description,
      tradeName: est.tradeName,
      quantity: est.quantity,
      unit: est.unit,
      materialCost: est.materialCostEst,
      laborCost: est.laborCostEst,
      equipmentCost: est.equipmentCostEst,
      totalCost: est.materialCostEst + est.laborCostEst + est.equipmentCostEst
    }))

    return `You are an expert construction project analyst. Your task is to match invoice line items to project estimate line items based on their descriptions, quantities, costs, and context.

INVOICES TO MATCH:
${JSON.stringify(invoiceData, null, 2)}

PROJECT ESTIMATES:
${JSON.stringify(estimateData, null, 2)}

INSTRUCTIONS:
1. For each invoice line item, find the best matching estimate line item
2. Consider: description similarity, quantity compatibility, cost reasonableness, trade/category alignment
3. Assign confidence scores: 0.9+ (exact match), 0.7-0.9 (high confidence), 0.5-0.7 (medium), 0.3-0.5 (low), <0.3 (no match)
4. Provide clear reasoning for each match

REQUIRED JSON OUTPUT FORMAT:
{
  "matches": [
    {
      "invoiceLineItemId": "item_id",
      "estimateLineItemId": "estimate_id_or_null",
      "confidence": 0.85,
      "reasoning": "Clear explanation of why this match was made",
      "matchType": "exact|partial|conceptual|none"
    }
  ]
}

MATCH TYPES:
- exact: Perfect description and quantity match
- partial: Similar description, some quantity/cost variance
- conceptual: Related work but different specifics
- none: No reasonable match found

Respond with ONLY the JSON output, no additional text.`
  }

  /**
   * Call Gemini API directly
   */
  private async callGeminiAPI(prompt: string): Promise<{success: boolean, data?: any, error?: string, cost?: number}> {
    try {
      // Get API key from environment or user settings
      const apiKey = process.env.GEMINI_API_KEY
      
      if (!apiKey) {
        // Try to get from user settings
        const { getParsingConfig } = await import('./pdf-parsing-config')
        const config = await getParsingConfig()
        
        if (!config.llmProviders.gemini?.enabled || !config.llmProviders.gemini?.apiKey) {
          return {
            success: false,
            error: 'Gemini API key not configured'
          }
        }
        
        return await this.makeGeminiRequest(config.llmProviders.gemini.apiKey, prompt)
      }
      
      return await this.makeGeminiRequest(apiKey, prompt)
      
    } catch (error) {
      console.error('Gemini API call failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gemini API call failed'
      }
    }
  }

  /**
   * Make the actual Gemini API request
   */
  private async makeGeminiRequest(apiKey: string, prompt: string): Promise<{success: boolean, data?: any, error?: string, cost?: number}> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Gemini API error: ${response.status} ${errorText}`
        }
      }

      const result = await response.json()
      
      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        return {
          success: false,
          error: 'Invalid Gemini API response format'
        }
      }

      const content = result.candidates[0].content.parts[0].text
      
      return {
        success: true,
        data: content,
        cost: 0.001 // Approximate cost for Gemini Flash
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gemini request failed'
      }
    }
  }

  /**
   * Parse LLM response to extract matching results
   */
  private parseLLMResponse(
    llmResponse: string,
    invoices: Invoice[],
    estimates: EstimateLineItem[]
  ): LLMMatchResult[] {
    try {
      // Extract JSON from response if it's wrapped in text
      let jsonData
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonData = JSON.parse(jsonMatch[0])
      } else {
        jsonData = JSON.parse(llmResponse)
      }

      if (!jsonData.matches || !Array.isArray(jsonData.matches)) {
        throw new Error('Invalid LLM response format - missing matches array')
      }

      // Validate and normalize matches
      const validMatches: LLMMatchResult[] = []
      const allInvoiceItems = invoices.flatMap(inv => inv.lineItems)
      const estimateIds = new Set(estimates.map(e => e.id))

      for (const match of jsonData.matches) {
        // Validate invoice line item exists
        const invoiceItem = allInvoiceItems.find(item => item.id === match.invoiceLineItemId)
        if (!invoiceItem) {
          console.warn(`Invalid invoice line item ID: ${match.invoiceLineItemId}`)
          continue
        }

        // Validate estimate ID if provided
        if (match.estimateLineItemId && !estimateIds.has(match.estimateLineItemId)) {
          console.warn(`Invalid estimate line item ID: ${match.estimateLineItemId}`)
          match.estimateLineItemId = null
          match.confidence = 0
          match.matchType = 'none'
        }

        // Ensure confidence is a valid number
        const confidence = Math.max(0, Math.min(1, Number(match.confidence) || 0))

        validMatches.push({
          invoiceLineItemId: match.invoiceLineItemId,
          estimateLineItemId: match.estimateLineItemId || null,
          confidence,
          reasoning: match.reasoning || 'LLM match without specific reasoning',
          matchType: match.matchType || 'partial'
        })
      }

      // Ensure all invoice items have matches (add missing ones as no-match)
      const matchedItemIds = new Set(validMatches.map(m => m.invoiceLineItemId))
      for (const item of allInvoiceItems) {
        if (!matchedItemIds.has(item.id)) {
          validMatches.push({
            invoiceLineItemId: item.id,
            estimateLineItemId: null,
            confidence: 0,
            reasoning: 'No match found by LLM',
            matchType: 'none'
          })
        }
      }

      return validMatches

    } catch (error) {
      console.error('Error parsing LLM response:', error)
      
      // Return no-match results for all invoice items
      const allInvoiceItems = invoices.flatMap(inv => inv.lineItems)
      return allInvoiceItems.map(item => ({
        invoiceLineItemId: item.id,
        estimateLineItemId: null,
        confidence: 0,
        reasoning: 'Failed to parse LLM response',
        matchType: 'none' as const
      }))
    }
  }

  /**
   * Logic-based matching fallback
   */
  private async logicBasedMatching(
    invoices: Invoice[],
    estimates: EstimateLineItem[]
  ): Promise<BatchMatchingResult> {
    const matches: LLMMatchResult[] = []
    
    for (const invoice of invoices) {
      for (const invoiceItem of invoice.lineItems) {
        let bestMatch: LLMMatchResult = {
          invoiceLineItemId: invoiceItem.id,
          estimateLineItemId: null,
          confidence: 0,
          reasoning: 'No matching estimate found',
          matchType: 'none'
        }

        for (const estimateItem of estimates) {
          // Calculate multiple similarity scores
          const stringSimilarity = this.calculateStringSimilarity(
            invoiceItem.description,
            estimateItem.description
          )
          
          const semanticSimilarity = this.calculateSemanticSimilarity(
            invoiceItem.description,
            estimateItem.description
          )
          
          // Price similarity
          const invoicePrice = invoiceItem.totalPrice
          const estimatePrice = estimateItem.materialCostEst + 
                               estimateItem.laborCostEst + 
                               estimateItem.equipmentCostEst
          
          let priceSimilarity = 0
          if (estimatePrice > 0) {
            const priceDiff = Math.abs(invoicePrice - estimatePrice) / Math.max(invoicePrice, estimatePrice)
            priceSimilarity = Math.max(0, 1 - priceDiff)
          }
          
          // Combined confidence score
          const confidence = Math.round((
            stringSimilarity * 0.4 +
            semanticSimilarity * 0.3 +
            priceSimilarity * 0.2 +
            (invoiceItem.category === 'MATERIAL' ? 0.1 : 0)
          ) * 100) / 100
          
          if (confidence > bestMatch.confidence && confidence > 0.3) {
            let reasoning = 'Logic-based match: '
            const reasons = []
            if (stringSimilarity > 0.5) reasons.push('text similarity')
            if (semanticSimilarity > 0.4) reasons.push('semantic match')
            if (priceSimilarity > 0.6) reasons.push('price alignment')
            reasoning += reasons.join(', ')
            
            bestMatch = {
              invoiceLineItemId: invoiceItem.id,
              estimateLineItemId: estimateItem.id,
              confidence,
              reasoning,
              matchType: confidence > 0.7 ? 'partial' : 'conceptual'
            }
          }
        }
        
        matches.push(bestMatch)
      }
    }

    return {
      success: true,
      matches,
      fallbackUsed: false,
      processingTime: 0
    }
  }

  // Utility functions for string similarity
  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim()
    const s2 = str2.toLowerCase().trim()
    
    if (s1 === s2) return 1.0
    
    const matrix: number[][] = []
    const n = s1.length
    const m = s2.length
    
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
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
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

  private calculateSemanticSimilarity(desc1: string, desc2: string): number {
    const keywords1 = new Set(this.extractKeywords(desc1))
    const keywords2 = new Set(this.extractKeywords(desc2))
    
    if (keywords1.size === 0 && keywords2.size === 0) return 1.0
    if (keywords1.size === 0 || keywords2.size === 0) return 0.0
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)))
    const union = new Set([...keywords1, ...keywords2])
    
    return intersection.size / union.size
  }

  private extractKeywords(description: string): string[] {
    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'with', 'from', 'inc', 'ltd', 'pty'].includes(word))
  }
}