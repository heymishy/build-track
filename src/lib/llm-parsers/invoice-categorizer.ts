/**
 * LLM-based Invoice Categorization System
 * Automatically matches invoice line items to estimate trade categories
 */

import { AnthropicParser } from './anthropic-parser'
import { GeminiParser } from './gemini-parser'
import { openaiParse } from './openai-parser'

export interface TradeCategory {
  id: string
  name: string
  description?: string
  keywords?: string[]
}

export interface InvoiceLineItemData {
  description: string
  supplierName: string
  quantity?: number
  unitPrice?: number
  totalPrice: number
}

export interface CategorizationResult {
  tradeId: string
  tradeName: string
  confidence: number
  reasoning: string
  category: 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'OTHER'
}

export interface CategorizationResponse {
  success: boolean
  results: CategorizationResult[]
  averageConfidence: number
  cost: number
  error?: string
}

/**
 * Generate categorization prompt for LLM
 */
function generateCategorizationPrompt(
  lineItems: InvoiceLineItemData[],
  tradeCategories: TradeCategory[]
): string {
  const tradeList = tradeCategories
    .map(trade => `- ${trade.name} (ID: ${trade.id})${trade.description ? `: ${trade.description}` : ''}`)
    .join('\n')

  const itemsList = lineItems
    .map((item, index) => 
      `${index + 1}. "${item.description}" (Supplier: ${item.supplierName}, Amount: $${item.totalPrice})`
    )
    .join('\n')

  return `You are a construction project management AI assistant specializing in categorizing invoice line items into trade categories.

AVAILABLE TRADE CATEGORIES:
${tradeList}

INVOICE LINE ITEMS TO CATEGORIZE:
${itemsList}

TASK:
For each invoice line item, determine the most appropriate trade category based on:
1. The item description and what work/materials it represents
2. The supplier name and their typical services
3. Common construction industry practices

For each item, also determine if it's:
- MATERIAL: Physical goods, supplies, materials
- LABOR: Work, services, time-based charges
- EQUIPMENT: Tools, machinery, equipment rental
- OTHER: Administrative, permits, miscellaneous

RESPONSE FORMAT (valid JSON only):
{
  "categorizations": [
    {
      "itemIndex": 1,
      "tradeId": "trade-id",
      "tradeName": "Trade Name",
      "confidence": 0.95,
      "reasoning": "Brief explanation of why this trade was chosen",
      "category": "MATERIAL"
    }
  ]
}

Rules:
- confidence should be 0.0 to 1.0 (1.0 = completely certain)
- If unsure, choose the most likely category and reduce confidence accordingly
- reasoning should be concise but explain the key factors
- Always match to one of the provided trade categories
- Return valid JSON only, no additional text`
}

/**
 * Parse LLM response for categorization results
 */
function parseCategorizationResponse(response: string): CategorizationResult[] {
  try {
    const parsed = JSON.parse(response)
    
    if (!parsed.categorizations || !Array.isArray(parsed.categorizations)) {
      throw new Error('Invalid response format: missing categorizations array')
    }

    return parsed.categorizations.map((cat: any, index: number) => ({
      tradeId: cat.tradeId || '',
      tradeName: cat.tradeName || 'Unknown',
      confidence: Math.max(0, Math.min(1, cat.confidence || 0)),
      reasoning: cat.reasoning || 'No reasoning provided',
      category: ['MATERIAL', 'LABOR', 'EQUIPMENT', 'OTHER'].includes(cat.category) 
        ? cat.category 
        : 'OTHER'
    }))
  } catch (error) {
    console.error('Failed to parse categorization response:', error)
    throw new Error('Invalid JSON response from LLM')
  }
}

/**
 * Categorize invoice line items using LLM
 */
export async function categorizeInvoiceItems(
  lineItems: InvoiceLineItemData[],
  tradeCategories: TradeCategory[],
  provider: 'anthropic' | 'openai' | 'gemini' = 'anthropic'
): Promise<CategorizationResponse> {
  if (lineItems.length === 0) {
    return {
      success: true,
      results: [],
      averageConfidence: 0,
      cost: 0
    }
  }

  if (tradeCategories.length === 0) {
    return {
      success: false,
      results: [],
      averageConfidence: 0,
      cost: 0,
      error: 'No trade categories available for matching'
    }
  }

  try {
    const prompt = generateCategorizationPrompt(lineItems, tradeCategories)
    
    let parseResult
    switch (provider) {
      case 'openai':
        parseResult = await openaiParse(prompt, 'gpt-4')
        break
      case 'gemini':
        try {
          const parser = new GeminiParser({
            apiKey: process.env.GEMINI_API_KEY || '',
            model: 'gemini-1.5-flash',
            timeout: 30000,
            maxRetries: 2
          })
          // Use the parser for simple text generation rather than invoice parsing
          const response = await parser.parseInvoice({ text: prompt })
          parseResult = {
            success: response.success,
            data: response.metadata?.reasoning || '',
            cost: response.costEstimate
          }
        } catch (error) {
          parseResult = { success: false, cost: 0, error: 'Gemini API not configured' }
        }
        break
      default:
        try {
          const parser = new AnthropicParser({
            apiKey: process.env.ANTHROPIC_API_KEY || '',
            model: 'claude-3-sonnet-20240229',
            timeout: 30000,
            maxRetries: 2
          })
          // Use the parser for simple text generation rather than invoice parsing
          const response = await parser.parseInvoice({ text: prompt })
          parseResult = {
            success: response.success,
            data: response.metadata?.reasoning || '',
            cost: response.costEstimate
          }
        } catch (error) {
          parseResult = { success: false, cost: 0, error: 'Anthropic API not configured' }
        }
    }

    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        results: [],
        averageConfidence: 0,
        cost: parseResult.cost || 0,
        error: parseResult.error || 'Failed to get LLM response'
      }
    }

    const results = parseCategorizationResponse(parseResult.data)
    
    // Validate we have results for all items
    if (results.length !== lineItems.length) {
      console.warn(`Expected ${lineItems.length} results, got ${results.length}`)
    }

    const averageConfidence = results.length > 0 
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length 
      : 0

    return {
      success: true,
      results,
      averageConfidence,
      cost: parseResult.cost || 0
    }

  } catch (error) {
    console.error('Invoice categorization error:', error)
    return {
      success: false,
      results: [],
      averageConfidence: 0,
      cost: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate fallback categorization based on keywords
 */
export function generateFallbackCategorization(
  lineItems: InvoiceLineItemData[],
  tradeCategories: TradeCategory[]
): CategorizationResult[] {
  const materialKeywords = ['material', 'supply', 'lumber', 'steel', 'concrete', 'brick', 'tile', 'paint', 'fixtures']
  const laborKeywords = ['labor', 'work', 'service', 'installation', 'hours', 'hourly', 'wages']
  const equipmentKeywords = ['rental', 'equipment', 'tool', 'machinery', 'hire', 'lease']

  return lineItems.map(item => {
    const description = item.description.toLowerCase()
    const supplierName = item.supplierName.toLowerCase()
    
    // Determine category based on keywords
    let category: 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'OTHER' = 'OTHER'
    if (materialKeywords.some(keyword => description.includes(keyword) || supplierName.includes(keyword))) {
      category = 'MATERIAL'
    } else if (laborKeywords.some(keyword => description.includes(keyword) || supplierName.includes(keyword))) {
      category = 'LABOR'
    } else if (equipmentKeywords.some(keyword => description.includes(keyword) || supplierName.includes(keyword))) {
      category = 'EQUIPMENT'
    }

    // Simple trade matching based on keywords
    let bestMatch = tradeCategories[0] // Default to first trade
    let bestScore = 0

    for (const trade of tradeCategories) {
      const tradeName = trade.name.toLowerCase()
      let score = 0
      
      // Check if trade name appears in description or supplier
      if (description.includes(tradeName) || supplierName.includes(tradeName)) {
        score += 5
      }
      
      // Check keywords if available
      if (trade.keywords) {
        score += trade.keywords.filter(keyword => 
          description.includes(keyword.toLowerCase()) || supplierName.includes(keyword.toLowerCase())
        ).length
      }
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = trade
      }
    }

    return {
      tradeId: bestMatch.id,
      tradeName: bestMatch.name,
      confidence: Math.min(0.7, bestScore * 0.15), // Lower confidence for keyword matching
      reasoning: `Keyword-based matching (score: ${bestScore})`,
      category
    }
  })
}