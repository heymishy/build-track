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
} from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { tokens } from '@/lib/design-system'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { EditProjectModal } from '@/components/projects/EditProjectModal'
import { StageNavigation } from '@/components/layout/StageNavigation'
import { StageTabNavigation } from '@/components/layout/StageTabNavigation'
import {
  StageIndicator,
  FloatingStageIndicator,
  BreadcrumbStageIndicator,
} from '@/components/layout/StageIndicator'
import { PlanningStage } from '@/components/stages/PlanningStage'
import { ConstructionStage } from '@/components/stages/ConstructionStage'
import { CompletionStage } from '@/components/stages/CompletionStage'

interface Project {
  id: string
  name: string
  description?: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'
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
}

export function StageAwareProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchProjects()
  }, [])

  // Reset to overview tab when project changes
  useEffect(() => {
    if (selectedProject) {
      setActiveTab('overview')
    }
  }, [selectedProject])

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
      case 'PLANNING':
        return 'blue'
      case 'IN_PROGRESS':
        return 'yellow'
      case 'ON_HOLD':
        return 'gray'
      case 'COMPLETED':
        return 'green'
      case 'CANCELLED':
        return 'red'
      default:
        return 'gray'
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

  const handleStageTransition = async (newStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED') => {
    if (!selectedProject) return

    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedProject,
          status: newStatus,
          // Update dates based on stage
          ...(newStatus === 'IN_PROGRESS' && !selectedProject.startDate
            ? { startDate: new Date().toISOString() }
            : {}),
          ...(newStatus === 'COMPLETED' ? { actualEndDate: new Date().toISOString() } : {}),
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Create stage transition log
        await fetch('/api/projects/stage-transition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: selectedProject.id,
            fromStatus: selectedProject.status,
            toStatus: newStatus,
            reason: `Manual stage transition from ${selectedProject.status} to ${newStatus}`,
          }),
        })

        // Update local state
        const updatedProject = { ...selectedProject, status: newStatus }
        setSelectedProject(updatedProject)
        setProjects(projects.map(p => (p.id === selectedProject.id ? updatedProject : p)))

        // Reset to overview tab for new stage
        setActiveTab('overview')
      }
    } catch (error) {
      console.error('Failed to transition project stage:', error)
    }
  }

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${project.id}/delete`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        setProjects(projects.filter(p => p.id !== project.id))
        if (selectedProject?.id === project.id) {
          setSelectedProject(projects.find(p => p.id !== project.id) || null)
        }
      } else {
        alert(data.error || 'Failed to delete project')
      }
    } catch (error) {
      alert('Network error deleting project')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: selectedProject?.currency || 'NZD',
    }).format(amount)
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString()
  }

  const renderStageContent = () => {
    if (!selectedProject) return null

    switch (selectedProject.status) {
      case 'PLANNING':
        return <PlanningStage project={selectedProject} activeTab={activeTab} />
      case 'IN_PROGRESS':
        return <ConstructionStage project={selectedProject} activeTab={activeTab} />
      case 'COMPLETED':
        return <CompletionStage project={selectedProject} activeTab={activeTab} />
      case 'ON_HOLD':
        return <PlanningStage project={selectedProject} activeTab={activeTab} />
      case 'CANCELLED':
        return <CompletionStage project={selectedProject} activeTab={activeTab} />
      default:
        return <PlanningStage project={selectedProject} activeTab={activeTab} />
    }
  }

  const getTabCounts = () => {
    if (!selectedProject?.stats) return {}

    return {
      estimates: selectedProject.stats.totalTrades || 0,
      milestones: selectedProject.stats.totalMilestones || 0,
      invoices: selectedProject.stats.totalInvoices || 0,
      documents: 0, // TODO: Get from API
      progress: 0, // TODO: Get from API
      labor: 0, // TODO: Get from API
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading projects</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <Button onClick={fetchProjects}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Floating Stage Indicator */}
      {selectedProject && (
        <FloatingStageIndicator
          currentStage={selectedProject.status}
          projectName={selectedProject.name}
        />
      )}

      {/* Projects Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Construction Projects</h1>
          <p className="text-gray-600">
            Manage your construction projects through all stages of development
          </p>
          {selectedProject && (
            <div className="mt-2">
              <BreadcrumbStageIndicator currentStage={selectedProject.status} />
            </div>
          )}
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <PlusIcon className="w-5 h-5 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Project Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Projects</h3>
                <span className="text-sm text-gray-500">{projects.length}</span>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-6">
                  <BuildingOfficeIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No projects yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateModalOpen(true)}
                    className="mt-2"
                  >
                    Create First Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`
                        p-3 rounded-lg cursor-pointer border transition-all
                        ${
                          selectedProject?.id === project.id
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-gray-50 border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {project.name}
                          </h4>
                          <div className="flex items-center mt-1">
                            <Badge
                              variant={getStatusVariant(project.status)}
                              size="sm"
                              icon={getStatusIcon(project.status)}
                            >
                              {project.status ? project.status.replace('_', ' ') : 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-gray-400 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedProject ? (
            <div className="space-y-6">
              {/* Current Stage Indicator */}
              <StageIndicator
                currentStage={selectedProject.status}
                projectName={selectedProject.name}
                showDescription={true}
              />

              {/* Project Header */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedProject.name}</h2>
                    {selectedProject.description && (
                      <p className="text-gray-600 mt-1">{selectedProject.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProject(selectedProject)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Budget and Timeline Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm text-gray-500">Total Budget</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(selectedProject.totalBudget)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm text-gray-500">Start Date</p>
                        <p className="font-semibold text-gray-900">
                          {formatDate(selectedProject.startDate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <ChartBarIcon className="h-5 w-5 text-purple-600" />
                      <div className="ml-3">
                        <p className="text-sm text-gray-500">Status</p>
                        <Badge
                          variant={getStatusVariant(selectedProject.status)}
                          icon={getStatusIcon(selectedProject.status)}
                        >
                          {selectedProject.status
                            ? selectedProject.status.replace('_', ' ')
                            : 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stage Navigation */}
              <StageNavigation
                currentStage={selectedProject.status}
                onStageChange={handleStageTransition}
                showTransitionControls={true}
                userCanTransition={true}
              />

              {/* Stage-Specific Navigation Tabs */}
              <StageTabNavigation
                currentStage={selectedProject.status}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                counts={getTabCounts()}
              />

              {/* Stage-Specific Content */}
              {renderStageContent()}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No project selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a project from the sidebar to view details
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onProjectCreated={newProject => {
          setProjects([...projects, newProject])
          setSelectedProject(newProject)
          setCreateModalOpen(false)
        }}
      />

      {editModalOpen && selectedProject && (
        <EditProjectModal
          isOpen={editModalOpen}
          project={selectedProject}
          onClose={() => setEditModalOpen(false)}
          onProjectUpdated={updatedProject => {
            setProjects(projects.map(p => (p.id === updatedProject.id ? updatedProject : p)))
            setSelectedProject(updatedProject)
            setEditModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
