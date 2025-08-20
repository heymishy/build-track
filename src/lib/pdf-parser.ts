/**
 * PDF Parser Utility
 * Extracts and parses invoice data from PDF documents
 */

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
}

/**
 * Extract text from PDF buffer using pdfjs-dist
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log('PDF buffer size:', pdfBuffer.length, 'bytes')

    // Dynamic import of pdfjs-dist for server-side usage
    const pdfjsLib = await import('pdfjs-dist')
    
    // Configure for Node.js environment
    if (typeof window === 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
    }

    // Convert Buffer to Uint8Array for PDF.js
    const uint8Array = new Uint8Array(pdfBuffer)
    
    // Load the PDF document with error handling
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      verbosity: 0, // Reduce console output
      standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/web/standard_fonts/`,
    })
    
    const pdf = await loadingTask.promise
    console.log('PDF loaded successfully, pages:', pdf.numPages)
    
    let fullText = ''
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Extract text items and join them
        const pageText = textContent.items
          .filter((item): item is any => 'str' in item)
          .map((item: any) => item.str)
          .join(' ')
        
        fullText += pageText + '\n'
      } catch (pageError) {
        console.warn(`Error extracting text from page ${pageNum}:`, pageError)
        // Continue with other pages even if one fails
      }
    }
    
    console.log('PDF text extracted successfully, total length:', fullText.length)
    
    if (fullText.length === 0) {
      throw new Error('No text could be extracted from the PDF')
    }
    
    return fullText.trim()
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
 * Parse invoice information from extracted text
 */
export function parseInvoiceFromText(text: string): ParsedInvoice {
  return {
    invoiceNumber: extractInvoiceNumber(text),
    date: extractDate(text),
    vendorName: extractVendorName(text),
    description: extractDescription(text),
    amount: extractAmount(text),
    tax: extractTax(text),
    total: extractTotal(text),
    lineItems: extractLineItems(text),
  }
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
  ]

  return extractMonetaryValue(text, patterns)
}

/**
 * Extract monetary value using given patterns
 */
function extractMonetaryValue(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const valueStr = match[1].replace(/,/g, '')
      const value = parseFloat(valueStr)
      if (!isNaN(value)) {
        return Math.round(value * 100) / 100 // Round to 2 decimal places
      }
    }
  }

  return null
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