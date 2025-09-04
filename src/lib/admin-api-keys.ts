/**
 * Admin API Key Service
 * Provides system-level API keys for supplier portal operations
 */

import { prisma } from '@/lib/prisma'

export interface AdminApiKeys {
  geminiApiKey?: string
  anthropicApiKey?: string
  openaiApiKey?: string
}

/**
 * Get API keys from the first admin user for system operations
 * Used by supplier portal when .env.local keys are not available
 */
export async function getAdminApiKeys(): Promise<AdminApiKeys> {
  try {
    // Find first admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        createdAt: 'asc', // Get the first/oldest admin
      },
    })

    if (!adminUser) {
      console.warn('⚠️ No admin user found for API key fallback')
      return {}
    }

    // Get admin user's API keys from settings
    const apiKeysSettings = await prisma.userSettings.findUnique({
      where: {
        userId_key: {
          userId: adminUser.id,
          key: 'api_keys',
        },
      },
    })

    if (!apiKeysSettings) {
      console.log(`📋 Admin user ${adminUser.name} has no API keys configured`)
      return {}
    }

    const apiKeys = JSON.parse(apiKeysSettings.value) as Record<string, string>
    console.log(`🔑 Using API keys from admin user: ${adminUser.name}`)

    return {
      geminiApiKey: apiKeys.gemini || undefined,
      anthropicApiKey: apiKeys.anthropic || undefined,
      openaiApiKey: apiKeys.openai || undefined,
    }
  } catch (error) {
    console.error('❌ Error fetching admin API keys:', error)
    return {}
  }
}

/**
 * Get consolidated API key configuration for supplier portal
 * EXCLUSIVE: Only uses admin Settings API keys, never environment variables
 * This ensures supplier portal always uses centrally managed keys
 */
export async function getSupplierPortalApiKeys(): Promise<{
  geminiApiKey?: string
  anthropicApiKey?: string
  openaiApiKey?: string
  source: 'admin_user' | 'none'
}> {
  console.log('🏢 Supplier portal: Checking admin Settings API keys only...')
  console.log('📋 Note: Environment variables (.env.local) are ignored for supplier portal')
  
  const adminKeys = await getAdminApiKeys()
  const hasAdminKeys = Object.values(adminKeys).some(key => key && key.trim() !== '')

  if (hasAdminKeys) {
    console.log('👑 Using admin Settings API keys for supplier portal')
    console.log('🔑 Available providers:', Object.entries(adminKeys)
      .filter(([_, key]) => key && key.trim() !== '')
      .map(([provider, _]) => provider.replace('ApiKey', ''))
      .join(', ')
    )
    return {
      ...adminKeys,
      source: 'admin_user' as const,
    }
  }

  console.warn('⚠️ No API keys found in admin Settings')
  console.warn('💡 Solution: Add API keys through Settings → LLM page as an admin user')
  return {
    source: 'none' as const,
  }
}