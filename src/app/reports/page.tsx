'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ReportManager } from '@/components/reports/ReportManager'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  status: string
  totalBudget: number
  currency: string
  stats?: {
    totalInvoices: number
    budgetUsedPercent: number
    completedMilestones: number
    totalMilestones: number
  }
}

interface RecentReport {
  id: string
  name: string
  type: string
  generatedAt: string
  generatedBy: string
  format: string
  projectName?: string
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentReports, setRecentReports] = useState<RecentReport[]>([])

  useEffect(() => {
    if (user) {
      fetchProjects()
      fetchRecentReports()
    }
  }, [user])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()

      if (data.success) {
        setProjects(data.projects)
      } else {
        setError(data.error || 'Failed to fetch projects')
      }
    } catch (err) {
      setError('Network error loading projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentReports = async () => {
    // Mock recent reports for demo
    const mockReports: RecentReport[] = [
      {
        id: '1',
        name: 'Monthly Project Summary',
        type: 'project',
        generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        generatedBy: user?.name || 'System',
        format: 'pdf',
        projectName: 'Downtown Office Complex',
      },
      {
        id: '2',
        name: 'Invoice Summary Report',
        type: 'invoice',
        generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        generatedBy: user?.name || 'System',
        format: 'csv',
      },
      {
        id: '3',
        name: 'Cost Tracking Analysis',
        type: 'cost-tracking',
        generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        generatedBy: user?.name || 'System',
        format: 'pdf',
        projectName: 'Residential Development Phase 2',
      },
    ]
    setRecentReports(mockReports)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <DocumentArrowDownIcon className="h-5 w-5 text-blue-600" />
      case 'invoice':
        return <DocumentArrowDownIcon className="h-5 w-5 text-green-600" />
      case 'cost-tracking':
        return <ChartBarIcon className="h-5 w-5 text-purple-600" />
      case 'analytics':
        return <ChartBarIcon className="h-5 w-5 text-orange-600" />
      default:
        return <DocumentArrowDownIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-50'
      case 'IN_PROGRESS':
        return 'text-blue-600 bg-blue-50'
      case 'ON_HOLD':
        return 'text-yellow-600 bg-yellow-50'
      case 'PLANNING':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600">Please log in to view reports.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports & Export</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Generate comprehensive reports for projects, invoices, and analytics
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {projects.length} {projects.length === 1 ? 'project' : 'projects'} available
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Report Generator */}
          <div className="lg:col-span-3">
            <ReportManager projects={projects} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-gray-900">Quick Stats</h3>
              </Card.Header>
              <Card.Body>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Projects</span>
                    <span className="text-sm font-medium text-gray-900">{projects.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Projects</span>
                    <span className="text-sm font-medium text-blue-600">
                      {projects.filter(p => p.status === 'IN_PROGRESS').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completed Projects</span>
                    <span className="text-sm font-medium text-green-600">
                      {projects.filter(p => p.status === 'COMPLETED').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">On Hold</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {projects.filter(p => p.status === 'ON_HOLD').length}
                    </span>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Project Overview */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-gray-900">Project Overview</h3>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {projects.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No projects found</p>
                    </div>
                  ) : (
                    projects.slice(0, 5).map(project => (
                      <div key={project.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {project.name}
                          </h4>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getProjectStatusColor(project.status)}`}
                          >
                            {project.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>Budget: ${project.totalBudget?.toLocaleString()}</span>
                          {project.stats && (
                            <span>Used: {project.stats.budgetUsedPercent?.toFixed(1)}%</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {projects.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      And {projects.length - 5} more projects...
                    </p>
                  )}
                </div>
              </Card.Body>
            </Card>

            {/* Recent Reports */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3">
                  {recentReports.length === 0 ? (
                    <div className="text-center py-4">
                      <ClockIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">No recent reports</p>
                      <p className="text-xs text-gray-400">Generated reports will appear here</p>
                    </div>
                  ) : (
                    recentReports.map(report => (
                      <div key={report.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">{getReportTypeIcon(report.type)}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {report.name}
                            </h4>
                            {report.projectName && (
                              <p className="text-xs text-gray-600 truncate">{report.projectName}</p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">
                                {formatDate(report.generatedAt)}
                              </span>
                              <span className="text-xs font-medium text-gray-700 uppercase">
                                {report.format}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card.Body>
            </Card>

            {/* Help & Tips */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Tips & Help
                </h3>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">PDF Reports</h4>
                    <p>
                      Best for presentations and formal documentation. Includes charts and formatted
                      layouts.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">CSV/Excel Reports</h4>
                    <p>Perfect for data analysis and importing into spreadsheet applications.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Executive Summary</h4>
                    <p>High-level overview ideal for stakeholder meetings and project reviews.</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
