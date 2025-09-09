/**
 * Enhanced Supplier Upload with Real-Time AI Processing
 * Provides intelligent upload experience with AI preview and project suggestions
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'react-hot-toast'
import { GoogleDrivePicker } from '@/components/ui/GoogleDrivePicker'
import {
  DocumentArrowUpIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  LightBulbIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import { ParsedInvoice } from '@/lib/pdf-parser'

interface Project {
  id: string
  name: string
  description?: string
}

interface AIProjectSuggestion {
  projectId: string
  projectName: string
  confidence: number
  reasoning: string
  estimatedMatches?: number
}

interface AIPreviewData {
  parsedInvoice: ParsedInvoice
  allInvoices?: ParsedInvoice[]
  multipleInvoices?: boolean
  totalInvoices?: number
  aggregatedData?: {
    totalAmount: number
    totalLineItems: number
    averageAmount: number
  }
  confidence: number
  projectSuggestions: AIProjectSuggestion[]
  extractedLineItems: number
  totalAmount: number
  processingTime: number
}

interface EnhancedSupplierUploadProps {
  supplierEmail: string
  supplierName: string
  projects: Project[]
  onUploadComplete?: (result: any) => void
  className?: string
}

export function EnhancedSupplierUpload({
  supplierEmail,
  supplierName,
  projects,
  onUploadComplete,
  className = '',
}: EnhancedSupplierUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiPreview, setAiPreview] = useState<AIPreviewData | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelection(files[0])
    }
  }, [])

  const handleFileSelection = async (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    setAiPreview(null)

    // Start AI processing for preview
    await processFileWithAI(file)
  }

  const processFileWithAI = async (file: File) => {
    setAiProcessing(true)
    const startTime = Date.now()

    try {
      // Create FormData for AI processing
      const formData = new FormData()
      formData.append('file', file)
      formData.append('email', supplierEmail)
      formData.append('previewOnly', 'true') // Flag for preview processing

      const response = await fetch('/api/portal/ai-preview', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success && result.preview) {
        const processingTime = Date.now() - startTime

        setAiPreview({
          ...result.preview,
          processingTime,
        })

        // Auto-select top project suggestion if confidence is high
        const topSuggestion = result.preview.projectSuggestions?.[0]
        if (topSuggestion && topSuggestion.confidence > 0.8) {
          setSelectedProjectId(topSuggestion.projectId)
          toast.success(
            `AI suggests "${topSuggestion.projectName}" with ${Math.round(topSuggestion.confidence * 100)}% confidence`
          )
        }
      } else {
        toast.error(result.error || 'AI processing failed')
      }
    } catch (error) {
      console.error('AI processing error:', error)
      toast.error('AI processing unavailable - you can still upload manually')
    } finally {
      setAiProcessing(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileSelection(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // If we have AI preview data, use it directly instead of reprocessing
      let aiResult
      if (aiPreview) {
        console.log('✅ Using existing AI preview data - skipping duplicate LLM processing')

        // Call the save-preview endpoint to save already-processed data
        const saveData = {
          email: supplierEmail,
          supplierName,
          projectId: selectedProjectId || null,
          notes: notes.trim() || null,
          aiPreviewData: aiPreview,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
        }

        const saveResponse = await fetch('/api/portal/save-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saveData),
        })

        aiResult = await saveResponse.json()
      } else {
        // Fallback: process with LLM if no preview available
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('email', supplierEmail)
        formData.append('supplierName', supplierName)
        formData.append('previewOnly', 'false')

        if (selectedProjectId) {
          formData.append('projectId', selectedProjectId)
        }

        if (notes.trim()) {
          formData.append('notes', notes.trim())
        }

        console.log('🔄 No AI preview available, processing with LLM...')

        const aiResponse = await fetch('/api/portal/ai-preview', {
          method: 'POST',
          body: formData,
        })

        aiResult = await aiResponse.json()
      }

      if (aiResult.success) {
        // Also create InvoiceUpload record for tracking
        const uploadFormData = new FormData()
        uploadFormData.append('file', selectedFile)
        uploadFormData.append('email', supplierEmail)
        uploadFormData.append('supplierName', supplierName)

        if (selectedProjectId) {
          uploadFormData.append('projectId', selectedProjectId)
        }

        if (notes.trim()) {
          uploadFormData.append('notes', notes.trim())
        }

        // Create upload tracking record
        await fetch('/api/portal/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const invoiceCount = aiPreview?.totalInvoices || 1
        toast.success(
          `Successfully processed and saved ${invoiceCount} invoice${invoiceCount > 1 ? 's' : ''} to main app!`
        )

        // Reset form
        setSelectedFile(null)
        setSelectedProjectId('')
        setNotes('')
        setAiPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        onUploadComplete?.(aiResult)
      } else {
        toast.error(aiResult.error || 'Invoice processing failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed - please try again')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-700 bg-green-50 border-green-200'
    if (confidence >= 0.6) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence'
    if (confidence >= 0.6) return 'Medium Confidence'
    return 'Low Confidence'
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid="enhanced-supplier-upload">
      {/* Enhanced Drag & Drop Zone */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-purple-600" />
          AI-Enhanced Upload
        </h2>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          data-testid="file-drop-zone"
        >
          {selectedFile ? (
            <div className="space-y-3">
              <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <p className="text-lg font-medium text-green-900">{selectedFile.name}</p>
                <p className="text-sm text-green-700">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • PDF
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFile(null)
                  setAiPreview(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
              >
                Change File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <DocumentArrowUpIcon className="h-16 w-16 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop your invoice here or click to browse
                </h3>
                <p className="text-gray-600 mb-4">
                  AI will instantly analyze your invoice and suggest the best project match
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <span>• PDF files only</span>
                  <span>• Up to 10MB</span>
                  <span>• Instant AI processing</span>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4"
              >
                Select Invoice File
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileInputChange}
            data-testid="file-input"
          />
        </div>

        {/* AI Processing Indicator */}
        {aiProcessing && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-3">
              <ArrowPathIcon className="h-5 w-5 text-purple-600 animate-spin" />
              <div>
                <h4 className="font-medium text-purple-900">AI Processing Your Invoice</h4>
                <p className="text-sm text-purple-700">
                  Extracting data, analyzing content, and finding project matches...
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Google Drive Import */}
      {!selectedFile && !aiProcessing && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DocumentArrowUpIcon className="h-5 w-5 text-blue-600" />
            Import from Google Drive
          </h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Upload invoices directly from your Google Drive. Share your PDF invoice file and paste
              the link below.
            </p>
          </div>
          <GoogleDrivePicker
            endpoint="/api/portal/google-drive"
            additionalData={{
              email: supplierEmail,
              supplierName: supplierName,
              projectId: selectedProjectId || undefined,
              notes: notes || undefined,
            }}
            onSuccess={result => {
              toast.success(
                `Successfully imported ${result.processedFiles || 1} file(s) from Google Drive!`
              )
              onUploadComplete?.(result)
            }}
            onError={error => {
              console.error('Google Drive import failed:', error)
            }}
            disabled={uploading || aiProcessing}
            enablePersonalAuth={true}
            supplierEmail={supplierEmail}
            className="max-w-lg"
          />
        </Card>
      )}

      {/* AI Preview Panel */}
      {aiPreview && (
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Analysis Results</h3>
            <Badge className="bg-purple-100 text-purple-800">
              Processed in {(aiPreview.processingTime / 1000).toFixed(1)}s
            </Badge>
          </div>

          {/* Multi-Invoice Summary */}
          {aiPreview.multipleInvoices && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-900">Multiple Invoices Detected!</h4>
                <Badge className="bg-green-100 text-green-800">
                  {aiPreview.totalInvoices} invoices found
                </Badge>
              </div>
              <p className="text-sm text-green-700 mb-3">
                AI successfully identified and processed {aiPreview.totalInvoices} separate invoices
                in your PDF. All will be saved when you upload.
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-medium text-gray-900">
                    ${aiPreview.aggregatedData?.totalAmount.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-gray-600">Total Value</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-medium text-gray-900">
                    {aiPreview.aggregatedData?.totalLineItems || 0}
                  </div>
                  <div className="text-gray-600">Total Line Items</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-medium text-gray-900">
                    ${aiPreview.aggregatedData?.averageAmount.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-gray-600">Average Amount</div>
                </div>
              </div>
            </div>
          )}

          {/* Extracted Data Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium text-gray-900">
                  {aiPreview.multipleInvoices ? 'Combined Data' : 'Data Extracted'}
                </h4>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  Line Items: <span className="font-medium">{aiPreview.extractedLineItems}</span>
                </p>
                <p>
                  Total Amount:{' '}
                  <span className="font-medium">${aiPreview.totalAmount.toFixed(2)}</span>
                </p>
                {aiPreview.multipleInvoices && (
                  <p>
                    Invoices: <span className="font-medium">{aiPreview.totalInvoices}</span>
                  </p>
                )}
                <div className="flex items-center gap-1">
                  <span>Confidence:</span>
                  <Badge className={`${getConfidenceColor(aiPreview.confidence)} border`}>
                    {Math.round(aiPreview.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <LightBulbIcon className="h-4 w-4 text-green-600" />
                <h4 className="font-medium text-gray-900">
                  {aiPreview.multipleInvoices ? 'Primary Invoice' : 'Invoice Details'}
                </h4>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Number: {aiPreview.parsedInvoice.invoiceNumber || 'Not found'}</p>
                <p>Date: {aiPreview.parsedInvoice.invoiceDate || 'Not found'}</p>
                <p>Supplier: {aiPreview.parsedInvoice.supplierName || supplierName}</p>
                {aiPreview.multipleInvoices && (
                  <p className="text-blue-600 font-medium text-xs mt-1">
                    + {(aiPreview.totalInvoices || 1) - 1} additional invoices
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="h-4 w-4 text-purple-600" />
                <h4 className="font-medium text-gray-900">AI Insights</h4>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Categories: {aiPreview.parsedInvoice.lineItems?.length || 0} items</p>
                <p>Matches: ~{aiPreview.projectSuggestions?.[0]?.estimatedMatches || 0}</p>
                <p>
                  Status:{' '}
                  {aiPreview.multipleInvoices ? 'Multi-invoice ready' : 'Ready for processing'}
                </p>
              </div>
            </div>
          </div>

          {/* Project Suggestions */}
          {aiPreview.projectSuggestions && aiPreview.projectSuggestions.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <LightBulbIcon className="h-4 w-4 text-yellow-600" />
                AI Project Recommendations
              </h4>
              <div className="space-y-3">
                {aiPreview.projectSuggestions.slice(0, 3).map((suggestion, index) => (
                  <div
                    key={suggestion.projectId}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedProjectId === suggestion.projectId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => setSelectedProjectId(suggestion.projectId)}
                    data-testid={`project-suggestion-${index}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{suggestion.projectName}</h5>
                      <div className="flex items-center gap-2">
                        {suggestion.estimatedMatches && (
                          <span className="text-xs text-gray-500">
                            ~{suggestion.estimatedMatches} matches
                          </span>
                        )}
                        <Badge className={`${getConfidenceColor(suggestion.confidence)} border`}>
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{suggestion.reasoning}</p>
                    {index === 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800">🏆 AI Recommended</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Multi-Invoice Breakdown */}
          {aiPreview.multipleInvoices &&
            aiPreview.allInvoices &&
            aiPreview.allInvoices.length > 1 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="h-4 w-4 text-blue-600" />
                  All {aiPreview.totalInvoices} Invoices Found
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {aiPreview.allInvoices.map((invoice, index) => (
                    <div
                      key={`invoice-${index}`}
                      className="p-3 bg-white rounded border border-gray-200 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              Invoice #{index + 1}
                            </Badge>
                            {invoice.invoiceNumber && (
                              <span className="text-sm font-medium text-gray-900">
                                {invoice.invoiceNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-x-4">
                            {invoice.invoiceDate && <span>Date: {invoice.invoiceDate}</span>}
                            {invoice.supplierName && <span>Supplier: {invoice.supplierName}</span>}
                            <span>Items: {invoice.lineItems?.length || 0}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            ${invoice.totalAmount?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </Card>
      )}

      {/* Project Selection & Upload Form */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Details</h3>

        <div className="space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Assignment {aiPreview ? '(AI-Suggested)' : '(Optional)'}
            </label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="project-selector"
            >
              <option value="">Select a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                  {aiPreview?.projectSuggestions?.find(s => s.projectId === project.id) &&
                    ' ⭐ AI Match'}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional context about this invoice..."
              data-testid="notes-textarea"
            />
          </div>

          {/* Upload Button */}
          <div className="flex justify-end">
            <div className="text-right">
              {aiPreview?.multipleInvoices && (
                <p className="text-sm text-green-700 mb-2 font-medium">
                  ✨ {aiPreview.totalInvoices} invoices will be uploaded and processed
                </p>
              )}
              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="px-8 py-3"
                data-testid="upload-button"
              >
                {uploading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Uploading
                    {aiPreview?.multipleInvoices ? ` ${aiPreview.totalInvoices} invoices` : ''} with
                    AI Processing...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Upload
                    {aiPreview?.multipleInvoices ? ` ${aiPreview.totalInvoices} Invoices` : ''} with
                    AI Enhancement
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
