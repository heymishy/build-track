/**
 * PDF Parser Utility with Training System
 * Extracts and parses invoice data from PDF documents
 * Now includes machine learning capabilities for improved accuracy
 */

import { trainingManager } from './invoice-training'

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
}

/**
 * Extract text from PDF buffer using pdfjs-dist, returning page-by-page text
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string[]> {
  try {
    console.log('PDF buffer size:', pdfBuffer.length, 'bytes')

    // Dynamic import of pdfjs-dist legacy build for server-side usage
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

    // Set worker source for Node.js environment
    if (typeof window === 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs'
    }

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
 * Parse multiple invoices from a multi-page PDF
 */
export async function parseMultipleInvoices(pdfBuffer: Buffer): Promise<MultiInvoiceResult> {
  const pages = await extractTextFromPDF(pdfBuffer)
  const invoices: ParsedInvoice[] = []

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i]

    if (pageText.trim().length === 0) {
      continue // Skip empty pages
    }

    // Check if this page contains invoice indicators
    if (isInvoicePage(pageText)) {
      const invoice = parseInvoiceFromText(pageText, i + 1)
      if (invoice.invoiceNumber || invoice.total || invoice.vendorName) {
        invoices.push(invoice)
      }
    }
  }

  const totalAmount = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0)

  return {
    invoices,
    totalInvoices: invoices.length,
    totalAmount,
    summary: `Found ${invoices.length} invoice(s) across ${pages.length} page(s). Total amount: $${totalAmount.toFixed(2)}`,
  }
}

/**
 * Check if a page contains invoice content
 */
function isInvoicePage(text: string): boolean {
  const invoiceIndicators = [
    /invoice/i,
    /bill/i,
    /receipt/i,
    /statement/i,
    /total\s*(?:amount|due)/i,
    /amount\s*due/i,
    /pay.*(?:by|before)/i,
    /invoice\s*(?:number|#|no)/i,
    /\$[\d,]+\.?\d*/, // Dollar amounts
  ]

  return invoiceIndicators.some(pattern => pattern.test(text))
}

/**
 * Parse invoice information from extracted text with training system integration
 */
export function parseInvoiceFromText(text: string, pageNumber?: number): ParsedInvoice {
  // First try learned patterns from training data
  const learnedInvoiceNumber = trainingManager.applyLearnedPatterns(text, 'invoiceNumber') as string
  const learnedDate = trainingManager.applyLearnedPatterns(text, 'date') as string
  const learnedVendorName = trainingManager.applyLearnedPatterns(text, 'vendorName') as string
  const learnedDescription = trainingManager.applyLearnedPatterns(text, 'description') as string
  const learnedAmount = trainingManager.applyLearnedPatterns(text, 'amount') as number
  const learnedTax = trainingManager.applyLearnedPatterns(text, 'tax') as number
  const learnedTotal = trainingManager.applyLearnedPatterns(text, 'total') as number

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

  return trainingManager.addTrainingExample(
    originalInvoice.rawText,
    parsedValues,
    correctValues,
    invoiceType
  )
}

/**
 * Get training statistics
 */
export function getTrainingStats() {
  return trainingManager.getTrainingStats()
}

/**
 * Legacy function for backward compatibility - parses single page/invoice
 */
export function parseSingleInvoiceFromPDF(text: string): ParsedInvoice {
  return parseInvoiceFromText(text)
}

/**
 * Extract invoice number from text
 */
function extractInvoiceNumber(text: string): string | null {
  // Common patterns for invoice numbers
  const patterns = [
    /invoice\s*#:?\s*([A-Z0-9\-_]+)/i,
    /invoice\s*(?:number|no\.?):?\s*([A-Z0-9\-_]+)/i,
    /inv\.?\s*(?:#|number|no\.?)?:?\s*([A-Z0-9\-_]+)/i,
    /(?:reference|ref)\s*(?:#|number|no\.?)?:?\s*([A-Z0-9\-_]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * Extract date from text
 */
function extractDate(text: string): string | null {
  const patterns = [
    // YYYY-MM-DD format
    /(?:date|invoice\s*date|dated?):?\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/i,
    // DD/MM/YYYY format
    /(?:date|invoice\s*date|dated?):?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    // Jan 15, 2024 format
    /(?:date|invoice\s*date|dated?):?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    // 15-Jan-2024 format
    /(?:date|invoice\s*date|dated?):?\s*(\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{4})/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const dateStr = match[1].trim()
      return normalizeDate(dateStr)
    }
  }

  return null
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
