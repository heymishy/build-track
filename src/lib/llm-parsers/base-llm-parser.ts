/**
 * Base LLM Parser Interface
 * Standardized interface for all LLM providers
 */

import { ParsedInvoice } from '@/lib/pdf-parser'

export interface LLMParseRequest {
  content: string  // Renamed from 'text' to be more generic
  pageNumber?: number
  attachments?: Array<{   // NEW: Support for PDF/image attachments
    type: 'application/pdf' | 'image/jpeg' | 'image/png'
    data: string  // Base64 encoded data
    filename?: string
  }>
  context?: {
    previousInvoices?: ParsedInvoice[]
    expectedFormat?: 'nz-tax-invoice' | 'au-tax-invoice' | 'construction-invoice' | 'generic'
    supplierName?: string
    projectContext?: string
  }
  options?: {
    temperature?: number
    maxTokens?: number
    includeConfidence?: boolean
    structured?: boolean
  }
}

export interface LLMParseResponse {
  success: boolean
  invoice?: ParsedInvoice
  confidence: number
  costEstimate: number
  processingTime: number
  tokensUsed: {
    input: number
    output: number
  }
  error?: string
  metadata?: {
    model: string
    provider: string
    reasoning?: string
    alternativeParsing?: ParsedInvoice[]
  }
}

export interface LLMParserConfig {
  apiKey: string
  model: string
  baseUrl?: string
  timeout: number
  maxRetries: number
}

export abstract class BaseLLMParser {
  protected config: LLMParserConfig
  protected rateLimiter: Map<string, number[]> = new Map()

  constructor(config: LLMParserConfig) {
    this.config = config
  }

  abstract parseInvoice(request: LLMParseRequest): Promise<LLMParseResponse>

  /**
   * Validate and normalize LLM response, ensuring pageNumber is preserved
   */
  protected validateResponse(
    parsedData: any,
    originalText: string,
    pageNumber?: number
  ): ParsedInvoice {
    const parsed: ParsedInvoice = {
      invoiceNumber: parsedData.invoiceNumber || null,
      date: this.normalizeDate(parsedData.date),
      vendorName: parsedData.vendorName || null,
      description: parsedData.description || null,
      amount: this.normalizeAmount(parsedData.amount),
      tax: this.normalizeAmount(parsedData.tax),
      total: this.normalizeAmount(parsedData.total),
      lineItems: this.normalizeLineItems(parsedData.lineItems || []),
      pageNumber, // Preserve pageNumber from request
      confidence: Math.min(Math.max(parsedData.confidence || 0.8, 0), 1),
      rawText: originalText,
    }

    // Validate total calculation
    if (parsed.amount && parsed.tax && parsed.total) {
      const expectedTotal = parsed.amount + parsed.tax
      const difference = Math.abs(parsed.total - expectedTotal)

      if (difference > 0.5) {
        parsed.confidence = Math.max(parsed.confidence * 0.8, 0.3)
      }
    }

    return parsed
  }

  /**
   * Generate structured prompt for invoice parsing
   */
  protected generatePrompt(request: LLMParseRequest): string {
    const { text, context, pageNumber } = request

    return `You are an expert invoice data extraction system for construction projects. Extract structured data from the following invoice text with high accuracy.

INVOICE TEXT (Page ${pageNumber || 1}):
${text}

EXTRACTION REQUIREMENTS:
1. **Invoice Number**: Exact invoice/reference number
2. **Vendor Name**: Company name issuing the invoice
3. **Date**: Invoice date in YYYY-MM-DD format
4. **Amounts**: 
   - Subtotal/Amount (before tax)
   - Tax/GST amount
   - Total amount (including tax)
5. **Line Items**: Individual items/services with quantities and prices
6. **Description**: Brief description of work/materials

CONTEXT:
${context?.supplierName ? `Expected Supplier: ${context.supplierName}` : ''}
${context?.expectedFormat ? `Format Type: ${context.expectedFormat}` : ''}
${context?.projectContext ? `Project Context: ${context.projectContext}` : ''}

RESPONSE FORMAT (JSON):
{
  "invoiceNumber": "string",
  "vendorName": "string", 
  "date": "YYYY-MM-DD",
  "description": "string",
  "amount": number,
  "tax": number,
  "total": number,
  "lineItems": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "total": number
    }
  ],
  "confidence": number,
  "reasoning": "brief explanation of extraction decisions"
}

VALIDATION RULES:
- All currency amounts should be numbers (not strings)
- Dates must be valid YYYY-MM-DD format
- Total should equal amount + tax (within $0.50 tolerance)
- Confidence should reflect extraction certainty (0.0-1.0)
- If unsure about a field, use null and lower confidence

Extract the data now:`
  }

  private normalizeDate(dateStr: any): string | null {
    if (!dateStr) return null

    try {
      // Try parsing various date formats
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return null

      return date.toISOString().split('T')[0]
    } catch {
      return null
    }
  }

  private normalizeAmount(amount: any): number | null {
    if (amount === null || amount === undefined) return null

    const num =
      typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : Number(amount)

    return isNaN(num) ? null : Math.round(num * 100) / 100
  }

  private normalizeLineItems(items: any[]): any[] {
    if (!Array.isArray(items)) return []

    return items
      .map(item => ({
        description: item.description || '',
        quantity: this.normalizeAmount(item.quantity) || 1,
        unitPrice: this.normalizeAmount(item.unitPrice) || 0,
        total: this.normalizeAmount(item.total) || 0,
      }))
      .filter(item => item.description && item.total > 0)
  }

  /**
   * Rate limiting check
   */
  protected async checkRateLimit(identifier: string, maxPerMinute: number): Promise<boolean> {
    const now = Date.now()
    const windowStart = now - 60000 // 1 minute ago

    const requests = this.rateLimiter.get(identifier) || []
    const recentRequests = requests.filter(time => time > windowStart)

    if (recentRequests.length >= maxPerMinute) {
      return false
    }

    recentRequests.push(now)
    this.rateLimiter.set(identifier, recentRequests)
    return true
  }

  /**
   * Calculate estimated cost
   */
  protected calculateCost(inputTokens: number, outputTokens: number, costPer1k: number): number {
    return ((inputTokens + outputTokens) / 1000) * costPer1k
  }
}
