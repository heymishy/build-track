/**
 * LLM-based Estimate Parser
 * Adapts the invoice parsing system for construction estimate data
 */

import { EstimateLineItem, EstimateTrade, ParsedEstimate } from '@/lib/estimate-parser'
import { ParsingOrchestrator } from './parsing-orchestrator'
import { LLMParseRequest } from './base-llm-parser'

export interface EstimateParseRequest {
  text: string
  filename: string
  pageNumber?: number
  context?: {
    projectName?: string
    expectedFormat?: 'nz-estimate' | 'au-estimate' | 'construction-estimate' | 'generic'
    currency?: string
    estimateType?: 'detailed' | 'summary' | 'quote'
  }
  options?: {
    temperature?: number
    maxTokens?: number
    includeConfidence?: boolean
    structured?: boolean
  }
}

export interface EstimatePDFParseRequest {
  pdfBuffer: Buffer
  filename: string
  context?: {
    projectName?: string
    expectedFormat?: 'nz-estimate' | 'au-estimate' | 'construction-estimate' | 'generic'
    currency?: string
    estimateType?: 'detailed' | 'summary' | 'quote'
  }
  options?: {
    temperature?: number
    maxTokens?: number
    includeConfidence?: boolean
    structured?: boolean
  }
}

export interface EstimateParseResponse {
  success: boolean
  estimate?: ParsedEstimate
  confidence: number
  costEstimate: number
  processingTime: number
  tokensUsed?: {
    input: number
    output: number
  }
  error?: string
  metadata?: {
    model: string
    provider: string
    reasoning?: string
    extractedTrades: number
    extractedLineItems: number
  }
}

export class LLMEstimateParser {
  private orchestrator: ParsingOrchestrator
  private userId?: string

  constructor(userId?: string) {
    this.userId = userId
    this.orchestrator = new ParsingOrchestrator(userId)
  }

  async parseEstimateFromPDF(request: EstimatePDFParseRequest): Promise<EstimateParseResponse> {
    const startTime = Date.now()

    try {
      console.log('Starting LLM-based PDF estimate parsing...')

      // Call Gemini directly with PDF buffer
      const result = await this.callGeminiWithPDF(request)

      if (!result.success || !result.data) {
        return {
          success: false,
          confidence: 0,
          costEstimate: result.cost || 0,
          processingTime: Date.now() - startTime,
          error: result.error || 'LLM PDF parsing failed to extract estimate data',
        }
      }

      console.log('LLM PDF raw response:', JSON.stringify(result.data, null, 2))

      // Convert the LLM response to estimate format
      const estimate = this.convertInvoiceToEstimate(result.data, request.filename)

      console.log('Converted estimate:', {
        trades: estimate.trades.length,
        lineItems: estimate.summary.totalLineItems,
        total: estimate.totalBudget,
      })

      return {
        success: true,
        estimate,
        confidence: result.confidence,
        costEstimate: result.totalCost,
        processingTime: Date.now() - startTime,
        metadata: {
          model: 'Gemini-PDF',
          provider: 'Direct-PDF',
          extractedTrades: estimate.trades.length,
          extractedLineItems: estimate.summary.totalLineItems,
        },
      }
    } catch (error) {
      console.error('LLM PDF estimate parsing error:', error)
      return {
        success: false,
        confidence: 0,
        costEstimate: 0,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown LLM PDF parsing error',
      }
    }
  }

  async parseEstimate(request: EstimateParseRequest): Promise<EstimateParseResponse> {
    const startTime = Date.now()

    try {
      console.log('Starting LLM-based text estimate parsing...')

      // Generate estimate-specific prompt
      const estimatePrompt = this.generateEstimatePrompt(request)

      // Call LLM directly instead of using invoice orchestrator (which expects single invoices)
      const result = await this.callLLMDirectly(estimatePrompt, request)

      if (!result.success || !result.data) {
        return {
          success: false,
          confidence: 0,
          costEstimate: result.cost || 0,
          processingTime: Date.now() - startTime,
          error: result.error || 'LLM parsing failed to extract estimate data',
        }
      }

      console.log('LLM raw response:', JSON.stringify(result.data, null, 2))

      // Convert the LLM response to estimate format
      const estimate = this.convertInvoiceToEstimate(result.data, request.filename)

      console.log('Converted estimate:', {
        trades: estimate.trades.length,
        lineItems: estimate.summary.totalLineItems,
        total: estimate.totalBudget,
      })

      return {
        success: true,
        estimate,
        confidence: result.confidence,
        costEstimate: result.totalCost,
        processingTime: Date.now() - startTime,
        metadata: {
          model: 'LLM-based',
          provider: 'Orchestrator',
          extractedTrades: estimate.trades.length,
          extractedLineItems: estimate.summary.totalLineItems,
        },
      }
    } catch (error) {
      console.error('LLM estimate parsing error:', error)
      return {
        success: false,
        confidence: 0,
        costEstimate: 0,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown LLM parsing error',
      }
    }
  }

  private generateEstimatePrompt(request: EstimateParseRequest): string {
    const { text, context } = request

    // Analyze the document structure to create a more targeted prompt
    const lines = text.split('\n').filter(line => line.trim())
    const sampleTrades = this.extractSampleTrades(text)
    const documentType = text.toLowerCase().includes('sub contractors')
      ? 'contractor breakdown'
      : 'general estimate'

    return `Extract construction estimate data from this ${documentType}. Analyze the document structure and extract EVERY cost line item.

DOCUMENT TO ANALYZE:
${text}

ANALYSIS INSTRUCTIONS:
1. This appears to be a ${documentType}
2. Look for patterns like these sample trades I can see: ${sampleTrades.join(', ')}
3. Extract EVERY line that has a trade/service name followed by a dollar amount
4. Skip summary lines like "Total", "Net", "GST", "Margin"
5. Use the EXACT trade names from the document, don't change them

REQUIRED JSON FORMAT (return ONLY this JSON):
{
  "invoices": [
    {
      "invoiceNumber": "EST-001",
      "vendorName": "[EXACT trade name from document]",
      "date": "2025-01-22",
      "description": "[Trade work description]",
      "amount": [number without commas],
      "tax": 0,
      "total": [same as amount]
    }
  ],
  "confidence": 0.95,
  "reasoning": "Found [X] individual cost line items"
}`
  }

  private extractSampleTrades(text: string): string[] {
    const tradePattern = /([A-Za-z][A-Za-z\s&\/]{3,25}?)\s+[\d,]+\.?\d*\s*\$/g
    const samples = []
    let match
    let count = 0

    while ((match = tradePattern.exec(text)) !== null && count < 5) {
      const tradeName = match[1]
        .trim()
        .replace(/\s+(quote|quoted|tbc|to be|discussed).*$/i, '')
        .trim()

      if (tradeName.length > 2 && !tradeName.toLowerCase().includes('total')) {
        samples.push(tradeName)
        count++
      }
    }

    return samples
  }

  private async callLLMDirectly(prompt: string, request: EstimateParseRequest) {
    try {
      // Get parsing configuration to access API keys - pass userId for user-specific config
      const { getParsingConfig } = await import('@/lib/pdf-parsing-config')
      const config = await getParsingConfig(this.userId)

      console.log(
        'Estimate parsing - Available providers:',
        Object.keys(config.llmProviders).filter(key => config.llmProviders[key].enabled)
      )
      console.log(
        'Estimate parsing - Provider details:',
        Object.entries(config.llmProviders).map(([key, provider]) => ({
          name: key,
          enabled: provider.enabled,
          hasApiKey: !!provider.apiKey,
        }))
      )

      // Try Gemini first if available (good for structured responses)
      if (config.llmProviders.gemini.enabled && config.llmProviders.gemini.apiKey) {
        console.log('Using Gemini for estimate parsing')
        const { GeminiParser } = await import('./gemini-parser')
        const parser = new GeminiParser({
          apiKey: config.llmProviders.gemini.apiKey!,
          model: config.llmProviders.gemini.model,
          timeout: config.timeout,
          maxRetries: config.retryAttempts,
        })

        // Create a custom LLM request specifically for estimates
        const llmRequest = {
          text: this.generateEstimatePrompt(request), // Use our custom prompt
          pageNumber: request.pageNumber,
          options: {
            temperature: 0.1,
            maxTokens: 8000,
            includeConfidence: true,
            structured: true,
          },
        }

        const response = await parser.parseInvoice(llmRequest)
        console.log('Gemini response received:', {
          success: response.success,
          hasInvoice: !!response.invoice,
          confidence: response.confidence,
        })

        // Try to extract the JSON from the response
        if (response.success && response.invoice) {
          try {
            // Check all possible response fields for JSON content
            const possibleFields = [
              response.invoice.description,
              response.invoice.rawText,
              response.invoice.vendorName,
              JSON.stringify(response.invoice),
            ]

            console.log(
              'Full response object for debugging:',
              JSON.stringify(response.invoice, null, 2)
            )

            let parsedData = null
            for (const responseText of possibleFields) {
              if (!responseText) continue

              console.log('Checking field for JSON:', responseText.substring(0, 100) + '...')

              // Try multiple JSON extraction patterns
              const patterns = [
                /\{[\s\S]*?"invoices"[\s\S]*?\}/, // Original pattern
                /\{[\s\S]*?\}/, // Any JSON object
                /"invoices"\s*:\s*\[[\s\S]*?\]/, // Just the invoices array
              ]

              for (const pattern of patterns) {
                const jsonMatch = responseText.match(pattern)
                if (jsonMatch) {
                  try {
                    parsedData = JSON.parse(jsonMatch[0])
                    console.log('Successfully parsed JSON with pattern:', pattern.source)
                    break
                  } catch (e) {
                    console.log(
                      'JSON parse failed for pattern:',
                      pattern.source,
                      'Error:',
                      e.message
                    )
                    continue
                  }
                }
              }

              if (parsedData) break
            }

            if (parsedData) {
              console.log('Successfully extracted estimate data:', parsedData)

              return {
                success: true,
                data: parsedData,
                confidence: parsedData.confidence || response.confidence,
                cost: response.costEstimate,
                error: null,
              }
            }
          } catch (parseError) {
            console.error('Failed to extract JSON from Gemini response:', parseError)
          }
        }

        console.log('Gemini parsing failed, will fallback to traditional parsing')
        return {
          success: false,
          data: null,
          confidence: 0,
          cost: response?.costEstimate || 0,
          error: 'Failed to extract structured data from LLM response',
        }
      }

      // Fallback to Anthropic if available
      if (config.llmProviders.anthropic.enabled && config.llmProviders.anthropic.apiKey) {
        console.log('Using Anthropic for estimate parsing')
        const { AnthropicParser } = await import('./anthropic-parser')
        const parser = new AnthropicParser({
          apiKey: config.llmProviders.anthropic.apiKey!,
          model: config.llmProviders.anthropic.model,
          timeout: config.timeout,
          maxRetries: config.retryAttempts,
        })

        const llmRequest = {
          text: prompt,
          pageNumber: request.pageNumber,
          options: {
            temperature: 0.1,
            maxTokens: 8000, // Higher limit for multiple items
            includeConfidence: true,
            structured: true,
          },
        }

        const response = await parser.parseInvoice(llmRequest)

        return {
          success: response.success,
          data: response.invoice,
          confidence: response.confidence,
          cost: response.costEstimate,
          error: response.error,
        }
      }

      throw new Error('No LLM providers available for estimate parsing')
    } catch (error) {
      console.error('Direct LLM call failed:', error)
      return {
        success: false,
        data: null,
        confidence: 0,
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async callGeminiDirectly(providerConfig: any, request: EstimateParseRequest) {
    try {
      // Import Google Generative AI directly
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(providerConfig.apiKey)
      const model = genAI.getGenerativeModel({ model: providerConfig.model })

      const prompt = this.generateEstimatePrompt(request)
      console.log('Sending prompt to Gemini:', prompt.substring(0, 200) + '...')

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      console.log('Gemini raw response:', text)

      // Parse the JSON response
      let parsedData
      try {
        // Try to find and parse JSON in the response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0])
          console.log('Successfully parsed Gemini JSON:', parsedData)
        } else {
          throw new Error('No JSON found in response')
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini JSON response:', parseError)
        return {
          success: false,
          data: null,
          confidence: 0,
          cost: 0,
          error: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        }
      }

      return {
        success: true,
        data: parsedData,
        confidence: parsedData.confidence || 0.8,
        cost: 0.01, // Rough estimate for cost
        error: null,
      }
    } catch (error) {
      console.error('Gemini direct call error:', error)
      return {
        success: false,
        data: null,
        confidence: 0,
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown Gemini error',
      }
    }
  }

  private async callGeminiWithPDF(request: EstimatePDFParseRequest) {
    try {
      // Get parsing configuration to access API keys
      const { getParsingConfig } = await import('@/lib/pdf-parsing-config')
      const config = await getParsingConfig(this.userId)

      if (!config.llmProviders.gemini.enabled || !config.llmProviders.gemini.apiKey) {
        throw new Error('Gemini not configured for PDF parsing')
      }

      console.log('Using Gemini for PDF parsing')

      // Import Google Generative AI directly
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(config.llmProviders.gemini.apiKey)

      // Use the model that supports file uploads
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // Generate the prompt for PDF parsing
      const prompt = this.generatePDFEstimatePrompt(request)
      console.log('Sending PDF to Gemini with prompt:', prompt.substring(0, 200) + '...')

      // Convert buffer to base64 for Gemini
      const pdfBase64 = request.pdfBuffer.toString('base64')

      const result = await model.generateContent([
        {
          inlineData: {
            data: pdfBase64,
            mimeType: 'application/pdf',
          },
        },
        prompt,
      ])

      const response = await result.response
      const text = response.text()

      console.log('Gemini PDF response:', text.substring(0, 500) + '...')

      // Parse the JSON response with better error handling
      let parsedData
      try {
        // Clean the response text first
        let cleanedText = text.trim()

        // Remove markdown code block markers and any text before/after JSON
        cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*$/g, '')
        cleanedText = cleanedText.replace(/^[^{]*/, '').replace(/[^}]*$/, '') // Remove text before { and after }

        console.log('Cleaned Gemini response:', cleanedText.substring(0, 500) + '...')

        // Try to find and parse JSON in the response
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          let jsonString = jsonMatch[0]

          // Fix common JSON issues more comprehensively
          jsonString = jsonString
            .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
            .replace(/,\s*\}/g, '}') // Remove trailing commas in objects
            .replace(/:\s*null(?=\s*[,\}])/g, ': ""') // Replace null with empty string
            .replace(/:\s*undefined(?=\s*[,\}])/g, ': ""') // Replace undefined with empty string
            .replace(/([{,]\s*)"([^"]+)"\s*:\s*"([^"]*)"/g, '$1"$2": "$3"') // Ensure proper quoting
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
            .replace(/:\s*'([^']*)'/g, ': "$1"') // Convert single quotes to double quotes
            .replace(/\n\s*/g, ' ') // Remove newlines and extra spaces
            .replace(/\s+/g, ' ') // Normalize whitespace

          console.log('Attempting to parse cleaned JSON:', jsonString.substring(0, 300) + '...')

          // Try parsing with multiple attempts
          try {
            parsedData = JSON.parse(jsonString)
            console.log('Successfully parsed Gemini PDF JSON:', parsedData)
          } catch (firstError) {
            console.log('First parse attempt failed, trying alternative cleaning...')

            // More aggressive cleaning for malformed JSON
            const alternativeJson = jsonString
              .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII characters
              .replace(/\\n/g, ' ') // Replace literal \n with space
              .replace(/\\r/g, ' ') // Replace literal \r with space
              .replace(/\s+"/g, '"') // Clean spaces before quotes
              .replace(/"\s+:/g, '":') // Clean spaces after keys
              .replace(/:\s+"/g, ':"') // Clean spaces after colons
              .replace(/,\s+"/g, ',"') // Clean spaces after commas

            parsedData = JSON.parse(alternativeJson)
            console.log('Successfully parsed Gemini PDF JSON on second attempt:', parsedData)
          }
        } else {
          throw new Error('No JSON found in Gemini PDF response')
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini PDF JSON response:', parseError)
        console.error('Original response:', text.substring(0, 1000))
        return {
          success: false,
          data: null,
          confidence: 0,
          cost: 0,
          error: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        }
      }

      return {
        success: true,
        data: parsedData,
        confidence: parsedData.confidence || 0.9,
        cost: 0.01, // Rough estimate for cost
        totalCost: 0.01,
        error: null,
      }
    } catch (error) {
      console.error('Gemini PDF call error:', error)
      return {
        success: false,
        data: null,
        confidence: 0,
        cost: 0,
        totalCost: 0,
        error: error instanceof Error ? error.message : 'Unknown Gemini PDF error',
      }
    }
  }

  private generatePDFEstimatePrompt(request: EstimatePDFParseRequest): string {
    const { context } = request
    const documentType = 'construction estimate'

    return `You are a construction cost estimation expert analyzing a ${documentType} PDF document. Your task is to extract ALL individual cost line items with maximum accuracy and return them as structured JSON.

CRITICAL INSTRUCTIONS:
1. Read the PDF document THOROUGHLY - scan every line, table, and section
2. Look for patterns like: "Trade Name    $Amount" or "Service    Amount $" 
3. Extract EVERY line item that has a trade/service name with a dollar amount
4. Use the EXACT trade names as they appear in the PDF - do not modify or standardize them
5. Include ALL cost categories: trades, materials, labor, subcontractors, equipment, margins, fees, allowances
6. EXCLUDE only these summary lines: "Grand Total", "Sub Total", "Net Total", "GST Total" 
7. INCLUDE these as legitimate line items: "Margin", "P&G", "Profit", individual "Materials", "Labour", specific trade margins

EXAMPLES of what TO INCLUDE:
- "Concrete pump 2,500.00" → include as $2500
- "Materials 89,231.86" → include as $89231.86  
- "5% P&G 15,000" → include as $15000
- "Plumber 21,000" → include as $21000
- "Allowance for site prep 5,500" → include as $5500

EXAMPLES of what to EXCLUDE:
- "Total 475,277.48" → exclude (final total)
- "Net 413,277.48" → exclude (net total)
- "GST 62,000" → exclude (tax total)

TARGET ACCURACY: This estimate should total approximately $475,000 NZD with 20-25 individual line items.

REQUIRED JSON FORMAT (return ONLY this JSON, no markdown, no explanation):
{
  "invoices": [
    {
      "invoiceNumber": "EST-001",
      "vendorName": "[Exact trade name from PDF]",
      "date": "2025-01-22",
      "description": "[Trade work description or service type]",
      "amount": [number without commas or currency symbols],
      "tax": 0,
      "total": [same as amount]
    },
    {
      "invoiceNumber": "EST-002", 
      "vendorName": "[Next exact trade name]",
      "date": "2025-01-22",
      "description": "[Description of work or materials]", 
      "amount": [amount as number],
      "tax": 0,
      "total": [same as amount]
    }
  ],
  "confidence": 0.95,
  "reasoning": "Extracted X individual cost line items totaling approximately $Y from the construction estimate PDF"
}

Context: ${context?.currency || 'NZD'} currency, ${context?.estimateType || 'detailed'} estimate.
Expected total range: $400,000 - $500,000 NZD with 20-30 line items.

Analyze the PDF now and extract ALL line items:`
  }

  private convertInvoiceToEstimate(invoiceData: any, filename: string): ParsedEstimate {
    console.log('Converting invoice data to estimate:', invoiceData)

    // Handle different response formats from LLM
    let invoices: any[] = []

    if (invoiceData.invoices && Array.isArray(invoiceData.invoices)) {
      // LLM returned the expected format with invoices array
      invoices = invoiceData.invoices
      console.log('Found invoices array with', invoices.length, 'items')
    } else if (Array.isArray(invoiceData)) {
      // LLM returned an array directly
      invoices = invoiceData
      console.log('Found direct array with', invoices.length, 'items')
    } else {
      // LLM returned a single invoice object - wrap it in array
      invoices = [invoiceData]
      console.log('Found single invoice, wrapping in array')
    }

    const lineItems: EstimateLineItem[] = []
    let totalBudget = 0

    // Convert each "invoice" (trade/contractor) to line items
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i]
      console.log(`Processing invoice ${i + 1}:`, invoice)

      const tradeName = this.extractTradeFromVendor(invoice.vendorName || `Trade ${i + 1}`)
      const total = invoice.total || invoice.amount || 0

      console.log(`Trade: ${tradeName}, Amount: ${total}`)

      if (total > 0) {
        // Only add if we have a valid amount
        totalBudget += total

        // Create line item for this trade
        const lineItem: EstimateLineItem = {
          description: invoice.description || invoice.vendorName || 'Work item',
          quantity: 1,
          unit: 'lump sum',
          materialCost: 0,
          laborCost: total, // Assume labor cost for estimates
          equipmentCost: 0,
          markupPercent: 0,
          overheadPercent: 0,
          totalCost: total,
          tradeName,
          category: 'LABOR',
        }

        lineItems.push(lineItem)
        console.log('Added line item:', lineItem)
      } else {
        console.warn('Skipping invoice with no amount:', invoice)
      }
    }

    console.log(`Total line items created: ${lineItems.length}, Total budget: ${totalBudget}`)

    // Group by trade
    const tradeMap = new Map<string, EstimateLineItem[]>()
    for (const item of lineItems) {
      const tradeName = item.tradeName
      if (!tradeMap.has(tradeName)) {
        tradeMap.set(tradeName, [])
      }
      tradeMap.get(tradeName)!.push(item)
    }

    // Build trades
    const trades: EstimateTrade[] = []
    let totalMaterialCost = 0
    let totalLaborCost = 0
    let totalEquipmentCost = 0

    Array.from(tradeMap.entries()).forEach(([tradeName, items], index) => {
      let tradeMaterialCost = 0
      let tradeLaborCost = 0
      let tradeEquipmentCost = 0
      let tradeTotalCost = 0

      for (const item of items) {
        tradeMaterialCost += item.materialCost
        tradeLaborCost += item.laborCost
        tradeEquipmentCost += item.equipmentCost
        tradeTotalCost += item.totalCost
      }

      trades.push({
        name: tradeName,
        description: `${tradeName} work items`,
        lineItems: items,
        totalMaterialCost: tradeMaterialCost,
        totalLaborCost: tradeLaborCost,
        totalEquipmentCost: tradeEquipmentCost,
        totalCost: tradeTotalCost,
        sortOrder: index,
      })

      totalMaterialCost += tradeMaterialCost
      totalLaborCost += tradeLaborCost
      totalEquipmentCost += tradeEquipmentCost
    })

    return {
      projectName: filename.replace(/\.(pdf|csv|xlsx)$/i, ''),
      totalBudget,
      currency: 'NZD',
      trades,
      summary: {
        totalTrades: trades.length,
        totalLineItems: lineItems.length,
        totalMaterialCost,
        totalLaborCost,
        totalEquipmentCost,
        grandTotal: totalBudget,
      },
      metadata: {
        source: 'pdf',
        filename,
        parseDate: new Date().toISOString(),
        rowCount: lineItems.length,
      },
    }
  }

  private extractTradeFromVendor(vendorName: string): string {
    const vendor = vendorName.toLowerCase()

    // Trade mapping for estimate parsing
    const tradeMap: { [key: string]: string } = {
      concrete: 'Concrete & Foundations',
      plumber: 'Plumbing',
      plumbing: 'Plumbing',
      electrician: 'Electrical',
      electrical: 'Electrical',
      roofing: 'Roofing',
      roof: 'Roofing',
      aluminium: 'Windows & Doors',
      aluminum: 'Windows & Doors',
      joinery: 'Windows & Doors',
      plasterer: 'Plastering',
      plastering: 'Plastering',
      door: 'Windows & Doors',
      doors: 'Windows & Doors',
      tiler: 'Tiling',
      tiling: 'Tiling',
      painter: 'Painting',
      painting: 'Painting',
      flooring: 'Flooring',
      framing: 'Framing',
      insulation: 'Insulation',
      hvac: 'HVAC',
      kitchen: 'Kitchen & Bathrooms',
      bathroom: 'Kitchen & Bathrooms',
      landscaping: 'Landscaping',
      excavation: 'Site Work',
    }

    // Find matching trade
    for (const [keyword, trade] of Object.entries(tradeMap)) {
      if (vendor.includes(keyword)) {
        return trade
      }
    }

    // Default to the vendor name as trade name
    return vendorName || 'General'
  }
}
