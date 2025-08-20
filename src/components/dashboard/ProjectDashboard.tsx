'use client'

import { useState, useEffect } from 'react'
import { ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline'
import {
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/solid'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'

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
  stats: {
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
  milestones: Array<{
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

  useEffect(() => {
    fetchProjects()
  }, [])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

  const calculateProjectHealth = (project: Project) => {
    const { stats } = project
    let healthScore = 100

    // Budget health (40% weight)
    if (stats.isOverBudget) {
      healthScore -= 40
    } else if (stats.budgetUsedPercent > 85) {
      healthScore -= 20
    } else if (stats.budgetUsedPercent > 70) {
      healthScore -= 10
    }

    // Timeline health (30% weight) - simplified for now
    if (project.status === 'ON_HOLD') {
      healthScore -= 30
    } else if (project.status === 'CANCELLED') {
      healthScore = 0
    }

    // Milestone completion (30% weight)
    const milestoneCompletionRate =
      stats.totalMilestones > 0 ? (stats.completedMilestones / stats.totalMilestones) * 100 : 100

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

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-4">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Projects</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchProjects}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Projects Yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first project.</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Project
          </button>
        </div>
      </div>
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
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Projects ({projects.length})
            </h3>
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
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}
                          >
                            {getStatusIcon(project.status)}
                            <span className="ml-1">{project.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <span>
                            Budget: {formatCurrency(project.totalBudget, project.currency)}
                          </span>
                          <span>Used: {project.stats.budgetUsedPercent.toFixed(1)}%</span>
                          <span className={getHealthColor(health)}>Health: {health}%</span>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Project Details */}
        {selectedProject && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {selectedProject.name}
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedProject.status)}`}
                >
                  {getStatusIcon(selectedProject.status)}
                  <span className="ml-1">{selectedProject.status.replace('_', ' ')}</span>
                </span>
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
                        {formatCurrency(selectedProject.stats.budgetUsed)}
                        <span className="text-xs text-gray-500 ml-1">
                          ({selectedProject.stats.budgetUsedPercent.toFixed(1)}%)
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
                        {selectedProject.stats.completedMilestones} /{' '}
                        {selectedProject.stats.totalMilestones}
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
                  <span>{formatCurrency(selectedProject.stats.budgetRemaining)} remaining</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      selectedProject.stats.isOverBudget
                        ? 'bg-red-500'
                        : selectedProject.stats.budgetUsedPercent > 85
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, selectedProject.stats.budgetUsedPercent)}%` }}
                  ></div>
                </div>
                {selectedProject.stats.isOverBudget && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Over budget by{' '}
                    {formatCurrency(Math.abs(selectedProject.stats.budgetRemaining))}
                  </p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {selectedProject.stats.totalInvoices}
                  </p>
                  <p className="text-xs text-gray-500">Invoices</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {selectedProject.stats.totalTrades}
                  </p>
                  <p className="text-xs text-gray-500">Trades</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {selectedProject.stats.totalMilestones}
                  </p>
                  <p className="text-xs text-gray-500">Milestones</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onProjectCreated={project => {
          setProjects(prev => [project, ...prev])
          setSelectedProject(project)
          setCreateModalOpen(false)
        }}
      />
    </div>
  )
}
