/**
 * Supplier Portal Page
 * Public page for suppliers/subcontractors to upload invoices
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'react-hot-toast'
import {
  EnvelopeIcon,
  DocumentArrowUpIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  description?: string
}

interface Supplier {
  name: string
  type: 'SUPPLIER' | 'SUBCONTRACTOR'
  email: string
}

interface Upload {
  id: string
  fileName: string
  uploadedAt: string
  status: 'PENDING' | 'PROCESSED' | 'REJECTED'
  project?: {
    id: string
    name: string
  }
}

export default function SupplierPortalPage() {
  const [step, setStep] = useState<'validate' | 'upload' | 'history'>('validate')
  const [email, setEmail] = useState('')
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [uploads, setUploads] = useState<Upload[]>([])
  
  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleEmailValidation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/portal/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setSupplier(data.supplier)
        setProjects(data.projects)
        setSupplierName(data.supplier.name)
        setStep('upload')
        toast.success('Email validated successfully')
        
        // Load upload history
        loadUploadHistory()
      } else {
        toast.error(data.error || 'Email validation failed')
      }
    } catch (error) {
      console.error('Email validation error:', error)
      toast.error('Unable to validate email address')
    } finally {
      setLoading(false)
    }
  }

  const loadUploadHistory = async () => {
    try {
      const response = await fetch(`/api/portal/upload?email=${encodeURIComponent(email.trim())}`)
      const data = await response.json()

      if (data.success) {
        setUploads(data.uploads)
      }
    } catch (error) {
      console.error('Error loading upload history:', error)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('email', email.trim())
      formData.append('supplierName', supplierName.trim())
      
      if (selectedProjectId) {
        formData.append('projectId', selectedProjectId)
      }
      
      if (notes.trim()) {
        formData.append('notes', notes.trim())
      }

      const response = await fetch('/api/portal/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Invoice uploaded successfully')
        
        // Reset form
        setSelectedFile(null)
        setSelectedProjectId('')
        setNotes('')
        
        // Reload upload history
        loadUploadHistory()
        
        // Show history tab
        setStep('history')
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Unable to upload file')
    } finally {
      setUploading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <ClockIcon className="h-4 w-4" />
      case 'PROCESSED':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'REJECTED':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return <ClockIcon className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>
      case 'PROCESSED':
        return <Badge className="bg-green-100 text-green-800">Processed</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Supplier Portal</h1>
              <p className="text-gray-600">Upload invoices for construction projects</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Email Validation Step */}
        {step === 'validate' && (
          <Card className="p-8">
            <div className="text-center mb-8">
              <EnvelopeIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Verify Your Email Address
              </h2>
              <p className="text-gray-600">
                Enter your registered email address to access the invoice upload portal
              </p>
            </div>

            <form onSubmit={handleEmailValidation} className="max-w-md mx-auto">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your.email@company.com"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3"
              >
                {loading ? 'Validating...' : 'Continue'}
              </Button>
            </form>
          </Card>
        )}

        {/* Upload and History Steps */}
        {(step === 'upload' || step === 'history') && supplier && (
          <>
            {/* Supplier Info Bar */}
            <Card className="p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{supplier.name}</h3>
                    <p className="text-sm text-gray-600">{supplier.email}</p>
                  </div>
                  <Badge className={
                    supplier.type === 'SUPPLIER'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }>
                    {supplier.type === 'SUPPLIER' ? 'Supplier' : 'Subcontractor'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={step === 'upload' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStep('upload')}
                  >
                    Upload Invoice
                  </Button>
                  <Button
                    variant={step === 'history' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStep('history')}
                  >
                    Upload History
                  </Button>
                </div>
              </div>
            </Card>

            {/* Upload Form */}
            {step === 'upload' && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Upload Invoice</h2>
                
                <form onSubmit={handleFileUpload} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project (Optional)
                      </label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a project...</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplier/Company Name
                      </label>
                      <input
                        type="text"
                        required
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Company Name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice File (PDF only)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Upload a file</span>
                            <input
                              type="file"
                              accept=".pdf"
                              className="sr-only"
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PDF files up to 10MB</p>
                        {selectedFile && (
                          <p className="text-sm text-green-600 mt-2">
                            Selected: {selectedFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional notes about this invoice..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={uploading || !selectedFile}
                      className="px-8"
                    >
                      {uploading ? 'Uploading...' : 'Upload Invoice'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Upload History */}
            {step === 'history' && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="h-5 w-5" />
                  Upload History
                </h2>

                {uploads.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No invoices uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {uploads.map(upload => (
                      <div key={upload.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{upload.fileName}</h3>
                          {getStatusBadge(upload.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(upload.status)}
                            Status: {upload.status}
                          </div>
                          {upload.project && (
                            <div>
                              Project: {upload.project.name}
                            </div>
                          )}
                          <div>
                            Uploaded: {new Date(upload.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}