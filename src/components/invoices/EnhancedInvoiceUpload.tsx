/**
 * Enhanced Invoice Upload Component
 * Real-time progress tracking and comprehensive review interface
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { ParsedInvoice } from '@/lib/pdf-parser'
import { PDFPreview } from './PDFPreview'

interface UploadProgress {
  stage: 'idle' | 'uploading' | 'parsing' | 'processing' | 'complete' | 'error'
  message: string
  progress: number // 0-100
  currentInvoice?: number
  totalInvoices?: number
}

interface ProcessedInvoice {
  id: string
  invoiceNumber: string
  vendorName: string
  date: string
  amount: number
  tax: number
  total: number
  confidence: number
  lineItems?: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  pageNumber?: number
}

interface ProcessingResult {
  success: boolean
  invoices: ProcessedInvoice[]
  totalAmount: number
  summary: string
  qualityMetrics?: {
    overallAccuracy: number
    extractionQuality: number
    parsingSuccess: number
  }
}

interface EnhancedInvoiceUploadProps {
  onUploadComplete?: (result: ProcessingResult) => void
  className?: string
}

export const EnhancedInvoiceUpload: React.FC<EnhancedInvoiceUploadProps> = ({
  onUploadComplete,
  className = '',
}) => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    message: 'Ready to process invoices',
    progress: 0,
  })
  const [processedResult, setProcessedResult] = useState<ProcessingResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateProgress = useCallback((update: Partial<UploadProgress>) => {
    setUploadProgress(prev => ({ ...prev, ...update }))
  }, [])

  const simulateProgress = useCallback(async (stage: string, duration: number) => {
    const steps = 20
    const stepDuration = duration / steps
    
    for (let i = 0; i <= steps; i++) {
      const progress = Math.min((i / steps) * 100, 100)
      updateProgress({
        progress,
        message: `${stage}... ${Math.round(progress)}%`,
      })
      await new Promise(resolve => setTimeout(resolve, stepDuration))
    }
  }, [updateProgress])

  const processFiles = async (files: FileList) => {
    if (!files || files.length === 0) return

    const file = files[0] // Process first file for now
    setUploadedFile(file) // Store the file for PDF preview
    
    try {
      // Stage 1: Upload
      updateProgress({
        stage: 'uploading',
        message: 'Uploading PDF file...',
        progress: 10,
      })

      const formData = new FormData()
      formData.append('file', file)

      // Stage 2: Parsing
      updateProgress({
        stage: 'parsing',
        message: 'Analyzing PDF structure...',
        progress: 30,
      })

      const response = await fetch(`/api/invoices/parse?t=${Date.now()}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      })

      // Stage 3: Processing
      updateProgress({
        stage: 'processing',
        message: 'Extracting invoice data with AI...',
        progress: 60,
      })

      const result = await response.json()

      if (result.success) {
        // Simulate final processing steps
        await simulateProgress('Finalizing extraction', 1000)

        const processedResult: ProcessingResult = {
          success: true,
          invoices: result.result.invoices || [],
          totalAmount: result.result.totalAmount || 0,
          summary: result.result.summary || '',
          qualityMetrics: result.result.qualityMetrics,
        }

        setProcessedResult(processedResult)
        
        updateProgress({
          stage: 'complete',
          message: `Successfully processed ${processedResult.invoices.length} invoice${processedResult.invoices.length === 1 ? '' : 's'}!`,
          progress: 100,
          totalInvoices: processedResult.invoices.length,
        })

        setShowReview(true)
        onUploadComplete?.(processedResult)
      } else {
        throw new Error(result.error || 'Processing failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      updateProgress({
        stage: 'error',
        message: error instanceof Error ? error.message : 'Upload failed. Please try again.',
        progress: 0,
      })
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      processFiles(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const resetUpload = () => {
    setUploadProgress({
      stage: 'idle',
      message: 'Ready to process invoices',
      progress: 0,
    })
    setProcessedResult(null)
    setShowReview(false)
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  const getStageIcon = () => {
    switch (uploadProgress.stage) {
      case 'complete':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />
      case 'error':
        return <ExclamationCircleIcon className="h-8 w-8 text-red-500" />
      case 'uploading':
      case 'parsing':
      case 'processing':
        return <ClockIcon className="h-8 w-8 text-blue-500 animate-spin" />
      default:
        return <DocumentArrowUpIcon className="h-8 w-8 text-gray-400" />
    }
  }

  const getProgressColor = () => {
    switch (uploadProgress.stage) {
      case 'complete':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      {!showReview && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center space-y-4">
            {getStageIcon()}
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                {uploadProgress.stage === 'idle' ? 'Upload Invoice PDF' : uploadProgress.message}
              </h3>
              
              {uploadProgress.stage === 'idle' ? (
                <p className="text-gray-500">
                  Drag and drop a PDF file here, or click to select
                </p>
              ) : (
                <div className="w-full max-w-xs">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {uploadProgress.progress}% complete
                  </p>
                </div>
              )}
            </div>

            {uploadProgress.stage === 'idle' && (
              <button
                onClick={handleFileSelect}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                Select PDF File
              </button>
            )}

            {uploadProgress.stage === 'error' && (
              <button
                onClick={resetUpload}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Try Again
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Success Summary */}
      {uploadProgress.stage === 'complete' && processedResult && !showReview && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="text-lg font-medium text-green-800">
                  Processing Complete!
                </h3>
                <p className="text-green-600">
                  {processedResult.summary}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowReview(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              Review Invoices
            </button>
          </div>
        </div>
      )}

      {/* Invoice Review Interface */}
      {showReview && processedResult && (
        <InvoiceReviewInterface
          result={processedResult}
          uploadedFile={uploadedFile}
          onClose={() => setShowReview(false)}
          onStartNew={resetUpload}
        />
      )}
    </div>
  )
}

interface InvoiceReviewInterfaceProps {
  result: ProcessingResult
  uploadedFile: File | null
  onClose: () => void
  onStartNew: () => void
}

const InvoiceReviewInterface: React.FC<InvoiceReviewInterfaceProps> = ({
  result,
  uploadedFile,
  onClose,
  onStartNew,
}) => {
  const [selectedInvoice, setSelectedInvoice] = useState<ProcessedInvoice | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100'
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Invoice Review</h2>
          <p className="text-gray-600">
            {result.invoices.length} invoice{result.invoices.length === 1 ? '' : 's'} processed • Total: {formatCurrency(result.totalAmount)}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onStartNew}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            Upload Another
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Accept All
          </button>
        </div>
      </div>

      {/* Quality Metrics */}
      {result.qualityMetrics && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <SparklesIcon className="h-5 w-5 text-blue-500" />
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-blue-900">Overall Accuracy</p>
                <p className="text-lg font-bold text-blue-700">
                  {Math.round(result.qualityMetrics.overallAccuracy * 100)}%
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Extraction Quality</p>
                <p className="text-lg font-bold text-blue-700">
                  {Math.round(result.qualityMetrics.extractionQuality * 100)}%
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Parsing Success</p>
                <p className="text-lg font-bold text-blue-700">
                  {Math.round(result.qualityMetrics.parsingSuccess * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Summary Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Extracted Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {result.invoices.map((invoice, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber || `INV-${index + 1}`}
                      </span>
                      {invoice.pageNumber && (
                        <span className="ml-2 text-xs text-gray-500">
                          (Page {invoice.pageNumber})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.vendorName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(invoice.tax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(invoice.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(invoice.confidence)}`}>
                      {Math.round(invoice.confidence * 100)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      <EyeIcon className="h-4 w-4 inline mr-1" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900">
                  Total ({result.invoices.length} invoice{result.invoices.length === 1 ? '' : 's'})
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(result.totalAmount)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          uploadedFile={uploadedFile}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  )
}

interface InvoiceDetailModalProps {
  invoice: ProcessedInvoice
  uploadedFile: File | null
  onClose: () => void
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  uploadedFile,
  onClose,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Invoice Details: {invoice.invoiceNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Invoice Information</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Invoice Number:</span>
                <span className="text-sm text-gray-900">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Vendor:</span>
                <span className="text-sm text-gray-900">{invoice.vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Date:</span>
                <span className="text-sm text-gray-900">{invoice.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Subtotal:</span>
                <span className="text-sm text-gray-900">{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Tax:</span>
                <span className="text-sm text-gray-900">{formatCurrency(invoice.tax)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-sm font-bold text-gray-900">Total:</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Confidence:</span>
                <span className="text-sm text-gray-900">{Math.round(invoice.confidence * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Line Items</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                <div className="space-y-2">
                  {invoice.lineItems.map((item, index) => (
                    <div key={index} className="text-sm border-b border-gray-200 pb-2 last:border-b-0">
                      <div className="font-medium text-gray-900">{item.description}</div>
                      <div className="flex justify-between text-gray-600">
                        <span>Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</span>
                        <span>{formatCurrency(item.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No line items extracted</p>
              )}
            </div>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Original Invoice</h4>
          {uploadedFile ? (
            <PDFPreview
              pdfFile={uploadedFile}
              highlightPageNumber={invoice.pageNumber}
              className="border border-gray-300 rounded-lg"
              height={500}
            />
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">PDF file not available</p>
              <p className="text-sm text-gray-500">
                Original PDF file is needed to display the invoice preview
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}