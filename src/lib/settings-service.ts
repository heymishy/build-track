/**
 * Settings Service - Database-backed persistent storage for user settings
 * Replaces in-memory settings-store.ts with proper database persistence
 */

import { prisma } from '@/lib/prisma'

// Import the interface from settings-store until we fully migrate
interface StoredSettings {
  apiKeys: Record<string, string>
  defaultStrategy: string
  providerOrder: string[]
  maxCostPerDocument: number
  dailyCostLimit: number
  enableFallback: boolean
  collectTrainingData: boolean
}

export class SettingsService {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async getSettings(): Promise<StoredSettings> {
    const settings = await prisma.userSettings.findMany({
      where: { userId: this.userId }
    })

    const result: StoredSettings = {
      apiKeys: {},
      defaultStrategy: 'hybrid',
      providerOrder: ['anthropic', 'gemini', 'openai'],
      maxCostPerDocument: 0.10,
      dailyCostLimit: 10.00,
      enableFallback: true,
      collectTrainingData: true
    }

    for (const setting of settings) {
      try {
        const value = JSON.parse(setting.value)
        
        switch (setting.key) {
          case 'api_keys':
            result.apiKeys = value
            break
          case 'default_strategy':
            result.defaultStrategy = value
            break
          case 'provider_order':
            result.providerOrder = value
            break
          case 'max_cost_per_document':
            result.maxCostPerDocument = value
            break
          case 'daily_cost_limit':
            result.dailyCostLimit = value
            break
          case 'enable_fallback':
            result.enableFallback = value
            break
          case 'collect_training_data':
            result.collectTrainingData = value
            break
        }
      } catch (error) {
        console.error(`Failed to parse setting ${setting.key}:`, error)
      }
    }

    return result
  }

  async updateSetting(key: string, value: any): Promise<void> {
    await prisma.userSettings.upsert({
      where: {
        userId_key: {
          userId: this.userId,
          key
        }
      },
      update: {
        value: JSON.stringify(value),
        updatedAt: new Date()
      },
      create: {
        userId: this.userId,
        key,
        value: JSON.stringify(value)
      }
    })
  }

  async setApiKey(provider: string, apiKey: string): Promise<void> {
    const currentSettings = await this.getSettings()
    const updatedApiKeys = {
      ...currentSettings.apiKeys,
      [provider]: apiKey
    }
    await this.updateSetting('api_keys', updatedApiKeys)
  }

  async removeApiKey(provider: string): Promise<void> {
    const currentSettings = await this.getSettings()
    const updatedApiKeys = { ...currentSettings.apiKeys }
    delete updatedApiKeys[provider]
    await this.updateSetting('api_keys', updatedApiKeys)
  }

  async setDefaultStrategy(strategy: string): Promise<void> {
    await this.updateSetting('default_strategy', strategy)
  }

  async setProviderOrder(order: string[]): Promise<void> {
    await this.updateSetting('provider_order', order)
  }

  async clearAllSettings(): Promise<void> {
    await prisma.userSettings.deleteMany({
      where: { userId: this.userId }
    })
  }
}

// Static helper functions for API routes
export async function getUserSettings(userId: string): Promise<StoredSettings> {
  const service = new SettingsService(userId)
  return await service.getSettings()
}

export async function updateUserSetting(userId: string, key: string, value: any): Promise<void> {
  const service = new SettingsService(userId)
  await service.updateSetting(key, value)
}