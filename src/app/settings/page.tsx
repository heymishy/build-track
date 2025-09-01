/**
 * Settings Page - Configuration for LLM Parsing and API Keys
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'react-hot-toast'
import {
  CogIcon,
  KeyIcon,
  BeakerIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UsersIcon,
  Square3Stack3DIcon,
} from '@heroicons/react/24/outline'
import { UserManagement } from '@/components/users/UserManagement'
import { SupplierManagement } from '@/components/suppliers/SupplierManagement'
import { PageHeader } from '@/components/navigation/PageHeader'
import { AppLayout } from '@/components/layout/AppLayout'

interface LLMProvider {
  name: string
  displayName: string
  model: string
  enabled: boolean
  priority: number
  costPer1k: number
  rateLimits: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
  status?: 'connected' | 'disconnected' | 'testing'
  lastUsed?: string
  totalCost?: number
  order?: number
}

interface ParsingStrategy {
  name: string
  displayName: string
  description: string
  fallbackChain: string[]
  confidenceThreshold: number
  maxCostPerInvoice: number
  recommended?: boolean
}

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'providers' | 'strategies' | 'advanced' | 'integrations' | 'users' | 'suppliers'
  >('providers')

  const [providers, setProviders] = useState<LLMProvider[]>([])
  const [strategies, setStrategies] = useState<ParsingStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<string>('hybrid')
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [providerOrder, setProviderOrder] = useState<string[]>(['anthropic', 'gemini', 'openai'])

  // Advanced settings
  const [maxCostPerDocument, setMaxCostPerDocument] = useState(0.1)
  const [dailyCostLimit, setDailyCostLimit] = useState(10.0)
  const [enableFallback, setEnableFallback] = useState(true)
  const [collectTrainingData, setCollectTrainingData] = useState(true)

  // Google Sheets integration
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState({
    serviceAccountKey: '',
    clientEmail: '',
    privateKey: '',
    isConfigured: false,
    method: 'json' as 'json' | 'individual',
  })
  const [googleSheetsLoading, setGoogleSheetsLoading] = useState(false)
  const [googleSheetsTesting, setGoogleSheetsTesting] = useState(false)

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/')
      return
    }
    loadConfiguration()
  }, [isAuthenticated, isLoading, router])

  const loadConfiguration = async () => {
    try {
      // Load LLM configuration
      const response = await fetch(`${window.location.origin}/api/settings/parsing-config`, {
        credentials: 'include',
      })
      if (response.ok) {
        const config = await response.json()
        setProviders(Object.values(config.llmProviders))
        setStrategies(Object.values(config.strategies))
        setSelectedStrategy(config.defaultStrategy)
        setMaxCostPerDocument(config.maxCostPerDocument)
        setDailyCostLimit(config.dailyCostLimit)
        setEnableFallback(config.enableFallback)
        setCollectTrainingData(config.collectTrainingData)
      }

      // Load Google Sheets configuration
      const gsResponse = await fetch(`${window.location.origin}/api/settings/google-sheets`, {
        credentials: 'include',
      })
      if (gsResponse.ok) {
        const gsConfig = await gsResponse.json()
        setGoogleSheetsConfig(prev => ({
          ...prev,
          isConfigured: gsConfig.isConfigured,
          method: gsConfig.hasServiceAccountKey ? 'json' : 'individual'
        }))
      }
    } catch (error) {
      console.error('Failed to load configuration:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const testProvider = async (providerName: string) => {
    if (!apiKeys[providerName]) {
      toast.error(`Please enter API key for ${providerName}`)
      return
    }

    setProviders(prev => prev.map(p => (p.name === providerName ? { ...p, status: 'testing' } : p)))

    try {
      console.log('Testing provider:', providerName)
      console.log('User context:', { user, isAuthenticated, isLoading })

      const response = await fetch(`${window.location.origin}/api/settings/test-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: providerName,
          apiKey: apiKeys[providerName],
        }),
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', [...response.headers.entries()])

      const result = await response.json()

      setProviders(prev =>
        prev.map(p =>
          p.name === providerName
            ? {
                ...p,
                status: result.success ? 'connected' : 'disconnected',
              }
            : p
        )
      )

      if (result.success) {
        toast.success(`${providerName} connected successfully`)
      } else {
        toast.error(`Failed to connect to ${providerName}: ${result.error}`)
      }
    } catch (error) {
      setProviders(prev =>
        prev.map(p => (p.name === providerName ? { ...p, status: 'disconnected' } : p))
      )
      toast.error(`Connection test failed for ${providerName}`)
    }
  }

  const saveConfiguration = async () => {
    setSaving(true)
    try {
      const config = {
        llmProviders: providers.reduce(
          (acc, provider) => ({
            ...acc,
            [provider.name]: {
              ...provider,
              enabled: !!apiKeys[provider.name] && provider.status === 'connected',
              apiKey: apiKeys[provider.name],
              order: providerOrder.indexOf(provider.name),
            },
          }),
          {}
        ),
        defaultStrategy: selectedStrategy,
        providerOrder,
        maxCostPerDocument,
        dailyCostLimit,
        enableFallback,
        collectTrainingData,
      }

      const response = await fetch(`${window.location.origin}/api/settings/parsing-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      })

      if (response.ok) {
        toast.success('Settings saved successfully')
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const moveProviderUp = (providerName: string) => {
    const currentIndex = providerOrder.indexOf(providerName)
    if (currentIndex > 0) {
      const newOrder = [...providerOrder]
      newOrder[currentIndex] = newOrder[currentIndex - 1]
      newOrder[currentIndex - 1] = providerName
      setProviderOrder(newOrder)
    }
  }

  const moveProviderDown = (providerName: string) => {
    const currentIndex = providerOrder.indexOf(providerName)
    if (currentIndex < providerOrder.length - 1) {
      const newOrder = [...providerOrder]
      newOrder[currentIndex] = newOrder[currentIndex + 1]
      newOrder[currentIndex + 1] = providerName
      setProviderOrder(newOrder)
    }
  }

  const getOrderedProviders = () => {
    const providerMap = new Map(providers.map(p => [p.name, p]))
    return providerOrder.map(name => providerMap.get(name)).filter(Boolean) as LLMProvider[]
  }

  const testGoogleSheetsConnection = async () => {
    if (!googleSheetsConfig.serviceAccountKey && (!googleSheetsConfig.clientEmail || !googleSheetsConfig.privateKey)) {
      toast.error('Please enter Google Sheets credentials first')
      return
    }

    setGoogleSheetsTesting(true)
    try {
      const response = await fetch('/api/settings/google-sheets/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          method: googleSheetsConfig.method,
          serviceAccountKey: googleSheetsConfig.serviceAccountKey,
          clientEmail: googleSheetsConfig.clientEmail,
          privateKey: googleSheetsConfig.privateKey,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('Google Sheets connection successful! ✅')
        console.log('Connection details:', result.details)
      } else {
        toast.error(`Connection failed: ${result.error}`)
        console.error('Connection test failed:', result)
      }
    } catch (error) {
      console.error('Connection test error:', error)
      toast.error('Connection test failed - check console for details')
    } finally {
      setGoogleSheetsTesting(false)
    }
  }

  const saveGoogleSheetsConfiguration = async () => {
    if (!googleSheetsConfig.serviceAccountKey && (!googleSheetsConfig.clientEmail || !googleSheetsConfig.privateKey)) {
      toast.error('Please enter Google Sheets credentials first')
      return
    }

    setGoogleSheetsLoading(true)
    try {
      const response = await fetch('/api/settings/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          method: googleSheetsConfig.method,
          serviceAccountKey: googleSheetsConfig.serviceAccountKey,
          clientEmail: googleSheetsConfig.clientEmail,
          privateKey: googleSheetsConfig.privateKey,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('Google Sheets configuration saved! ✅')
        setGoogleSheetsConfig(prev => ({ ...prev, isConfigured: true }))
        
        if (result.requiresRestart) {
          toast.loading('Server restart required for environment variables...', { duration: 3000 })
        }
        
        console.log('Configuration saved:', result)
      } else {
        toast.error(`Save failed: ${result.error}`)
        console.error('Save failed:', result)
      }
    } catch (error) {
      console.error('Save configuration error:', error)
      toast.error('Failed to save configuration - check console for details')
    } finally {
      setGoogleSheetsLoading(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="Configure LLM providers, parsing strategies, cost controls, and user management"
        icon={CogIcon}
        breadcrumbs={[{ label: 'Settings' }]}
        backTo="/dashboard"
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'providers', label: 'LLM Providers', icon: KeyIcon },
              { id: 'strategies', label: 'Parsing Strategies', icon: BeakerIcon },
              { id: 'advanced', label: 'Advanced Settings', icon: ShieldCheckIcon },
              { id: 'integrations', label: 'Integrations', icon: Square3Stack3DIcon },
              { id: 'users', label: 'User Management', icon: UsersIcon },
              { id: 'suppliers', label: 'Supplier Portal', icon: CogIcon },
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* LLM Providers Tab */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="text-sm text-gray-600">
              Configure API keys and connection settings for LLM providers. Drag to reorder provider
              priority for fallback chains.
            </div>

            {/* Provider Ordering Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Provider Priority Order</h3>
              <p className="text-xs text-blue-700 mb-3">
                Drag providers to set the order they'll be tried during parsing. First provider has
                highest priority.
              </p>
              <div className="space-y-2">
                {getOrderedProviders().map((provider, index) => (
                  <div
                    key={provider.name}
                    className="flex items-center justify-between bg-white border border-blue-200 rounded px-3 py-2"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {provider.displayName}
                      </span>
                      <span className="text-xs text-gray-500">${provider.costPer1k}/1K tokens</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => moveProviderUp(provider.name)}
                        disabled={index === 0}
                        className={`p-1 rounded ${
                          index === 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveProviderDown(provider.name)}
                        disabled={index === providerOrder.length - 1}
                        className={`p-1 rounded ${
                          index === providerOrder.length - 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {getOrderedProviders().map(provider => (
              <Card key={provider.name} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{provider.displayName}</h3>
                      {provider.status === 'connected' && (
                        <Badge className="bg-green-100 text-green-800">Connected</Badge>
                      )}
                      {provider.status === 'disconnected' && (
                        <Badge className="bg-red-100 text-red-800">Disconnected</Badge>
                      )}
                      {provider.status === 'testing' && (
                        <Badge className="bg-yellow-100 text-yellow-800">Testing...</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <BeakerIcon className="h-4 w-4" />
                        Model: {provider.model}
                      </div>
                      <div className="flex items-center gap-2">
                        <CurrencyDollarIcon className="h-4 w-4" />${provider.costPer1k}/1K tokens
                      </div>
                      <div className="flex items-center gap-2">
                        <ChartBarIcon className="h-4 w-4" />
                        {provider.rateLimits.requestsPerMinute} req/min
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4" />
                        Priority: {provider.priority}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <input
                        type="password"
                        placeholder={`Enter ${provider.displayName} API key`}
                        value={apiKeys[provider.name] || ''}
                        onChange={e =>
                          setApiKeys(prev => ({
                            ...prev,
                            [provider.name]: e.target.value,
                          }))
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <Button
                        onClick={() => testProvider(provider.name)}
                        disabled={!apiKeys[provider.name] || provider.status === 'testing'}
                        size="sm"
                      >
                        Test Connection
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Parsing Strategies Tab */}
        {activeTab === 'strategies' && (
          <div className="space-y-6">
            <div className="text-sm text-gray-600">
              Choose how the system should parse invoices. Strategies will use your provider
              priority order.
            </div>

            {/* Show current provider order impact */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Current Fallback Chain</h3>
              <p className="text-xs text-gray-600 mb-3">
                Based on your provider priority order, strategies will use this fallback sequence:
              </p>
              <div className="flex items-center space-x-2 text-sm">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  1st: {getOrderedProviders()[0]?.displayName || 'None'}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  2nd: {getOrderedProviders()[1]?.displayName || 'Traditional'}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  3rd: {getOrderedProviders()[2]?.displayName || 'Traditional'}
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              {strategies.map(strategy => (
                <Card
                  key={strategy.name}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedStrategy === strategy.name
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedStrategy(strategy.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={selectedStrategy === strategy.name}
                            onChange={() => setSelectedStrategy(strategy.name)}
                            className="h-4 w-4 text-blue-600"
                          />
                          <h3 className="font-semibold">{strategy.displayName}</h3>
                        </div>
                        {strategy.recommended && (
                          <Badge className="bg-blue-100 text-blue-800">Recommended</Badge>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-3">{strategy.description}</p>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Max Cost:</span>
                          <div className="font-medium">${strategy.maxCostPerInvoice}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Confidence:</span>
                          <div className="font-medium">
                            {(strategy.confidenceThreshold * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Fallback Chain:</span>
                          <div className="font-medium text-xs">
                            {strategy.fallbackChain.join(' → ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Settings Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Cost Controls</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Cost Per Document
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={maxCostPerDocument}
                      onChange={e => setMaxCostPerDocument(parseFloat(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Cost Limit
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="1000"
                      value={dailyCostLimit}
                      onChange={e => setDailyCostLimit(parseFloat(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Parsing Options</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Enable Fallback Parsing
                    </label>
                    <p className="text-sm text-gray-500">
                      Fallback to traditional parsing if LLM fails
                    </p>
                  </div>
                  <Switch checked={enableFallback} onCheckedChange={setEnableFallback} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Collect Training Data
                    </label>
                    <p className="text-sm text-gray-500">
                      Collect corrections to improve parsing accuracy
                    </p>
                  </div>
                  <Switch checked={collectTrainingData} onCheckedChange={setCollectTrainingData} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && <UserManagement />}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="text-sm text-gray-600">
              Configure external integrations for data export and automation.
            </div>

            {/* Google Sheets Integration */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Square3Stack3DIcon className="h-5 w-5" />
                    Google Sheets Integration
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Export invoices directly to Google Sheets for reporting and analysis
                  </p>
                </div>
                <Badge 
                  className={`${
                    googleSheetsConfig.isConfigured 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {googleSheetsConfig.isConfigured ? 'Configured' : 'Not Configured'}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">Configuration Method</h4>
                  
                  {/* Method Selection */}
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="googleSheetsMethod"
                        value="json"
                        checked={googleSheetsConfig.method === 'json'}
                        onChange={(e) => setGoogleSheetsConfig(prev => ({ 
                          ...prev, 
                          method: 'json',
                          // Clear individual fields when switching to JSON
                          clientEmail: '',
                          privateKey: ''
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-blue-900">Complete JSON Key</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="googleSheetsMethod"
                        value="individual"
                        checked={googleSheetsConfig.method === 'individual'}
                        onChange={(e) => setGoogleSheetsConfig(prev => ({ 
                          ...prev, 
                          method: 'individual',
                          // Clear JSON field when switching to individual
                          serviceAccountKey: ''
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-blue-900">Individual Fields</span>
                    </label>
                  </div>
                  
                  <p className="text-xs text-blue-700">
                    Choose your preferred configuration method based on what you have available.
                  </p>
                </div>

                {/* JSON Method */}
                {googleSheetsConfig.method === 'json' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Account JSON Key (Complete)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Paste your complete Google Service Account JSON key here..."
                      value={googleSheetsConfig.serviceAccountKey}
                      onChange={e =>
                        setGoogleSheetsConfig(prev => ({
                          ...prev,
                          serviceAccountKey: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Download from Google Cloud Console → Service Accounts → Create Key (JSON)
                    </p>
                  </div>
                )}

                {/* Individual Fields Method */}
                {googleSheetsConfig.method === 'individual' && (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client Email
                      </label>
                      <input
                        type="email"
                        placeholder="service-account@project-id.iam.gserviceaccount.com"
                        value={googleSheetsConfig.clientEmail}
                        onChange={e =>
                          setGoogleSheetsConfig(prev => ({
                            ...prev,
                            clientEmail: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Private Key
                      </label>
                      <textarea
                        rows={3}
                        placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                        value={googleSheetsConfig.privateKey}
                        onChange={e =>
                          setGoogleSheetsConfig(prev => ({
                            ...prev,
                            privateKey: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Security Notice</h4>
                  <p className="text-xs text-yellow-700">
                    These credentials will be stored as environment variables on your server. 
                    Never share these credentials or commit them to version control.
                  </p>
                </div>

                {/* Troubleshooting Guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">🛠️ Setup Requirements</h4>
                  <div className="text-xs text-blue-700 space-y-2">
                    <p className="font-medium">For Google Sheets export to work, ensure:</p>
                    <div className="space-y-1 ml-2">
                      <div>✅ Google Sheets API is enabled in Google Cloud Console</div>
                      <div>✅ Google Drive API is enabled in Google Cloud Console</div>
                      <div>✅ Service account has "Editor" or "Owner" role</div>
                      <div>✅ Service account key is properly formatted JSON</div>
                    </div>
                    <p className="text-blue-600 font-medium mt-2">
                      💡 If export fails with "Permission denied", check these APIs are enabled!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={testGoogleSheetsConnection}
                    disabled={googleSheetsTesting || (!googleSheetsConfig.serviceAccountKey && (!googleSheetsConfig.clientEmail || !googleSheetsConfig.privateKey))}
                    size="sm"
                    variant="outline"
                  >
                    {googleSheetsTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button
                    onClick={async () => {
                      setGoogleSheetsTesting(true)
                      try {
                        const response = await fetch('/api/settings/google-sheets/test-simple', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            method: googleSheetsConfig.method,
                            serviceAccountKey: googleSheetsConfig.serviceAccountKey,
                            clientEmail: googleSheetsConfig.clientEmail,
                            privateKey: googleSheetsConfig.privateKey,
                          }),
                        })
                        const result = await response.json()
                        if (result.success) {
                          toast.success('Advanced test passed! ✅')
                        } else {
                          toast.error(`Advanced test: ${result.error}`)
                          if (result.troubleshooting) {
                            console.log('Troubleshooting:', result.troubleshooting)
                          }
                        }
                        console.log('Advanced test result:', result)
                      } catch (error) {
                        console.error('Advanced test error:', error)
                        toast.error('Advanced test failed')
                      } finally {
                        setGoogleSheetsTesting(false)
                      }
                    }}
                    disabled={googleSheetsTesting || (!googleSheetsConfig.serviceAccountKey && (!googleSheetsConfig.clientEmail || !googleSheetsConfig.privateKey))}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Advanced Test
                  </Button>
                  <Button
                    onClick={async () => {
                      setGoogleSheetsTesting(true)
                      try {
                        const response = await fetch('/api/settings/google-sheets/diagnose', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            method: googleSheetsConfig.method,
                            serviceAccountKey: googleSheetsConfig.serviceAccountKey,
                            clientEmail: googleSheetsConfig.clientEmail,
                            privateKey: googleSheetsConfig.privateKey,
                          }),
                        })
                        const result = await response.json()
                        console.log('Full diagnostic result:', result)
                        
                        if (result.success) {
                          toast.success('Full diagnostic passed! ✅ Check console for details.')
                        } else {
                          toast.error(`Diagnostic found ${result.diagnostics?.summary?.failed || 'multiple'} issues`)
                          
                          // Show specific recommendations
                          if (result.diagnostics?.recommendations) {
                            console.log('🔧 Recommendations:')
                            result.diagnostics.recommendations.forEach((rec: string, i: number) => {
                              console.log(`${i + 1}. ${rec}`)
                            })
                          }
                        }
                      } catch (error) {
                        console.error('Diagnostic error:', error)
                        toast.error('Diagnostic failed to run')
                      } finally {
                        setGoogleSheetsTesting(false)
                      }
                    }}
                    disabled={googleSheetsTesting || (!googleSheetsConfig.serviceAccountKey && (!googleSheetsConfig.clientEmail || !googleSheetsConfig.privateKey))}
                    size="sm"
                    variant="outline"
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700"
                  >
                    Full Diagnostic
                  </Button>
                  <Button
                    onClick={async () => {
                      setGoogleSheetsTesting(true)
                      try {
                        const response = await fetch('/api/settings/google-sheets/test-sheets-only', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            method: googleSheetsConfig.method,
                            serviceAccountKey: googleSheetsConfig.serviceAccountKey,
                            clientEmail: googleSheetsConfig.clientEmail,
                            privateKey: googleSheetsConfig.privateKey,
                          }),
                        })
                        const result = await response.json()
                        console.log('Sheets-only test result:', result)
                        
                        if (result.success) {
                          toast.success('Sheets API works! ✅ Check console for spreadsheet link.')
                        } else {
                          toast.error(`Sheets-only test failed: ${result.error}`)
                        }
                      } catch (error) {
                        console.error('Sheets-only test error:', error)
                        toast.error('Sheets-only test failed')
                      } finally {
                        setGoogleSheetsTesting(false)
                      }
                    }}
                    disabled={googleSheetsTesting || (!googleSheetsConfig.serviceAccountKey && (!googleSheetsConfig.clientEmail || !googleSheetsConfig.privateKey))}
                    size="sm"
                    variant="outline"
                    className="text-xs bg-green-50 hover:bg-green-100 text-green-700"
                  >
                    Test Sheets Only
                  </Button>
                  <Button
                    onClick={async () => {
                      setGoogleSheetsTesting(true)
                      try {
                        const response = await fetch('/api/settings/google-sheets/test-alternative-auth', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            method: googleSheetsConfig.method,
                            serviceAccountKey: googleSheetsConfig.serviceAccountKey,
                            clientEmail: googleSheetsConfig.clientEmail,
                            privateKey: googleSheetsConfig.privateKey,
                          }),
                        })
                        const result = await response.json()
                        console.log('Alternative auth test result:', result)
                        
                        if (result.success) {
                          toast.success(`Alternative auth: ${result.details?.successfulMethods?.length || 0} methods worked! ✅`)
                          console.log('🎉 Working methods:', result.details?.successfulMethods)
                          if (result.recommendation) {
                            console.log('💡 Recommendation:', result.recommendation)
                          }
                        } else {
                          toast.error(`Alternative auth: All methods failed`)
                          if (result.recommendation) {
                            console.log('💡 Recommendation:', result.recommendation)
                          }
                        }
                      } catch (error) {
                        console.error('Alternative auth test error:', error)
                        toast.error('Alternative auth test failed')
                      } finally {
                        setGoogleSheetsTesting(false)
                      }
                    }}
                    disabled={googleSheetsTesting || (!googleSheetsConfig.serviceAccountKey && (!googleSheetsConfig.clientEmail || !googleSheetsConfig.privateKey))}
                    size="sm"
                    variant="outline"
                    className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700"
                  >
                    Alt Auth Test
                  </Button>
                  <Button
                    onClick={async () => {
                      setGoogleSheetsTesting(true)
                      try {
                        const response = await fetch('/api/settings/google-sheets/test-domain-policy', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            method: googleSheetsConfig.method,
                            serviceAccountKey: googleSheetsConfig.serviceAccountKey,
                            clientEmail: googleSheetsConfig.clientEmail,
                            privateKey: googleSheetsConfig.privateKey,
                          }),
                        })
                        const result = await response.json()
                        console.log('Domain policy test result:', result)
                        
                        if (result.success) {
                          toast.success(`Domain test: ${result.analysis?.accessLevel} access level`)
                          console.log('🔍 Access Analysis:', result.analysis)
                        } else {
                          toast.error(`Domain test: ${result.analysis?.likelyIssue || 'Access blocked'}`)
                        }
                        
                        if (result.recommendation) {
                          console.log('💡 Domain Recommendation:', result.recommendation)
                        }
                        
                        if (result.analysis?.likelyIssue === 'DOMAIN_POLICY') {
                          console.log('🚨 DOMAIN POLICY RESTRICTION DETECTED!')
                          console.log('📞 Contact your Google Workspace admin to allow service account API access')
                        }
                      } catch (error) {
                        console.error('Domain policy test error:', error)
                        toast.error('Domain policy test failed')
                      } finally {
                        setGoogleSheetsTesting(false)
                      }
                    }}
                    disabled={googleSheetsTesting || (!googleSheetsConfig.serviceAccountKey && (!googleSheetsConfig.clientEmail || !googleSheetsConfig.privateKey))}
                    size="sm"
                    variant="outline"
                    className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700"
                  >
                    Domain Test
                  </Button>
                  <Button
                    onClick={saveGoogleSheetsConfiguration}
                    disabled={googleSheetsLoading || (!googleSheetsConfig.serviceAccountKey && (!googleSheetsConfig.clientEmail || !googleSheetsConfig.privateKey))}
                    size="sm"
                  >
                    {googleSheetsLoading ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>

                {/* Debug Section for LLM Status */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">🔧 Debug Tools</h4>
                  <p className="text-xs text-gray-600 mb-3">Test system features for troubleshooting</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        // Test LLM status indicator
                        window.dispatchEvent(new CustomEvent('llm-processing-start', { 
                          detail: { operation: 'Testing LLM indicator...' } 
                        }))
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('llm-processing-end'))
                        }, 3000)
                        toast.success('LLM indicator test started (3 seconds)')
                      }}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      Test LLM Indicator
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Other integrations can be added here */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Other Integrations</h3>
              <div className="text-sm text-gray-500">
                Additional integrations (Xero, QuickBooks, etc.) coming soon...
              </div>
            </Card>
          </div>
        )}

        {/* Supplier Management Tab */}
        {activeTab === 'suppliers' && <SupplierManagement />}

        {/* Save Button - Hide for user, supplier, and integrations management tabs */}
        {activeTab !== 'users' && activeTab !== 'suppliers' && activeTab !== 'integrations' && (
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <Button onClick={saveConfiguration} disabled={saving} className="px-8">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
