'use client'

import { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'
import {
  XMarkIcon,
  CloudArrowDownIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface PWAInstallBannerProps {
  className?: string
  position?: 'top' | 'bottom'
  persistent?: boolean
}

export function PWAInstallBanner({ 
  className = '', 
  position = 'bottom',
  persistent = false 
}: PWAInstallBannerProps) {
  const {
    isInstallable,
    isInstalled,
    isOnline,
    install,
    updateAvailable,
    applyUpdate,
  } = usePWA()

  const [isDismissed, setIsDismissed] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-banner-dismissed')
    if (dismissed && !persistent) {
      setIsDismissed(true)
    }
  }, [persistent])

  // Show success message briefly after installation
  useEffect(() => {
    if (isInstalled && showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false)
        setIsDismissed(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isInstalled, showSuccess])

  const handleInstall = async () => {
    setIsInstalling(true)
    
    try {
      const success = await install()
      if (success) {
        setShowSuccess(true)
      }
    } catch (error) {
      console.error('Installation failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    if (!persistent) {
      localStorage.setItem('pwa-banner-dismissed', 'true')
    }
  }

  const handleUpdate = async () => {
    try {
      await applyUpdate()
    } catch (error) {
      console.error('Update failed:', error)
    }
  }

  // Don't show if dismissed, not installable, or already installed (unless update available)
  if (isDismissed || (!isInstallable && !updateAvailable) || (isInstalled && !updateAvailable)) {
    return null
  }

  // Update available banner
  if (updateAvailable) {
    return (
      <div className={`fixed left-0 right-0 z-50 ${position === 'top' ? 'top-0' : 'bottom-0'} ${className}`}>
        <div className="bg-blue-600 text-white px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <SparklesIcon className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  🚀 New version available!
                </p>
                <p className="text-xs text-blue-100">
                  Update now to get the latest features and improvements
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={handleUpdate}
                className="bg-white text-blue-600 px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={handleDismiss}
                className="text-blue-200 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success message
  if (showSuccess && isInstalled) {
    return (
      <div className={`fixed left-0 right-0 z-50 ${position === 'top' ? 'top-0' : 'bottom-0'} ${className}`}>
        <div className="bg-green-600 text-white px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">
                  ✅ BuildTrack installed successfully!
                </p>
                <p className="text-xs text-green-100">
                  You can now use BuildTrack offline and access it from your home screen
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Installation banner
  return (
    <div className={`fixed left-0 right-0 z-50 ${position === 'top' ? 'top-0' : 'bottom-0'} ${className}`}>
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="relative">
              <DevicePhoneMobileIcon className="h-6 w-6 flex-shrink-0" />
              {!isOnline && (
                <ExclamationTriangleIcon className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium flex items-center">
                📱 Install BuildTrack App
                <SparklesIcon className="h-4 w-4 ml-1 animate-pulse" />
              </p>
              <p className="text-xs text-blue-100 mt-0.5">
                {isOnline 
                  ? "Get faster access and work offline • Free installation"
                  : "Install now for offline access and better performance"
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center space-x-1"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <CloudArrowDownIcon className="h-4 w-4" />
                  <span>Install</span>
                </>
              )}
            </button>
            
            {!persistent && (
              <button
                onClick={handleDismiss}
                className="text-blue-200 hover:text-white transition-colors p-1"
                aria-label="Dismiss"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Feature highlights */}
        <div className="mt-2 flex items-center justify-center space-x-6 text-xs text-blue-100">
          <div className="flex items-center space-x-1">
            <CheckCircleIcon className="h-3 w-3" />
            <span>Works offline</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircleIcon className="h-3 w-3" />
            <span>Push notifications</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircleIcon className="h-3 w-3" />
            <span>Home screen access</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to detect if device supports PWA installation
export function isPWAInstallSupported(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check if service worker is supported
  if (!('serviceWorker' in navigator)) return false
  
  // Check for common PWA installation support indicators
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
  const isFirefox = navigator.userAgent.indexOf('Firefox') > -1
  const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)
  const isEdge = navigator.userAgent.indexOf('Edg') > -1
  
  // Most modern browsers support PWA installation
  return isChrome || isFirefox || isSafari || isEdge
}

// Hook to check if app should show PWA features
export function usePWASupport() {
  const [isSupported, setIsSupported] = useState(false)
  
  useEffect(() => {
    setIsSupported(isPWAInstallSupported())
  }, [])
  
  return isSupported
}