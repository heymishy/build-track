'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { 
  LinkIcon, 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline'

interface GoogleDrivePickerProps {
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
  endpoint: string // '/api/google-drive/import' or '/api/portal/google-drive'
  additionalData?: Record<string, any> // Extra data to send with request
  disabled?: boolean
  className?: string
}

export function GoogleDrivePicker({
  onSuccess,
  onError,
  endpoint,
  additionalData = {},
  disabled = false,
  className = '',
}: GoogleDrivePickerProps) {
  const [driveUrl, setDriveUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async () => {
    if (!driveUrl.trim()) {
      setError('Please enter a Google Drive URL')
      return
    }

    if (!isValidGoogleDriveUrl(driveUrl)) {
      setError('Please enter a valid Google Drive sharing URL')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fileUrl: driveUrl,
          ...additionalData,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message || 'File imported successfully!')
        setDriveUrl('')
        onSuccess?.(data)
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

  const isValidGoogleDriveUrl = (url: string): boolean => {
    const patterns = [
      /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9-_]+/,
      /https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/[a-zA-Z0-9-_]+/,
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  const resetState = () => {
    setError(null)
    setSuccess(null)
    setDriveUrl('')
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <label htmlFor="drive-url" className="block text-sm font-medium text-gray-700">
          Google Drive File URL
        </label>
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              id="drive-url"
              type="url"
              value={driveUrl}
              onChange={(e) => {
                setDriveUrl(e.target.value)
                if (error || success) {
                  setError(null)
                  setSuccess(null)
                }
              }}
              placeholder="https://drive.google.com/file/d/..."
              disabled={disabled || loading}
              className="w-full"
            />
          </div>
          <Button
            onClick={handleImport}
            disabled={disabled || loading || !driveUrl.trim()}
            className="flex items-center space-x-2"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4" />
                <span>Import from Drive</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>📋 <strong>How to get the URL:</strong></p>
        <ol className="list-decimal list-inside space-y-1 ml-4">
          <li>Open your file in Google Drive</li>
          <li>Click "Share" and ensure "Anyone with the link" can view</li>
          <li>Copy the sharing URL and paste it above</li>
        </ol>
        <p className="mt-2">✅ <strong>Supported:</strong> PDF files only</p>
      </div>

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
          <Button
            variant="outline"
            size="sm"
            onClick={resetState}
            className="text-xs"
          >
            Import Another File
          </Button>
        </div>
      )}
    </div>
  )
}