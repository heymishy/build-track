/**
 * Temporary diagnostic endpoint to verify LLM configuration
 */

import { NextResponse } from 'next/server'
import { getParsingConfig } from '@/lib/pdf-parsing-config'

export async function GET() {
  try {
    // Use a test user ID for debugging
    const testUserId = 'cmeuc7zwb0001ky04bu002p0n'
    console.log('LLM Debug: Starting diagnostic for user:', testUserId)

    const diagnostics: Record<string, unknown> = {
      userId: testUserId,
      timestamp: new Date().toISOString(),
      steps: [],
    }

    try {
      // Step 1: Test parsing configuration
      diagnostics.steps.push('Loading parsing configuration...')
      const config = await getParsingConfig(testUserId)
      diagnostics.steps.push('✅ Parsing configuration loaded')

      diagnostics.config = {
        defaultStrategy: config.defaultStrategy,
        enabledProviders: Object.entries(config.llmProviders)
          .filter(([, provider]) => provider.enabled)
          .map(([name, provider]) => ({
            name,
            hasApiKey: !!provider.apiKey,
            model: provider.model,
            enabled: provider.enabled,
          })),
        providerOrder: config.providerOrder,
        fallbackChains: Object.fromEntries(
          Object.entries(config.strategies).map(([name, strategy]) => [
            name,
            strategy.fallbackChain,
          ])
        ),
      }
    } catch (configError) {
      diagnostics.steps.push(`❌ Config loading failed: ${configError}`)
      diagnostics.configError =
        configError instanceof Error ? configError.message : String(configError)
    }

    try {
      // Step 2: Test orchestrator initialization manually
      diagnostics.steps.push('Testing orchestrator manually...')

      // Skip orchestrator for now and test direct parsing config usage
      if (diagnostics.config && diagnostics.config.enabledProviders.length > 0) {
        diagnostics.steps.push(
          `✅ Found ${diagnostics.config.enabledProviders.length} enabled providers`
        )
        diagnostics.directTest = {
          providers: diagnostics.config.enabledProviders,
          strategies: Object.keys(diagnostics.config.fallbackChains),
        }
      } else {
        diagnostics.steps.push('❌ No enabled providers found in config')
      }
    } catch (orchError) {
      diagnostics.steps.push(`❌ Orchestrator test failed: ${orchError}`)
      diagnostics.orchestratorError =
        orchError instanceof Error ? orchError.message : String(orchError)
    }

    return NextResponse.json({
      success: true,
      diagnostics,
    })
  } catch (error) {
    console.error('LLM Debug error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// No auth needed for debugging
