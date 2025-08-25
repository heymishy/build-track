'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  CameraIcon
} from '@heroicons/react/24/outline'
import { ParsedInvoice, MultiInvoiceResult } from '@/lib/pdf-parser'
import { PhaseBasedNavigation, PhaseNavigationProvider } from '@/components/navigation/PhaseBasedNavigation'
import { PhaseBasedContent } from '@/components/dashboard/PhaseBasedContent'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

function DashboardContent() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Get active view from URL params or default to all
  const [activeView, setActiveView] = useState(() => {
    try {
      return searchParams?.get('view') || 'all'
    } catch {
      return 'all'
    }
  })
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'uploading' | null
    message: string
  }>({ type: null, message: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    
    // Load projects
    loadProjects()
  }, [isAuthenticated, router])
  
  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects')
      const result = await response.json()
      
      if (result.success) {
        setProjects(result.projects || [])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update URL when view changes
  const handleViewChange = (viewId: string) => {
    setActiveView(viewId)
    try {
      const newUrl = viewId === 'all' ? '/dashboard' : `/dashboard?view=${viewId}`
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', newUrl)
      }
    } catch (error) {
      console.error('Failed to update URL:', error)
    }
  }

  const clearUploadStatus = () => {
    setUploadStatus({ type: null, message: '' })
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const processFiles = async (files: FileList) => {
    if (!files || files.length === 0) return

    setUploadStatus({ type: 'uploading', message: 'Processing invoice PDFs...' })

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/invoices/parse', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (result.success) {
          setUploadStatus({
            type: 'success',
            message: `Successfully processed ${result.data.processed} invoice${result.data.processed === 1 ? '' : 's'} from ${file.name}`,
          })
          
          // Reload projects after successful upload
          await loadProjects()
        } else {
          setUploadStatus({
            type: 'error',
            message: result.error || 'Failed to process PDF',
          })
        }
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Upload failed. Please try again.',
      })
      console.error('Upload error:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    await processFiles(files!)

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    
    const files = event.dataTransfer.files
    await processFiles(files)
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  // Filter projects based on active view
  const getFilteredProjects = () => {
    if (activeView === 'all') return projects
    
    switch (activeView) {
      case 'planning':
        return projects.filter(p => p.status === 'PLANNING')
      case 'construction':
        return projects.filter(p => p.status === 'IN_PROGRESS')
      case 'completed':
        return projects.filter(p => p.status === 'COMPLETED')
      default:
        return projects
    }
  }

  if (!isAuthenticated || !user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  const filteredProjects = getFilteredProjects()

  return (
    <PhaseNavigationProvider projects={projects}>
      <div className="min-h-screen bg-gray-50">
        {/* Upload Status Alert */}
        {uploadStatus.type && (
          <div
            className={`mx-auto max-w-7xl px-6 py-4 ${
              uploadStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : uploadStatus.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
            } rounded-md`}
          >
            <div className="flex items-center justify-between">
              <span>{uploadStatus.message}</span>
              <button
                onClick={clearUploadStatus}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Phase-Based Navigation */}
        <PhaseBasedNavigation 
          projects={projects}
          activeView={activeView}
          onViewChange={handleViewChange}
          loading={loading}
        />

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Quick Upload Section */}
          <Card className="mb-6">
            <Card.Body 
              className={`p-8 text-center border-2 border-dashed rounded-lg transition-colors ${
                isDragging 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <CameraIcon className={`mx-auto h-12 w-12 mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isDragging ? 'Drop files here' : 'Quick Invoice Upload'}
              </h3>
              <p className="text-gray-500 mb-4">
                {isDragging 
                  ? 'Release to upload PDF files'
                  : 'Drag and drop PDF files here, or click to select files'
                }
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                data-testid="file-input"
              />
              {!isDragging && (
                <Button
                  onClick={handleFileSelect}
                  className="inline-flex items-center"
                  data-testid="upload-button"
                >
                  <CameraIcon className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
              )}
            </Card.Body>
          </Card>

          {/* Phase-Based Content */}
          <PhaseBasedContent 
            activeView={activeView} 
            projects={filteredProjects}
            onProjectsChange={loadProjects}
          />
        </div>
      </div>
    </PhaseNavigationProvider>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}