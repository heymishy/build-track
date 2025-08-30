/**
 * LLM-First PDF Processor
 * Uses configured LLM providers directly to extract structured invoice data from PDFs
 * This approach provides much higher accuracy than text extraction + parsing
 */

import { ParsedInvoice, InvoiceLineItem, MultiInvoiceResult } from './pdf-parser'
import { getSettings } from './settings'
import { GeminiParser } from './llm-parsers/gemini-parser'
import { AnthropicParser } from './llm-parsers/anthropic-parser'
import { BaseLLMParser } from './llm-parsers/base-llm-parser'

export interface LLMPdfProcessorOptions {
  userId?: string
  projectId?: string
  maxRetries?: number
  confidenceThreshold?: number
}

export interface LLMProcessingResult {
  success: boolean
  invoices: ParsedInvoice[]
  totalCost: number
  processingTime: number
  provider: string
  confidence: number
  metadata: {
    pagesProcessed: number
    llmUsed: boolean
    fallbackUsed: boolean
    retries: number
  }
}

export class LLMPdfProcessor {
  private parsers: Map<string, BaseLLMParser> = new Map()
  private options: LLMPdfProcessorOptions

  constructor(options: LLMPdfProcessorOptions = {}) {
    this.options = {
      maxRetries: 2,
      confidenceThreshold: 0.7,
      ...options,
    }
    this.initializeParsers()
  }

  private initializeParsers() {
    // Initialize available LLM parsers
    this.parsers.set('gemini', new GeminiParser())
    this.parsers.set('anthropic', new AnthropicParser())
    // OpenAI parser can be added when available
    // this.parsers.set('openai', new OpenAIParser())
  }

  /**
   * Process PDF directly using configured LLM
   * Primary method - high accuracy structured extraction
   */
  async processPdfWithLLM(pdfBuffer: Buffer): Promise<MultiInvoiceResult> {
    const startTime = Date.now()
    let totalCost = 0
    let attempts = 0
    const maxAttempts = this.options.maxRetries! + 1

    try {
      // Get user's LLM settings
      const settings = await getSettings(this.options.userId)
      const pdfSettings = settings.system.pdfProcessing

      console.log('🤖 Processing PDF with LLM-first approach')
      console.log('   - Provider:', pdfSettings.provider)
      console.log('   - Fallback:', pdfSettings.fallbackProvider)
      console.log('   - Buffer size:', pdfBuffer.length, 'bytes')

      // Try primary provider
      let result = await this.tryProviderWithPdf(
        pdfSettings.provider,
        pdfBuffer,
        'Primary LLM extraction'
      )
      attempts++
      totalCost += result.cost || 0

      // If primary fails or low confidence, try fallback
      if (!result.success || result.confidence < pdfSettings.confidenceThreshold) {
        console.log('⚠️ Primary LLM failed or low confidence, trying fallback...')

        if (pdfSettings.fallbackProvider !== pdfSettings.provider) {
          const fallbackResult = await this.tryProviderWithPdf(
            pdfSettings.fallbackProvider,
            pdfBuffer,
            'Fallback LLM extraction'
          )
          attempts++
          totalCost += fallbackResult.cost || 0

          // Use fallback if better
          if (fallbackResult.success && fallbackResult.confidence > result.confidence) {
            result = fallbackResult
          }
        }
      }

      const processingTime = Date.now() - startTime

      if (result.success && result.invoices.length > 0) {
        console.log('✅ LLM processing successful')
        console.log('   - Invoices found:', result.invoices.length)
        console.log('   - Confidence:', (result.confidence * 100).toFixed(1) + '%')
        console.log('   - Cost: $' + totalCost.toFixed(4))
        console.log('   - Time:', processingTime + 'ms')

        const totalAmount = result.invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

        return {
          invoices: result.invoices,
          totalInvoices: result.invoices.length,
          totalAmount,
          summary: `✨ LLM extracted ${result.invoices.length} invoice(s). Total: $${totalAmount.toFixed(2)} (Confidence: ${(result.confidence * 100).toFixed(0)}%)`,
          parsingStats: {
            llmUsed: true,
            totalCost,
            averageConfidence: result.confidence,
            strategy: 'llm-first',
          },
          qualityMetrics: {
            overallAccuracy: result.confidence,
            extractionQuality: 0.95, // LLM extraction is high quality
            parsingSuccess: 1.0,
            dataCompleteness: this.calculateDataCompleteness(result.invoices),
            corruptionDetected: false, // LLM doesn't suffer from text corruption
            issuesFound: result.confidence < 0.8 ? ['Lower confidence result'] : [],
            recommendedAction: result.confidence < 0.6 ? 'Manual review recommended' : undefined,
          },
        }
      }

      // If LLM processing fails, fall back to text extraction
      console.log('⚠️ LLM processing failed, falling back to text extraction...')
      return await this.fallbackToTextExtraction(pdfBuffer, totalCost, processingTime)
    } catch (error) {
      console.error('❌ LLM PDF processing failed:', error)

      // Fall back to text extraction
      return await this.fallbackToTextExtraction(pdfBuffer, totalCost, Date.now() - startTime)
    }
  }

  private async tryProviderWithPdf(
    providerName: string,
    pdfBuffer: Buffer,
    context: string
  ): Promise<{ success: boolean; invoices: ParsedInvoice[]; confidence: number; cost: number }> {
    try {
      const parser = this.parsers.get(providerName)
      if (!parser) {
        throw new Error(`Parser not available: ${providerName}`)
      }

      console.log(`🔍 ${context} with ${providerName}...`)

      // Convert PDF buffer to base64 for LLM processing
      const base64Pdf = pdfBuffer.toString('base64')

      // Create structured prompt for invoice extraction
      const prompt = this.createInvoiceExtractionPrompt()

      // Process with LLM
      const response = await parser.parseInvoice({
        content: prompt,
        attachments: [
          {
            type: 'application/pdf',
            data: base64Pdf,
          },
        ],
        expectedFormat: 'construction-invoice',
        context: 'Direct PDF processing',
      })

      if (response.success && response.invoice) {
        return {
          success: true,
          invoices: [response.invoice],
          confidence: response.confidence,
          cost: response.totalCost,
        }
      }

      return {
        success: false,
        invoices: [],
        confidence: 0,
        cost: response.totalCost,
      }
    } catch (error) {
      console.error(`❌ ${context} failed:`, error)
      return {
        success: false,
        invoices: [],
        confidence: 0,
        cost: 0,
      }
    }
  }

  private createInvoiceExtractionPrompt(): string {
    return `You are an expert invoice data extraction system. Please analyze the attached PDF document and extract structured invoice information.

TASK: Extract ALL invoices found in this PDF document with maximum accuracy.

For EACH invoice found, extract:

REQUIRED FIELDS:
- Invoice Number: The unique identifier for this invoice
- Supplier/Vendor Name: The company or person issuing the invoice
- Invoice Date: When the invoice was issued
- Total Amount: The final amount due (including any taxes)

DETAILED LINE ITEMS:
For each line item on the invoice:
- Description: What service/product was provided
- Quantity: How many units (if specified)
- Unit Price: Price per unit (if specified) 
- Line Total: Total for this line item

ADDITIONAL AMOUNTS:
- Subtotal: Amount before taxes (if shown)
- Tax/GST: Tax amount (if shown)
- Discount: Any discounts applied (if shown)

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "invoices": [
    {
      "invoiceNumber": "string or null",
      "date": "YYYY-MM-DD format or null",
      "vendorName": "string or null", 
      "description": "brief description or null",
      "amount": number or null (subtotal),
      "tax": number or null,
      "total": number or null (final amount),
      "lineItems": [
        {
          "description": "string",
          "quantity": number or null,
          "unitPrice": number or null,
          "total": number
        }
      ]
    }
  ]
}

IMPORTANT REQUIREMENTS:
- Extract ALL invoices in the document (may be multiple pages)
- Prioritize accuracy over speed
- Use null for any field that cannot be determined
- Ensure numbers are correctly parsed (handle currency symbols, commas)
- For dates, convert to YYYY-MM-DD format
- If multiple currencies, note the currency in the description
- Focus on construction/trade invoices (electrical, plumbing, building materials, etc.)

Extract the invoice data now:`
  }

  private async fallbackToTextExtraction(
    pdfBuffer: Buffer,
    existingCost: number,
    existingTime: number
  ): Promise<MultiInvoiceResult> {
    try {
      console.log('📄 Falling back to text extraction method...')

      // Import the text extraction method
      const { extractTextFromPDF, parseMultipleInvoices } = await import('./pdf-parser')

      // Use existing text extraction as fallback
      const result = await parseMultipleInvoices(
        pdfBuffer,
        this.options.userId,
        false,
        this.options.projectId
      )

      // Enhance with LLM processing metadata
      return {
        ...result,
        summary: `⚠️ Fallback extraction: ${result.totalInvoices} invoice(s). Total: $${result.totalAmount.toFixed(2)}`,
        parsingStats: {
          llmUsed: false,
          totalCost: existingCost + (result.parsingStats?.totalCost || 0),
          averageConfidence: result.parsingStats?.averageConfidence || 0.5,
          strategy: 'llm-fallback-to-text',
        },
        qualityMetrics: {
          ...result.qualityMetrics,
          recommendedAction: 'LLM processing failed - manual review highly recommended',
        },
      }
    } catch (error) {
      console.error('❌ Fallback text extraction also failed:', error)

      return {
        invoices: [],
        totalInvoices: 0,
        totalAmount: 0,
        summary: '❌ Both LLM and text extraction failed',
        parsingStats: {
          llmUsed: false,
          totalCost: existingCost,
          averageConfidence: 0,
          strategy: 'failed',
        },
        qualityMetrics: {
          overallAccuracy: 0,
          extractionQuality: 0,
          parsingSuccess: 0,
          dataCompleteness: 0,
          corruptionDetected: true,
          issuesFound: ['Complete processing failure'],
          recommendedAction: 'Manual processing required',
        },
      }
    }
  }

  private calculateDataCompleteness(invoices: ParsedInvoice[]): number {
    if (invoices.length === 0) return 0

    const totalFields = invoices.length * 4 // invoiceNumber, date, vendor, total
    const foundFields = invoices.reduce((sum, invoice) => {
      let found = 0
      if (invoice.invoiceNumber) found++
      if (invoice.date) found++
      if (invoice.vendorName) found++
      if (invoice.total || invoice.amount) found++
      return sum + found
    }, 0)

    return foundFields / totalFields
  }
}

/**
 * Main function to process PDF using LLM-first approach
 * This replaces the old text extraction approach
 */
export async function processInvoicePdfWithLLM(
  pdfBuffer: Buffer,
  options: LLMPdfProcessorOptions = {}
): Promise<MultiInvoiceResult> {
  const processor = new LLMPdfProcessor(options)
  return await processor.processPdfWithLLM(pdfBuffer)
}
