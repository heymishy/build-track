/**
 * LLM Status Indicator Component
 * Shows current LLM configuration status in the application header
 */

'use client'

import { useState } from 'react'
import { KeyIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useLLMStatus } from '@/hooks/useLLMStatus'

export function LLMStatusIndicator() {
  const { hasConfiguredProvider, primaryProvider, totalProviders, loading, error } = useLLMStatus()
  const [showTooltip, setShowTooltip] = useState(false)

  if (loading) {
    return (
      <div className="h-6 w-6 animate-pulse bg-gray-200 rounded"></div>
    )
  }

  const getStatusColor = () => {
    if (loading || error) return 'text-gray-400'
    return hasConfiguredProvider ? 'text-green-500' : 'text-red-500'
  }

  const getStatusIcon = () => {
    if (loading) return <KeyIcon className="h-5 w-5" />
    if (error) return <ExclamationTriangleIcon className="h-5 w-5" />
    
    if (hasConfiguredProvider) {
      return <CheckCircleIcon className="h-5 w-5" />
    } else {
      return <ExclamationTriangleIcon className="h-5 w-5" />
    }
  }

  const getTooltipText = () => {
    if (loading) return 'Loading LLM status...'
    if (error) return `Error checking LLM status: ${error}`
    
    if (hasConfiguredProvider) {
      const providerName = getProviderDisplayName(primaryProvider)
      return `LLM configured: ${providerName} (${totalProviders} total)`
    } else {
      return 'No LLM providers configured. Go to Settings to add API keys.'
    }
  }

  const getProviderDisplayName = (provider: string | null) => {
    if (!provider) return 'Unknown'
    const names: Record<string, string> = {
      anthropic: 'Claude',
      gemini: 'Gemini',
      openai: 'OpenAI',
    }
    return names[provider] || provider
  }

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={() => window.location.href = '/settings'}
        className={`p-1 rounded-md hover:bg-gray-100 transition-colors ${getStatusColor()}`}
        title={getTooltipText()}
      >
        {getStatusIcon()}
      </button>
      
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
            {getTooltipText()}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-b-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}