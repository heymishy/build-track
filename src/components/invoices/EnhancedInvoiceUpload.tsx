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
import { GoogleDrivePicker } from '@/components/ui/GoogleDrivePicker'

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

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      // Convert FileList to Array for processing
      const fileArray = Array.from(files)

      // Validate all files first
      const invalidFiles = fileArray.filter(
        file => file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024
      )

      if (invalidFiles.length > 0) {
        const invalidNames = invalidFiles
          .map(f => `${f.name} (${f.type !== 'application/pdf' ? 'not PDF' : 'too large'})`)
          .join(', ')
        alert(`Invalid files: ${invalidNames}\n\nOnly PDF files under 10MB are allowed.`)
        return
      }

      // Set uploaded files info
      setUploadedFile(fileArray.length === 1 ? fileArray[0] : null)
      setShowResults(false)

      try {
        let allInvoices: any[] = []
        let totalAmount = 0
        let totalFiles = fileArray.length
        let processedFiles = 0
        let hasErrors = false
        let errorMessages: string[] = []

        // Process files sequentially to avoid overwhelming the API
        for (const file of fileArray) {
          try {
            console.log(`Processing file ${processedFiles + 1}/${totalFiles}: ${file.name}`)

            const result = await processInvoices(file, {
              onComplete: result => {
                if (result.success && result.invoices) {
                  allInvoices = [...allInvoices, ...result.invoices]
                  totalAmount += result.totalAmount || 0
                }
                processedFiles++
              },
              onError: error => {
                console.error(`Error processing ${file.name}:`, error)
                hasErrors = true
                errorMessages.push(`${file.name}: ${error}`)
                processedFiles++
              },
            })
          } catch (error) {
            console.error(`Failed to process ${file.name}:`, error)
            hasErrors = true
            errorMessages.push(
              `${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            processedFiles++
          }
        }

        // Create combined result
        const combinedResult: ProcessedInvoiceResult = {
          success: !hasErrors || allInvoices.length > 0,
          totalInvoices: allInvoices.length,
          totalAmount,
          invoices: allInvoices,
          error: hasErrors ? errorMessages.join('; ') : undefined,
          stats: {
            filesProcessed: processedFiles,
            totalFiles: totalFiles,
            successfulFiles: processedFiles - errorMessages.length,
          },
        }

        setProcessingResult(combinedResult)
        setShowResults(true)

        if (onUploadComplete) {
          onUploadComplete(combinedResult)
        }
      } catch (error) {
        console.error('Multi-file upload error:', error)
        setProcessingResult({
          success: false,
          totalInvoices: 0,
          totalAmount: 0,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        })
        setShowResults(true)
      }
    },
    [processInvoices, onUploadComplete]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files)
    },
    [handleFileSelect]
  )

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
            ${
              isDragging
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
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />

          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />

          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              {isDragging ? 'Drop your PDFs here' : 'Upload Invoice PDFs'}
            </p>
            <p className="text-sm text-gray-600">
              Drag and drop PDF files here, or click to select multiple files
            </p>
            <p className="text-xs text-gray-500">
              Maximum file size: 10MB per file • Supported format: PDF • Multiple files supported
            </p>
          </div>
        </div>
      )}

      {/* Google Drive Import */}
      {!isProcessing && !showResults && (
        <div className="border-t pt-6">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-500">Or import from Google Drive</p>
          </div>
          <GoogleDrivePicker
            endpoint="/api/google-drive/import"
            onSuccess={result => {
              console.log('Google Drive import successful:', result)
              // Simulate processing complete for consistency
              setProcessingResult({
                success: true,
                invoices: result.processingResult?.invoices || [],
                stats: result.processingResult?.parsingStats || {},
                qualityMetrics: result.processingResult?.qualityMetrics || {},
              })
              setShowResults(true)
              if (onUploadComplete) {
                onUploadComplete({
                  success: true,
                  invoices: result.processingResult?.invoices || [],
                  stats: result.processingResult?.parsingStats || {},
                  qualityMetrics: result.processingResult?.qualityMetrics || {},
                })
              }
            }}
            onError={error => {
              console.error('Google Drive import failed:', error)
            }}
            disabled={isProcessing}
            className="max-w-lg mx-auto"
          />
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

      {/* Multiple Files Info */}
      {processingResult?.stats && processingResult.stats.totalFiles > 1 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {processingResult.stats.totalFiles} files processed
                </p>
                <p className="text-xs text-gray-600">
                  {processingResult.stats.successfulFiles} successful •{' '}
                  {processingResult.stats.totalFiles - processingResult.stats.successfulFiles}{' '}
                  failed
                </p>
              </div>
            </div>
            {processingResult.stats.totalFiles !== processingResult.stats.successfulFiles && (
              <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
