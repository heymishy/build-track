'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { ParsedInvoice, MultiInvoiceResult } from '@/lib/pdf-parser'
import {
  PhaseBasedNavigation,
  PhaseNavigationProvider,
} from '@/components/navigation/PhaseBasedNavigation'
import { PhaseBasedContent } from '@/components/dashboard/PhaseBasedContent'
import { EnhancedInvoiceUpload } from '@/components/invoices/EnhancedInvoiceUpload'
import { CostTrackingWidget } from '@/components/tracking/CostTrackingWidget'
import { EnhancedCostTrackingDashboard } from '@/components/tracking/EnhancedCostTrackingDashboard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AppLayout } from '@/components/layout/AppLayout'

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
    <AppLayout>
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
            {/* Enhanced Invoice Upload Section */}
            <EnhancedInvoiceUpload
              className="mb-6"
              onUploadComplete={result => {
                // Reload projects after successful upload
                loadProjects()
                console.log('Upload completed:', result)
              }}
            />

            {/* Enhanced Cost Tracking Section */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Estimate vs Invoice Tracking
              </h2>
              <EnhancedCostTrackingDashboard
                showProjectSelector={true}
                onProjectChange={projectId => {
                  console.log('Cost tracking project changed:', projectId)
                }}
              />
            </div>

            {/* Phase-Based Content */}
            <PhaseBasedContent
              activeView={activeView}
              projects={filteredProjects}
              onProjectsChange={loadProjects}
            />
          </div>
        </div>
      </PhaseNavigationProvider>
    </AppLayout>
  )
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
