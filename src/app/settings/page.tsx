/**
 * Settings Page - Configuration for LLM Parsing and API Keys
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  UsersIcon 
} from '@heroicons/react/24/outline'
import { UserManagement } from '@/components/users/UserManagement'
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
  const [activeTab, setActiveTab] = useState<'providers' | 'strategies' | 'advanced' | 'users'>('providers')
  
  const [providers, setProviders] = useState<LLMProvider[]>([])
  const [strategies, setStrategies] = useState<ParsingStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<string>('hybrid')
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [providerOrder, setProviderOrder] = useState<string[]>(['anthropic', 'gemini', 'openai'])
  
  // Advanced settings
  const [maxCostPerDocument, setMaxCostPerDocument] = useState(0.10)
  const [dailyCostLimit, setDailyCostLimit] = useState(10.00)
  const [enableFallback, setEnableFallback] = useState(true)
  const [collectTrainingData, setCollectTrainingData] = useState(true)

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
      const response = await fetch(`${window.location.origin}/api/settings/parsing-config`, {
        credentials: 'include'
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

    setProviders(prev => prev.map(p => 
      p.name === providerName ? { ...p, status: 'testing' } : p
    ))

    try {
      console.log('Testing provider:', providerName)
      console.log('User context:', { user, isAuthenticated, isLoading })
      
      const response = await fetch(`${window.location.origin}/api/settings/test-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: providerName,
          apiKey: apiKeys[providerName]
        })
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', [...response.headers.entries()])

      const result = await response.json()
      
      setProviders(prev => prev.map(p => 
        p.name === providerName ? { 
          ...p, 
          status: result.success ? 'connected' : 'disconnected'
        } : p
      ))

      if (result.success) {
        toast.success(`${providerName} connected successfully`)
      } else {
        toast.error(`Failed to connect to ${providerName}: ${result.error}`)
      }
    } catch (error) {
      setProviders(prev => prev.map(p => 
        p.name === providerName ? { ...p, status: 'disconnected' } : p
      ))
      toast.error(`Connection test failed for ${providerName}`)
    }
  }

  const saveConfiguration = async () => {
    setSaving(true)
    try {
      const config = {
        llmProviders: providers.reduce((acc, provider) => ({
          ...acc,
          [provider.name]: {
            ...provider,
            enabled: !!apiKeys[provider.name] && provider.status === 'connected',
            apiKey: apiKeys[provider.name],
            order: providerOrder.indexOf(provider.name)
          }
        }), {}),
        defaultStrategy: selectedStrategy,
        providerOrder,
        maxCostPerDocument,
        dailyCostLimit,
        enableFallback,
        collectTrainingData
      }

      const response = await fetch(`${window.location.origin}/api/settings/parsing-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
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
    return providerOrder
      .map(name => providerMap.get(name))
      .filter(Boolean) as LLMProvider[]
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
        breadcrumbs={[
          { label: 'Settings' }
        ]}
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
            { id: 'users', label: 'User Management', icon: UsersIcon }
          ].map((tab) => {
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
            Configure API keys and connection settings for LLM providers. Drag to reorder provider priority for fallback chains.
          </div>

          {/* Provider Ordering Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Provider Priority Order</h3>
            <p className="text-xs text-blue-700 mb-3">
              Drag providers to set the order they'll be tried during parsing. First provider has highest priority.
            </p>
            <div className="space-y-2">
              {getOrderedProviders().map((provider, index) => (
                <div key={provider.name} className="flex items-center justify-between bg-white border border-blue-200 rounded px-3 py-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{provider.displayName}</span>
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
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
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
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {getOrderedProviders().map((provider) => (
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
                      <CurrencyDollarIcon className="h-4 w-4" />
                      ${provider.costPer1k}/1K tokens
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
                      onChange={(e) => setApiKeys(prev => ({
                        ...prev,
                        [provider.name]: e.target.value
                      }))}
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
            Choose how the system should parse invoices. Strategies will use your provider priority order.
          </div>

          {/* Show current provider order impact */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Current Fallback Chain</h3>
            <p className="text-xs text-gray-600 mb-3">
              Based on your provider priority order, strategies will use this fallback sequence:
            </p>
            <div className="flex items-center space-x-2 text-sm">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">1st: {getOrderedProviders()[0]?.displayName || 'None'}</span>
              <span className="text-gray-400">→</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">2nd: {getOrderedProviders()[1]?.displayName || 'Traditional'}</span>
              <span className="text-gray-400">→</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">3rd: {getOrderedProviders()[2]?.displayName || 'Traditional'}</span>
            </div>
          </div>

          <div className="grid gap-4">
            {strategies.map((strategy) => (
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
                        <div className="font-medium">{(strategy.confidenceThreshold * 100).toFixed(0)}%</div>
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
                    onChange={(e) => setMaxCostPerDocument(parseFloat(e.target.value))}
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
                    onChange={(e) => setDailyCostLimit(parseFloat(e.target.value))}
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
                  <label className="text-sm font-medium text-gray-700">Enable Fallback Parsing</label>
                  <p className="text-sm text-gray-500">Fallback to traditional parsing if LLM fails</p>
                </div>
                <Switch
                  checked={enableFallback}
                  onCheckedChange={setEnableFallback}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Collect Training Data</label>
                  <p className="text-sm text-gray-500">Collect corrections to improve parsing accuracy</p>
                </div>
                <Switch
                  checked={collectTrainingData}
                  onCheckedChange={setCollectTrainingData}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <UserManagement />
      )}

      {/* Save Button - Hide for user management tab */}
      {activeTab !== 'users' && (
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <Button
            onClick={saveConfiguration}
            disabled={saving}
            className="px-8"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}
      </div>
    </AppLayout>
  )
}