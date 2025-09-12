/**
 * Invoice Cleanup Component
 * Admin tool to clean up empty invoices (0 line items)
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface InvoiceCleanupProps {
  projectId: string
  projectName: string
}

export function InvoiceCleanup({ projectId, projectName }: InvoiceCleanupProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    deletedCount: number
    invoiceNumbers?: string[]
    message: string
  } | null>(null)

  const handleCleanup = async () => {
    if (!confirm(`Are you sure you want to delete all empty invoices (0 line items) from ${projectName}?`)) {
      return
    }

    try {
      setIsDeleting(true)
      setResult(null)

      const response = await fetch(`/api/invoices/cleanup-empty?projectId=${projectId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      setResult(data)

      if (data.success && data.deletedCount > 0) {
        // Refresh the page to update invoice counts
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      console.error('Cleanup error:', error)
      setResult({
        success: false,
        deletedCount: 0,
        message: 'Failed to cleanup invoices',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-yellow-200 p-4">
      <div className="flex items-start space-x-3">
        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Clean Up Empty Invoices</h3>
          <p className="mt-1 text-sm text-yellow-700">
            Remove invoices that have 0 line items (failed PDF parsing). This will allow you to re-upload with proper PDF processing.
          </p>
          
          {result && (
            <div className={`mt-3 p-3 rounded-lg ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm font-medium ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.message}
              </p>
              {result.success && result.invoiceNumbers && result.invoiceNumbers.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-green-700">Deleted invoices:</p>
                  <p className="text-xs text-green-600 font-mono">
                    {result.invoiceNumbers.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <Button
              onClick={handleCleanup}
              disabled={isDeleting}
              icon={<TrashIcon className="h-4 w-4" />}
              variant="secondary"
              className="bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100"
            >
              {isDeleting ? 'Cleaning up...' : 'Clean Up Empty Invoices'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}