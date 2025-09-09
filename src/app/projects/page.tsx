/**
 * Projects Management Page
 * Main interface for managing construction projects
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProjectList } from '@/components/projects/ProjectList'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { EditProjectModal } from '@/components/projects/EditProjectModal'
import { CostTrackingWidget } from '@/components/tracking/CostTrackingWidget'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  PlusIcon,
  FolderIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  description?: string
  totalBudget: number
  currency: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'
  startDate?: string
  estimatedEndDate?: string
  actualEndDate?: string
  createdAt: string
  updatedAt: string
  ownerId: string
}

interface ProjectSummary {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalBudget: number
  currency: string
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const itemsPerPage = 10

  const fetchProjects = async (page: number = 1) => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/projects?page=${page}&limit=${itemsPerPage}&sortBy=updatedAt&sortOrder=desc`,
        {
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const data = await response.json()
      setProjects(data.projects)
      setTotalPages(Math.ceil(data.total / itemsPerPage))

      // Calculate summary statistics
      const activeCount = data.projects.filter((p: Project) =>
        ['PLANNING', 'IN_PROGRESS'].includes(p.status)
      ).length

      const completedCount = data.projects.filter((p: Project) => p.status === 'COMPLETED').length

      const totalBudget = data.projects.reduce(
        (sum: number, p: Project) => sum + Number(p.totalBudget),
        0
      )

      setSummary({
        totalProjects: data.total,
        activeProjects: activeCount,
        completedProjects: completedCount,
        totalBudget,
        currency: data.projects[0]?.currency || 'NZD',
      })
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchProjects(currentPage)
    }
  }, [user, currentPage])

  const handleCreateProject = () => {
    setShowCreateModal(true)
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
  }

  const handleProjectCreated = () => {
    setShowCreateModal(false)
    fetchProjects(currentPage)
  }

  const handleProjectUpdated = () => {
    setEditingProject(null)
    fetchProjects(currentPage)
  }

  const formatCurrency = (amount: number, currency: string = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  if (loading && projects.length === 0) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Projects</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <button
                onClick={() => fetchProjects(currentPage)}
                className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">Manage your construction projects</p>
          </div>
          <Button
            onClick={handleCreateProject}
            className="inline-flex items-center"
            data-testid="create-project-button"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Summary Statistics */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FolderIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">Total Projects</dt>
                  <dd className="text-2xl font-bold text-gray-900">{summary.totalProjects}</dd>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">Active Projects</dt>
                  <dd className="text-2xl font-bold text-gray-900">{summary.activeProjects}</dd>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">Completed</dt>
                  <dd className="text-2xl font-bold text-gray-900">{summary.completedProjects}</dd>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">$</span>
                  </div>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">Total Budget</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.totalBudget, summary.currency)}
                  </dd>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Cost Tracking Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Cost Tracking</h2>
              <p className="text-sm text-gray-600">Monitor project spend vs estimates</p>
            </div>
          </div>
          <CostTrackingWidget showProjectSelector={true} className="mb-0" />
        </div>

        {/* Projects List */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">All Projects</h2>
            <p className="text-sm text-gray-500 mt-1">
              {projects.length} of {summary?.totalProjects || 0} projects
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {projects.length > 0 ? (
              projects.map(project => (
                <div
                  key={project.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleEditProject(project)}
                  data-testid={`project-${project.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            project.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : project.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800'
                                : project.status === 'PLANNING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {project.status ? project.status.replace('_', ' ') : 'Unknown'}
                        </span>
                      </div>

                      {project.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                        <span>
                          Budget: {formatCurrency(Number(project.totalBudget), project.currency)}
                        </span>
                        <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
                <div className="mt-6">
                  <Button onClick={handleCreateProject}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Modals */}
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={handleProjectCreated}
        />

        {editingProject && (
          <EditProjectModal
            isOpen={true}
            onClose={() => setEditingProject(null)}
            project={editingProject}
            onProjectUpdated={handleProjectUpdated}
          />
        )}
      </div>
    </AppLayout>
  )
}
