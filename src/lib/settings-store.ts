/**
 * Temporary in-memory settings store
 * In production, this would be replaced with secure database storage
 */

interface StoredSettings {
  apiKeys: Record<string, string>
  defaultStrategy: string
  providerOrder: string[]
  maxCostPerDocument: number
  dailyCostLimit: number
  enableFallback: boolean
  collectTrainingData: boolean
}

// In-memory storage for settings (temporary solution)
let storedSettings: StoredSettings = {
  apiKeys: {},
  defaultStrategy: 'hybrid',
  providerOrder: ['anthropic', 'gemini', 'openai'],
  maxCostPerDocument: 0.1,
  dailyCostLimit: 10.0,
  enableFallback: true,
  collectTrainingData: true,
}

export function getStoredSettings(): StoredSettings {
  return { ...storedSettings }
}

export function updateStoredSettings(updates: Partial<StoredSettings>): void {
  storedSettings = { ...storedSettings, ...updates }
  console.log('Settings updated:', {
    ...updates,
    apiKeys: Object.fromEntries(
      Object.entries(updates.apiKeys || {}).map(([key, value]) => [
        key,
        value ? '[HIDDEN]' : undefined,
      ])
    ),
  })
}

export function hasApiKey(provider: string): boolean {
  return !!storedSettings.apiKeys[provider]
}

export function getApiKey(provider: string): string | undefined {
  return storedSettings.apiKeys[provider]
}
