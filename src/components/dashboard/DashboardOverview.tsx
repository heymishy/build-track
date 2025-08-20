'use client'

import { useState, useEffect } from 'react'
import {
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalBudget: number
  totalSpent: number
  totalInvoices: number
  pendingInvoices: number
  overBudgetProjects: number
  completedProjects: number
  averageBudgetUsage: number
  totalPendingAmount: number
  healthyProjects: number
  atRiskProjects: number
}

interface DashboardOverviewProps {
  className?: string
}

export function DashboardOverview({ className = '' }: DashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects')
      const data = await response.json()

      if (data.success) {
        const projects = data.projects
        
        // Calculate dashboard statistics
        const dashboardStats: DashboardStats = {
          totalProjects: projects.length,
          activeProjects: projects.filter((p: any) => 
            ['PLANNING', 'IN_PROGRESS'].includes(p.status)
          ).length,
          completedProjects: projects.filter((p: any) => p.status === 'COMPLETED').length,
          totalBudget: projects.reduce((sum: number, p: any) => sum + Number(p.totalBudget), 0),
          totalSpent: projects.reduce((sum: number, p: any) => sum + p.stats.budgetUsed, 0),
          totalInvoices: projects.reduce((sum: number, p: any) => sum + p.stats.totalInvoices, 0),
          pendingInvoices: projects.reduce((sum: number, p: any) => 
            sum + (p.stats.totalInvoices - p.stats.totalInvoices), 0), // This would need actual pending count
          overBudgetProjects: projects.filter((p: any) => p.stats.isOverBudget).length,
          averageBudgetUsage: projects.length > 0 
            ? projects.reduce((sum: number, p: any) => sum + p.stats.budgetUsedPercent, 0) / projects.length
            : 0,
          totalPendingAmount: projects.reduce((sum: number, p: any) => sum + p.stats.pendingInvoiceAmount, 0),
          healthyProjects: projects.filter((p: any) => {
            const health = calculateProjectHealth(p)
            return health >= 80
          }).length,
          atRiskProjects: projects.filter((p: any) => {
            const health = calculateProjectHealth(p)
            return health < 60
          }).length,
        }

        setStats(dashboardStats)
      } else {
        setError(data.error || 'Failed to fetch dashboard stats')
      }
    } catch (err) {
      setError('Network error loading dashboard')
    } finally {
      setLoading(false)
    }
  }

  const calculateProjectHealth = (project: any) => {
    let healthScore = 100
    
    if (project.stats.isOverBudget) {
      healthScore -= 40
    } else if (project.stats.budgetUsedPercent > 85) {
      healthScore -= 20
    } else if (project.stats.budgetUsedPercent > 70) {
      healthScore -= 10
    }

    if (project.status === 'ON_HOLD') {
      healthScore -= 30
    } else if (project.status === 'CANCELLED') {
      healthScore = 0
    }

    const milestoneCompletionRate = project.stats.totalMilestones > 0 
      ? (project.stats.completedMilestones / project.stats.totalMilestones) * 100 
      : 100

    if (milestoneCompletionRate < 50) {
      healthScore -= 20
    } else if (milestoneCompletionRate < 75) {
      healthScore -= 10
    }

    return Math.max(0, healthScore)
  }

  const formatCurrency = (amount: number, currency = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-4">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchDashboardStats}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      icon: BuildingOfficeIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: `${stats.activeProjects} active, ${stats.completedProjects} completed`,
    },
    {
      title: 'Total Budget',
      value: formatCurrency(stats.totalBudget),
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: `${formatCurrency(stats.totalSpent)} spent`,
      trend: stats.totalBudget > 0 ? (stats.totalSpent / stats.totalBudget) * 100 : 0,
    },
    {
      title: 'Budget Usage',
      value: formatPercentage(stats.averageBudgetUsage),
      icon: ChartBarIcon,
      color: stats.averageBudgetUsage > 85 ? 'text-red-600' : stats.averageBudgetUsage > 70 ? 'text-yellow-600' : 'text-green-600',
      bgColor: stats.averageBudgetUsage > 85 ? 'bg-red-50' : stats.averageBudgetUsage > 70 ? 'bg-yellow-50' : 'bg-green-50',
      subtitle: `${stats.overBudgetProjects} projects over budget`,
      trendIcon: stats.averageBudgetUsage > 85 ? TrendingUpIcon : undefined,
    },
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: DocumentTextIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: formatCurrency(stats.totalPendingAmount) + ' pending',
    },
    {
      title: 'Project Health',
      value: `${stats.healthyProjects}/${stats.totalProjects}`,
      icon: ChartBarIcon,
      color: stats.atRiskProjects > 0 ? 'text-yellow-600' : 'text-green-600',
      bgColor: stats.atRiskProjects > 0 ? 'bg-yellow-50' : 'bg-green-50',
      subtitle: `${stats.atRiskProjects} at risk`,
      trendIcon: stats.atRiskProjects > 0 ? ExclamationTriangleIcon : undefined,
    },
    {
      title: 'Completion Rate',
      value: formatPercentage(stats.totalProjects > 0 ? (stats.completedProjects / stats.totalProjects) * 100 : 0),
      icon: ClockIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      subtitle: `${stats.completedProjects} of ${stats.totalProjects} complete`,
    },
    {
      title: 'Budget Remaining',
      value: formatCurrency(stats.totalBudget - stats.totalSpent),
      icon: CurrencyDollarIcon,
      color: (stats.totalBudget - stats.totalSpent) < 0 ? 'text-red-600' : 'text-green-600',
      bgColor: (stats.totalBudget - stats.totalSpent) < 0 ? 'bg-red-50' : 'bg-green-50',
      subtitle: 'across all projects',
      trendIcon: (stats.totalBudget - stats.totalSpent) < 0 ? TrendingDownIcon : TrendingUpIcon,
    },
    {
      title: 'Average Project',
      value: stats.totalProjects > 0 ? formatCurrency(stats.totalBudget / stats.totalProjects) : formatCurrency(0),
      icon: BuildingOfficeIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      subtitle: `${formatCurrency(stats.totalProjects > 0 ? stats.totalSpent / stats.totalProjects : 0)} avg spent`,
    },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Dashboard Overview</h2>
        <button
          onClick={fetchDashboardStats}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => {
              const IconComponent = card.icon
              const TrendIcon = card.trendIcon
              
              return (
                <div key={index} className="relative">
                  <div className="relative p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 rounded-md p-2 ${card.bgColor}`}>
                        <IconComponent className={`h-5 w-5 ${card.color}`} />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {card.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          <p className={`text-lg font-semibold ${card.color}`}>
                            {card.value}
                          </p>
                          {TrendIcon && (
                            <TrendIcon className={`h-4 w-4 ${card.color}`} />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {card.subtitle}
                        </p>
                      </div>
                    </div>
                    
                    {/* Trend bar for budget usage */}
                    {card.trend !== undefined && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full transition-all duration-300 ${
                              card.trend > 85 ? 'bg-red-500' : 
                              card.trend > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, card.trend)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Insights</h3>
          <div className="space-y-3">
            {stats.overBudgetProjects > 0 && (
              <div className="flex items-center p-3 bg-red-50 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {stats.overBudgetProjects} project{stats.overBudgetProjects !== 1 ? 's' : ''} over budget
                  </p>
                  <p className="text-xs text-red-600">Review spending and adjust budgets as needed</p>
                </div>
              </div>
            )}
            
            {stats.atRiskProjects > 0 && (
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    {stats.atRiskProjects} project{stats.atRiskProjects !== 1 ? 's' : ''} at risk
                  </p>
                  <p className="text-xs text-yellow-600">Consider reviewing project timelines and resources</p>
                </div>
              </div>
            )}

            {stats.totalPendingAmount > 0 && (
              <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    {formatCurrency(stats.totalPendingAmount)} in pending invoices
                  </p>
                  <p className="text-xs text-blue-600">Process invoices to keep project finances up to date</p>
                </div>
              </div>
            )}

            {stats.overBudgetProjects === 0 && stats.atRiskProjects === 0 && (
              <div className="flex items-center p-3 bg-green-50 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    All projects are on track
                  </p>
                  <p className="text-xs text-green-600">Great job managing your construction projects!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}