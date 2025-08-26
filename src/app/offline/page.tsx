'use client'

import { useState, useEffect } from 'react'
import {
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingActions, setPendingActions] = useState(0)
  const [retryAttempts, setRetryAttempts] = useState(0)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check for pending sync actions
    checkPendingActions()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkPendingActions = async () => {
    try {
      // This would normally check IndexedDB for pending actions
      // For now, we'll simulate this
      const stored = localStorage.getItem('offline-pending-actions')
      const actions = stored ? JSON.parse(stored) : []
      setPendingActions(actions.length)
    } catch (error) {
      console.error('Failed to check pending actions:', error)
    }
  }

  const handleRetry = () => {
    setRetryAttempts(prev => prev + 1)
    
    // Try to reload the page
    if (navigator.onLine) {
      window.location.href = '/'
    } else {
      setTimeout(() => {
        if (navigator.onLine) {
          window.location.href = '/'
        }
      }, 2000)
    }
  }

  const clearOfflineData = () => {
    // Clear offline data
    localStorage.removeItem('offline-pending-actions')
    setPendingActions(0)
    
    // Clear service worker caches (this would typically be done through messaging)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          {/* Status Icon */}
          <div className="mb-4">
            {isOnline ? (
              <div className="relative">
                <WifiIcon className="h-16 w-16 text-green-500 mx-auto animate-pulse" />
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1">
                  <CheckCircleIcon className="h-4 w-4 text-white" />
                </div>
              </div>
            ) : (
              <div className="relative">
                <WifiIcon className="h-16 w-16 text-gray-400 mx-auto" />
                <div className="absolute top-0 left-0 h-16 w-16">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-500 absolute top-0 right-0 bg-white rounded-full" />
                </div>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="mb-6">
            {isOnline ? (
              <>
                <h1 className="text-xl font-semibold text-green-800 mb-2">
                  🌐 Back Online!
                </h1>
                <p className="text-green-600 mb-4">
                  Your internet connection has been restored. You can now access all BuildTrack features.
                </p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Return to BuildTrack
                </button>
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold text-gray-800 mb-2">
                  📱 You're Offline
                </h1>
                <p className="text-gray-600 mb-4">
                  BuildTrack is working in offline mode. Some features may be limited, but you can still view cached data and make changes that will sync when you're back online.
                </p>
              </>
            )}
          </div>

          {/* Offline Features */}
          {!isOnline && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                Available Offline
              </h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                  View cached projects and invoices
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                  Browse analytics and reports
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                  Make notes and comments
                </li>
                <li className="flex items-center">
                  <ClockIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                  Changes will sync automatically when online
                </li>
              </ul>
            </div>
          )}

          {/* Pending Actions */}
          {pendingActions > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center text-yellow-800">
                <ClockIcon className="h-4 w-4 mr-2" />
                <span className="font-medium">
                  {pendingActions} action{pendingActions !== 1 ? 's' : ''} waiting to sync
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                These changes will be uploaded automatically when your connection is restored.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isOnline && (
              <>
                <button
                  onClick={handleRetry}
                  disabled={retryAttempts >= 3}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  {retryAttempts >= 3 ? 'Please wait...' : 'Try Again'}
                </button>

                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Continue Offline
                </button>
              </>
            )}

            <button
              onClick={clearOfflineData}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear Offline Data
            </button>
          </div>

          {/* Tips */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">💡 Tips for Offline Use</h4>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Your data is stored locally and encrypted</p>
              <p>• Changes sync automatically when online</p>
              <p>• Large files may require internet connection</p>
              <p>• Refresh the page to check for connection</p>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="mt-4 text-center text-sm text-gray-500">
          BuildTrack PWA • Version 1.0.0
          <br />
          Offline-capable construction management
        </div>
      </div>
    </div>
  )
}