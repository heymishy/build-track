/**
 * Invoices Page
 * Main interface for invoice management and matching
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/PageHeader'
import { InvoiceManagement } from '@/components/invoices/InvoiceManagement'
import { InvoiceMatchingInterface } from '@/components/invoices/InvoiceMatchingInterface'
import {
  DocumentTextIcon,
  SparklesIcon,
  CursorArrowRaysIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  status: string
  stats: {
    totalInvoices: number
    pendingInvoiceAmount: number
  }
}

export default function InvoicesPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'management' | 'matching'>('management')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects')
      const data = await response.json()
      
      if (data.success) {
        // Filter projects that have invoices
        const projectsWithInvoices = data.projects.filter((p: Project) => p.stats.totalInvoices > 0)
        setProjects(projectsWithInvoices)
        
        // Auto-select first project with pending invoices, or first project
        const projectWithPending = projectsWithInvoices.find((p: Project) => p.stats.pendingInvoiceAmount > 0)
        const defaultProject = projectWithPending || projectsWithInvoices[0]
        
        if (defaultProject) {
          setSelectedProjectId(defaultProject.id)
          // If project has pending invoices, default to matching tab
          if (projectWithPending) {
            setActiveTab('matching')
          }
        }
      } else {
        setError(data.error || 'Failed to fetch projects')
      }
    } catch (err) {
      setError('Failed to fetch projects')
      console.error('Projects fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  const handleMatchingComplete = () => {
    // Refresh projects to update pending amounts
    fetchProjects()
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Please log in to continue</h2>
          </div>
        </div>
      </AppLayout>
    )
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const hasPendingInvoices = selectedProject && selectedProject.stats.pendingInvoiceAmount > 0

  return (
    <AppLayout>
      <PageHeader
        title="Invoice Management"
        description="Manage and match invoices against project estimates"
        icon={DocumentTextIcon}
        breadcrumbs={[
          { label: 'Invoice Management' }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Data</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <button
                onClick={() => {
                  setError(null)
                  fetchProjects()
                }}
                className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Projects with Invoices</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload invoices to your projects to start managing them here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Project Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Select Project</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a project to manage its invoices
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select a project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.stats.totalInvoices} invoices)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {selectedProject && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedProject.stats.totalInvoices}
                        </p>
                        <p className="text-xs text-gray-500">Total Invoices</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <CursorArrowRaysIcon className="h-5 w-5 text-yellow-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(selectedProject.stats.pendingInvoiceAmount)}
                        </p>
                        <p className="text-xs text-gray-500">Pending Amount</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <SparklesIcon className="h-5 w-5 text-blue-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedProject.status}
                        </p>
                        <p className="text-xs text-gray-500">Project Status</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedProjectId && (
              <>
                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                      <button
                        onClick={() => setActiveTab('management')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'management'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <EyeIcon className="h-4 w-4 inline mr-2" />
                        Invoice Management
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('matching')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'matching'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <SparklesIcon className="h-4 w-4 inline mr-2" />
                        Smart Matching
                        {hasPendingInvoices && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Pending
                          </span>
                        )}
                      </button>
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="p-0">
                    {activeTab === 'management' && (
                      <InvoiceManagement
                        projectId={selectedProjectId}
                        className="border-0 shadow-none rounded-none"
                      />
                    )}
                    
                    {activeTab === 'matching' && (
                      <InvoiceMatchingInterface
                        projectId={selectedProjectId}
                        onMatchingComplete={handleMatchingComplete}
                        className="border-0 shadow-none rounded-none"
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}