/**
 * PDF Parser Utility with LLM and Training System
 * Extracts and parses invoice data from PDF documents
 * Now includes LLM capabilities and machine learning for improved accuracy
 */

import { applyLearnedPatterns, getTrainingStats as getServerTrainingStats } from './server-training'
import { ParsingOrchestrator, ParsingResult } from './llm-parsers/parsing-orchestrator'
import { prisma } from './prisma'

export interface InvoiceLineItem {
  description: string
  quantity: number | null
  unitPrice: number | null
  total: number
}

export interface ExtractionQuality {
  textClarity: number // 0-1: How clean/readable is extracted text
  structureDetection: number // 0-1: How well structured data was identified
  completeness: number // 0-1: How complete the extraction appears
  corruptionIndicators: string[] // List of corruption patterns detected
  warnings: string[] // Extraction warnings
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
  // Enhanced QA fields
  extractionQuality?: ExtractionQuality
  validationScore?: number // 0-1: Overall validation score
  fieldScores?: {
    invoiceNumber: number
    date: number
    vendorName: number
    amounts: number
  }
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
  // Enhanced QA metrics
  qualityMetrics?: {
    overallAccuracy: number // 0-1: Overall accuracy score
    extractionQuality: number // 0-1: Text extraction quality
    parsingSuccess: number // 0-1: Parsing success rate
    dataCompleteness: number // 0-1: How complete the data is
    corruptionDetected: boolean
    issuesFound: string[] // List of quality issues
    recommendedAction?: string // What to do if quality is low
  }
}

/**
 * Extract text from PDF buffer using pdf-parse with improved error handling
 * Returns page-by-page text with fallback import methods
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string[]> {
  try {
    console.log('PDF buffer size:', pdfBuffer.length, 'bytes')

    // Use pdf-parse with better error handling and safer import
    let pdfParse
    try {
      // Try require first since it's more stable in Node.js
      pdfParse = require('pdf-parse')
      if (typeof pdfParse !== 'function') {
        throw new Error('pdf-parse require is not a function')
      }
    } catch (requireError) {
      console.warn('Require failed, trying dynamic import:', requireError?.message || requireError)
      try {
        // Fallback to dynamic import (for ES modules)
        const pdfParseModule = await import('pdf-parse')
        pdfParse = pdfParseModule.default || pdfParseModule
        
        // Test the import by checking if it's a function
        if (typeof pdfParse !== 'function') {
          throw new Error('pdf-parse import is not a function')
        }
      } catch (importError) {
        console.error('All PDF parsing import methods failed:', importError?.message || importError)
        console.log('PDF parsing will be skipped - returning empty text array')
        return [] // Return empty array as expected by Promise<string[]>
      }
    }

    const pdfData = await pdfParse(pdfBuffer, {
      // Keep text formatting and spacing
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    })

    console.log('PDF loaded successfully, pages:', pdfData.numpages)

    // Split text into pages using common page break indicators
    const fullText = pdfData.text
    const pages = splitTextIntoPages(fullText, pdfData.numpages)

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
 * Split full PDF text into pages using heuristics
 * This approximates the page-by-page extraction from the original working implementation
 */
function splitTextIntoPages(text: string, numPages: number): string[] {
  if (numPages === 1) {
    return [text]
  }

  // Split by common page break patterns
  let pages = text.split(/(?:\n\s*){3,}|\f|\x0C/g) // Form feeds or large gaps

  // If we don't have enough splits, try other patterns
  if (pages.length < numPages) {
    // Split by invoice headers or other common patterns
    pages = text.split(/(?=(?:invoice|tax\s+invoice|statement|bill|receipt)\s*\n)/gi)
  }

  // If still not enough, split by equal length chunks as fallback
  if (pages.length < numPages && text.length > 100) {
    const chunkSize = Math.ceil(text.length / numPages)
    pages = []
    for (let i = 0; i < text.length; i += chunkSize) {
      pages.push(text.substring(i, i + chunkSize))
    }
  }

  // Ensure we have the right number of pages (pad or trim as needed)
  while (pages.length < numPages) {
    pages.push('')
  }
  if (pages.length > numPages) {
    pages = pages.slice(0, numPages)
  }

  // Clean up each page
  return pages.map(page => page.trim())
}

/**
 * Assess the quality of extracted text from PDF
 */
function assessExtractionQuality(extractedText: string): ExtractionQuality {
  const corruptionIndicators: string[] = []
  const warnings: string[] = []

  // Check for known corruption patterns
  const corruptionPatterns = [
    { pattern: /\b[A-Z][a-z]L\b/g, name: 'Character substitution (RmL pattern)' },
    { pattern: /\bEcG\b/g, name: 'Font encoding issues' },
    { pattern: /Unicode \d+ \d+ R/g, name: 'Unicode reference corruption' },
    { pattern: /[^\x20-\x7E\n\r\t]/g, name: 'Non-printable characters' },
    { pattern: /\b[A-Z]{3,}\s+[A-Z]{3,}\s+[A-Z]{3,}/g, name: 'Excessive uppercase sequences' },
    { pattern: /\b\d+\s+\d+\s+obj\b/g, name: 'PDF object references' },
    { pattern: /stream\s*\n[\s\S]*?\nendstream/g, name: 'PDF stream data' },
  ]

  for (const { pattern, name } of corruptionPatterns) {
    const matches = extractedText.match(pattern)
    if (matches && matches.length > 0) {
      corruptionIndicators.push(`${name}: ${matches.length} instances`)
    }
  }

  // Calculate text clarity (0-1 scale)
  const totalChars = extractedText.length
  const readableChars = extractedText.replace(/[^\x20-\x7E\n\r\t]/g, '').length
  const textClarity = totalChars > 0 ? readableChars / totalChars : 0

  // Check for structure indicators
  const structurePatterns = [
    /invoice/i,
    /\$[\d,]+\.?\d*/,
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/,
    /total/i,
    /amount/i,
  ]
  const structureScore =
    structurePatterns.filter(pattern => pattern.test(extractedText)).length /
    structurePatterns.length

  // Assess completeness based on expected content
  const expectedElements = [
    { pattern: /invoice.*number/i, name: 'Invoice number field' },
    { pattern: /date/i, name: 'Date field' },
    { pattern: /\$\d+/g, name: 'Dollar amounts' },
    { pattern: /total/i, name: 'Total field' },
  ]

  let elementsFound = 0
  for (const element of expectedElements) {
    if (element.pattern.test(extractedText)) {
      elementsFound++
    } else {
      warnings.push(`Missing ${element.name}`)
    }
  }
  const completeness = elementsFound / expectedElements.length

  // Quality warnings
  if (textClarity < 0.8) {
    warnings.push(`Low text clarity: ${(textClarity * 100).toFixed(1)}%`)
  }
  if (corruptionIndicators.length > 0) {
    warnings.push(`Text corruption detected: ${corruptionIndicators.length} types`)
  }
  if (extractedText.length < 50) {
    warnings.push('Very short extracted text - possible extraction failure')
  }

  return {
    textClarity,
    structureDetection: structureScore,
    completeness,
    corruptionIndicators,
    warnings,
  }
}

/**
 * Calculate field-specific accuracy scores
 */
function calculateFieldScores(invoice: ParsedInvoice): {
  invoiceNumber: number
  date: number
  vendorName: number
  amounts: number
} {
  return {
    invoiceNumber: invoice.invoiceNumber
      ? /^[A-Z0-9\-_\/]+$/i.test(invoice.invoiceNumber) && invoice.invoiceNumber.length >= 3
        ? 1
        : 0.5
      : 0,
    date: invoice.date ? (!isNaN(new Date(invoice.date).getTime()) ? 1 : 0.3) : 0,
    vendorName: invoice.vendorName
      ? invoice.vendorName !== 'Unknown Supplier' && invoice.vendorName.length > 2
        ? 1
        : 0.3
      : 0,
    amounts:
      invoice.total || invoice.amount ? ((invoice.total || invoice.amount)! > 0 ? 1 : 0.2) : 0,
  }
}

/**
 * Calculate overall validation score for an invoice
 */
function calculateValidationScore(invoice: ParsedInvoice, fieldScores: any): number {
  const weights = {
    invoiceNumber: 0.2,
    date: 0.2,
    vendorName: 0.3,
    amounts: 0.3,
  }

  return (
    fieldScores.invoiceNumber * weights.invoiceNumber +
    fieldScores.date * weights.date +
    fieldScores.vendorName * weights.vendorName +
    fieldScores.amounts * weights.amounts
  )
}

/**
 * Enhance an invoice with quality metrics and validation scores
 */
function enhanceInvoiceWithQuality(invoice: ParsedInvoice, rawText: string): ParsedInvoice {
  const extractionQuality = assessExtractionQuality(rawText)
  const fieldScores = calculateFieldScores(invoice)
  const validationScore = calculateValidationScore(invoice, fieldScores)

  return {
    ...invoice,
    extractionQuality,
    fieldScores,
    validationScore,
    rawText: rawText, // Ensure raw text is included for QA
  }
}

/**
 * Calculate overall quality metrics for multiple invoices
 */
function calculateOverallQualityMetrics(
  invoices: ParsedInvoice[],
  pages: string[]
): {
  overallAccuracy: number
  extractionQuality: number
  parsingSuccess: number
  dataCompleteness: number
  corruptionDetected: boolean
  issuesFound: string[]
  recommendedAction?: string
} {
  if (invoices.length === 0) {
    return {
      overallAccuracy: 0,
      extractionQuality: 0,
      parsingSuccess: 0,
      dataCompleteness: 0,
      corruptionDetected: true,
      issuesFound: ['No invoices parsed successfully'],
      recommendedAction: 'Check PDF quality and try manual processing',
    }
  }

  // Calculate averages
  const avgValidationScore =
    invoices.reduce((sum, inv) => sum + (inv.validationScore || 0), 0) / invoices.length
  const avgExtractionQuality =
    invoices.reduce(
      (sum, inv) =>
        sum +
        ((inv.extractionQuality?.textClarity || 0) +
          (inv.extractionQuality?.structureDetection || 0) +
          (inv.extractionQuality?.completeness || 0)) /
          3,
      0
    ) / invoices.length

  const parsingSuccess = invoices.length / Math.max(pages.length, 1)

  // Check for corruption across all invoices
  const corruptionDetected = invoices.some(
    inv =>
      inv.extractionQuality?.corruptionIndicators &&
      inv.extractionQuality.corruptionIndicators.length > 0
  )

  // Collect all issues
  const issuesFound: string[] = []
  invoices.forEach((inv, i) => {
    if (inv.extractionQuality?.warnings) {
      inv.extractionQuality.warnings.forEach(warning =>
        issuesFound.push(`Page ${i + 1}: ${warning}`)
      )
    }
    if (inv.validationScore && inv.validationScore < 0.5) {
      issuesFound.push(
        `Page ${i + 1}: Low validation score (${(inv.validationScore * 100).toFixed(0)}%)`
      )
    }
  })

  // Data completeness based on expected vs actual fields
  const totalExpectedFields = invoices.length * 4 // invoiceNumber, date, vendor, amount
  const totalFoundFields = invoices.reduce((sum, inv) => {
    let found = 0
    if (inv.invoiceNumber) found++
    if (inv.date) found++
    if (inv.vendorName && inv.vendorName !== 'Unknown Supplier') found++
    if (inv.total || inv.amount) found++
    return sum + found
  }, 0)
  const dataCompleteness = totalFoundFields / totalExpectedFields

  // Recommend actions based on quality
  let recommendedAction: string | undefined
  if (avgValidationScore < 0.3) {
    recommendedAction = 'Quality very low - consider manual processing or different PDF'
  } else if (avgValidationScore < 0.6) {
    recommendedAction = 'Review extracted data carefully before proceeding'
  } else if (corruptionDetected) {
    recommendedAction = 'Text corruption detected - verify critical fields manually'
  }

  return {
    overallAccuracy: avgValidationScore,
    extractionQuality: avgExtractionQuality,
    parsingSuccess,
    dataCompleteness,
    corruptionDetected,
    issuesFound: [...new Set(issuesFound)], // Remove duplicates
    recommendedAction,
  }
}

/**
 * Parse multiple invoices from a multi-page PDF with LLM-first approach
 * NEW: Uses configured LLM directly for maximum accuracy, with text extraction as fallback
 */
export async function parseMultipleInvoices(
  pdfBuffer: Buffer,
  userId?: string,
  saveToDatabase: boolean = false,
  projectId?: string
): Promise<MultiInvoiceResult> {
  try {
    console.log('🚀 Starting LLM-first PDF processing...')

    // NEW: Use LLM-first approach for maximum accuracy
    const { processInvoicePdfWithLLM } = await import('./llm-pdf-processor')
    const result = await processInvoicePdfWithLLM(pdfBuffer, { userId, projectId })

    console.log('✅ LLM-first processing completed')
    console.log('   - Method:', result.parsingStats?.strategy || 'llm-first')
    console.log('   - Invoices found:', result.totalInvoices)
    console.log('   - Accuracy:', (result.qualityMetrics?.overallAccuracy || 0) * 100, '%')

    // Save to database if requested and we have results
    if (saveToDatabase && userId && result.invoices.length > 0) {
      console.log('💾 Saving invoices to database...')
      for (const invoice of result.invoices) {
        await saveInvoiceToDatabase(invoice, userId, projectId)
      }
    }

    return result
  } catch (error) {
    console.error('❌ LLM-first processing failed, falling back to legacy method:', error)

    // FALLBACK: Use legacy text extraction method if LLM processing fails
    return await parseMultipleInvoicesLegacy(pdfBuffer, userId, saveToDatabase, projectId)
  }
}

/**
 * Legacy text extraction method - kept as ultimate fallback
 */
async function parseMultipleInvoicesLegacy(
  pdfBuffer: Buffer,
  userId?: string,
  saveToDatabase: boolean = false,
  projectId?: string
): Promise<MultiInvoiceResult> {
  console.log('📄 Using legacy text extraction method...')

  const pages = await extractTextFromPDF(pdfBuffer)
  const invoices: ParsedInvoice[] = []
  const orchestrator = new ParsingOrchestrator(userId)

  let totalCost = 0
  let llmUsages = 0
  let totalConfidence = 0
  let strategy = 'traditional'

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i]

    if (pageText.trim().length === 0) {
      continue // Skip empty pages
    }

    // Check if this page contains invoice indicators
    if (isInvoicePage(pageText)) {
      try {
        // Try LLM-powered parsing first
        const result = await orchestrator.parseInvoice(pageText, i + 1, {
          expectedFormat: 'construction-invoice',
          projectContext: 'Multi-page PDF processing',
        })

        if (result.success && result.invoice) {
          // Enhance invoice with quality metrics
          const enhancedInvoice = enhanceInvoiceWithQuality(result.invoice, pageText)
          invoices.push(enhancedInvoice)
          totalCost += result.totalCost
          totalConfidence += result.confidence
          if (result.metadata?.llmUsed) llmUsages++
          strategy = result.strategy

          // Save to database immediately if requested
          if (saveToDatabase && userId) {
            await saveInvoiceToDatabase(enhancedInvoice, userId, projectId)
          }
        } else {
          // Fallback to traditional parsing
          const fallbackInvoice = await parseInvoiceFromTextTraditional(pageText, i + 1)
          if (
            fallbackInvoice.invoiceNumber ||
            fallbackInvoice.total ||
            fallbackInvoice.vendorName
          ) {
            // Enhance invoice with quality metrics
            const enhancedInvoice = enhanceInvoiceWithQuality(fallbackInvoice, pageText)
            invoices.push(enhancedInvoice)
            totalConfidence += enhancedInvoice.confidence || 0.5

            // Save to database immediately if requested
            if (saveToDatabase && userId) {
              await saveInvoiceToDatabase(enhancedInvoice, userId, projectId)
            }
          }
        }
      } catch (error) {
        console.warn(`LLM parsing failed for page ${i + 1}, using traditional method:`, error)
        // Fallback to traditional parsing
        const fallbackInvoice = await parseInvoiceFromTextTraditional(pageText, i + 1)
        if (fallbackInvoice.invoiceNumber || fallbackInvoice.total || fallbackInvoice.vendorName) {
          // Enhance invoice with quality metrics
          const enhancedInvoice = enhanceInvoiceWithQuality(fallbackInvoice, pageText)
          invoices.push(enhancedInvoice)
          totalConfidence += enhancedInvoice.confidence || 0.5

          // Save to database immediately if requested
          if (saveToDatabase && userId) {
            await saveInvoiceToDatabase(enhancedInvoice, userId, projectId)
          }
        }
      }
    }
  }

  const totalAmount = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0)
  const averageConfidence = invoices.length > 0 ? totalConfidence / invoices.length : 0
  const qualityMetrics = calculateOverallQualityMetrics(invoices, pages)

  // Enhanced summary with quality information
  let summary = `Found ${invoices.length} invoice(s) across ${pages.length} page(s). Total amount: $${totalAmount.toFixed(2)}`
  if (qualityMetrics.overallAccuracy < 0.7) {
    summary += ` ⚠️ Quality score: ${(qualityMetrics.overallAccuracy * 100).toFixed(0)}%`
  }
  if (qualityMetrics.corruptionDetected) {
    summary += ` 🚨 Text corruption detected`
  }

  return {
    invoices,
    totalInvoices: invoices.length,
    totalAmount,
    summary,
    parsingStats: {
      llmUsed: llmUsages > 0,
      totalCost,
      averageConfidence,
      strategy,
    },
    qualityMetrics,
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

/**
 * Helper function to save a parsed invoice to the database immediately
 */
async function saveInvoiceToDatabase(
  parsedInvoice: ParsedInvoice,
  userId: string,
  projectId?: string
): Promise<void> {
  try {
    // Get user's project if not provided
    let targetProjectId = projectId
    if (!targetProjectId) {
      const userProject = await prisma.project.findFirst({
        where: {
          users: {
            some: { userId },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      targetProjectId = userProject?.id
      console.log(`Auto-selected project: ${userProject?.name} (ID: ${targetProjectId})`)
    }

    // Skip saving if no project found
    if (!targetProjectId) {
      console.log('⚠️ NO PROJECT: Cannot save invoice without a project. Skipping save.')
      return
    }

    const invoiceNumber =
      parsedInvoice.invoiceNumber || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`

    // Check for duplicate invoice to prevent constraint errors
    if (targetProjectId && parsedInvoice.invoiceNumber) {
      const existingInvoice = await prisma.invoice.findUnique({
        where: {
          projectId_invoiceNumber: {
            projectId: targetProjectId,
            invoiceNumber: parsedInvoice.invoiceNumber,
          },
        },
      })

      if (existingInvoice) {
        console.log(
          `🔄 DUPLICATE DETECTED: Invoice ${parsedInvoice.invoiceNumber} already exists for project ${targetProjectId}. Skipping save.`
        )
        return // Skip saving duplicate invoice
      }
    }

    const invoiceData = {
      invoiceNumber,
      supplierName: parsedInvoice.vendorName || 'Unknown Supplier',
      totalAmount: parsedInvoice.total || parsedInvoice.amount || 0,
      gstAmount: parsedInvoice.tax || 0,
      invoiceDate: parsedInvoice.date ? new Date(parsedInvoice.date) : new Date(),
      status: 'PENDING' as const,
      userId,
      projectId: targetProjectId,
      notes: parsedInvoice.description || 'Parsed from PDF',
    }

    const savedInvoice = await prisma.invoice.create({
      data: invoiceData,
    })

    console.log(
      `💾 SAVED: ${savedInvoice.id} - ${invoiceData.supplierName} - $${invoiceData.totalAmount}`
    )
  } catch (saveError) {
    console.error(`💾 FAILED to save invoice:`, saveError)
    console.error(`💾 Invoice data:`, {
      vendor: parsedInvoice.vendorName,
      total: parsedInvoice.total,
      number: parsedInvoice.invoiceNumber,
    })
  }
}
