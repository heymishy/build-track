/**
 * Application Context Provider
 * Combines all context providers and manages global app state
 */

'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { AuthProvider } from './AuthContext'
import { ProjectsProvider } from './ProjectsContext'
import { useSettings } from '@/lib/settings'
import type { AppSettings, SystemSettings, LoadingState } from '@/types'

// ==================== App State Interface ====================

interface AppState {
  // System info
  version: string
  environment: 'development' | 'production' | 'test'
  maintenanceMode: boolean
  
  // Feature flags
  features: {
    invoiceProcessing: boolean
    milestoneTracking: boolean
    costAnalytics: boolean
    reporting: boolean
    advancedSettings: boolean
  }
  
  // UI state
  ui: {
    sidebarOpen: boolean
    theme: 'light' | 'dark' | 'system'
    loading: LoadingState
    notifications: Array<{
      id: string
      type: 'info' | 'success' | 'warning' | 'error'
      title: string
      message: string
      timestamp: Date
      read: boolean
      actions?: Array<{
        label: string
        action: () => void
        primary?: boolean
      }>
    }>
  }
  
  // Network state
  network: {
    online: boolean
    slowConnection: boolean
    lastOnline?: Date
  }
  
  // Error boundaries
  errors: Array<{
    id: string
    error: Error
    timestamp: Date
    component: string
    userId?: string
    resolved: boolean
  }>
}

// ==================== App Actions Interface ====================

interface AppActions {
  // UI Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: AppState['ui']['theme']) => void
  
  // Loading state
  setGlobalLoading: (loading: boolean, message?: string) => void
  
  // Notifications
  addNotification: (notification: Omit<AppState['ui']['notifications'][0], 'id' | 'timestamp' | 'read'>) => void
  removeNotification: (id: string) => void
  markNotificationRead: (id: string) => void
  clearAllNotifications: () => void
  
  // Error handling
  reportError: (error: Error, component: string) => void
  resolveError: (id: string) => void
  clearErrors: () => void
  
  // System
  refreshSystemInfo: () => Promise<void>
  toggleMaintenanceMode: (enabled: boolean) => void
  
  // Feature flags
  updateFeatureFlags: (features: Partial<AppState['features']>) => void
  isFeatureEnabled: (feature: keyof AppState['features']) => boolean
}

// ==================== Context Definition ====================

interface AppContextType {
  state: AppState
  actions: AppActions
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// ==================== Initial State ====================

const createInitialAppState = (): AppState => ({
  version: '0.1.0',
  environment: process.env.NODE_ENV as 'development' | 'production' | 'test',
  maintenanceMode: false,
  
  features: {
    invoiceProcessing: true,
    milestoneTracking: true,
    costAnalytics: true,
    reporting: false, // Coming soon
    advancedSettings: process.env.NODE_ENV === 'development'
  },
  
  ui: {
    sidebarOpen: true,
    theme: 'system',
    loading: {
      isLoading: false,
      error: null
    },
    notifications: []
  },
  
  network: {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    slowConnection: false
  },
  
  errors: []
})

// ==================== Provider Component ====================

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createInitialAppState)
  const { settings, updateSettings } = useSettings()

  // ==================== Network Detection ====================

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateOnlineStatus = () => {
      setState(prev => ({
        ...prev,
        network: {
          ...prev.network,
          online: navigator.onLine,
          lastOnline: navigator.onLine ? new Date() : prev.network.lastOnline
        }
      }))
    }

    const detectSlowConnection = () => {
      const connection = (navigator as any).connection
      if (connection) {
        const isSlowConnection = connection.effectiveType === 'slow-2g' || 
                                connection.effectiveType === '2g'
        
        setState(prev => ({
          ...prev,
          network: {
            ...prev.network,
            slowConnection: isSlowConnection
          }
        }))
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    // Check connection speed if available
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', detectSlowConnection)
      detectSlowConnection()
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', detectSlowConnection)
      }
    }
  }, [])

  // ==================== Theme Synchronization ====================

  useEffect(() => {
    if (settings.user.theme !== state.ui.theme) {
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, theme: settings.user.theme }
      }))
    }
  }, [settings.user.theme])

  // ==================== Actions Implementation ====================

  const actions: AppActions = {
    // UI Actions
    toggleSidebar: () => {
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, sidebarOpen: !prev.ui.sidebarOpen }
      }))
    },

    setSidebarOpen: (open: boolean) => {
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, sidebarOpen: open }
      }))
    },

    setTheme: (theme: AppState['ui']['theme']) => {
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, theme }
      }))
      // Update user settings
      updateSettings({
        user: { ...settings.user, theme }
      })
    },

    // Loading state
    setGlobalLoading: (loading: boolean, message?: string) => {
      setState(prev => ({
        ...prev,
        ui: {
          ...prev.ui,
          loading: {
            isLoading: loading,
            error: loading ? null : prev.ui.loading.error,
            message
          }
        }
      }))
    },

    // Notifications
    addNotification: (notification) => {
      const newNotification = {
        ...notification,
        id: `notification_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        timestamp: new Date(),
        read: false
      }
      
      setState(prev => ({
        ...prev,
        ui: {
          ...prev.ui,
          notifications: [newNotification, ...prev.ui.notifications].slice(0, 50) // Keep max 50
        }
      }))

      // Auto-remove success and info notifications after 5 seconds
      if (notification.type === 'success' || notification.type === 'info') {
        setTimeout(() => {
          actions.removeNotification(newNotification.id)
        }, 5000)
      }
    },

    removeNotification: (id: string) => {
      setState(prev => ({
        ...prev,
        ui: {
          ...prev.ui,
          notifications: prev.ui.notifications.filter(n => n.id !== id)
        }
      }))
    },

    markNotificationRead: (id: string) => {
      setState(prev => ({
        ...prev,
        ui: {
          ...prev.ui,
          notifications: prev.ui.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          )
        }
      }))
    },

    clearAllNotifications: () => {
      setState(prev => ({
        ...prev,
        ui: { ...prev.ui, notifications: [] }
      }))
    },

    // Error handling
    reportError: (error: Error, component: string) => {
      const errorReport = {
        id: `error_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        error,
        timestamp: new Date(),
        component,
        resolved: false
      }
      
      setState(prev => ({
        ...prev,
        errors: [errorReport, ...prev.errors].slice(0, 20) // Keep max 20 errors
      }))

      // Add error notification
      actions.addNotification({
        type: 'error',
        title: 'Application Error',
        message: `Error in ${component}: ${error.message}`,
        actions: [
          {
            label: 'Report Issue',
            action: () => {
              // TODO: Implement error reporting
              console.log('Reporting error:', errorReport)
            }
          }
        ]
      })

      // Log to console in development
      if (state.environment === 'development') {
        console.error(`[${component}] Error:`, error)
      }
    },

    resolveError: (id: string) => {
      setState(prev => ({
        ...prev,
        errors: prev.errors.map(e =>
          e.id === id ? { ...e, resolved: true } : e
        )
      }))
    },

    clearErrors: () => {
      setState(prev => ({
        ...prev,
        errors: []
      }))
    },

    // System
    refreshSystemInfo: async () => {
      // TEMPORARILY DISABLED: Skip system info in development to prevent crashes
      if (process.env.NODE_ENV === 'development') {
        console.log('System info refresh disabled in development mode')
        return
      }

      try {
        const response = await fetch('/api/system/info')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            const systemInfo = result.data
            setState(prev => ({
              ...prev,
              version: systemInfo.version || prev.version,
              maintenanceMode: systemInfo.maintenanceMode || false,
              features: { ...prev.features, ...systemInfo.features }
            }))
          }
        }
      } catch (error) {
        console.warn('Failed to refresh system info:', error)
      }
    },

    toggleMaintenanceMode: (enabled: boolean) => {
      setState(prev => ({
        ...prev,
        maintenanceMode: enabled
      }))
      
      actions.addNotification({
        type: enabled ? 'warning' : 'info',
        title: 'Maintenance Mode',
        message: enabled 
          ? 'Application is now in maintenance mode' 
          : 'Maintenance mode disabled'
      })
    },

    // Feature flags
    updateFeatureFlags: (features: Partial<AppState['features']>) => {
      setState(prev => ({
        ...prev,
        features: { ...prev.features, ...features }
      }))
    },

    isFeatureEnabled: (feature: keyof AppState['features']): boolean => {
      return state.features[feature] && !state.maintenanceMode
    }
  }

  // ==================== Effect for System Info ====================

  useEffect(() => {
    // TEMPORARILY DISABLED: Skip system info polling in development to prevent crashes
    if (process.env.NODE_ENV === 'development') {
      console.log('System info polling disabled in development mode')
      return
    }

    // Refresh system info on mount
    const refreshSystemInfo = async () => {
      try {
        const response = await fetch('/api/system/info')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            const systemInfo = result.data
            setState(prev => ({
              ...prev,
              version: systemInfo.version || prev.version,
              maintenanceMode: systemInfo.maintenanceMode || false,
              features: { ...prev.features, ...systemInfo.features }
            }))
          }
        }
      } catch (error) {
        console.warn('Failed to refresh system info:', error)
      }
    }

    // Initial refresh
    refreshSystemInfo()

    // Set up periodic refresh (every 5 minutes)
    const interval = setInterval(refreshSystemInfo, 5 * 60 * 1000)

    return () => {
      clearInterval(interval)
    }
  }, []) // Empty dependency array to run only once

  // ==================== Maintenance Mode Check ====================

  if (state.maintenanceMode && state.environment === 'production') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            System Maintenance
          </h1>
          <p className="text-gray-600 mb-8">
            BuildTrack is currently undergoing maintenance. Please check back soon.
          </p>
          <div className="animate-pulse">
            <div className="h-2 bg-blue-200 rounded-full w-64 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  const contextValue: AppContextType = {
    state,
    actions
  }

  return (
    <AppContext.Provider value={contextValue}>
      <AuthProvider>
        <ProjectsProvider>
          {children}
        </ProjectsProvider>
      </AuthProvider>
    </AppContext.Provider>
  )
}

// ==================== Hook ====================

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// ==================== Utility Hooks ====================

export function useNotifications() {
  const { state, actions } = useApp()
  return {
    notifications: state.ui.notifications,
    unreadCount: state.ui.notifications.filter(n => !n.read).length,
    ...actions
  }
}

export function useFeatureFlags() {
  const { state, actions } = useApp()
  return {
    features: state.features,
    isFeatureEnabled: actions.isFeatureEnabled,
    updateFeatureFlags: actions.updateFeatureFlags
  }
}

export function useAppErrors() {
  const { state, actions } = useApp()
  return {
    errors: state.errors,
    unresolvedCount: state.errors.filter(e => !e.resolved).length,
    reportError: actions.reportError,
    resolveError: actions.resolveError,
    clearErrors: actions.clearErrors
  }
}

export function useNetworkStatus() {
  const { state } = useApp()
  return state.network
}

// ==================== Export Default ====================

export default AppProvider