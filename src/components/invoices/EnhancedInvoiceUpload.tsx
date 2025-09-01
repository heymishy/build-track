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
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { ParsedInvoice } from '@/lib/pdf-parser'
import { InvoiceProcessingProgress } from './InvoiceProcessingProgress'
import { useInvoiceProcessing, ProcessedInvoiceResult } from '@/hooks/useInvoiceProcessing'

interface EnhancedInvoiceUploadProps {
  onUploadComplete?: (result: ProcessedInvoiceResult) => void
  className?: string
}

export const EnhancedInvoiceUpload: React.FC<EnhancedInvoiceUploadProps> = ({
  onUploadComplete,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [processingResult, setProcessingResult] = useState<ProcessedInvoiceResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    isProcessing,
    steps,
    stats,
    currentStep,
    processInvoices,
    cancelProcessing,
    resetProcessing,
  } = useInvoiceProcessing()

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploadedFile(file)
    setShowResults(false)

    try {
      const result = await processInvoices(file, {
        onComplete: (result) => {
          setProcessingResult(result)
          setShowResults(true)
          if (onUploadComplete) {
            onUploadComplete(result)
          }
        },
        onError: (error) => {
          console.error('Processing error:', error)
          setProcessingResult({
            success: false,
            totalInvoices: 0,
            totalAmount: 0,
            error,
          })
          setShowResults(true)
        }
      })
    } catch (error) {
      console.error('Upload error:', error)
    }
  }, [processInvoices, onUploadComplete])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }, [handleFileSelect])

  const handleReset = useCallback(() => {
    resetProcessing()
    setUploadedFile(null)
    setProcessingResult(null)
    setShowResults(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [resetProcessing])

  const handleCancel = useCallback(() => {
    cancelProcessing()
  }, [cancelProcessing])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      {!isProcessing && !showResults && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              {isDragging ? 'Drop your PDF here' : 'Upload Invoice PDF'}
            </p>
            <p className="text-sm text-gray-600">
              Drag and drop a PDF file here, or click to select
            </p>
            <p className="text-xs text-gray-500">
              Maximum file size: 10MB • Supported format: PDF
            </p>
          </div>
        </div>
      )}

      {/* Processing Progress */}
      {(isProcessing || showResults) && (
        <InvoiceProcessingProgress
          isProcessing={isProcessing}
          steps={steps}
          stats={stats}
          currentStep={currentStep}
          onCancel={isProcessing ? handleCancel : undefined}
          className="mb-6"
        />
      )}

      {/* Results Summary */}
      {showResults && processingResult && (
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              {processingResult.success ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
              ) : (
                <ExclamationCircleIcon className="h-6 w-6 text-red-600 mr-2" />
              )}
              Processing {processingResult.success ? 'Complete' : 'Failed'}
            </h3>
            <button
              onClick={handleReset}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Reset
            </button>
          </div>

          {processingResult.success ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-900">
                    {processingResult.totalInvoices}
                  </div>
                  <div className="text-sm text-blue-700">
                    {processingResult.totalInvoices === 1 ? 'Invoice' : 'Invoices'} Processed
                  </div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-900">
                    ${processingResult.totalAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700">Total Amount</div>
                </div>

                {processingResult.qualityScore !== undefined && (
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <SparklesIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-900">
                      {Math.round(processingResult.qualityScore * 100)}%
                    </div>
                    <div className="text-sm text-purple-700">Quality Score</div>
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Invoices have been saved to your project and are ready for review.
                </p>
                <button
                  onClick={() => {
                    // Navigate to invoice management or trigger refresh
                    window.location.reload()
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View Processed Invoices
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-red-600 mb-4">{processingResult.error}</p>
              <button
                onClick={handleReset}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* File Info */}
      {uploadedFile && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="h-5 w-5 text-gray-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
              <p className="text-xs text-gray-600">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {uploadedFile.type}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}