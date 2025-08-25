'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/PageLayout'
import { DocumentManager } from '@/components/documents/DocumentManager'
import { TabNavigation, TabPanel, TabItem } from '@/components/layout/TabNavigation'
import { DocumentCheckIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

function DocumentsContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState(() => {
    try {
      return searchParams?.get('tab') || 'all'
    } catch {
      return 'all'
    }
  })

  const selectedProjectId = searchParams?.get('projectId') || projects[0]?.id

  useEffect(() => {
    // Wait for auth loading to complete before checking authentication
    if (authLoading) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    loadProjects()
  }, [isAuthenticated, authLoading, router])

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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    try {
      const newUrl = `/documents?tab=${tabId}${selectedProjectId ? `&projectId=${selectedProjectId}` : ''}`
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', newUrl)
      }
    } catch (error) {
      console.error('Failed to update URL:', error)
    }
  }

  const tabs: TabItem[] = [
    {
      id: 'all',
      name: 'All Documents',
      icon: <DocumentCheckIcon className="h-4 w-4" />,
    },
    {
      id: 'planning',
      name: 'Planning',
      icon: <DocumentCheckIcon className="h-4 w-4" />,
    },
    {
      id: 'construction',
      name: 'Construction',
      icon: <ClockIcon className="h-4 w-4" />,
    },
    {
      id: 'completion',
      name: 'Completion',
      icon: <CheckCircleIcon className="h-4 w-4" />,
    },
  ]

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null // The useEffect will handle redirect to login
  }

  return (
    <DashboardLayout
      title="Document Management"
      subtitle="Organize and manage all your project documents"
      tab={activeTab}
    >
      {/* Project Selector */}
      {projects.length > 1 && (
        <div className="mb-6">
          <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Project
          </label>
          <select
            id="project-select"
            className="block w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedProjectId || ''}
            onChange={e => {
              const newUrl = `/documents?tab=${activeTab}&projectId=${e.target.value}`
              window.location.href = newUrl
            }}
          >
            {projects.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          variant="underline"
        />
      </div>

      {/* Document Manager Content */}
      <TabPanel tabId="all" activeTab={activeTab}>
        <DocumentManager projectId={selectedProjectId} />
      </TabPanel>

      <TabPanel tabId="planning" activeTab={activeTab} lazy>
        <DocumentManager projectId={selectedProjectId} phase="PLANNING" />
      </TabPanel>

      <TabPanel tabId="construction" activeTab={activeTab} lazy>
        <DocumentManager projectId={selectedProjectId} phase="CONSTRUCTION" />
      </TabPanel>

      <TabPanel tabId="completion" activeTab={activeTab} lazy>
        <DocumentManager projectId={selectedProjectId} phase="COMPLETION" />
      </TabPanel>
    </DashboardLayout>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <DocumentsContent />
    </Suspense>
  )
}
