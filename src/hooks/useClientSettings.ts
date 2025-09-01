/**
 * Client-Side Settings Hook
 * Safe client-only settings management that works with both SQLite (dev) and PostgreSQL (prod)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

interface SettingsState {
  theme: 'light' | 'dark' | 'system'
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

const DEFAULT_SETTINGS: SettingsState = {
  theme: 'light',
  loading: true,
  error: null,
  lastUpdated: null,
}

export function useClientSettings() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)

  const loadSettings = useCallback(async () => {
    try {
      setSettings(prev => ({ ...prev, loading: true, error: null }))

      // Try to load from localStorage first (immediate feedback)
      const cached = localStorage.getItem('app-settings')
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached)
          setSettings(prev => ({
            ...prev,
            ...parsedCache,
            loading: true, // Still loading from server
          }))
        } catch (e) {
          console.warn('Failed to parse cached settings:', e)
        }
      }

      // Then load from server and update both state and cache
      const response = await fetch('/api/settings', {
        credentials: 'include',
        cache: 'no-cache',
      })

      if (response.ok) {
        const data = await response.json()
        const newSettings = {
          theme: data.user?.theme || 'light',
          loading: false,
          error: null,
          lastUpdated: new Date(),
        }

        setSettings(newSettings)
        localStorage.setItem('app-settings', JSON.stringify(newSettings))
      } else {
        throw new Error(`Settings load failed: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      setSettings(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load settings',
      }))
    }
  }, [])

  const updateTheme = useCallback(
    async (theme: 'light' | 'dark' | 'system') => {
      try {
        // Optimistic update
        const optimisticSettings = {
          ...settings,
          theme,
          lastUpdated: new Date(),
        }
        setSettings(optimisticSettings)
        localStorage.setItem('app-settings', JSON.stringify(optimisticSettings))

        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', theme)

        // Persist to server
        const response = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ user: { theme } }),
        })

        if (!response.ok) {
          throw new Error(`Theme update failed: ${response.status}`)
        }

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Theme update failed')
        }

        console.log('Theme updated successfully:', theme)
      } catch (error) {
        console.error('Failed to update theme:', error)
        // Revert optimistic update on failure
        loadSettings()
        setSettings(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to update theme',
        }))
      }
    },
    [settings, loadSettings]
  )

  const clearError = useCallback(() => {
    setSettings(prev => ({ ...prev, error: null }))
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Apply theme on mount and when it changes
  useEffect(() => {
    if (!settings.loading && settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme)
    }
  }, [settings.theme, settings.loading])

  return {
    theme: settings.theme,
    loading: settings.loading,
    error: settings.error,
    lastUpdated: settings.lastUpdated,
    updateTheme,
    refresh: loadSettings,
    clearError,
  }
}
