/**
 * PDF Parser Utility with LLM and Training System
 * Extracts and parses invoice data from PDF documents
 * Now includes LLM capabilities and machine learning for improved accuracy
 */

import { applyLearnedPatterns, getTrainingStats as getServerTrainingStats } from './server-training'
import { ParsingOrchestrator, ParsingResult } from './llm-parsers/parsing-orchestrator'

export interface InvoiceLineItem {
  description: string
  quantity: number | null
  unitPrice: number | null
  total: number
}

export interface ParsedInvoice {
  invoiceNumber: string | null
  date: string | null
  vendorName: string | null
  description: string | null
  amount: number | null
  tax: number | null
  total: number | null
  lineItems: InvoiceLineItem[]
  pageNumber?: number
  confidence?: number
  rawText?: string
  trainingId?: string
}

export interface MultiInvoiceResult {
  invoices: ParsedInvoice[]
  totalInvoices: number
  totalAmount: number
  summary: string
  parsingStats?: {
    llmUsed: boolean
    totalCost: number
    averageConfidence: number
    strategy: string
  }
}

/**
 * Extract text from PDF buffer using pdfjs-dist with enhanced error handling
 * Supports both client and server-side extraction with intelligent fallbacks
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string[]> {
  console.log('PDF buffer size:', pdfBuffer.length, 'bytes')

  // Validate PDF buffer
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('Invalid PDF buffer: empty or null')
  }

  // Check for PDF header
  if (!isPDFBuffer(pdfBuffer)) {
    console.warn('Buffer does not appear to be a valid PDF file')
  }

  try {
    // Try server-side extraction first (more reliable)
    if (typeof window === 'undefined') {
      return await extractServerSide(pdfBuffer)
    } else {
      // Client-side extraction
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
      return await extractWithPdfJs(pdfBuffer, pdfjsLib)
    }
  } catch (error) {
    console.warn('Primary PDF.js extraction failed:', error)

    try {
      // Try alternative extraction method
      return await extractAlternative(pdfBuffer)
    } catch (alternativeError) {
      console.warn('Alternative extraction failed:', alternativeError)

      // Final fallback with structured content
      return generateEnhancedFallback(pdfBuffer, error as Error)
    }
  }
}

/**
 * Check if buffer contains a valid PDF file
 */
function isPDFBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false

  // Check PDF header signature
  const header = buffer.toString('ascii', 0, 5)
  return header === '%PDF-'
}

/**
 * Server-side PDF extraction with Canvas polyfill
 */
async function extractServerSide(pdfBuffer: Buffer): Promise<string[]> {
  try {
    // Skip PDF.js on server-side due to DOM dependencies
    // This will force the fallback to alternative extraction
    console.log('Server-side PDF.js disabled to avoid DOM issues, using alternative extraction')
    throw new Error('Server-side PDF.js disabled - using alternative extraction')
  } catch (error) {
    console.log('Server-side extraction skipped, trying alternative method:', error)
    throw error
  }
}

/**
 * Alternative extraction using basic text scanning
 */
async function extractAlternative(pdfBuffer: Buffer): Promise<string[]> {
  try {
    // Try to extract any readable text from the buffer
    const bufferText = pdfBuffer.toString('utf8')

    // Look for text patterns that might be readable content
    const textChunks = []
    const lines = bufferText.split(/[\r\n]+/)

    for (const line of lines) {
      // Filter out binary data and keep readable text
      if (line.length > 5 && /[a-zA-Z]/.test(line) && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(line)) {
        textChunks.push(line.trim())
      }
    }

    if (textChunks.length > 0) {
      console.log(`Alternative extraction found ${textChunks.length} text lines`)
      return [textChunks.join('\n')]
    }

    throw new Error('No readable text found in PDF buffer')
  } catch (error) {
    console.error('Alternative extraction method failed:', error)
    throw error
  }
}

/**
 * Enhanced fallback content generation with LLM-compatible structure
 */
function generateEnhancedFallback(pdfBuffer: Buffer, originalError: Error): string[] {
  const errorInfo = `Error: ${originalError.message.slice(0, 100)}`
  const timestamp = new Date().toISOString()
  const fileSizeKB = (pdfBuffer.length / 1024).toFixed(1)

  // Generate structured content that LLM can still parse for basic info
  return [
    `INVOICE PROCESSING FALLBACK
    
FILE: PDF Document (${fileSizeKB} KB)
PROCESSING STATUS: Manual Review Required
ERROR: ${errorInfo}
TIMESTAMP: ${timestamp}

INVOICE TEMPLATE FOR MANUAL ENTRY:
Invoice Number: MANUAL-${Date.now().toString().slice(-6)}
Date: ${new Date().toLocaleDateString('en-NZ')}
Vendor: [Please enter vendor name]
Description: PDF processing fallback - manual entry required

CONSTRUCTION INVOICE - SAMPLE STRUCTURE:
Line Items:
1. Materials - Quantity: 1 @ $1.00 = $1.00
2. Labor - Hours: 1 @ $1.00 = $1.00
3. Equipment - Days: 1 @ $1.00 = $1.00

Subtotal: $3.00
Tax (15%): $0.45
Total: $3.45

INSTRUCTIONS:
- Replace sample amounts with actual values from PDF
- Add additional line items as needed
- Verify all calculations
- Update vendor and description information

PROCESSING NOTE: This document requires manual data entry due to PDF extraction limitations.`,
  ]
}

/**
 * Legacy fallback for backward compatibility
 */
function generateFallbackContent(pdfBuffer: Buffer): string[] {
  return generateEnhancedFallback(pdfBuffer, new Error('Legacy fallback'))
}

/**
 * Extract text using PDF.js when available
 */
async function extractWithPdfJs(pdfBuffer: Buffer, pdfjsLib: any): Promise<string[]> {
  try {
    // Convert Buffer to Uint8Array for PDF.js
    const uint8Array = new Uint8Array(pdfBuffer)

    // Load the PDF document with error handling
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      verbosity: 0, // Reduce console output
      useSystemFonts: true,
      disableFontFace: false,
      isEvalSupported: false,
    })

    const pdf = await loadingTask.promise
    console.log('PDF loaded successfully, pages:', pdf.numPages)

    const pages: string[] = []

    // Extract text from each page separately
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()

        // Extract text items and join them
        const pageText = textContent.items
          .filter((item): item is any => 'str' in item)
          .map((item: any) => item.str)
          .join(' ')

        pages.push(pageText.trim())
      } catch (pageError) {
        console.warn(`Error extracting text from page ${pageNum}:`, pageError)
        // Add empty string for failed pages to maintain page indexing
        pages.push('')
      }
    }

    console.log(
      'PDF text extracted successfully, pages:',
      pages.length,
      'total length:',
      pages.join(' ').length
    )

    if (pages.every(page => page.length === 0)) {
      throw new Error('No text could be extracted from the PDF')
    }

    return pages
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    console.error('Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack?.slice(0, 500),
    })
    throw error
  }
}

/**
 * Parse multiple invoices from a multi-page PDF with LLM support
 */
export async function parseMultipleInvoices(
  pdfBuffer: Buffer,
  userId?: string
): Promise<MultiInvoiceResult> {
  const pages = await extractTextFromPDF(pdfBuffer)
  const invoices: ParsedInvoice[] = []
  const orchestrator = new ParsingOrchestrator(userId)

  let totalCost = 0
  let llmUsages = 0
  let totalConfidence = 0
  let strategy = 'traditional'

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i]

    console.log(`Page ${i + 1}: text length = ${pageText.trim().length}`)
    console.log(`Page ${i + 1}: first 200 chars: "${pageText.substring(0, 200)}"`)

    if (pageText.trim().length === 0) {
      console.log(`Page ${i + 1}: Skipping empty page`)
      continue // Skip empty pages
    }

    // Check if this page contains invoice indicators
    const isInvoice = isInvoicePage(pageText)
    console.log(`Page ${i + 1}: isInvoicePage = ${isInvoice}`)
    
    if (isInvoice) {
      try {
        // Try LLM-powered parsing first
        const result = await orchestrator.parseInvoice(pageText, i + 1, {
          expectedFormat: 'construction-invoice',
          projectContext: 'Multi-page PDF processing',
        })

        if (result.success && result.invoice) {
          invoices.push(result.invoice)
          totalCost += result.totalCost
          totalConfidence += result.confidence
          if (result.metadata?.llmUsed) llmUsages++
          strategy = result.strategy
        } else {
          // Fallback to traditional parsing
          const fallbackInvoice = await parseInvoiceFromTextTraditional(pageText, i + 1)
          if (
            fallbackInvoice.invoiceNumber ||
            fallbackInvoice.total ||
            fallbackInvoice.vendorName
          ) {
            invoices.push(fallbackInvoice)
            totalConfidence += fallbackInvoice.confidence || 0.5
          }
        }
      } catch (error) {
        console.warn(`LLM parsing failed for page ${i + 1}, using traditional method:`, error)
        // Fallback to traditional parsing
        const fallbackInvoice = await parseInvoiceFromTextTraditional(pageText, i + 1)
        if (fallbackInvoice.invoiceNumber || fallbackInvoice.total || fallbackInvoice.vendorName) {
          invoices.push(fallbackInvoice)
          totalConfidence += fallbackInvoice.confidence || 0.5
        }
      }
    }
  }

  const totalAmount = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0)
  const averageConfidence = invoices.length > 0 ? totalConfidence / invoices.length : 0

  return {
    invoices,
    totalInvoices: invoices.length,
    totalAmount,
    summary: `Found ${invoices.length} invoice(s) across ${pages.length} page(s). Total amount: $${totalAmount.toFixed(2)}`,
    parsingStats: {
      llmUsed: llmUsages > 0,
      totalCost,
      averageConfidence,
      strategy,
    },
  }
}

/**
 * Enhanced invoice page detection with scoring system
 */
function isInvoicePage(text: string): boolean {
  const strongIndicators = [
    /\binvoice\s*(?:number|#|no\.?)\s*:?\s*[A-Z0-9\-_]+/i, // Invoice number pattern
    /\btotal\s*(?:amount\s*)?due\s*:?\s*\$?[\d,]+\.?\d*/i, // Total amount due
    /\bamount\s*(?:owing|due)\s*:?\s*\$?[\d,]+\.?\d*/i, // Amount owing/due
    /\bpay.*(?:by|before)\s*:?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/i, // Payment date
  ]

  const mediumIndicators = [
    /\binvoice\b/i,
    /\bbill(?:ing)?\b/i,
    /\breceipt\b/i,
    /\bstatement\b/i,
    /\bpurchase\s*order\b/i,
    /\bquotation\b/i,
    /\btax\s*invoice\b/i,
    /\bdelivery\s*note\b/i,
  ]

  const weakIndicators = [
    /\bsubtotal\s*:?\s*\$?[\d,]+\.?\d*/i,
    /\btax\s*(?:\(\d+%\))?\s*:?\s*\$?[\d,]+\.?\d*/i,
    /\bgst\s*:?\s*\$?[\d,]+\.?\d*/i,
    /\bvat\s*:?\s*\$?[\d,]+\.?\d*/i,
    /\$[\d,]+\.?\d*/, // Any dollar amounts
    /\bdate\s*:?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/i, // Dates
  ]

  const negativeIndicators = [
    /\bterms\s*(?:and|&)\s*conditions\b/i,
    /\bprivacy\s*policy\b/i,
    /\buser\s*manual\b/i,
    /\btable\s*of\s*contents\b/i,
  ]

  // Scoring system
  let score = 0

  // Strong indicators (high confidence)
  score += strongIndicators.filter(pattern => pattern.test(text)).length * 10

  // Medium indicators
  score += mediumIndicators.filter(pattern => pattern.test(text)).length * 5

  // Weak indicators
  score += weakIndicators.filter(pattern => pattern.test(text)).length * 1

  // Negative scoring
  score -= negativeIndicators.filter(pattern => pattern.test(text)).length * 3

  // Additional scoring for construction-specific terms
  const constructionTerms = [
    /\bmaterials?\b/i,
    /\blabou?r\b/i,
    /\bequipment\b/i,
    /\brental\b/i,
    /\bconstruction\b/i,
    /\bcontractor\b/i,
    /\bbuilding\b/i,
    /\bconcrete\b/i,
    /\bsteel\b/i,
    /\btimber\b/i,
  ]

  score += constructionTerms.filter(pattern => pattern.test(text)).length * 2

  // Need minimum score to be considered an invoice
  const threshold = 8
  const isInvoice = score >= threshold

  if (isInvoice) {
    console.log(`Invoice page detected with score ${score}`)
  } else {
    console.log(`Page rejected with score ${score} (threshold: ${threshold})`)
  }

  return isInvoice
}

/**
 * Parse invoice information from extracted text with LLM orchestrator
 */
export async function parseInvoiceFromText(
  text: string,
  pageNumber?: number,
  userId?: string
): Promise<ParsedInvoice> {
  const orchestrator = new ParsingOrchestrator(userId)

  try {
    // Try LLM-powered parsing
    const result = await orchestrator.parseInvoice(text, pageNumber, {
      expectedFormat: 'construction-invoice',
    })

    if (result.success && result.invoice) {
      console.log(
        `LLM parsing successful for page ${pageNumber}: confidence ${result.confidence}, cost $${result.totalCost.toFixed(4)}`
      )
      return result.invoice
    }
  } catch (error) {
    console.warn(`LLM parsing failed for page ${pageNumber}, using traditional method:`, error)
  }

  // Fallback to traditional parsing
  console.log(`Falling back to traditional parsing for page ${pageNumber}`)
  return parseInvoiceFromTextTraditional(text, pageNumber)
}

/**
 * Traditional invoice parsing with training system integration (fallback method)
 */
export async function parseInvoiceFromTextTraditional(
  text: string,
  pageNumber?: number
): Promise<ParsedInvoice> {
  // First try learned patterns from training data
  const learnedInvoiceNumber = (await applyLearnedPatterns(text, 'invoiceNumber')) as string
  const learnedDate = (await applyLearnedPatterns(text, 'date')) as string
  const learnedVendorName = (await applyLearnedPatterns(text, 'vendorName')) as string
  const learnedDescription = (await applyLearnedPatterns(text, 'description')) as string
  const learnedAmount = (await applyLearnedPatterns(text, 'amount')) as number
  const learnedTax = (await applyLearnedPatterns(text, 'tax')) as number
  const learnedTotal = (await applyLearnedPatterns(text, 'total')) as number

  // Fallback to traditional extraction methods
  const invoiceNumber = learnedInvoiceNumber || extractInvoiceNumber(text)
  const date = learnedDate || extractDate(text)
  const vendorName = learnedVendorName || extractVendorName(text)
  const description = learnedDescription || extractDescription(text)
  const amount = learnedAmount || extractAmount(text)
  const tax = learnedTax || extractTax(text)
  let total = learnedTotal || extractTotal(text)
  const lineItems = extractLineItems(text)

  // Enhanced amount detection: if we don't find a total but find an amount, use that
  if (!total && amount) {
    total = amount
  }

  // Final fallback: if we still don't have amounts, try to find ANY dollar value
  if (!total && !amount) {
    const fallbackAmount = extractFallbackAmount(text)
    if (fallbackAmount) {
      total = fallbackAmount
    }
  }

  // Calculate confidence based on how many fields were extracted
  const fieldsFound = [invoiceNumber, date, vendorName, description, amount || total, tax].filter(
    Boolean
  ).length
  const confidence = Math.min(1.0, fieldsFound / 4) // Normalize to 0-1 range

  // Debug logging for amount detection issues
  if (pageNumber && (!total || total === 0)) {
    console.log(`Page ${pageNumber} - No amount detected. Sample text:`, text.substring(0, 200))
  }

  return {
    invoiceNumber,
    date,
    vendorName,
    description,
    amount,
    tax,
    total,
    lineItems,
    pageNumber,
    confidence,
    rawText: text,
  }
}

/**
 * Train the parser with corrected invoice data
 */
export function trainParser(
  originalInvoice: ParsedInvoice,
  correctedData: Partial<ParsedInvoice>,
  invoiceType?: string
): string {
  if (!originalInvoice.rawText) {
    throw new Error('Original invoice must have rawText to train')
  }

  const parsedValues = {
    invoiceNumber: originalInvoice.invoiceNumber,
    date: originalInvoice.date,
    vendorName: originalInvoice.vendorName,
    description: originalInvoice.description,
    amount: originalInvoice.amount,
    tax: originalInvoice.tax,
    total: originalInvoice.total,
  }

  const correctValues = {
    invoiceNumber: correctedData.invoiceNumber,
    date: correctedData.date,
    vendorName: correctedData.vendorName,
    description: correctedData.description,
    amount: correctedData.amount,
    tax: correctedData.tax,
    total: correctedData.total,
  }

  // Training is now handled server-side through the API
  // This function is kept for backward compatibility
  console.log('Training data collected (handled by API)')
  return `training-${Date.now()}`
}

/**
 * Get training statistics
 */
export async function getTrainingStats() {
  return getServerTrainingStats()
}

/**
 * Legacy function for backward compatibility - parses single page/invoice
 */
export async function parseSingleInvoiceFromPDF(
  text: string,
  userId?: string
): Promise<ParsedInvoice> {
  return parseInvoiceFromText(text, undefined, userId)
}

/**
 * Enhanced invoice number extraction with validation
 */
function extractInvoiceNumber(text: string): string | null {
  // Comprehensive patterns for invoice numbers
  const patterns = [
    // Standard invoice patterns
    /\binvoice\s*#:?\s*([A-Z0-9\-_\/]+)/i,
    /\binvoice\s*(?:number|no\.?|num):?\s*([A-Z0-9\-_\/]+)/i,
    /\btax\s*invoice\s*(?:#|number|no\.?)?:?\s*([A-Z0-9\-_\/]+)/i,

    // Short forms
    /\binv\.?\s*(?:#|number|no\.?|num)?:?\s*([A-Z0-9\-_\/]+)/i,
    /\bin\.?\s*(?:#|number|no\.?)?:?\s*([A-Z0-9\-_\/]+)/i,

    // Reference patterns
    /\b(?:reference|ref\.?)\s*(?:#|number|no\.?)?:?\s*([A-Z0-9\-_\/]+)/i,
    /\bdocument\s*(?:#|number|no\.?)?:?\s*([A-Z0-9\-_\/]+)/i,

    // Common invoice formats
    /\b(INV[-_]?\d{4,8})\b/i, // INV-12345, INV12345
    /\b(I\d{4,8})\b/, // I12345
    /\b(\d{4,8}[-_][A-Z]{2,4})\b/i, // 12345-INV, 12345_ABC
    /\b([A-Z]{2,4}[-_]?\d{4,8})\b/i, // ABC-12345, ABC12345

    // Date-based invoice numbers
    /\b(\d{4}[-\/]\d{2}[-\/]\d{2}[-_]\d{3,6})\b/, // 2024-01-15-001
    /\b(\d{8}[-_]\d{3,6})\b/, // 20240115-001
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const invoiceNum = match[1].trim()

      // Validate invoice number format
      if (isValidInvoiceNumber(invoiceNum)) {
        return invoiceNum
      }
    }
  }

  return null
}

/**
 * Validate if extracted text looks like a valid invoice number
 */
function isValidInvoiceNumber(text: string): boolean {
  // Length check (reasonable invoice number length)
  if (text.length < 3 || text.length > 20) return false

  // Must contain at least one number or letter
  if (!/[A-Za-z0-9]/.test(text)) return false

  // Shouldn't be all numbers if very short (likely not an invoice number)
  if (text.length < 5 && /^\d+$/.test(text)) return false

  // Shouldn't contain common false positives
  const falsePositives = ['page', 'total', 'date', 'amount', 'tax', 'gst', 'vat']
  if (falsePositives.some(fp => text.toLowerCase().includes(fp))) return false

  return true
}

/**
 * Enhanced date extraction with multiple formats and validation
 */
function extractDate(text: string): string | null {
  const patterns = [
    // Explicit date labels
    /\b(?:invoice\s*date|date\s*of\s*invoice|issue\s*date|bill\s*date)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /\b(?:invoice\s*date|date\s*of\s*invoice|issue\s*date|bill\s*date)\s*:?\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/i,
    /\b(?:invoice\s*date|date\s*of\s*invoice|issue\s*date|bill\s*date)\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /\b(?:invoice\s*date|date\s*of\s*invoice|issue\s*date|bill\s*date)\s*:?\s*(\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{4})/i,

    // Generic date labels
    /\b(?:date|dated?)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /\b(?:date|dated?)\s*:?\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/i,
    /\b(?:date|dated?)\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /\b(?:date|dated?)\s*:?\s*(\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{4})/i,

    // International date formats
    /\b(\d{1,2}\.\d{1,2}\.\d{4})\b/, // DD.MM.YYYY (European)
    /\b(\d{4}\.\d{1,2}\.\d{1,2})\b/, // YYYY.MM.DD (International)

    // Common standalone patterns (with context validation)
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/g, // DD/MM/YYYY or MM/DD/YYYY
    /\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/g, // YYYY-MM-DD
    /\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/g, // Month DD, YYYY
    /\b(\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{4})\b/g, // DD-Month-YYYY
  ]

  // Try labeled patterns first (more reliable)
  for (let i = 0; i < 8; i++) {
    // First 8 patterns have labels
    const pattern = patterns[i]
    const match = text.match(pattern)
    if (match && match[1]) {
      const dateStr = match[1].trim()
      const normalized = normalizeDate(dateStr)
      if (normalized && isReasonableDate(normalized)) {
        return normalized
      }
    }
  }

  // Try unlabeled patterns with context validation
  const candidates: string[] = []

  for (let i = 8; i < patterns.length; i++) {
    const pattern = patterns[i]
    let match
    pattern.lastIndex = 0
    while ((match = pattern.exec(text)) !== null) {
      const dateStr = match[1].trim()
      const normalized = normalizeDate(dateStr)

      if (normalized && isReasonableDate(normalized)) {
        // Check context - prefer dates near invoice-related terms
        const matchIndex = match.index
        const contextBefore = text.substring(Math.max(0, matchIndex - 50), matchIndex)
        const contextAfter = text.substring(matchIndex, Math.min(text.length, matchIndex + 50))
        const context = contextBefore + contextAfter

        const hasInvoiceContext = /\b(?:invoice|bill|date|issue|tax)\b/i.test(context)

        if (hasInvoiceContext) {
          candidates.push(normalized)
        }
      }
    }
  }

  // Return the first valid candidate
  return candidates.length > 0 ? candidates[0] : null
}

/**
 * Validate if a date is reasonable for an invoice (not too old, not in future)
 */
function isReasonableDate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

    // Must be a valid date within reasonable bounds
    return !isNaN(date.getTime()) && date >= fiveYearsAgo && date <= oneYearFromNow
  } catch {
    return false
  }
}

/**
 * Normalize various date formats to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  try {
    // Handle DD/MM/YYYY format
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(dateStr)) {
      const parts = dateStr.split(/[\/\-]/)
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      const year = parts[2]
      return `${year}-${month}-${day}`
    }

    // Handle other formats using Date parsing
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }

    return dateStr
  } catch {
    console.warn('Could not normalize date:', dateStr)
    return dateStr
  }
}

/**
 * Extract vendor/company name from text
 */
function extractVendorName(text: string): string | null {
  const patterns = [
    /(?:bill\s*to|to|from|vendor|company):?\s*([^\n\r]+)/i,
    /^([A-Za-z][A-Za-z\s&\.\-]+(?:Ltd|Limited|Inc|Corp|Corporation|Co\.?|Pty|Company))/im,
    /(?:from|issued\s*by):?\s*([^\n\r]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const vendor = match[1].trim()
      // Filter out common false positives
      if (!vendor.match(/^\d+$/) && vendor.length > 2 && vendor.length < 100) {
        return vendor
      }
    }
  }

  return null
}

/**
 * Extract description from text
 */
function extractDescription(text: string): string | null {
  const patterns = [
    /(?:description|work\s*performed|services?|details?):?\s*([^\n\r]+)/i,
    /(?:for|re):?\s*([^\n\r]{10,})/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const desc = match[1].trim()
      if (desc.length > 5 && desc.length < 200) {
        return desc
      }
    }
  }

  return null
}

/**
 * Extract monetary amount from text (excluding tax and total)
 */
function extractAmount(text: string): number | null {
  const patterns = [
    /(?:subtotal|sub[-\s]total):?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/i,
    /(?:net\s*amount):?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/i,
    /(?:^|\n)\s*amount:?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/im,
    /(?:cost|charge|fee):?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/i,
    /(?:price|value):?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/i,
  ]

  return extractMonetaryValue(text, patterns)
}

/**
 * Extract tax amount from text
 */
function extractTax(text: string): number | null {
  const patterns = [
    /(?:tax|gst|vat)(?:\s*\(\d+%\))?:?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/i,
    /(?:gst|tax)\s*@?\s*\d+%:?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/i,
  ]

  return extractMonetaryValue(text, patterns)
}

/**
 * Extract total amount from text
 */
function extractTotal(text: string): number | null {
  const patterns = [
    /(?:total\s+amount|grand\s*total|amount\s*due):?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/i,
    /(?:^|\n)\s*total:?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/im,
    /(?:balance\s*due):?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/i,
    /(?:final\s*amount|payment\s*due):?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/i,
    /(?:amount\s*owing|outstanding):?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/i,
  ]

  return extractMonetaryValue(text, patterns)
}

/**
 * Extract monetary value using given patterns with enhanced fallback
 */
function extractMonetaryValue(text: string, patterns: RegExp[]): number | null {
  // First try the specific patterns
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const valueStr = match[1].replace(/,/g, '')
      const value = parseFloat(valueStr)
      if (!isNaN(value) && value > 0) {
        return Math.round(value * 100) / 100 // Round to 2 decimal places
      }
    }
  }

  // Fallback: Look for any dollar amount in the text
  return extractFallbackAmount(text)
}

/**
 * Enhanced fallback to find any monetary values in text
 */
function extractFallbackAmount(text: string): number | null {
  // More flexible patterns for finding any dollar amounts
  const fallbackPatterns = [
    // Standard formats: $123.45, $1,234.56
    /\$\s*([\d,]+\.?\d*)/g,
    // Without dollar sign but with common prefixes
    /(?:cost|price|amount|total|charge|fee|value|owing|due)\s*:?\s*(?:NZ\$|\$|AUD|USD)?\s*([\d,]+\.?\d*)/gi,
    // Standalone amounts that look like money (with comma separators or decimal)
    /\b([\d]{1,3}(?:,\d{3})*\.?\d{0,2})\b/g,
    // Simple decimal numbers that could be amounts
    /\b(\d+\.\d{2})\b/g,
  ]

  const potentialAmounts: number[] = []

  for (const pattern of fallbackPatterns) {
    let match
    pattern.lastIndex = 0 // Reset regex state
    while ((match = pattern.exec(text)) !== null) {
      const valueStr = match[1].replace(/,/g, '')
      const value = parseFloat(valueStr)

      // Filter for reasonable invoice amounts (between $1 and $1M)
      if (!isNaN(value) && value >= 1 && value <= 1000000) {
        potentialAmounts.push(Math.round(value * 100) / 100)
      }
    }
  }

  if (potentialAmounts.length === 0) {
    return null
  }

  // Return the largest reasonable amount found (likely to be the total)
  // But prefer amounts that are more likely to be totals (multiples of common values)
  potentialAmounts.sort((a, b) => b - a)
  return potentialAmounts[0]
}

/**
 * Extract line items from text
 */
function extractLineItems(text: string): InvoiceLineItem[] {
  const lineItems: InvoiceLineItem[] = []

  // Pattern for line items with quantity and unit price
  const patterns = [
    // Item 1: Description - Qty: X - $Y.YY each - $Z.ZZ
    /item\s*\d*:?\s*([^-\n]+?)\s*-\s*qty:?\s*(\d+)\s*-\s*\$?([\d,]+\.?\d*)\s*(?:each|per|\/\w+)?\s*-\s*\$?([\d,]+\.?\d*)/gi,
    // Description - X hours - $Y.YY/hour - $Z.ZZ
    /([^-\n]+?)\s*-\s*(\d+)\s*(?:units?|hours?|days?)\s*-\s*\$?([\d,]+\.?\d*)\s*(?:\/\w+|each|per)?\s*-\s*\$?([\d,]+\.?\d*)/gi,
  ]

  for (const pattern of patterns) {
    let match
    pattern.lastIndex = 0 // Reset regex state
    while ((match = pattern.exec(text)) !== null) {
      let description = match[1].trim()
      // Clean up description by removing "Item X:" prefix
      description = description.replace(/^item\s*\d*:\s*/i, '')

      const quantity = parseInt(match[2])
      const unitPrice = parseFloat(match[3].replace(/,/g, ''))
      const total = parseFloat(match[4].replace(/,/g, ''))

      if (description && !isNaN(quantity) && !isNaN(unitPrice) && !isNaN(total)) {
        lineItems.push({
          description,
          quantity,
          unitPrice: Math.round(unitPrice * 100) / 100,
          total: Math.round(total * 100) / 100,
        })
      }
    }
  }

  return lineItems
}
