/**
 * PDF Parsing Configuration System
 * Manages parsing strategies, LLM providers, and fallback behavior
 */

export interface LLMProvider {
  name: 'anthropic' | 'gemini' | 'openai'
  apiKey?: string
  model: string
  enabled: boolean
  priority: number
  costPer1k: number
  rateLimits: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
}

export interface ParsingStrategy {
  name: 'llm-primary' | 'traditional-primary' | 'hybrid' | 'cost-optimized' | 'accuracy-optimized'
  description: string
  fallbackChain: string[]
  confidenceThreshold: number
  maxCostPerInvoice: number
}

export interface ParsingConfig {
  // Strategy selection
  defaultStrategy: ParsingStrategy['name']
  strategies: Record<ParsingStrategy['name'], ParsingStrategy>

  // LLM providers
  llmProviders: Record<LLMProvider['name'], LLMProvider>

  // Provider ordering
  providerOrder: string[]

  // Fallback behavior
  enableFallback: boolean
  fallbackToTraditional: boolean
  fallbackToHuman: boolean

  // Quality controls
  confidenceThresholds: {
    autoApprove: number // 0.95+ auto-approve
    requireReview: number // 0.7-0.95 needs review
    requireCorrection: number // <0.7 needs correction
  }

  // Cost controls
  maxCostPerDocument: number
  dailyCostLimit: number

  // Performance settings
  timeout: number
  retryAttempts: number
  batchSize: number

  // Training integration
  useTrainingData: boolean
  collectTrainingData: boolean
  trainingDataWeight: number // 0-1, how much to weight training vs LLM
}

// Default configuration
export const DEFAULT_PARSING_CONFIG: ParsingConfig = {
  defaultStrategy: 'hybrid',

  // Provider ordering (default preference: accuracy, cost, availability)
  providerOrder: ['anthropic', 'gemini', 'openai'],

  strategies: {
    'llm-primary': {
      name: 'llm-primary',
      description: 'LLM first, traditional fallback only',
      fallbackChain: [], // Will be dynamically set based on providerOrder
      confidenceThreshold: 0.8,
      maxCostPerInvoice: 0.1,
    },
    'traditional-primary': {
      name: 'traditional-primary',
      description: 'Traditional parsing with LLM validation',
      fallbackChain: ['traditional'], // Will be dynamically extended
      confidenceThreshold: 0.7,
      maxCostPerInvoice: 0.02,
    },
    hybrid: {
      name: 'hybrid',
      description: 'LLM + traditional combined analysis',
      fallbackChain: [], // Will be dynamically set
      confidenceThreshold: 0.85,
      maxCostPerInvoice: 0.05,
    },
    'cost-optimized': {
      name: 'cost-optimized',
      description: 'Traditional first, LLM only for low confidence',
      fallbackChain: ['traditional'], // Will be dynamically extended
      confidenceThreshold: 0.6,
      maxCostPerInvoice: 0.01,
    },
    'accuracy-optimized': {
      name: 'accuracy-optimized',
      description: 'Multiple LLMs with consensus validation',
      fallbackChain: [], // Will be dynamically set
      confidenceThreshold: 0.95,
      maxCostPerInvoice: 0.2,
    },
  },

  llmProviders: {
    anthropic: {
      name: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      enabled: false, // Requires API key
      priority: 1,
      costPer1k: 0.003, // $3 per 1M input tokens
      rateLimits: {
        requestsPerMinute: 50,
        tokensPerMinute: 40000,
      },
    },
    gemini: {
      name: 'gemini',
      model: 'gemini-1.5-flash',
      enabled: false, // Requires API key
      priority: 2,
      costPer1k: 0.00015, // Much cheaper
      rateLimits: {
        requestsPerMinute: 60,
        tokensPerMinute: 60000,
      },
    },
    openai: {
      name: 'openai',
      model: 'gpt-4o-mini',
      enabled: false,
      priority: 3,
      costPer1k: 0.00015,
      rateLimits: {
        requestsPerMinute: 30,
        tokensPerMinute: 30000,
      },
    },
  },

  enableFallback: true,
  fallbackToTraditional: true,
  fallbackToHuman: true,

  confidenceThresholds: {
    autoApprove: 0.95,
    requireReview: 0.7,
    requireCorrection: 0.5,
  },

  maxCostPerDocument: 0.1,
  dailyCostLimit: 10.0,

  timeout: 30000, // 30 seconds
  retryAttempts: 2,
  batchSize: 5,

  useTrainingData: true,
  collectTrainingData: true,
  trainingDataWeight: 0.3, // 30% traditional + training, 70% LLM
}

/**
 * Build dynamic fallback chains based on provider order and strategy type
 */
function buildFallbackChain(
  strategy: ParsingStrategy['name'],
  providerOrder: string[],
  enabledProviders: Set<string>
): string[] {
  const enabledLLMs = providerOrder.filter(provider => enabledProviders.has(provider))

  switch (strategy) {
    case 'llm-primary':
      return [...enabledLLMs, 'traditional']

    case 'traditional-primary':
      return ['traditional', ...enabledLLMs]

    case 'hybrid':
      // Interleave LLMs with traditional for balanced approach
      const hybrid = []
      if (enabledLLMs.length > 0) hybrid.push(enabledLLMs[0])
      hybrid.push('traditional')
      if (enabledLLMs.length > 1) hybrid.push(...enabledLLMs.slice(1))
      return hybrid

    case 'cost-optimized':
      // Traditional first, then cheapest LLMs
      const sortedByPrice = enabledLLMs.sort((a, b) => {
        const priceA =
          DEFAULT_PARSING_CONFIG.llmProviders[a as LLMProvider['name']]?.costPer1k || Infinity
        const priceB =
          DEFAULT_PARSING_CONFIG.llmProviders[b as LLMProvider['name']]?.costPer1k || Infinity
        return priceA - priceB
      })
      return ['traditional', ...sortedByPrice]

    case 'accuracy-optimized':
      // All enabled LLMs in order, then traditional
      return [...enabledLLMs, 'traditional']

    default:
      return ['traditional']
  }
}

/**
 * Get parsing configuration from environment and database
 */
export async function getParsingConfig(userId?: string): Promise<ParsingConfig> {
  const config = { ...DEFAULT_PARSING_CONFIG }

  // Get settings from database if userId provided, otherwise use defaults
  let storedSettings
  if (userId) {
    try {
      const { getUserSettings } = await import('@/lib/settings-service')
      storedSettings = await getUserSettings(userId)
      console.log(`PDF parsing config loaded for user ${userId}:`, {
        hasApiKeys: storedSettings?.apiKeys ? Object.keys(storedSettings.apiKeys).length : 0,
        strategy: storedSettings?.defaultStrategy || 'not set',
      })
    } catch (error) {
      console.error('Failed to load user settings:', error)
      storedSettings = null
    }
  } else {
    console.log('No userId provided, using fallback settings')
    // Fallback to in-memory settings for backward compatibility
    try {
      const settingsStore = await import('@/lib/settings-store')
      storedSettings = settingsStore.getStoredSettings()
    } catch {
      storedSettings = null
    }
  }

  // Override with stored settings first
  if (storedSettings) {
    config.defaultStrategy = storedSettings.defaultStrategy as ParsingStrategy['name']
    config.providerOrder = storedSettings.providerOrder
    config.maxCostPerDocument = storedSettings.maxCostPerDocument
    config.dailyCostLimit = storedSettings.dailyCostLimit
    config.enableFallback = storedSettings.enableFallback
    config.collectTrainingData = storedSettings.collectTrainingData

    // Set API keys from stored settings
    Object.entries(storedSettings.apiKeys).forEach(([provider, apiKey]) => {
      if (apiKey && config.llmProviders[provider as LLMProvider['name']]) {
        config.llmProviders[provider as LLMProvider['name']].enabled = true
        config.llmProviders[provider as LLMProvider['name']].apiKey = apiKey
      }
    })
  }

  // Override with environment variables (takes precedence)
  if (process.env.ANTHROPIC_API_KEY) {
    config.llmProviders.anthropic.enabled = true
    config.llmProviders.anthropic.apiKey = process.env.ANTHROPIC_API_KEY
  }

  if (process.env.GEMINI_API_KEY) {
    config.llmProviders.gemini.enabled = true
    config.llmProviders.gemini.apiKey = process.env.GEMINI_API_KEY
  }

  if (process.env.OPENAI_API_KEY) {
    config.llmProviders.openai.enabled = true
    config.llmProviders.openai.apiKey = process.env.OPENAI_API_KEY
  }

  // Override provider order from environment
  if (process.env.PDF_PROVIDER_ORDER) {
    config.providerOrder = process.env.PDF_PROVIDER_ORDER.split(',')
  }

  // Build enabled providers set
  const enabledProviders = new Set(
    Object.entries(config.llmProviders)
      .filter(([_, provider]) => provider.enabled)
      .map(([name, _]) => name)
  )

  // Dynamically build fallback chains for each strategy
  Object.keys(config.strategies).forEach(strategyName => {
    const strategy = strategyName as ParsingStrategy['name']
    config.strategies[strategy].fallbackChain = buildFallbackChain(
      strategy,
      config.providerOrder,
      enabledProviders
    )
  })

  // Auto-select strategy based on available providers
  if (
    !config.llmProviders.anthropic.enabled &&
    !config.llmProviders.gemini.enabled &&
    !config.llmProviders.openai.enabled
  ) {
    config.defaultStrategy = 'traditional-primary'
  }

  // Override strategy from environment
  if (process.env.PDF_PARSING_STRATEGY) {
    config.defaultStrategy = process.env.PDF_PARSING_STRATEGY as ParsingStrategy['name']
  }

  // Log final configuration for debugging
  console.log('Final PDF parsing configuration:', {
    strategy: config.defaultStrategy,
    enabledProviders: Object.entries(config.llmProviders)
      .filter(([_, provider]) => provider.enabled)
      .map(([name, provider]) => ({
        name,
        hasApiKey: !!provider.apiKey,
        model: provider.model,
      })),
    fallbackChain: config.strategies[config.defaultStrategy]?.fallbackChain || [],
  })

  return config
}
