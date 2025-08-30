/**
 * LLM-First PDF Processor
 * Uses configured LLM providers directly to extract structured invoice data from PDFs
 * This approach provides much higher accuracy than text extraction + parsing
 */

import { ParsedInvoice, InvoiceLineItem, MultiInvoiceResult } from './pdf-parser'
import { getSettings } from './settings-server'
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
    // Note: initializeParsers is now async and called in processPdfWithLLM
  }

  private async initializeParsers() {
    // Initialize available LLM parsers using settings-configured API keys
    console.log('🔧 Initializing LLM parsers from user settings...')

    try {
      // Get API keys from settings service
      const { SettingsService } = await import('./settings-service')
      const settingsService = new SettingsService(this.options.userId || '')
      const settings = await settingsService.getSettings()

      console.log('🔑 Available API keys:', Object.keys(settings.apiKeys))

      // Initialize Gemini parser if API key is available
      if (settings.apiKeys.gemini) {
        console.log('✅ Initializing Gemini parser with settings API key')
        this.parsers.set(
          'gemini',
          new GeminiParser({
            apiKey: settings.apiKeys.gemini,
            model: 'gemini-1.5-flash',
            timeout: 30000,
            maxRetries: 2,
          })
        )
      }

      // Initialize Anthropic parser if API key is available
      if (settings.apiKeys.anthropic) {
        console.log('✅ Initializing Anthropic parser with settings API key')
        this.parsers.set(
          'anthropic',
          new AnthropicParser({
            apiKey: settings.apiKeys.anthropic,
            model: 'claude-3-haiku-20240307',
            timeout: 30000,
            maxRetries: 2,
          })
        )
      }

      // Fallback to environment variables if no settings API keys
      if (this.parsers.size === 0) {
        console.log('📋 No API keys in settings, checking environment variables...')

        if (process.env.GEMINI_API_KEY) {
          console.log('✅ Found Gemini API key in environment variables')
          this.parsers.set(
            'gemini',
            new GeminiParser({
              apiKey: process.env.GEMINI_API_KEY,
              model: 'gemini-1.5-flash',
              timeout: 30000,
              maxRetries: 2,
            })
          )
        }

        if (process.env.ANTHROPIC_API_KEY) {
          console.log('✅ Found Anthropic API key in environment variables')
          this.parsers.set(
            'anthropic',
            new AnthropicParser({
              apiKey: process.env.ANTHROPIC_API_KEY,
              model: 'claude-3-haiku-20240307',
              timeout: 30000,
              maxRetries: 2,
            })
          )
        }
      }
    } catch (error) {
      console.warn('⚠️ Error loading API keys from settings:', error)
      console.log('📋 Falling back to environment variables only...')

      if (process.env.GEMINI_API_KEY) {
        this.parsers.set(
          'gemini',
          new GeminiParser({
            apiKey: process.env.GEMINI_API_KEY,
            model: 'gemini-1.5-flash',
            timeout: 30000,
            maxRetries: 2,
          })
        )
      }
    }

    // Final status
    if (this.parsers.size === 0) {
      console.warn(
        '⚠️ No LLM API keys configured - PDF processing will use text extraction fallback only'
      )
    } else {
      console.log('🚀 LLM parsers initialized:', Array.from(this.parsers.keys()))
    }
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
      // Initialize parsers with API keys from settings
      await this.initializeParsers()

      // Get user's LLM settings
      const settings = await getSettings(this.options.userId)
      const pdfSettings = settings.system.pdfProcessing

      console.log('🤖 Processing PDF with LLM-first approach')
      console.log('   - Provider:', pdfSettings.provider)
      console.log('   - Fallback:', pdfSettings.fallbackProvider)
      console.log('   - Buffer size:', pdfBuffer.length, 'bytes')
      console.log('   - Available parsers:', Array.from(this.parsers.keys()))

      // Check if we have any parsers configured
      if (this.parsers.size === 0) {
        console.log('⚠️ No LLM parsers available - skipping to text extraction fallback')
        return await this.fallbackToTextExtraction(pdfBuffer, 0, Date.now() - startTime)
      }

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

      if (response.success) {
        // Handle multi-invoice response
        if (response.invoices && response.invoices.length > 0) {
          console.log('✅ Multi-invoice response:', response.invoices.length, 'invoices')
          return {
            success: true,
            invoices: response.invoices,
            confidence: response.confidence,
            cost: response.costEstimate,
          }
        }
        // Handle single invoice response (legacy)
        else if (response.invoice) {
          console.log('✅ Single invoice response')
          return {
            success: true,
            invoices: [response.invoice],
            confidence: response.confidence,
            cost: response.costEstimate,
          }
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

CRITICAL TASK: This PDF contains MULTIPLE INVOICES across MULTIPLE PAGES. You MUST:
1. EXAMINE EVERY SINGLE PAGE of the PDF document
2. IDENTIFY EVERY INDIVIDUAL INVOICE on each page
3. EXTRACT ALL invoices found - do not stop after finding one
4. Each page may contain one or multiple invoices
5. Look for invoice headers, invoice numbers, vendor names, and totals on EVERY page

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

OUTPUT FORMAT - CRITICAL: 
You MUST return a JSON object with EXACTLY this structure. Do not return any other format:

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
    },
    {
      "invoiceNumber": "string or null",
      "date": "YYYY-MM-DD format or null",
      "vendorName": "string or null", 
      "description": "brief description or null",
      "amount": number or null,
      "tax": number or null,
      "total": number or null,
      "lineItems": [...]
    }
  ]
}

EXAMPLE: If you find 3 invoices, your response should look like:
{"invoices": [invoice1_object, invoice2_object, invoice3_object]}

The "invoices" array is MANDATORY even if you find only one invoice.

IMPORTANT REQUIREMENTS:
- Extract ALL invoices in the document (this document has MULTIPLE pages with MULTIPLE invoices)
- SCAN EVERY PAGE - do not stop after finding the first invoice
- This PDF likely contains 10+ invoices across multiple pages
- Prioritize accuracy over speed
- Use null for any field that cannot be determined
- Ensure numbers are correctly parsed (handle currency symbols, commas)
- For dates, convert to YYYY-MM-DD format
- If multiple currencies, note the currency in the description
- Focus on construction/trade invoices (electrical, plumbing, building materials, etc.)

REMINDER: You are analyzing a MULTI-PAGE PDF with MULTIPLE INVOICES. Examine each page thoroughly and extract every invoice you find. 

Your response MUST start with {"invoices": [ and contain ALL invoices in the array format shown above.

Extract the invoice data now:`
  }

  private async fallbackToTextExtraction(
    pdfBuffer: Buffer,
    existingCost: number,
    existingTime: number
  ): Promise<MultiInvoiceResult> {
    try {
      console.log('📄 Falling back to text extraction method...')

      // Use simple text extraction approach to avoid recursion
      const { extractTextFromPDF, parseInvoiceFromTextTraditional } = await import('./pdf-parser')

      // Extract text from PDF
      const pages = await extractTextFromPDF(pdfBuffer)
      console.log('📄 Extracted text from', pages.length, 'pages')

      // Parse invoices from extracted text
      const invoices: ParsedInvoice[] = []
      for (let i = 0; i < pages.length; i++) {
        try {
          const invoice = await parseInvoiceFromTextTraditional(pages[i], i + 1)
          if (invoice) {
            invoices.push(invoice)
          }
        } catch (error) {
          console.warn(`Failed to parse page ${i + 1}:`, error)
        }
      }

      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

      const result = {
        invoices,
        totalInvoices: invoices.length,
        totalAmount,
        summary: `📄 Text extraction found ${invoices.length} invoice(s)`,
        parsingStats: {
          llmUsed: false,
          totalCost: 0,
          averageConfidence: 0.5,
          strategy: 'text-extraction-fallback',
        },
        qualityMetrics: {
          overallAccuracy: 0.5,
          extractionQuality: 0.6,
          parsingSuccess: invoices.length > 0 ? 1.0 : 0.0,
          dataCompleteness: 0.7,
          corruptionDetected: false,
          issuesFound: [],
          recommendedAction: undefined,
        },
      }

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
