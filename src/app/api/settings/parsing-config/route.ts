/**
 * API Routes for Parsing Configuration Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getParsingConfig, DEFAULT_PARSING_CONFIG } from '@/lib/pdf-parsing-config'
import { withAuth, AuthUser } from '@/lib/middleware'
import { getUserSettings } from '@/lib/settings-service'

async function GET(request: NextRequest, user: AuthUser) {
  try {
    const config = await getParsingConfig(user.id)
    const storedSettings = await getUserSettings(user.id)
    
    // Don't send API keys to client, but show connection status based on stored keys
    const clientConfig = {
      ...config,
      providerOrder: storedSettings.providerOrder,
      llmProviders: Object.fromEntries(
        Object.entries(config.llmProviders).map(([key, provider]) => [
          key,
          {
            ...provider,
            apiKey: undefined, // Remove API key from response
            displayName: getProviderDisplayName(key),
            status: storedSettings.apiKeys[key] ? 'connected' : 'disconnected',
            enabled: !!storedSettings.apiKeys[key]
          }
        ])
      ),
      strategies: Object.fromEntries(
        Object.entries(config.strategies).map(([key, strategy]) => [
          key,
          {
            ...strategy,
            displayName: getStrategyDisplayName(key),
            recommended: key === 'hybrid'
          }
        ])
      )
    }

    return NextResponse.json(clientConfig)
  } catch (error) {
    console.error('Failed to get parsing config:', error)
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    )
  }
}

async function POST(request: NextRequest, user: AuthUser) {
  try {
    const updates = await request.json()
    
    // Import the settings service here to avoid circular dependencies
    const { SettingsService } = await import('@/lib/settings-service')
    const settingsService = new SettingsService(user.id)
    
    if (!updates.llmProviders || !updates.defaultStrategy) {
      return NextResponse.json(
        { error: 'Invalid configuration format' },
        { status: 400 }
      )
    }

    // Validate strategy exists
    if (!DEFAULT_PARSING_CONFIG.strategies[updates.defaultStrategy]) {
      return NextResponse.json(
        { error: 'Invalid parsing strategy' },
        { status: 400 }
      )
    }

    // Validate provider order
    if (updates.providerOrder && Array.isArray(updates.providerOrder)) {
      const validProviders = ['anthropic', 'gemini', 'openai']
      const invalidProviders = updates.providerOrder.filter((p: string) => !validProviders.includes(p))
      if (invalidProviders.length > 0) {
        return NextResponse.json(
          { error: `Invalid providers in order: ${invalidProviders.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate cost limits
    if (updates.maxCostPerDocument < 0 || updates.maxCostPerDocument > 1) {
      return NextResponse.json(
        { error: 'Max cost per document must be between $0 and $1' },
        { status: 400 }
      )
    }

    if (updates.dailyCostLimit < 0 || updates.dailyCostLimit > 1000) {
      return NextResponse.json(
        { error: 'Daily cost limit must be between $0 and $1000' },
        { status: 400 }
      )
    }

    // Extract API keys and other settings
    const apiKeys: Record<string, string> = {}
    Object.entries(updates.llmProviders).forEach(([key, provider]: [string, any]) => {
      if (provider.apiKey) {
        apiKeys[key] = provider.apiKey
      }
    })

    // Update settings in database
    await settingsService.updateSetting('api_keys', apiKeys)
    await settingsService.updateSetting('default_strategy', updates.defaultStrategy)
    await settingsService.updateSetting('provider_order', updates.providerOrder || ['anthropic', 'gemini', 'openai'])
    
    // Update additional settings if provided
    if (updates.maxCostPerDocument !== undefined) {
      await settingsService.updateSetting('max_cost_per_document', updates.maxCostPerDocument)
    }
    if (updates.dailyCostLimit !== undefined) {
      await settingsService.updateSetting('daily_cost_limit', updates.dailyCostLimit)
    }
    if (updates.enableFallback !== undefined) {
      await settingsService.updateSetting('enable_fallback', updates.enableFallback)
    }
    if (updates.collectTrainingData !== undefined) {
      await settingsService.updateSetting('collect_training_data', updates.collectTrainingData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update parsing config:', error)
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    )
  }
}

function getProviderDisplayName(key: string): string {
  const names: Record<string, string> = {
    anthropic: 'Anthropic Claude',
    gemini: 'Google Gemini',
    openai: 'OpenAI GPT'
  }
  return names[key] || key
}

function getStrategyDisplayName(key: string): string {
  const names: Record<string, string> = {
    'llm-primary': 'LLM First',
    'traditional-primary': 'Traditional First',
    'hybrid': 'Hybrid (Recommended)',
    'cost-optimized': 'Cost Optimized',
    'accuracy-optimized': 'Accuracy Optimized'
  }
  return names[key] || key
}

// Apply authentication middleware
const protectedGET = withAuth(GET, {
  resource: 'settings',
  action: 'read',
  requireAuth: true,
})

const protectedPOST = withAuth(POST, {
  resource: 'settings',
  action: 'update',
  requireAuth: true,
})

export { protectedGET as GET, protectedPOST as POST }