'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'uploading' | null
    message: string
  }>({ type: null, message: '' })
  const [parsedInvoice, setParsedInvoice] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleLogout = () => {
    logout()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setUploadStatus({
        type: 'error',
        message: 'Please select a PDF file'
      })
      return
    }

    setUploadStatus({ type: 'uploading', message: 'Processing PDF...' })
    setParsedInvoice(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/invoices/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setUploadStatus({
          type: 'success',
          message: data.warning || 'PDF processed successfully!'
        })
        setParsedInvoice(data.invoice)
      } else {
        setUploadStatus({
          type: 'error',
          message: data.error || 'Failed to process PDF'
        })
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Network error. Please try again.'
      })
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!isAuthenticated || !user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">BuildTrack</h1>
              <p className="mt-1 text-sm text-gray-500">Construction Project Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user.name}</span>
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* PDF Invoice Upload */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Upload Invoice PDF
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a PDF invoice to extract project cost information automatically.
                </p>
                
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a PDF file</span>
                        <input
                          ref={fileInputRef}
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept=".pdf"
                          className="sr-only"
                          onChange={handleFileUpload}
                          disabled={uploadStatus.type === 'uploading'}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF files up to 10MB</p>
                  </div>
                </div>

                {/* Upload Status */}
                {uploadStatus.type && (
                  <div className={`mt-4 p-3 rounded-md ${
                    uploadStatus.type === 'success' 
                      ? 'bg-green-50 border border-green-200' 
                      : uploadStatus.type === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <p className={`text-sm ${
                      uploadStatus.type === 'success'
                        ? 'text-green-800'
                        : uploadStatus.type === 'error'
                        ? 'text-red-800'
                        : 'text-blue-800'
                    }`}>
                      {uploadStatus.message}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Parsed Invoice Data */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Parsed Invoice Data
                </h3>
                
                {parsedInvoice ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-500">Invoice #:</span>
                        <p>{parsedInvoice.invoiceNumber || 'Not found'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Date:</span>
                        <p>{parsedInvoice.date || 'Not found'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Vendor:</span>
                        <p>{parsedInvoice.vendorName || 'Not found'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Description:</span>
                        <p>{parsedInvoice.description || 'Not found'}</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Amount:</span>
                          <p className="text-lg font-semibold">
                            {parsedInvoice.amount ? `$${parsedInvoice.amount.toLocaleString()}` : 'Not found'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Tax:</span>
                          <p className="text-lg">
                            {parsedInvoice.tax ? `$${parsedInvoice.tax.toLocaleString()}` : 'Not found'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Total:</span>
                          <p className="text-lg font-bold text-green-600">
                            {parsedInvoice.total ? `$${parsedInvoice.total.toLocaleString()}` : 'Not found'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {parsedInvoice.lineItems && parsedInvoice.lineItems.length > 0 && (
                      <div className="border-t pt-3">
                        <span className="font-medium text-gray-500 text-sm">Line Items:</span>
                        <div className="mt-2 space-y-2">
                          {parsedInvoice.lineItems.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.description}</span>
                              <span>
                                {item.quantity && item.unitPrice && (
                                  <span className="text-gray-500">
                                    {item.quantity} × ${item.unitPrice} = 
                                  </span>
                                )}
                                <span className="font-medium ml-1">${item.total}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mt-2">No invoice data yet</p>
                    <p className="text-sm">Upload a PDF to see parsed data here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Project Overview
                </h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5">
                    <div className="text-sm font-medium text-gray-500">Total Projects</div>
                    <div className="mt-1 text-3xl font-semibold text-gray-900">-</div>
                  </div>
                  <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5">
                    <div className="text-sm font-medium text-gray-500">Active Invoices</div>
                    <div className="mt-1 text-3xl font-semibold text-gray-900">-</div>
                  </div>
                  <div className="bg-gray-50 overflow-hidden rounded-lg px-4 py-5">
                    <div className="text-sm font-medium text-gray-500">Total Spend</div>
                    <div className="mt-1 text-3xl font-semibold text-gray-900">-</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <p>Dashboard features coming soon: Project tracking, cost analysis, and milestone management.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}