/**
 * LLM Status Hook
 * Client-side hook to check LLM configuration status
 */

'use client'

import { useState, useEffect } from 'react'

interface LLMStatusData {
  hasConfiguredProvider: boolean
  primaryProvider: string | null
  totalProviders: number
  lastChecked: Date
  loading: boolean
  error: string | null
}

export function useLLMStatus() {
  const [status, setStatus] = useState<LLMStatusData>({
    hasConfiguredProvider: false,
    primaryProvider: null,
    totalProviders: 0,
    lastChecked: new Date(),
    loading: true,
    error: null,
  })

  const checkLLMStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await fetch('/api/settings/parsing-config', {
        credentials: 'include',
        cache: 'no-cache',
      })
      
      if (response.ok) {
        const config = await response.json()
        const providers = Object.values(config.llmProviders || {}) as any[]
        const configuredProviders = providers.filter((p: any) => p.status === 'connected')
        const primaryProvider = config.providerOrder?.[0] || null
        
        setStatus({
          hasConfiguredProvider: configuredProviders.length > 0,
          primaryProvider,
          totalProviders: configuredProviders.length,
          lastChecked: new Date(),
          loading: false,
          error: null,
        })
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to check LLM status:', error)
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to check LLM status',
      }))
    }
  }

  const refreshStatus = () => {
    checkLLMStatus()
  }

  useEffect(() => {
    // Initial check
    checkLLMStatus()
    
    // Check every 5 minutes
    const interval = setInterval(checkLLMStatus, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return {
    ...status,
    refresh: refreshStatus,
  }
}