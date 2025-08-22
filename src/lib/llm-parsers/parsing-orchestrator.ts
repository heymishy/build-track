/**
 * Parsing Orchestrator
 * Implements hybrid parsing strategies with intelligent fallback chains
 */

import { ParsedInvoice } from '@/lib/pdf-parser'
import { getParsingConfig, ParsingStrategy, LLMProvider } from '@/lib/pdf-parsing-config'
import { AnthropicParser } from './anthropic-parser'
import { GeminiParser } from './gemini-parser'
import { BaseLLMParser, LLMParseRequest, LLMParseResponse } from './base-llm-parser'
import { applyLearnedPatterns } from '@/lib/server-training'

export interface ParsingResult {
  success: boolean
  invoice?: ParsedInvoice
  confidence: number
  totalCost: number
  processingTime: number
  strategy: string
  attempts: Array<{
    method: string
    success: boolean
    confidence: number
    cost: number
    error?: string
  }>
  metadata?: {
    llmUsed?: boolean
    fallbackTriggered?: boolean
    traditionalUsed?: boolean
  }
}

export class ParsingOrchestrator {
  private parsers: Map<string, BaseLLMParser> = new Map()
  private config: any
  private userId?: string

  constructor(userId?: string) {
    this.userId = userId
    this.initialize()
  }

  private async initialize() {
    this.config = await getParsingConfig(this.userId)
    
    console.log('Orchestrator initialized with strategy:', this.config.defaultStrategy)
    console.log('Available providers:', Object.keys(this.config.llmProviders).filter(key => this.config.llmProviders[key].enabled))
    
    // Initialize available LLM parsers based on configuration
    if (this.config.llmProviders.anthropic.enabled && this.config.llmProviders.anthropic.apiKey) {
      console.log('Initializing Anthropic parser')
      this.parsers.set('anthropic', new AnthropicParser({
        apiKey: this.config.llmProviders.anthropic.apiKey!,
        model: this.config.llmProviders.anthropic.model,
        timeout: this.config.timeout,
        maxRetries: this.config.retryAttempts
      }))
    }

    if (this.config.llmProviders.gemini.enabled && this.config.llmProviders.gemini.apiKey) {
      console.log('Initializing Gemini parser')
      this.parsers.set('gemini', new GeminiParser({
        apiKey: this.config.llmProviders.gemini.apiKey!,
        model: this.config.llmProviders.gemini.model,
        timeout: this.config.timeout,
        maxRetries: this.config.retryAttempts
      }))
    }

    if (this.config.llmProviders.openai.enabled && this.config.llmProviders.openai.apiKey) {
      console.log('Initializing OpenAI parser')
      // OpenAI parser would go here when implemented
    }
  }

  async parseInvoice(
    text: string, 
    pageNumber?: number, 
    context?: LLMParseRequest['context']
  ): Promise<ParsingResult> {
    const startTime = Date.now()
    await this.initialize() // Ensure config is loaded

    const strategy = this.config.strategies[this.config.defaultStrategy]
    const attempts: ParsingResult['attempts'] = []
    let totalCost = 0
    let bestResult: { invoice: ParsedInvoice, confidence: number } | null = null
    let metadata = { llmUsed: false, fallbackTriggered: false, traditionalUsed: false }

    console.log(`Starting parsing with strategy: ${strategy.name}`)
    console.log(`Available parsers: ${Array.from(this.parsers.keys()).join(', ')}`)
    console.log(`Fallback chain: ${strategy.fallbackChain.join(' → ')}`)

    for (const method of strategy.fallbackChain) {
      if (totalCost >= strategy.maxCostPerInvoice) {
        console.log(`Cost limit reached: $${totalCost.toFixed(4)} >= $${strategy.maxCostPerInvoice}`)
        break
      }

      let result: { success: boolean, invoice?: ParsedInvoice, confidence: number, cost: number, error?: string }

      if (method === 'traditional') {
        result = await this.tryTraditionalParsing(text, pageNumber)
        metadata.traditionalUsed = true
      } else if (this.parsers.has(method)) {
        result = await this.tryLLMParsing(method, text, pageNumber, context)
        metadata.llmUsed = true
      } else {
        console.log(`Unknown parsing method: ${method}`)
        continue
      }

      attempts.push({
        method,
        success: result.success,
        confidence: result.confidence,
        cost: result.cost,
        error: result.error
      })

      totalCost += result.cost

      if (result.success && result.invoice) {
        // Check if this result meets our confidence threshold
        if (result.confidence >= strategy.confidenceThreshold) {
          console.log(`Parsing successful with ${method}: confidence ${result.confidence}`)
          return {
            success: true,
            invoice: result.invoice,
            confidence: result.confidence,
            totalCost,
            processingTime: Date.now() - startTime,
            strategy: strategy.name,
            attempts,
            metadata
          }
        } else {
          // Keep track of best result so far
          if (!bestResult || result.confidence > bestResult.confidence) {
            bestResult = { invoice: result.invoice, confidence: result.confidence }
            metadata.fallbackTriggered = true
          }
        }
      }
    }

    // If no result met threshold, return best available result
    if (bestResult) {
      console.log(`Using best available result: confidence ${bestResult.confidence}`)
      return {
        success: true,
        invoice: bestResult.invoice,
        confidence: bestResult.confidence,
        totalCost,
        processingTime: Date.now() - startTime,
        strategy: strategy.name,
        attempts,
        metadata
      }
    }

    // All methods failed
    return {
      success: false,
      confidence: 0,
      totalCost,
      processingTime: Date.now() - startTime,
      strategy: strategy.name,
      attempts,
      metadata
    }
  }

  private async tryLLMParsing(
    providerName: string, 
    text: string, 
    pageNumber?: number, 
    context?: LLMParseRequest['context']
  ): Promise<{ success: boolean, invoice?: ParsedInvoice, confidence: number, cost: number, error?: string }> {
    const parser = this.parsers.get(providerName)
    if (!parser) {
      return {
        success: false,
        confidence: 0,
        cost: 0,
        error: `Parser not available: ${providerName}`
      }
    }

    try {
      const request: LLMParseRequest = {
        text,
        pageNumber,
        context,
        options: {
          temperature: 0.1,
          maxTokens: 4000,
          includeConfidence: true,
          structured: true
        }
      }

      const result = await parser.parseInvoice(request)

      return {
        success: result.success,
        invoice: result.invoice,
        confidence: result.confidence,
        cost: result.costEstimate,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async tryTraditionalParsing(
    text: string, 
    pageNumber?: number
  ): Promise<{ success: boolean, invoice?: ParsedInvoice, confidence: number, cost: number, error?: string }> {
    try {
      // Apply learned patterns from training first
      const enhancedInvoice = await applyLearnedPatterns(text, pageNumber || 1)
      
      if (enhancedInvoice) {
        return {
          success: true,
          invoice: enhancedInvoice,
          confidence: enhancedInvoice.confidence || 0.7, // Default confidence for traditional parsing
          cost: 0 // No cost for traditional parsing
        }
      }

      // Fallback to basic traditional parsing - call the traditional function directly
      const { parseInvoiceFromTextTraditional } = await import('@/lib/pdf-parser')
      const basicResult = await parseInvoiceFromTextTraditional(text, pageNumber)
      
      return {
        success: !!basicResult,
        invoice: basicResult || undefined,
        confidence: basicResult?.confidence || 0.5,
        cost: 0
      }
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        cost: 0,
        error: error instanceof Error ? error.message : 'Traditional parsing failed'
      }
    }
  }

  // Strategy-specific parsing methods
  async parseWithStrategy(
    strategyName: string,
    text: string,
    pageNumber?: number,
    context?: LLMParseRequest['context']
  ): Promise<ParsingResult> {
    const originalStrategy = this.config.defaultStrategy
    this.config.defaultStrategy = strategyName as ParsingStrategy['name']
    
    try {
      const result = await this.parseInvoice(text, pageNumber, context)
      return result
    } finally {
      this.config.defaultStrategy = originalStrategy
    }
  }

  // Get available strategies
  getAvailableStrategies(): ParsingStrategy[] {
    return Object.values(this.config.strategies)
  }

  // Get current configuration
  getConfiguration() {
    return this.config
  }

  // Cost and usage tracking
  async estimateCost(text: string, strategyName?: string): Promise<number> {
    const strategy = strategyName 
      ? this.config.strategies[strategyName]
      : this.config.strategies[this.config.defaultStrategy]

    let estimatedCost = 0
    const textLength = text.length
    const estimatedTokens = Math.ceil(textLength / 4) // Rough token estimation

    for (const method of strategy.fallbackChain) {
      if (method === 'traditional') {
        // Traditional parsing has no cost
        continue
      }

      const provider = this.config.llmProviders[method]
      if (provider?.enabled) {
        const methodCost = (estimatedTokens / 1000) * provider.costPer1k
        estimatedCost += methodCost
        
        // If this would meet confidence threshold, we probably wouldn't use other methods
        if (method === 'anthropic') {
          break // Anthropic usually has high confidence
        }
      }
    }

    return Math.min(estimatedCost, strategy.maxCostPerInvoice)
  }
}