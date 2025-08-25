'use client'

import { useState, useEffect } from 'react'
import { ChevronRightIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import {
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  CalculatorIcon,
} from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { tokens } from '@/lib/design-system'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { EditProjectModal } from '@/components/projects/EditProjectModal'
import { EstimateManager } from '@/components/estimates/EstimateManager'
import { MilestoneManagement } from '@/components/projects/MilestoneManagement'
import { CostTrackingDashboard } from '@/components/estimates/CostTrackingDashboard'
import { ProjectAnalytics } from '@/components/analytics/ProjectAnalytics'

interface Project {
  id: string
  name: string
  description?: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  totalBudget: number
  currency: string
  startDate?: string
  estimatedEndDate?: string
  actualEndDate?: string
  createdAt: string
  updatedAt: string
  stats?: {
    totalInvoices: number
    totalTrades: number
    totalMilestones: number
    completedMilestones: number
    totalInvoiceAmount: number
    paidInvoiceAmount: number
    pendingInvoiceAmount: number
    totalMilestoneAmount: number
    budgetUsed: number
    budgetRemaining: number
    budgetUsedPercent: number
    isOverBudget: boolean
  }
  milestones?: Array<{
    id: string
    paymentAmount: number
    status: string
    percentComplete: number
  }>
}

interface ProjectDashboardProps {
  className?: string
}

export function ProjectDashboard({ className = '' }: ProjectDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [estimateViewMode, setEstimateViewMode] = useState<'manager' | 'editor'>('editor')
  const [activeManagementTab, setActiveManagementTab] = useState<string>('overview')

  // Debug effect to track modal state changes
  useEffect(() => {
    console.log('ProjectDashboard: createModalOpen changed to:', createModalOpen)
  }, [createModalOpen])

  useEffect(() => {
    fetchProjects()
  }, [])

  const formatCurrency = (amount: number, currency = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects')
      const data = await response.json()

      if (data.success) {
        setProjects(data.projects)
        if (data.projects.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0])
        }
      } else {
        setError(data.error || 'Failed to fetch projects')
      }
    } catch (err) {
      setError('Network error loading projects')
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: string): 'gray' | 'blue' | 'yellow' | 'green' | 'red' => {
    switch (status) {
      case 'PLANNING': return 'gray'
      case 'IN_PROGRESS': return 'blue'
      case 'ON_HOLD': return 'yellow'
      case 'COMPLETED': return 'green'
      case 'CANCELLED': return 'red'
      default: return 'gray'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return <BuildingOfficeIcon className="h-4 w-4" />
      case 'IN_PROGRESS':
        return <ClockIcon className="h-4 w-4" />
      case 'ON_HOLD':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'COMPLETED':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'CANCELLED':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return <BuildingOfficeIcon className="h-4 w-4" />
    }
  }


  const calculateProjectHealth = (project: Project) => {
    const { stats } = project
    let healthScore = 100

    // Handle missing or incomplete stats for newly created projects
    if (!stats) {
      return healthScore // Return 100% health for new projects
    }

    // Budget health (40% weight)
    if (stats.isOverBudget) {
      healthScore -= 40
    } else if ((stats.budgetUsedPercent || 0) > 85) {
      healthScore -= 20
    } else if ((stats.budgetUsedPercent || 0) > 70) {
      healthScore -= 10
    }

    // Timeline health (30% weight) - simplified for now
    if (project.status === 'ON_HOLD') {
      healthScore -= 30
    } else if (project.status === 'CANCELLED') {
      healthScore = 0
    }

    // Milestone completion (30% weight)
    const totalMilestones = stats.totalMilestones || 0
    const completedMilestones = stats.completedMilestones || 0
    const milestoneCompletionRate =
      totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 100

    if (milestoneCompletionRate < 50) {
      healthScore -= 20
    } else if (milestoneCompletionRate < 75) {
      healthScore -= 10
    }

    return Math.max(0, healthScore)
  }

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'text-green-600'
    if (health >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project)
    setEditModalOpen(true)
  }

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => (p.id === updatedProject.id ? updatedProject : p)))
    if (selectedProject?.id === updatedProject.id) {
      setSelectedProject(updatedProject)
    }
    setEditModalOpen(false)
    setProjectToEdit(null)
  }

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/projects/${projectToDelete.id}/delete`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        // Remove from projects list
        setProjects(prev => prev.filter(p => p.id !== projectToDelete.id))

        // Update selected project if needed
        if (selectedProject?.id === projectToDelete.id) {
          const remainingProjects = projects.filter(p => p.id !== projectToDelete.id)
          setSelectedProject(remainingProjects.length > 0 ? remainingProjects[0] : null)
        }

        // Close modals
        setShowDeleteConfirm(false)
        setProjectToDelete(null)
      } else {
        setError(data.error || 'Failed to delete project')
      }
    } catch (err) {
      setError('Failed to delete project')
      console.error('Delete project error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleProjectDeleted = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId))
    if (selectedProject?.id === projectId) {
      const remainingProjects = projects.filter(p => p.id !== projectId)
      setSelectedProject(remainingProjects.length > 0 ? remainingProjects[0] : null)
    }
    setEditModalOpen(false)
    setProjectToEdit(null)
  }

  if (loading) {
    return (
      <Card className={className}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <div className="text-center py-4">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Projects</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <Button onClick={fetchProjects} className="mt-4">
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  if (projects.length === 0) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Projects Yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first project.</p>
          <Button
            onClick={() => setCreateModalOpen(true)}
            icon={<PlusIcon className="h-4 w-4" />}
            className="mt-4"
          >
            Create Project
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Project Management</h2>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project List */}
        <Card>
          <Card.Header>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Projects ({projects.length})
            </h3>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {projects.map(project => {
                const health = calculateProjectHealth(project)
                const isSelected = selectedProject?.id === project.id

                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {project.name}
                          </h4>
                          <Badge 
                            variant={getStatusVariant(project.status)}
                            icon={getStatusIcon(project.status)}
                          >
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <span>
                            Budget: {formatCurrency(project.totalBudget, project.currency)}
                          </span>
                          <span>Used: {(project.stats?.budgetUsedPercent || 0).toFixed(1)}%</span>
                          <span className={getHealthColor(health)}>Health: {health}%</span>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card.Body>
        </Card>

        {/* Project Details */}
        {selectedProject && (
          <Card>
            <Card.Body>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {selectedProject.name}
                </h3>
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => handleEditProject(selectedProject)}
                    variant="secondary"
                    size="sm"
                    icon={<PencilIcon className="h-3 w-3" />}
                    title="Edit project"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={async () => {
                      // Debug permissions first
                      try {
                        const response = await fetch(
                          `/api/projects/${selectedProject.id}/permissions`
                        )
                        const data = await response.json()
                        console.log('Project permissions:', data)

                        if (!data.permissions?.canDelete) {
                          console.log('User cannot delete, trying to fix ownership...')
                          const fixResponse = await fetch(
                            `/api/projects/${selectedProject.id}/fix-ownership`,
                            {
                              method: 'POST',
                            }
                          )
                          const fixData = await fixResponse.json()
                          console.log('Fix ownership result:', fixData)

                          if (fixData.success) {
                            // Refresh the page or refetch projects
                            window.location.reload()
                            return
                          }
                        }

                        handleDeleteProject(selectedProject)
                      } catch (error) {
                        console.error('Error checking permissions:', error)
                        handleDeleteProject(selectedProject)
                      }
                    }}
                    variant="error"
                    size="sm"
                    icon={<TrashIcon className="h-3 w-3" />}
                    title="Delete project"
                  >
                    Delete
                  </Button>
                  <Badge
                    variant={getStatusVariant(selectedProject.status)}
                    icon={getStatusIcon(selectedProject.status)}
                  >
                    {selectedProject.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {selectedProject.description && (
                <p className="text-sm text-gray-600 mb-4">{selectedProject.description}</p>
              )}

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                    <div className="ml-2">
                      <p className="text-xs text-gray-500">Budget Used</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(selectedProject.stats?.budgetUsed || 0)}
                        <span className="text-xs text-gray-500 ml-1">
                          ({(selectedProject.stats?.budgetUsedPercent || 0).toFixed(1)}%)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-5 w-5 text-blue-600" />
                    <div className="ml-2">
                      <p className="text-xs text-gray-500">Milestones</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedProject.stats?.completedMilestones || 0} /{' '}
                        {selectedProject.stats?.totalMilestones || 0}
                        <span className="text-xs text-gray-500 ml-1">complete</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-orange-600" />
                    <div className="ml-2">
                      <p className="text-xs text-gray-500">Timeline</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(selectedProject.startDate)} -{' '}
                        {formatDate(selectedProject.estimatedEndDate)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          calculateProjectHealth(selectedProject) >= 80
                            ? 'bg-green-500'
                            : calculateProjectHealth(selectedProject) >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      ></div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Health Score</p>
                      <p
                        className={`text-sm font-medium ${getHealthColor(calculateProjectHealth(selectedProject))}`}
                      >
                        {calculateProjectHealth(selectedProject)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Budget Progress</span>
                  <span>
                    {formatCurrency(
                      selectedProject.stats?.budgetRemaining || selectedProject.totalBudget
                    )}{' '}
                    remaining
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      selectedProject.stats?.isOverBudget
                        ? 'bg-red-500'
                        : (selectedProject.stats?.budgetUsedPercent || 0) > 85
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, selectedProject.stats?.budgetUsedPercent || 0)}%`,
                    }}
                  ></div>
                </div>
                {selectedProject.stats?.isOverBudget && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Over budget by{' '}
                    {formatCurrency(Math.abs(selectedProject.stats.budgetRemaining || 0))}
                  </p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {selectedProject.stats?.totalInvoices || 0}
                  </p>
                  <p className="text-xs text-gray-500">Invoices</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {selectedProject.stats?.totalTrades || 0}
                  </p>
                  <p className="text-xs text-gray-500">Trades</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {selectedProject.stats?.totalMilestones || 0}
                  </p>
                  <p className="text-xs text-gray-500">Milestones</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}
      </div>

      {/* Project Management Tools */}
      {selectedProject && (
        <Card className="col-span-1 lg:col-span-2">
          <Card.Header>
            <div className="border-b border-gray-200 pb-0">
              <nav className="-mb-px flex space-x-8" aria-label="Management tabs">
                <button
                  onClick={() => setActiveManagementTab('overview')}
                  className={`${
                    activeManagementTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveManagementTab('estimates')}
                  className={`${
                    activeManagementTab === 'estimates'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Estimates & Trades
                </button>
                <button
                  onClick={() => setActiveManagementTab('milestones')}
                  className={`${
                    activeManagementTab === 'milestones'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Milestones
                </button>
                <button
                  onClick={() => setActiveManagementTab('cost-tracking')}
                  className={`${
                    activeManagementTab === 'cost-tracking'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Cost Tracking
                </button>
                <button
                  onClick={() => setActiveManagementTab('analytics')}
                  className={`${
                    activeManagementTab === 'analytics'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Analytics
                </button>
              </nav>
            </div>
          </Card.Header>
          <Card.Body>
            {activeManagementTab === 'overview' && (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">Project management overview for {selectedProject.name}</p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <Button
                    variant="secondary"
                    onClick={() => setActiveManagementTab('estimates')}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <CalculatorIcon className="h-6 w-6 mb-2" />
                    <span>Manage Estimates</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setActiveManagementTab('milestones')}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <ClockIcon className="h-6 w-6 mb-2" />
                    <span>Track Milestones</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setActiveManagementTab('cost-tracking')}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <ChartBarIcon className="h-6 w-6 mb-2" />
                    <span>Cost Tracking</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setActiveManagementTab('analytics')}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <ChartBarIcon className="h-6 w-6 mb-2" />
                    <span>View Analytics</span>
                  </Button>
                </div>
              </div>
            )}
            {activeManagementTab === 'estimates' && (
              <EstimateManager projectId={selectedProject.id} />
            )}
            {activeManagementTab === 'milestones' && (
              <MilestoneManagement project={selectedProject} />
            )}
            {activeManagementTab === 'cost-tracking' && (
              <CostTrackingDashboard projectId={selectedProject.id} />
            )}
            {activeManagementTab === 'analytics' && (
              <ProjectAnalytics projectId={selectedProject.id} />
            )}
          </Card.Body>
        </Card>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => {
          console.log('Modal onClose called')
          setCreateModalOpen(false)
        }}
        onProjectCreated={project => {
          console.log('Project created:', project)
          setProjects(prev => [project, ...prev])
          setSelectedProject(project)
          setCreateModalOpen(false)
        }}
      />

      {/* Edit Project Modal */}
      {projectToEdit && (
        <EditProjectModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setProjectToEdit(null)
          }}
          project={projectToEdit}
          onProjectUpdated={handleProjectUpdated}
          onProjectDeleted={handleProjectDeleted}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && projectToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Delete Project</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete "<strong>{projectToDelete.name}</strong>"? This will
              permanently delete:
            </p>
            <ul className="text-sm text-gray-600 mb-6 pl-4 space-y-1">
              <li>• All project data and settings</li>
              <li>
                • All trades and line items ({projectToDelete.stats?.totalTrades || 0} trades)
              </li>
              <li>• All invoices ({projectToDelete.stats?.totalInvoices || 0} invoices)</li>
              <li>• All milestones ({projectToDelete.stats?.totalMilestones || 0} milestones)</li>
              <li>
                • Project budget:{' '}
                {formatCurrency(projectToDelete.totalBudget, projectToDelete.currency)}
              </li>
            </ul>
            <p className="text-sm text-red-600 font-medium mb-6">This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setProjectToDelete(null)
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
