'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  isLoading: boolean
  installPrompt: BeforeInstallPromptEvent | null
  swRegistration: ServiceWorkerRegistration | null
  updateAvailable: boolean
}

interface PWAActions {
  install: () => Promise<boolean>
  checkForUpdates: () => Promise<void>
  applyUpdate: () => Promise<void>
  clearCache: () => Promise<void>
  registerSW: () => Promise<void>
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isLoading: true,
    installPrompt: null,
    swRegistration: null,
    updateAvailable: false,
  })

  // Check if app is installed
  const checkInstallStatus = useCallback(() => {
    if (typeof window === 'undefined') return

    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('utm_source=pwa')

    setState(prev => ({ ...prev, isInstalled }))
  }, [])

  // Register service worker
  const registerSW = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service Worker not supported')
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      console.log('Service Worker registered:', registration.scope)

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({ ...prev, updateAvailable: true }))
              console.log('New version available')
            }
          })
        }
      })

      // Handle messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'VERSION_INFO') {
          console.log('Service Worker version:', event.data.version)
        }
      })

      setState(prev => ({ 
        ...prev, 
        swRegistration: registration,
        isLoading: false 
      }))

    } catch (error) {
      console.error('Service Worker registration failed:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // Install PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!state.installPrompt) {
      console.log('No install prompt available')
      return false
    }

    try {
      await state.installPrompt.prompt()
      const { outcome } = await state.installPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('PWA installation accepted')
        setState(prev => ({ 
          ...prev, 
          isInstalled: true,
          isInstallable: false,
          installPrompt: null 
        }))
        return true
      } else {
        console.log('PWA installation dismissed')
        return false
      }
    } catch (error) {
      console.error('PWA installation error:', error)
      return false
    }
  }, [state.installPrompt])

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if (!state.swRegistration) return

    try {
      await state.swRegistration.update()
      console.log('Checked for service worker updates')
    } catch (error) {
      console.error('Update check failed:', error)
    }
  }, [state.swRegistration])

  // Apply pending update
  const applyUpdate = useCallback(async () => {
    if (!state.swRegistration || !state.updateAvailable) return

    const newWorker = state.swRegistration.waiting
    if (newWorker) {
      // Tell the new service worker to skip waiting
      newWorker.postMessage({ type: 'SKIP_WAITING' })
      
      // Listen for controller change and reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })

      setState(prev => ({ ...prev, updateAvailable: false }))
    }
  }, [state.swRegistration, state.updateAvailable])

  // Clear all caches
  const clearCache = useCallback(async () => {
    if (!('caches' in window)) return

    try {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
      
      // Also clear service worker cache
      if (state.swRegistration) {
        state.swRegistration.active?.postMessage({ type: 'CLEAR_CACHE' })
      }
      
      console.log('All caches cleared')
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }, [state.swRegistration])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize
    checkInstallStatus()
    registerSW()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      const installEvent = event as BeforeInstallPromptEvent
      
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: installEvent
      }))
      
      console.log('PWA install prompt available')
    }

    // Listen for online/offline events
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))

    // Listen for app installed event
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null
      }))
      console.log('PWA was installed')
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setState(prev => ({ ...prev, isInstalled: e.matches }))
    }
    mediaQuery.addEventListener('change', handleDisplayModeChange)

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('appinstalled', handleAppInstalled)
      mediaQuery.removeEventListener('change', handleDisplayModeChange)
    }
  }, [registerSW, checkInstallStatus])

  return {
    ...state,
    install,
    checkForUpdates,
    applyUpdate,
    clearCache,
    registerSW,
  }
}