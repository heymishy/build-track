/**
 * Anthropic Claude Parser Implementation
 * High-quality parsing with Claude 3.5 Sonnet for maximum accuracy
 */

import {
  BaseLLMParser,
  LLMParseRequest,
  LLMParseResponse,
  LLMParserConfig,
} from './base-llm-parser'

interface AnthropicResponse {
  content: Array<{
    type: string
    text: string
  }>
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export class AnthropicParser extends BaseLLMParser {
  constructor(config: LLMParserConfig) {
    super(config)
    if (!config.baseUrl) {
      config.baseUrl = 'https://api.anthropic.com/v1/messages'
    }
  }

  async parseInvoice(request: LLMParseRequest): Promise<LLMParseResponse> {
    const startTime = Date.now()

    try {
      // Rate limiting check
      const canProceed = await this.checkRateLimit(this.config.apiKey, 50) // 50 per minute
      if (!canProceed) {
        return {
          success: false,
          error: 'Rate limit exceeded for Anthropic API',
          confidence: 0,
          costEstimate: 0,
          processingTime: Date.now() - startTime,
          tokensUsed: { input: 0, output: 0 },
          metadata: {
            model: this.config.model,
            provider: 'anthropic',
            reasoning: 'Rate limit exceeded',
          },
        }
      }

      const prompt = this.generatePrompt(request)

      // Make API call to Anthropic
      const response = await this.callAnthropicAPI(prompt, request.options)

      if (!response.success) {
        return {
          success: false,
          error: response.error,
          confidence: 0,
          costEstimate: 0,
          processingTime: Date.now() - startTime,
          tokensUsed: { input: 0, output: 0 },
          metadata: {
            model: this.config.model,
            provider: 'anthropic',
          },
        }
      }

      // Parse JSON response
      let parsedData: any
      try {
        parsedData = JSON.parse(response.data.content[0].text)
      } catch (error) {
        // Try to extract JSON from response
        const jsonMatch = response.data.content[0].text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0])
          } catch {
            return {
              success: false,
              error: 'Failed to parse JSON response from Claude',
              confidence: 0,
              costEstimate: this.calculateCost(0, 0, 0.003),
              processingTime: Date.now() - startTime,
              tokensUsed: response.data.usage,
              metadata: {
                model: this.config.model,
                provider: 'anthropic',
                reasoning: 'JSON parsing failed',
              },
            }
          }
        } else {
          return {
            success: false,
            error: 'No valid JSON found in Claude response',
            confidence: 0,
            costEstimate: this.calculateCost(0, 0, 0.003),
            processingTime: Date.now() - startTime,
            tokensUsed: response.data.usage,
            metadata: {
              model: this.config.model,
              provider: 'anthropic',
            },
          }
        }
      }

      // Validate and normalize response, preserving pageNumber
      const invoice = this.validateResponse(parsedData, request.text, request.pageNumber)
      const processingTime = Date.now() - startTime
      const tokensUsed = response.data.usage
      const costEstimate = this.calculateCost(
        tokensUsed.input_tokens,
        tokensUsed.output_tokens,
        0.003
      )

      return {
        success: true,
        invoice,
        confidence: invoice.confidence,
        costEstimate,
        processingTime,
        tokensUsed: {
          input: tokensUsed.input_tokens,
          output: tokensUsed.output_tokens,
        },
        metadata: {
          model: this.config.model,
          provider: 'anthropic',
          reasoning: parsedData.reasoning || 'Successfully parsed with Claude',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        confidence: 0,
        costEstimate: 0,
        processingTime: Date.now() - startTime,
        tokensUsed: { input: 0, output: 0 },
        metadata: {
          model: this.config.model,
          provider: 'anthropic',
        },
      }
    }
  }

  private async callAnthropicAPI(
    prompt: string,
    options?: any
  ): Promise<{
    success: boolean
    data?: AnthropicResponse
    error?: string
  }> {
    try {
      const response = await fetch(this.config.baseUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: options?.maxTokens || 4000,
          temperature: options?.temperature || 0.1,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          error: `Anthropic API error: ${response.status} - ${errorData.error?.message || errorData.error || 'Unknown error'}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  protected generatePrompt(request: LLMParseRequest): string {
    const { text, context, pageNumber } = request

    return `You are Claude, an expert invoice data extraction system for construction projects. Extract structured data from the following invoice text with high accuracy and provide detailed reasoning for your decisions.

INVOICE TEXT (Page ${pageNumber || 1}):
${text}

EXTRACTION REQUIREMENTS:
1. **Invoice Number**: Exact invoice/reference number from document
2. **Vendor Name**: Complete company name issuing the invoice
3. **Date**: Invoice date in YYYY-MM-DD format (be very careful with date formats)
4. **Amounts**: 
   - Subtotal/Amount (before tax)
   - Tax/GST amount (look for tax rates like 10%, 15%, or specific tax amounts)
   - Total amount (including tax)
5. **Line Items**: Individual items/services with quantities, unit prices, and totals
6. **Description**: Comprehensive description of work/materials supplied

CONTEXT INFORMATION:
${context?.supplierName ? `Expected Supplier: ${context.supplierName}` : ''}
${context?.expectedFormat ? `Format Type: ${context.expectedFormat}` : ''}
${context?.projectContext ? `Project Context: ${context.projectContext}` : ''}

ANALYSIS APPROACH:
1. Carefully read through the entire text to understand the invoice structure
2. Identify key sections (header, line items, totals, tax information)
3. Extract data methodically, double-checking calculations
4. Validate that subtotal + tax = total (within reasonable tolerance)
5. Assign confidence based on clarity and completeness of extracted data

RESPONSE FORMAT (JSON only, no additional text):
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
  "reasoning": "Detailed explanation of extraction decisions, any challenges encountered, and confidence rationale"
}

VALIDATION RULES:
- All currency amounts must be numbers (not strings)
- Dates must be valid YYYY-MM-DD format
- Total should equal amount + tax (within $0.50 tolerance)
- Confidence should reflect extraction certainty (0.0-1.0)
- If unsure about a field, use null and explain in reasoning
- Reasoning should be detailed and explain your decision-making process

Extract the data now:`
  }
}
