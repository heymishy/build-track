/**
 * Google Sheets Export Component
 * Provides interface for exporting invoices to Google Sheets
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProjectSelector } from '@/components/projects/ProjectSelector'
import {
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'

interface GoogleSheetsExportProps {
  defaultProjectId?: string
  showProjectSelector?: boolean
  compact?: boolean
  className?: string
}

interface ExportResult {
  success: boolean
  message: string
  data?: {
    spreadsheetId: string
    spreadsheetUrl: string
    totalInvoices: number
    totalRows: number
    exportedAt: string
  }
  error?: string
}

export function GoogleSheetsExport({
  defaultProjectId,
  showProjectSelector = true,
  compact = false,
  className = '',
}: GoogleSheetsExportProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || 'all')
  const [selectedStatus, setSelectedStatus] = useState<string[]>(['PENDING', 'APPROVED', 'PAID'])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [includeLineItems, setIncludeLineItems] = useState(false)
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)

  const statusOptions = [
    { value: 'PENDING', label: 'Pending', color: 'yellow' },
    { value: 'APPROVED', label: 'Approved', color: 'green' },
    { value: 'PAID', label: 'Paid', color: 'blue' },
    { value: 'REJECTED', label: 'Rejected', color: 'red' },
  ]

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setExportResult(null)

      const exportData = {
        projectId: selectedProjectId,
        status: selectedStatus,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        includeLineItems,
        spreadsheetTitle: spreadsheetTitle || undefined,
      }

      const response = await fetch('/api/invoices/export/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(exportData),
      })

      const result = await response.json()
      setExportResult(result)

      if (result.success) {
        // Auto-open the spreadsheet in a new tab
        if (result.data?.spreadsheetUrl) {
          window.open(result.data.spreadsheetUrl, '_blank')
        }
      }
    } catch (error) {
      console.error('Export error:', error)
      setExportResult({
        success: false,
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleCSVExport = async () => {
    try {
      setIsExporting(true)
      setExportResult(null)

      const exportData = {
        projectId: selectedProjectId,
        status: selectedStatus,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        includeLineItems,
      }

      const response = await fetch('/api/invoices/export/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(exportData),
      })

      if (response.ok) {
        // Handle file download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url

        // Extract filename from response headers or use default
        const contentDisposition = response.headers.get('content-disposition')
        const filename =
          contentDisposition?.match(/filename="(.+)"/)?.[1] || 'BuildTrack_Invoice_Export.csv'

        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        setExportResult({
          success: true,
          message: 'CSV export successful',
          data: { filename },
        })
      } else {
        const result = await response.json()
        setExportResult(result)
      }
    } catch (error) {
      console.error('CSV export error:', error)
      setExportResult({
        success: false,
        message: 'CSV export failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const clearResult = () => {
    setExportResult(null)
  }

  if (compact) {
    return (
      <div className={className}>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="outline"
            className="inline-flex items-center"
          >
            {isExporting ? (
              <ClockIcon className="h-4 w-4 mr-2 animate-pulse" />
            ) : (
              <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Exporting...' : 'Export to Sheets'}
          </Button>
          <Button
            onClick={handleCSVExport}
            disabled={isExporting}
            variant="outline"
            className="inline-flex items-center"
          >
            {isExporting ? (
              <ClockIcon className="h-4 w-4 mr-2 animate-pulse" />
            ) : (
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        {exportResult && (
          <div className="mt-2">
            {exportResult.success ? (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                <span>Exported successfully</span>
                {exportResult.data?.spreadsheetUrl && (
                  <a
                    href={exportResult.data.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 underline hover:no-underline"
                  >
                    <LinkIcon className="h-3 w-3 inline" />
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center text-sm text-red-600">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                <span>Export failed</span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Export to Google Sheets</h3>
          <p className="text-sm text-gray-500 mt-1">
            Export invoice data to a Google Sheets spreadsheet
          </p>
        </div>
        <DocumentArrowUpIcon className="h-6 w-6 text-gray-400" />
      </div>

      {/* Export Result */}
      {exportResult && (
        <div
          className={`mb-4 p-4 rounded-lg border ${
            exportResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              {exportResult.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    exportResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {exportResult.message}
                </p>
                {exportResult.success && exportResult.data && (
                  <div className="mt-2 space-y-1 text-sm text-green-700">
                    <p>
                      Exported {exportResult.data.totalRows} rows from{' '}
                      {exportResult.data.totalInvoices} invoices
                    </p>
                    {exportResult.data.spreadsheetUrl && (
                      <p>
                        <a
                          href={exportResult.data.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center underline hover:no-underline"
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Open in Google Sheets
                        </a>
                      </p>
                    )}
                  </div>
                )}
                {!exportResult.success && exportResult.error && (
                  <p className="mt-1 text-sm text-red-700">{exportResult.error}</p>
                )}
              </div>
            </div>
            <button onClick={clearResult} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Project Selector */}
        {showProjectSelector && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
              includeAllOption={true}
            />
          </div>
        )}

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Status</label>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedStatus.includes(option.value)}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedStatus([...selectedStatus, option.value])
                    } else {
                      setSelectedStatus(selectedStatus.filter(s => s !== option.value))
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Options</label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeLineItems}
                onChange={e => setIncludeLineItems(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-900">
                Include line items (one row per line item)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spreadsheet Title (Optional)
            </label>
            <input
              type="text"
              value={spreadsheetTitle}
              onChange={e => setSpreadsheetTitle(e.target.value)}
              placeholder="BuildTrack Invoice Export"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="pt-4 border-t space-y-3">
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedStatus.length === 0}
            className="w-full"
          >
            {isExporting ? (
              <>
                <ClockIcon className="h-4 w-4 mr-2 animate-pulse" />
                Exporting to Google Sheets...
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                Export to Google Sheets
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          <Button
            onClick={handleCSVExport}
            disabled={isExporting || selectedStatus.length === 0}
            variant="outline"
            className="w-full"
          >
            {isExporting ? (
              <>
                <ClockIcon className="h-4 w-4 mr-2 animate-pulse" />
                Exporting to CSV...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export to CSV
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
