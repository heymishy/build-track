'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import {
  LinkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentIcon,
  FolderIcon,
  UserIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size: string
  webViewLink?: string
}

interface GoogleDrivePickerProps {
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
  endpoint: string // '/api/google-drive/import' or '/api/portal/google-drive'
  additionalData?: Record<string, any> // Extra data to send with request
  disabled?: boolean
  className?: string
  // New props for dual mode
  enablePersonalAuth?: boolean
  supplierEmail?: string // For supplier portal context
}

export function GoogleDrivePicker({
  onSuccess,
  onError,
  endpoint,
  additionalData = {},
  disabled = false,
  className = '',
  enablePersonalAuth = false,
  supplierEmail,
}: GoogleDrivePickerProps) {
  const [accessMethod, setAccessMethod] = useState<'shared' | 'personal'>('shared')
  const [driveUrl, setDriveUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [availableFiles, setAvailableFiles] = useState<GoogleDriveFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [showFileSelection, setShowFileSelection] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)

  const handleLoadFiles = async () => {
    if (!driveUrl.trim()) {
      setError('Please enter a Google Drive URL')
      return
    }

    if (!isValidGoogleDriveUrl(driveUrl)) {
      setError('Please enter a valid Google Drive sharing URL')
      return
    }

    setLoadingFiles(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`${endpoint}?fileUrl=${encodeURIComponent(driveUrl)}`, {
        method: 'GET',
        credentials: 'include',
      })

      const data = await response.json()

      if (data.success) {
        setAvailableFiles(data.files || [])
        setShowFileSelection(true)
        setSelectedFileIds([])
      } else {
        throw new Error(data.error || 'Failed to load files')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleConnectGoogle = async () => {
    if (!supplierEmail) {
      setError('Email is required to connect Google account')
      return
    }

    setConnectingGoogle(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/google/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: supplierEmail,
          isSupplierPortal: true,
        }),
      })

      const data = await response.json()

      if (data.success && data.authUrl) {
        // Open Google OAuth in new window
        window.open(data.authUrl, 'google-auth', 'width=500,height=600')

        // Listen for auth completion (simplified - in production, use postMessage)
        const checkAuth = setInterval(async () => {
          try {
            const personalFilesResponse = await fetch(
              `/api/portal/google-drive/personal?email=${encodeURIComponent(supplierEmail)}`
            )
            const personalData = await personalFilesResponse.json()

            if (personalData.success) {
              setGoogleConnected(true)
              setAvailableFiles(personalData.files || [])
              setShowFileSelection(true)
              clearInterval(checkAuth)
            } else if (personalData.requiresAuth || personalData.requiresReauth) {
              // Still waiting for auth
            } else {
              clearInterval(checkAuth)
              setError(personalData.error || 'Failed to access Google Drive')
            }
          } catch (error) {
            // Still waiting
          }
        }, 2000)

        // Stop checking after 5 minutes
        setTimeout(() => clearInterval(checkAuth), 300000)
      } else {
        throw new Error(data.error || 'Failed to initiate Google authentication')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect Google account'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setConnectingGoogle(false)
    }
  }

  const handleLoadPersonalFiles = async () => {
    if (!supplierEmail) {
      setError('Email is required to load files')
      return
    }

    setLoadingFiles(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `/api/portal/google-drive/personal?email=${encodeURIComponent(supplierEmail)}`
      )
      const data = await response.json()

      if (data.success) {
        setAvailableFiles(data.files || [])
        setShowFileSelection(true)
        setSelectedFileIds([])
        setGoogleConnected(true)
      } else if (data.requiresAuth || data.requiresReauth) {
        setGoogleConnected(false)
        setError('Please connect your Google account first')
      } else {
        throw new Error(data.error || 'Failed to load files from Google Drive')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleImportSelected = async () => {
    if (selectedFileIds.length === 0) {
      setError('Please select at least one file to import')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      let response: Response

      if (accessMethod === 'personal') {
        // Use personal Google Drive endpoint
        response = await fetch('/api/portal/google-drive/personal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: supplierEmail,
            selectedFileIds,
            ...additionalData,
          }),
        })
      } else {
        // Use existing shared folder endpoint
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            fileUrl: driveUrl,
            selectedFileIds,
            ...additionalData,
          }),
        })
      }

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message || 'Files imported successfully!')
        if (accessMethod === 'shared') {
          setDriveUrl('')
        }
        setAvailableFiles([])
        setSelectedFileIds([])
        setShowFileSelection(false)
        onSuccess?.(data)
      } else if (data.requiresReauth) {
        setGoogleConnected(false)
        setError('Your Google account access has expired. Please reconnect.')
      } else {
        throw new Error(data.error || 'Import failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    )
  }

  const handleSelectAll = () => {
    if (selectedFileIds.length === availableFiles.length) {
      setSelectedFileIds([])
    } else {
      setSelectedFileIds(availableFiles.map(file => file.id))
    }
  }

  const isValidGoogleDriveUrl = (url: string): boolean => {
    const patterns = [
      /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9-_]+/, // Individual files
      /https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/[a-zA-Z0-9-_]+/, // Google Docs
      /https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9-_]+/, // Shared folders
      /https:\/\/drive\.google\.com\/drive\/u\/\d+\/folders\/[a-zA-Z0-9-_]+/, // User-specific folder URLs
      /https:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9-_]+/, // Legacy format
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  const resetState = () => {
    setError(null)
    setSuccess(null)
    setDriveUrl('')
    setAvailableFiles([])
    setSelectedFileIds([])
    setShowFileSelection(false)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Access Method Selector */}
      {enablePersonalAuth && (
        <div className="flex items-center justify-center space-x-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setAccessMethod('shared')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              accessMethod === 'shared'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <GlobeAltIcon className="h-4 w-4" />
            <span>Shared Folder</span>
          </button>
          <button
            onClick={() => setAccessMethod('personal')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              accessMethod === 'personal'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>My Google Drive</span>
          </button>
        </div>
      )}

      {/* Shared Folder Access */}
      {accessMethod === 'shared' && (
        <div className="space-y-2">
          <label htmlFor="drive-url" className="block text-sm font-medium text-gray-700">
            Google Drive Folder URL
          </label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                id="drive-url"
                type="url"
                value={driveUrl}
                onChange={e => {
                  setDriveUrl(e.target.value)
                  if (error || success) {
                    setError(null)
                    setSuccess(null)
                  }
                }}
                placeholder="https://drive.google.com/drive/folders/..."
                disabled={disabled || loading}
                className="w-full"
              />
            </div>
            {!showFileSelection ? (
              <Button
                onClick={handleLoadFiles}
                disabled={disabled || loadingFiles || !driveUrl.trim()}
                className="flex items-center space-x-2"
              >
                {loadingFiles ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <FolderIcon className="h-4 w-4" />
                    <span>Load Files</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleImportSelected}
                disabled={disabled || loading || selectedFileIds.length === 0}
                className="flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Importing {selectedFileIds.length}...</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    <span>Import ({selectedFileIds.length})</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Personal Google Drive Access */}
      {accessMethod === 'personal' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Your Google Drive Files</label>
          <div className="flex space-x-2">
            {!googleConnected ? (
              <Button
                onClick={handleConnectGoogle}
                disabled={disabled || connectingGoogle}
                className="flex items-center space-x-2"
              >
                {connectingGoogle ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <UserIcon className="h-4 w-4" />
                    <span>Connect Google Account</span>
                  </>
                )}
              </Button>
            ) : (
              <>
                {!showFileSelection ? (
                  <Button
                    onClick={handleLoadPersonalFiles}
                    disabled={disabled || loadingFiles}
                    className="flex items-center space-x-2"
                  >
                    {loadingFiles ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        <span>Loading Files...</span>
                      </>
                    ) : (
                      <>
                        <FolderIcon className="h-4 w-4" />
                        <span>Load My Files</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleImportSelected}
                    disabled={disabled || loading || selectedFileIds.length === 0}
                    className="flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        <span>Importing {selectedFileIds.length}...</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4" />
                        <span>Import Selected ({selectedFileIds.length})</span>
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGoogleConnected(false)}
                  className="text-xs"
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500 space-y-1">
        {accessMethod === 'shared' ? (
          <>
            <p>
              📋 <strong>How to get the shared folder URL:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Open your folder in Google Drive</li>
              <li>Click "Share" and ensure "Anyone with the link" can view</li>
              <li>Copy the sharing URL and paste it above</li>
            </ol>
          </>
        ) : (
          <>
            <p>
              🔐 <strong>Personal Google Drive Access:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Connect your personal Google account</li>
              <li>Access your private files directly</li>
              <li>No need to make files public or get sharing links</li>
            </ul>
          </>
        )}
        <p className="mt-2">
          ✅ <strong>Supported:</strong> PDF files and folders containing PDFs
        </p>
      </div>

      {/* File Selection UI */}
      {showFileSelection && availableFiles.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">
              Select Files to Import ({availableFiles.length} found)
            </h3>
            <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs">
              {selectedFileIds.length === availableFiles.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {availableFiles.map(file => (
              <label
                key={file.id}
                className="flex items-center p-2 rounded border hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedFileIds.includes(file.id)}
                  onChange={() => handleFileSelection(file.id)}
                  className="mr-3"
                />
                <DocumentIcon className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(parseInt(file.size) / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
            <span>
              {selectedFileIds.length} of {availableFiles.length} files selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFileSelection(false)}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Empty state for file selection */}
      {showFileSelection && availableFiles.length === 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 text-center">
            No PDF files found in the selected Google Drive location.
          </p>
          <div className="mt-2 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFileSelection(false)}
              className="text-xs"
            >
              Try Different URL
            </Button>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <ExclamationCircleIcon className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Reset button when there's a success or error */}
      {(success || error) && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={resetState} className="text-xs">
            Import More Files
          </Button>
        </div>
      )}
    </div>
  )
}
