/**
 * Estimates Management Page
 * Main interface for managing project estimates and cost tracking
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { EstimateManager } from '@/components/estimates/EstimateManager'
import { AccuracyMeter } from '@/components/estimates/AccuracyMeter'
import { CostTrackingDashboard } from '@/components/estimates/CostTrackingDashboard'
import { ProjectSelector } from '@/components/projects/ProjectSelector'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  CalculatorIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  status: string
  totalBudget: number
  currency: string
}

interface EstimatesSummary {
  totalProjects: number
  projectsWithEstimates: number
  averageAccuracy: number
  totalEstimatedValue: number
  currency: string
}

export default function EstimatesPage() {
  const { user } = useAuth()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [summary, setSummary] = useState<EstimatesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'accuracy' | 'cost-tracking'>('overview')

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const data = await response.json()
      setProjects(data.projects || [])

      // Auto-select first project if none selected
      if (!selectedProject && data.projects?.length > 0) {
        setSelectedProject(data.projects[0])
      }

      // Fetch estimates accuracy data
      await fetchEstimatesAccuracy()
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchEstimatesAccuracy = async () => {
    try {
      const response = await fetch('/api/estimates/accuracy', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setSummary({
          totalProjects: projects.length,
          projectsWithEstimates: data.projectsWithEstimates || 0,
          averageAccuracy: data.averageAccuracy || 0,
          totalEstimatedValue: data.totalEstimatedValue || 0,
          currency: 'NZD',
        })
      }
    } catch (err) {
      console.error('Error fetching estimates accuracy:', err)
    }
  }

  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user])

  const formatCurrency = (amount: number, currency: string = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Estimates</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <button
                onClick={fetchProjects}
                className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
            <p className="text-gray-600">Manage project estimates and track accuracy</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <ProjectSelector
              selectedProject={selectedProject}
              onProjectSelect={setSelectedProject}
              projects={projects}
              placeholder="Select a project"
              data-testid="project-selector"
            />
          </div>
        </div>

        {/* Summary Statistics */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalculatorIcon className="h-8 w-8 text-blue-600" />
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
                  <DocumentTextIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">With Estimates</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {summary.projectsWithEstimates}
                  </dd>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">Avg. Accuracy</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {formatPercentage(summary.averageAccuracy)}
                  </dd>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm">$</span>
                  </div>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-500">Total Value</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.totalEstimatedValue, summary.currency)}
                  </dd>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="overview-tab"
            >
              Overview & Management
            </button>
            <button
              onClick={() => setActiveTab('accuracy')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'accuracy'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="accuracy-tab"
            >
              Accuracy Analysis
            </button>
            <button
              onClick={() => setActiveTab('cost-tracking')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cost-tracking'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="cost-tracking-tab"
            >
              Cost Tracking
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {selectedProject ? (
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <EstimateManager projectId={selectedProject.id} data-testid="estimate-manager" />
            )}

            {activeTab === 'accuracy' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Estimate Accuracy Analysis
                  </h2>
                  <AccuracyMeter projectId={selectedProject.id} data-testid="accuracy-meter" />
                </Card>
              </div>
            )}

            {activeTab === 'cost-tracking' && (
              <div className="space-y-6">
                <CostTrackingDashboard
                  projectId={selectedProject.id}
                  data-testid="cost-tracking-dashboard"
                />
              </div>
            )}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <CalculatorIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Project Selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                {projects.length > 0
                  ? 'Please select a project to view and manage estimates.'
                  : 'Create a project first to start managing estimates.'}
              </p>
              {projects.length === 0 && (
                <div className="mt-6">
                  <Button onClick={() => (window.location.href = '/projects')}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
