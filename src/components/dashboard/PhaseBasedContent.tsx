'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { usePhaseNavigation } from '@/components/navigation/PhaseBasedNavigation'
import { StageAwareProjectDashboard } from '@/components/dashboard/StageAwareProjectDashboard'
import { ProjectList } from '@/components/projects/ProjectList'
import { InvoiceManagement } from '@/components/invoices/InvoiceManagement'
import { ConstructionInvoiceManager } from '@/components/invoices/ConstructionInvoiceManager'
import { BudgetTrackingWidget } from '@/components/tracking/BudgetTrackingWidget'
import { MilestoneTracker } from '@/components/milestones/MilestoneTracker'
import { DocumentManager } from '@/components/documents/DocumentManager'
import { ProjectAnalytics } from '@/components/analytics/ProjectAnalytics'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import {
  DocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'
  totalBudget: number
  currency: string
}

interface PhaseBasedContentProps {
  activeView: string
  projects: Project[]
  onProjectsChange: () => void
}

export function PhaseBasedContent({
  activeView,
  projects,
  onProjectsChange,
}: PhaseBasedContentProps) {
  // Use the phase navigation context if available
  const phaseContext = React.useContext(React.createContext(null))
  const filteredProjects = phaseContext?.filteredProjects || projects

  // State for dashboard metrics
  const [pendingInvoices, setPendingInvoices] = useState(0)

  // Load dashboard metrics
  useEffect(() => {
    const loadDashboardMetrics = async () => {
      try {
        const response = await fetch('/api/invoices?status=PENDING')
        if (response.ok) {
          const data = await response.json()
          setPendingInvoices(data.invoices?.length || 0)
        }
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error)
        setPendingInvoices(0)
      }
    }

    if (projects.length > 0) {
      loadDashboardMetrics()
    }
  }, [projects])

  const renderPhaseContent = () => {
    switch (activeView) {
      case 'all':
        return (
          <div className="space-y-6">
            {/* Overview section */}
            <Card>
              <Card.Header>
                <div className="flex items-center space-x-2">
                  <BuildingOffice2Icon className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Project Overview</h2>
                </div>
              </Card.Header>
              <Card.Body>
                <DashboardOverview />
              </Card.Body>
            </Card>

            {/* All Projects */}
            <Card>
              <Card.Header>
                <h2 className="text-lg font-semibold text-gray-900">All Projects</h2>
              </Card.Header>
              <Card.Body>
                <ProjectList
                  projects={filteredProjects}
                  emptyMessage="No projects found. Create your first project to get started."
                />
              </Card.Body>
            </Card>
          </div>
        )

      case 'planning':
        return (
          <div className="space-y-6">
            {/* Planning Phase Header */}
            <Card>
              <Card.Header>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                    <DocumentCheckIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Planning Phase</h2>
                    <p className="text-gray-600">Project setup, estimates, and documentation</p>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
                    <div className="text-sm text-blue-700">Projects in Planning</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {new Intl.NumberFormat('en-NZ', {
                        style: 'currency',
                        currency: projects[0]?.currency || 'NZD',
                      }).format(projects.reduce((sum, p) => sum + (p.totalBudget || 0), 0))}
                    </div>
                    <div className="text-sm text-blue-700">Total Estimated Value</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(
                        projects.reduce((sum, p) => sum + (p.totalBudget || 0), 0) /
                          (projects.length || 1)
                      )}
                    </div>
                    <div className="text-sm text-blue-700">Avg Project Value</div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Planning Projects */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Projects in Planning</h3>
              </Card.Header>
              <Card.Body>
                <ProjectList
                  projects={filteredProjects}
                  emptyMessage="No projects in planning phase"
                />
              </Card.Body>
            </Card>

            {/* Document Management for Planning Phase */}
            <DocumentManager projectId={filteredProjects[0]?.id} phase="PLANNING" compact={true} />
          </div>
        )

      case 'construction':
        return (
          <div className="space-y-6">
            {/* Construction Phase Header */}
            <Card>
              <Card.Header>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                    <ClockIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Construction Phase</h2>
                    <p className="text-gray-600">
                      Active projects, progress tracking, and invoicing
                    </p>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{projects.length}</div>
                    <div className="text-sm text-orange-700">Active Projects</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {new Intl.NumberFormat('en-NZ', {
                        style: 'currency',
                        currency: projects[0]?.currency || 'NZD',
                      }).format(projects.reduce((sum, p) => sum + (p.totalBudget || 0), 0))}
                    </div>
                    <div className="text-sm text-orange-700">Active Project Value</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{pendingInvoices}</div>
                    <div className="text-sm text-orange-700">Pending Invoices</div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Construction Projects */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">
                  Active Construction Projects
                </h3>
              </Card.Header>
              <Card.Body>
                <ProjectList
                  projects={filteredProjects}
                  emptyMessage="No projects in construction phase"
                />
              </Card.Body>
            </Card>

            {/* Budget Tracking Summary */}
            <BudgetTrackingWidget projectId={filteredProjects[0]?.id} compact={true} />

            {/* Milestone Progress */}
            <MilestoneTracker projectId={filteredProjects[0]?.id} compact={true} />

            {/* Enhanced Invoice Management for Construction Phase */}
            <ConstructionInvoiceManager projectId={filteredProjects[0]?.id} />

            {/* Document Management for Construction Phase */}
            <DocumentManager
              projectId={filteredProjects[0]?.id}
              phase="CONSTRUCTION"
              compact={true}
            />
          </div>
        )

      case 'completed':
        return (
          <div className="space-y-6">
            {/* Completion Phase Header */}
            <Card>
              <Card.Header>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Completion Phase</h2>
                    <p className="text-gray-600">
                      Final documentation, reports, and reconciliation
                    </p>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{projects.length}</div>
                    <div className="text-sm text-green-700">Completed Projects</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${projects.reduce((sum, p) => sum + (p.totalBudget || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-green-700">Total Completed Value</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">100%</div>
                    <div className="text-sm text-green-700">Average Completion</div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Completed Projects */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Completed Projects</h3>
              </Card.Header>
              <Card.Body>
                <ProjectList projects={filteredProjects} emptyMessage="No completed projects yet" />
              </Card.Body>
            </Card>

            {/* Analytics for Completed Projects */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Project Analytics & Reports</h3>
              </Card.Header>
              <Card.Body>
                <ProjectAnalytics />
              </Card.Body>
            </Card>

            {/* Document Management for Completion Phase */}
            <DocumentManager
              projectId={filteredProjects[0]?.id}
              phase="COMPLETION"
              compact={true}
            />
          </div>
        )

      default:
        return (
          <Card>
            <Card.Body>
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg">Select a phase to view projects</div>
              </div>
            </Card.Body>
          </Card>
        )
    }
  }

  return <div className="space-y-6">{renderPhaseContent()}</div>
}
