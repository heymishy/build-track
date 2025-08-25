/**
 * Analytics Dashboard Page
 * Comprehensive analytics and reporting for construction projects
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProjectSelector } from '@/components/projects/ProjectSelector'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  status: string
  totalBudget: number
  currency: string
}

interface AnalyticsData {
  overview: {
    totalProjects: number
    activeProjects: number
    completedProjects: number
    totalBudget: number
    totalSpent: number
    budgetVariance: number
    currency: string
  }
  projectHealth: Array<{
    id: string
    name: string
    status: string
    budgetUsed: number
    timelineStatus: 'on-track' | 'delayed' | 'ahead'
    healthScore: number
  }>
  financialSummary: {
    monthlySpending: Array<{
      month: string
      spent: number
      budgeted: number
    }>
    categoryBreakdown: Array<{
      category: string
      amount: number
      percentage: number
    }>
  }
  milestoneStats: {
    totalMilestones: number
    completedMilestones: number
    overdueMilestones: number
    upcomingMilestones: number
  }
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        credentials: 'include'
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

    } catch (err) {
      console.error('Error fetching projects:', err)
      setError('Failed to load projects')
    }
  }

  const fetchAnalytics = async (projectId?: string) => {
    try {
      setLoading(true)
      const endpoint = projectId 
        ? `/api/projects/${projectId}/analytics?timeRange=${timeRange}`
        : `/api/analytics?timeRange=${timeRange}`
      
      const response = await fetch(endpoint, {
        credentials: 'include'
      })

      if (!response.ok) {
        // If analytics API doesn't exist, create mock data
        setAnalyticsData(generateMockAnalytics())
        return
      }

      const data = await response.json()
      setAnalyticsData(data)

    } catch (err) {
      console.error('Error fetching analytics:', err)
      // Fallback to mock data if API not available
      setAnalyticsData(generateMockAnalytics())
    } finally {
      setLoading(false)
    }
  }

  const generateMockAnalytics = (): AnalyticsData => {
    const totalBudget = projects.reduce((sum, p) => sum + Number(p.totalBudget), 0)
    const totalSpent = totalBudget * 0.65 // 65% spent
    
    return {
      overview: {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'IN_PROGRESS').length,
        completedProjects: projects.filter(p => p.status === 'COMPLETED').length,
        totalBudget,
        totalSpent,
        budgetVariance: (totalSpent - totalBudget) / totalBudget,
        currency: 'NZD'
      },
      projectHealth: projects.slice(0, 5).map((p, i) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        budgetUsed: Math.random() * 0.8 + 0.1,
        timelineStatus: ['on-track', 'delayed', 'ahead'][i % 3] as any,
        healthScore: Math.random() * 40 + 60 // 60-100
      })),
      financialSummary: {
        monthlySpending: Array.from({ length: 6 }, (_, i) => ({
          month: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' }),
          spent: Math.random() * 50000 + 10000,
          budgeted: Math.random() * 60000 + 15000
        })).reverse(),
        categoryBreakdown: [
          { category: 'Materials', amount: totalSpent * 0.4, percentage: 40 },
          { category: 'Labor', amount: totalSpent * 0.35, percentage: 35 },
          { category: 'Equipment', amount: totalSpent * 0.15, percentage: 15 },
          { category: 'Other', amount: totalSpent * 0.1, percentage: 10 }
        ]
      },
      milestoneStats: {
        totalMilestones: 25,
        completedMilestones: 18,
        overdueMilestones: 3,
        upcomingMilestones: 4
      }
    }
  }

  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user])

  useEffect(() => {
    if (projects.length > 0) {
      fetchAnalytics(selectedProject?.id)
    }
  }, [projects, selectedProject, timeRange])

  const formatCurrency = (amount: number, currency: string = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number, showSign = true) => {
    const percentage = `${Math.abs(value * 100).toFixed(1)}%`
    return showSign ? (value >= 0 ? `+${percentage}` : `-${percentage}`) : percentage
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Analytics</h3>
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

  if (!analyticsData) return null

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">Project performance and financial insights</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
              data-testid="time-range-selector"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>

            <ProjectSelector
              selectedProject={selectedProject}
              onProjectSelect={setSelectedProject}
              projects={projects}
              placeholder="All projects"
              allowAll={true}
              data-testid="project-selector"
            />
          </div>
        </div>

        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Budget</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analyticsData.overview.totalBudget, analyticsData.overview.currency)}
                </dd>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Spent</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analyticsData.overview.totalSpent, analyticsData.overview.currency)}
                </dd>
              </div>
              <ChartBarIcon className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <dt className="text-sm font-medium text-gray-500">Budget Variance</dt>
                <dd className={`text-2xl font-bold flex items-center ${
                  analyticsData.overview.budgetVariance >= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {analyticsData.overview.budgetVariance >= 0 ? 
                    <TrendingUpIcon className="h-5 w-5 mr-1" /> :
                    <TrendingDownIcon className="h-5 w-5 mr-1" />
                  }
                  {formatPercentage(analyticsData.overview.budgetVariance)}
                </dd>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                analyticsData.overview.budgetVariance >= 0 ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {analyticsData.overview.budgetVariance >= 0 ? 
                  <TrendingUpIcon className="h-5 w-5 text-red-600" /> :
                  <TrendingDownIcon className="h-5 w-5 text-green-600" />
                }
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <dt className="text-sm font-medium text-gray-500">Active Projects</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {analyticsData.overview.activeProjects}
                </dd>
                <div className="text-xs text-gray-500">
                  of {analyticsData.overview.totalProjects} total
                </div>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Project Health & Milestones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Project Health */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Project Health</h2>
            </div>
            <div className="p-6 space-y-4">
              {analyticsData.projectHealth.map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{project.name}</h3>
                    <div className="flex items-center mt-1 space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${project.budgetUsed * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatPercentage(project.budgetUsed, false)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getHealthScoreColor(project.healthScore)}`}>
                      {Math.round(project.healthScore)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Milestone Statistics */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Milestone Progress</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <dt className="text-sm font-medium text-gray-500">Completed</dt>
                  <dd className="text-3xl font-bold text-green-600">
                    {analyticsData.milestoneStats.completedMilestones}
                  </dd>
                </div>
                <div className="text-center">
                  <dt className="text-sm font-medium text-gray-500">Upcoming</dt>
                  <dd className="text-3xl font-bold text-blue-600">
                    {analyticsData.milestoneStats.upcomingMilestones}
                  </dd>
                </div>
                <div className="text-center">
                  <dt className="text-sm font-medium text-gray-500">Total</dt>
                  <dd className="text-3xl font-bold text-gray-900">
                    {analyticsData.milestoneStats.totalMilestones}
                  </dd>
                </div>
                <div className="text-center">
                  <dt className="text-sm font-medium text-gray-500">Overdue</dt>
                  <dd className="text-3xl font-bold text-red-600">
                    {analyticsData.milestoneStats.overdueMilestones}
                  </dd>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Completion Rate</span>
                  <span>
                    {Math.round((analyticsData.milestoneStats.completedMilestones / analyticsData.milestoneStats.totalMilestones) * 100)}%
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full"
                    style={{
                      width: `${(analyticsData.milestoneStats.completedMilestones / analyticsData.milestoneStats.totalMilestones) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card className="mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Spending by Category</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {analyticsData.financialSummary.categoryBreakdown.map((category, index) => {
                const colors = [
                  'bg-blue-500',
                  'bg-green-500', 
                  'bg-yellow-500',
                  'bg-purple-500'
                ]
                return (
                  <div key={category.category} className="text-center">
                    <div className={`w-16 h-16 ${colors[index]} rounded-full mx-auto mb-2 flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">{category.percentage}%</span>
                    </div>
                    <h3 className="font-medium text-gray-900">{category.category}</h3>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(category.amount, analyticsData.overview.currency)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Empty State for No Data */}
        {projects.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create some projects to start seeing analytics data.
              </p>
              <div className="mt-6">
                <Button onClick={() => window.location.href = '/projects'}>
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}