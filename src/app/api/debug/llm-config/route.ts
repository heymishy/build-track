/**
 * Temporary diagnostic endpoint to verify LLM configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getParsingConfig } from '@/lib/pdf-parsing-config'
import { ParsingOrchestrator } from '@/lib/llm-parsers/parsing-orchestrator'

export async function GET(request: NextRequest) {
  try {
    // Use a test user ID for debugging  
    const testUserId = 'cmeuc7zwb0001ky04bu002p0n'
    console.log('LLM Debug: Starting diagnostic for user:', testUserId)
    
    // Test parsing configuration
    const config = await getParsingConfig(testUserId)
    
    // Test orchestrator initialization
    const orchestrator = new ParsingOrchestrator(testUserId)
    
    // Get available strategies
    const strategies = orchestrator.getAvailableStrategies()
    
    const diagnostics = {
      userId: testUserId,
      timestamp: new Date().toISOString(),
      config: {
        defaultStrategy: config.defaultStrategy,
        enabledProviders: Object.entries(config.llmProviders)
          .filter(([_, provider]) => provider.enabled)
          .map(([name, provider]) => ({
            name,
            hasApiKey: !!provider.apiKey,
            model: provider.model,
            enabled: provider.enabled
          })),
        providerOrder: config.providerOrder,
        fallbackChains: Object.fromEntries(
          Object.entries(config.strategies).map(([name, strategy]) => [
            name,
            strategy.fallbackChain
          ])
        )
      },
      orchestrator: {
        strategiesCount: strategies.length,
        currentConfig: orchestrator.getConfiguration()
      },
      testText: 'INVOICE\nInvoice Number: TEST-123\nDate: 2024-08-28\nTotal: $150.00'
    }
    
    // Test a simple parsing attempt
    const testResult = await orchestrator.parseInvoice(diagnostics.testText, 1, {
      expectedFormat: 'construction-invoice'
    })
    
    diagnostics.testResults = {
      textLength: diagnostics.testText.length,
      parseSuccess: testResult.success,
      parseConfidence: testResult.confidence,
      parseTotalCost: testResult.totalCost,
      parseStrategy: testResult.strategy,
      parseAttempts: testResult.attempts?.length || 0
    }
    
    return NextResponse.json({
      success: true,
      diagnostics
    })
    
  } catch (error) {
    console.error('LLM Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

// No auth needed for debugging