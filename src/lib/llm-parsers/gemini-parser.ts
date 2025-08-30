/**
 * Google Gemini Parser Implementation
 * Cost-optimized parsing with Gemini 1.5 Flash for high-volume processing
 */

import {
  BaseLLMParser,
  LLMParseRequest,
  LLMParseResponse,
  LLMParserConfig,
} from './base-llm-parser'

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
    finishReason: string
  }>
  usageMetadata: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export class GeminiParser extends BaseLLMParser {
  constructor(config: LLMParserConfig) {
    super(config)
    if (!config.baseUrl) {
      config.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models'
    }
  }

  async parseInvoice(request: LLMParseRequest): Promise<LLMParseResponse> {
    const startTime = Date.now()

    try {
      // Rate limiting check - Gemini allows higher rates
      const canProceed = await this.checkRateLimit(this.config.apiKey, 60) // 60 per minute
      if (!canProceed) {
        return {
          success: false,
          error: 'Rate limit exceeded for Gemini API',
          confidence: 0,
          costEstimate: 0,
          processingTime: Date.now() - startTime,
          tokensUsed: { input: 0, output: 0 },
          metadata: {
            model: this.config.model,
            provider: 'gemini',
            reasoning: 'Rate limit exceeded',
          },
        }
      }

      const prompt = this.generateGeminiPrompt(request)

      // Make API call to Gemini (updated to support attachments)
      const response = await this.callGeminiAPI(prompt, request.options, request.attachments)

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
            provider: 'gemini',
          },
        }
      }

      // Parse JSON response
      let parsedData: any
      const responseText = response.data.candidates[0]?.content?.parts[0]?.text || ''

      try {
        parsedData = JSON.parse(responseText)
      } catch (error) {
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0])
          } catch {
            return {
              success: false,
              error: 'Failed to parse JSON response from Gemini',
              confidence: 0,
              costEstimate: this.calculateCost(0, 0, 0.00015),
              processingTime: Date.now() - startTime,
              tokensUsed: response.data.usageMetadata
                ? {
                    input: response.data.usageMetadata.promptTokenCount,
                    output: response.data.usageMetadata.candidatesTokenCount,
                  }
                : { input: 0, output: 0 },
              metadata: {
                model: this.config.model,
                provider: 'gemini',
                reasoning: 'JSON parsing failed',
              },
            }
          }
        } else {
          return {
            success: false,
            error: 'No valid JSON found in Gemini response',
            confidence: 0,
            costEstimate: this.calculateCost(0, 0, 0.00015),
            processingTime: Date.now() - startTime,
            tokensUsed: response.data.usageMetadata
              ? {
                  input: response.data.usageMetadata.promptTokenCount,
                  output: response.data.usageMetadata.candidatesTokenCount,
                }
              : { input: 0, output: 0 },
            metadata: {
              model: this.config.model,
              provider: 'gemini',
            },
          }
        }
      }

      // Handle both single invoice and multi-invoice responses
      const processingTime = Date.now() - startTime
      const tokensUsed = response.data.usageMetadata
      const costEstimate = this.calculateCost(
        tokensUsed?.promptTokenCount || 0,
        tokensUsed?.candidatesTokenCount || 0,
        0.00015 // Gemini 1.5 Flash pricing
      )

      // Check if this is a multi-invoice response
      if (parsedData.invoices && Array.isArray(parsedData.invoices)) {
        console.log('📄 Processing multi-invoice response:', parsedData.invoices.length, 'invoices found')
        
        // Validate and normalize each invoice
        const invoices = parsedData.invoices.map((invoiceData: any, index: number) => {
          return this.validateResponse(invoiceData, request.content || '', (request.pageNumber || 1) + index)
        })

        // Calculate overall confidence as average
        const overallConfidence = invoices.reduce((sum, inv) => sum + (inv.confidence || 0), 0) / invoices.length || 0

        return {
          success: true,
          invoices,
          confidence: overallConfidence,
          costEstimate,
          processingTime,
          tokensUsed: {
            input: tokensUsed?.promptTokenCount || 0,
            output: tokensUsed?.candidatesTokenCount || 0,
          },
          metadata: {
            model: this.config.model,
            provider: 'gemini',
            reasoning: `Multi-invoice extraction: ${invoices.length} invoices found`,
          },
        }
      } else {
        // Legacy single invoice response
        const invoice = this.validateResponse(parsedData, request.content || '', request.pageNumber)
        
        return {
          success: true,
          invoice,
          confidence: invoice.confidence,
          costEstimate,
          processingTime,
          tokensUsed: {
            input: tokensUsed?.promptTokenCount || 0,
            output: tokensUsed?.candidatesTokenCount || 0,
          },
          metadata: {
            model: this.config.model,
            provider: 'gemini',
            reasoning: parsedData.reasoning || 'Successfully parsed with Gemini',
          },
        }
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
          provider: 'gemini',
        },
      }
    }
  }

  private async callGeminiAPI(
    prompt: string,
    options?: any,
    attachments?: Array<{
      type: 'application/pdf' | 'image/jpeg' | 'image/png'
      data: string // Base64 encoded
      filename?: string
    }>
  ): Promise<{
    success: boolean
    data?: GeminiResponse
    error?: string
  }> {
    try {
      const url = `${this.config.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`

      // Build parts array with text prompt and attachments
      const parts: any[] = [
        {
          text: prompt,
        },
      ]

      // Add PDF/image attachments if provided
      if (attachments && attachments.length > 0) {
        console.log('🖼️ Adding attachments to Gemini request:', attachments.length)

        for (const attachment of attachments) {
          if (attachment.type === 'application/pdf') {
            parts.push({
              inline_data: {
                mime_type: 'application/pdf',
                data: attachment.data,
              },
            })
          } else if (attachment.type.startsWith('image/')) {
            parts.push({
              inline_data: {
                mime_type: attachment.type,
                data: attachment.data,
              },
            })
          }
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: parts,
            },
          ],
          generationConfig: {
            temperature: options?.temperature || 0.1,
            maxOutputTokens: options?.maxTokens || 4000,
            topK: 40,
            topP: 0.95,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE',
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          error: `Gemini API error: ${response.status} - ${errorData.error?.message || errorData.error || 'Unknown error'}`,
        }
      }

      const data = await response.json()

      // Check for safety blocks or other issues
      if (data.candidates && data.candidates[0]?.finishReason !== 'STOP') {
        return {
          success: false,
          error: `Gemini generation issue: ${data.candidates[0]?.finishReason || 'Unknown reason'}`,
        }
      }

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

  private generateGeminiPrompt(request: LLMParseRequest): string {
    const { content, context, pageNumber } = request

    // Optimized prompt for Gemini - more concise to reduce token usage
    let prompt = ''

    // Check if we have attachments (PDF/images) or just text content
    if (request.attachments && request.attachments.length > 0) {
      prompt = `Extract invoice data from the attached PDF document. Focus on accuracy and provide confidence scoring.

TASK: Analyze the attached PDF and extract structured invoice information.`
    } else {
      prompt = `Extract invoice data from this construction invoice text. Focus on accuracy and provide confidence scoring.

INVOICE TEXT (Page ${pageNumber || 1}):
${content}`
    }

    prompt += `

CONTEXT:
${context?.supplierName ? `Supplier: ${context.supplierName}` : ''}
${context?.expectedFormat ? `Format: ${context.expectedFormat}` : ''}
${context?.projectContext ? `Project: ${context.projectContext}` : ''}

Extract these fields:
1. Invoice number (exact from document)
2. Vendor name (full company name)
3. Date (YYYY-MM-DD format)
4. Description (work/materials summary)
5. Amount (pre-tax)
6. Tax amount
7. Total (amount + tax)
8. Line items (description, quantity, unit price, total)

Return ONLY valid JSON:
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
  "reasoning": "Brief extraction explanation and confidence rationale"`

    return prompt
  }
}
