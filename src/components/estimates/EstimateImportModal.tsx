/**
 * Estimate Import Modal
 * Upload and parse project estimates from CSV, Excel, or PDF files
 */

'use client'

import { useState, useRef } from 'react'
import { Dialog } from '@headlessui/react'
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentIcon,
  CurrencyDollarIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import { ParsedEstimate } from '@/lib/estimate-parser'

interface EstimateImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (result: any) => void
  projectId?: string // If provided, import to existing project
  allowCreateProject?: boolean // Allow creating new project
}

export function EstimateImportModal({
  isOpen,
  onClose,
  onImportComplete,
  projectId,
  allowCreateProject = true,
}: EstimateImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [parseResult, setParseResult] = useState<ParsedEstimate | null>(null)
  const [importResult, setImportResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'configure' | 'result'>('upload')

  // Project configuration
  const [createNewProject, setCreateNewProject] = useState(!projectId)
  const [projectName, setProjectName] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
    setParseResult(null)
    setImportResult(null)

    // Auto-set project name from filename if creating new project
    if (createNewProject && !projectName) {
      const name = selectedFile.name.replace(/\.(csv|xlsx|xls|pdf)$/i, '')
      setProjectName(name)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const parseEstimate = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('preview', 'true') // Preview mode - don't save to DB yet

      const response = await fetch('/api/estimates/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setParseResult(data.estimate)
        setStep('preview')
      } else {
        setError(data.error || 'Failed to parse estimate file')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Estimate parsing error:', err)
    } finally {
      setUploading(false)
    }
  }

  const importEstimate = async () => {
    if (!parseResult) return

    setUploading(true)
    setError(null)

    try {
      // Use the new API endpoint that accepts pre-parsed data
      const requestBody = {
        parsedEstimate: parseResult,
        createNewProject,
        projectName,
        projectId: !createNewProject ? projectId : undefined,
      }

      const response = await fetch('/api/estimates/import-parsed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        setImportResult(data)
        setStep('result')
        setTimeout(() => {
          onImportComplete(data)
          onClose()
        }, 3000)
      } else {
        setError(data.error || 'Failed to import estimate')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Estimate import error:', err)
    } finally {
      setUploading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'csv':
        return <DocumentTextIcon className="h-8 w-8 text-green-500" />
      case 'xlsx':
      case 'xls':
        return <TableCellsIcon className="h-8 w-8 text-blue-500" />
      case 'pdf':
        return <DocumentIcon className="h-8 w-8 text-red-500" />
      default:
        return <DocumentArrowUpIcon className="h-8 w-8 text-gray-500" />
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-25" />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <Dialog.Title className="text-lg font-medium text-gray-900">
                  Import Project Estimate
                </Dialog.Title>
                <p className="mt-1 text-sm text-gray-500">
                  Upload CSV, Excel, or PDF files with project cost breakdown
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Step 1: File Upload */}
              {step === 'upload' && (
                <div className="space-y-6">
                  {/* File Drop Zone */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,.pdf"
                      onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />

                    {file ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center">
                          {getFileIcon(file.name)}
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setFile(null)
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div>
                          <p className="text-lg font-medium text-gray-900">
                            Drop your estimate file here
                          </p>
                          <p className="text-sm text-gray-500">
                            or click to browse for CSV, Excel, or PDF files
                          </p>
                        </div>
                        <div className="text-xs text-gray-400">Maximum file size: 10MB</div>
                      </div>
                    )}
                  </div>

                  {/* File Format Guide */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Expected File Format:</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>
                        • <strong>Trade/Category:</strong> Work category (e.g., Electrical,
                        Plumbing)
                      </p>
                      <p>
                        • <strong>Description:</strong> Work item description
                      </p>
                      <p>
                        • <strong>Quantity & Unit:</strong> Amount and unit of measure
                      </p>
                      <p>
                        • <strong>Costs:</strong> Material, Labor, Equipment costs
                      </p>
                      <p>
                        • <strong>Total:</strong> Line item total cost
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Error</h3>
                          <p className="mt-1 text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Preview Parsed Data */}
              {step === 'preview' && parseResult && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Estimate Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Budget</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(parseResult.summary.grandTotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Trades</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {parseResult.summary.totalTrades}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Line Items</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {parseResult.summary.totalLineItems}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Source</p>
                        <p className="text-lg font-semibold text-gray-900 uppercase">
                          {parseResult.metadata.source}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Material Costs</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(parseResult.summary.totalMaterialCost)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600">Labor Costs</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(parseResult.summary.totalLaborCost)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-600">Equipment Costs</p>
                      <p className="text-xl font-bold text-orange-700">
                        {formatCurrency(parseResult.summary.totalEquipmentCost)}
                      </p>
                    </div>
                  </div>

                  {/* Trades Preview */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Trades Breakdown</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {parseResult.trades.map((trade, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-white border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{trade.name}</p>
                            <p className="text-sm text-gray-500">{trade.lineItems.length} items</p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(trade.totalCost)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Project Configuration */}
                  {allowCreateProject && (
                    <div className="border-t pt-6">
                      <h3 className="font-medium text-gray-900 mb-4">Project Configuration</h3>

                      {!projectId && (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                checked={createNewProject}
                                onChange={() => setCreateNewProject(true)}
                                className="mr-2"
                              />
                              Create new project
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                checked={!createNewProject}
                                onChange={() => setCreateNewProject(false)}
                                className="mr-2"
                              />
                              Add to existing project
                            </label>
                          </div>

                          {createNewProject && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Project Name
                              </label>
                              <input
                                type="text"
                                value={projectName}
                                onChange={e => setProjectName(e.target.value)}
                                placeholder="Enter project name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Import Result */}
              {step === 'result' && importResult && (
                <div className="text-center space-y-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Import Complete!</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Successfully imported estimate with {importResult.summary.tradesCreated}{' '}
                      trades and {importResult.summary.totalLineItems} line items.
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-green-600">Project:</p>
                        <p className="font-semibold text-green-800">{importResult.project.name}</p>
                      </div>
                      <div>
                        <p className="text-green-600">Total Budget:</p>
                        <p className="font-semibold text-green-800">
                          {formatCurrency(importResult.project.totalBudget)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        {importResult.errors.length} items had import errors and were skipped.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {step === 'upload' && 'Step 1 of 2: Upload File'}
                {step === 'preview' && 'Step 2 of 2: Review & Import'}
                {step === 'result' && 'Import Complete'}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {step === 'result' ? 'Close' : 'Cancel'}
                </button>

                {step === 'upload' && (
                  <button
                    onClick={parseEstimate}
                    disabled={!file || uploading}
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Parsing...' : 'Parse Estimate'}
                  </button>
                )}

                {step === 'preview' && (
                  <button
                    onClick={importEstimate}
                    disabled={uploading || !parseResult || (createNewProject && !projectName)}
                    className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Importing...' : 'Import Estimate'}
                  </button>
                )}
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )
}
