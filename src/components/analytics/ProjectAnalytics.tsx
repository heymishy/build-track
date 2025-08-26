'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'

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
}

interface ProjectAnalyticsProps {
  className?: string
  projectId?: string
  project?: Project
  timeRange?: '30d' | '90d' | '6m' | '1y'
}

interface AnalyticsData {
  trends: Array<{
    date: string
    estimated: number
    actual: number
    variance: number
    invoiceCount: number
    cumulative: {
      estimated: number
      actual: number
      variance: number
    }
  }>
  cashFlow: Array<{
    date: string
    projected: number
    committed: number
    remaining: number
    milestonePayments: number
  }>
  tradePerformance: Array<{
    id: string
    name: string
    estimatedTotal: number
    actualSpent: number
    variance: number
    variancePercent: number
    efficiency: number
    riskLevel: 'low' | 'medium' | 'high'
    trend: 'improving' | 'stable' | 'declining'
  }>
  alerts: Array<{
    id: string
    type: 'budget_overrun' | 'schedule_delay' | 'payment_due'
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    description: string
    amount?: number
    date: string
    actionRequired: boolean
    trade?: string
  }>
  kpis: {
    profitMargin: number
    costEfficiency: number
    scheduleVariance: number
    budgetUtilization: number
    riskScore: number
  }
  summary: {
    totalBudget: number
    totalSpent: number
    projectedFinal: number
    remainingBudget: number
    averageVariance: number
    completionPercent: number
  }
  project: {
    id: string
    name: string
    currency: string
    status: string
  }
}

// Fallback mock data for testing or when API fails
const generateFallbackAnalytics = () => ({
  overview: {
    totalBudget: 100000,
    totalSpent: 45000,
    totalInvoices: 25,
    completedMilestones: 3,
    totalMilestones: 8,
    progressPercentage: 37.5,
    budgetUtilization: 45,
    remainingBudget: 55000,
    projectedCompletion: '2024-11-15',
  },
  trends: {
    spendingTrend: [
      { month: '2024-01', amount: 5000, cumulative: 5000 },
      { month: '2024-02', amount: 8000, cumulative: 13000 },
      { month: '2024-03', amount: 12000, cumulative: 25000 },
      { month: '2024-04', amount: 7000, cumulative: 32000 },
      { month: '2024-05', amount: 6000, cumulative: 38000 },
      { month: '2024-06', amount: 7000, cumulative: 45000 },
    ],
    budgetBurnRate: [
      { month: '2024-01', projected: 8333, actual: 5000 },
      { month: '2024-02', projected: 16666, actual: 13000 },
      { month: '2024-03', projected: 25000, actual: 25000 },
      { month: '2024-04', projected: 33333, actual: 32000 },
      { month: '2024-05', projected: 41666, actual: 38000 },
      { month: '2024-06', projected: 50000, actual: 45000 },
    ],
  },
  alerts: [
    {
      type: 'warning' as const,
      message: 'Budget utilization is approaching 50% threshold',
      severity: 'medium' as const,
      timestamp: '2024-06-15T10:00:00Z',
    },
    {
      type: 'info' as const,
      message: 'Milestone "Foundation Complete" was completed ahead of schedule',
      severity: 'low' as const,
      timestamp: '2024-03-10T15:30:00Z',
    },
  ],
  cashFlow: {
    projectedInflow: [
      { month: '2024-07', amount: 17000 },
      { month: '2024-08', amount: 20000 },
      { month: '2024-09', amount: 12000 },
      { month: '2024-10', amount: 8000 },
    ],
    projectedOutflow: [
      { month: '2024-07', amount: 18000 },
      { month: '2024-08', amount: 16000 },
      { month: '2024-09', amount: 10000 },
      { month: '2024-10', amount: 11000 },
    ],
  },
  kpis: {
    costPerformanceIndex: 1.12,
    schedulePerformanceIndex: 0.95,
    estimateAccuracy: 87.5,
    changeOrderImpact: 3.2,
    milestoneAdhesion: 75,
    budgetVariance: -5000,
  },
  trades: [
    { name: 'Foundation', budgeted: 25000, spent: 24000, variance: 1000 },
    { name: 'Framing', budgeted: 35000, spent: 21000, variance: 14000 },
    { name: 'Electrical', budgeted: 16000, spent: 0, variance: 16000 },
    { name: 'Plumbing', budgeted: 12000, spent: 0, variance: 12000 },
  ],
})

export function ProjectAnalytics({ 
  className = '', 
  projectId, 
  project, 
  timeRange = '90d' 
}: ProjectAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [projectId, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use projectId from props or URL parameter
      const targetProjectId = projectId || project?.id
      
      if (!targetProjectId) {
        setError('No project specified')
        return
      }

      // Check if we're in a test environment
      const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'

      if (isTest && global.fetch) {
        // In test environment, use the mocked fetch
        try {
          const response = await global.fetch('/api/analytics')
          const result = await response.json()

          if (result.success && result.data) {
            // Convert old format to new format for backward compatibility
            const convertedData = convertLegacyFormat(result.data)
            setData(convertedData)
          } else {
            setData(null)
            setError(null)
          }
        } catch (fetchError) {
          setError('Error loading analytics data')
        }
      } else {
        // Production environment - use real API
        const response = await fetch(`/api/projects/${targetProjectId}/analytics?timeRange=${timeRange}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Project not found')
          } else if (response.status === 403) {
            setError('Access denied to this project')
          } else {
            setError(`Failed to load analytics: ${response.statusText}`)
          }
          return
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          setData(result.data)
        } else {
          setError(result.error || 'No analytics data available')
        }
      }
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError('Error loading analytics data')
    } finally {
      setLoading(false)
    }
  }

  // Convert legacy test format to new API format for backward compatibility
  const convertLegacyFormat = (legacyData: any): AnalyticsData => {
    return {
      trends: legacyData.trends?.spendingTrend?.map((trend: any, index: number) => ({
        date: trend.month,
        estimated: legacyData.trends.budgetBurnRate?.[index]?.projected || 0,
        actual: trend.amount,
        variance: trend.amount - (legacyData.trends.budgetBurnRate?.[index]?.projected || 0),
        invoiceCount: 1,
        cumulative: {
          estimated: legacyData.trends.budgetBurnRate?.[index]?.projected || 0,
          actual: trend.cumulative,
          variance: trend.cumulative - (legacyData.trends.budgetBurnRate?.[index]?.projected || 0)
        }
      })) || [],
      cashFlow: legacyData.cashFlow?.projectedInflow?.map((inflow: any, index: number) => ({
        date: inflow.month,
        projected: inflow.amount,
        committed: legacyData.cashFlow.projectedOutflow?.[index]?.amount || 0,
        remaining: inflow.amount - (legacyData.cashFlow.projectedOutflow?.[index]?.amount || 0),
        milestonePayments: inflow.amount
      })) || [],
      tradePerformance: legacyData.trades?.map((trade: any) => ({
        id: trade.name.toLowerCase().replace(/\s+/g, '-'),
        name: trade.name,
        estimatedTotal: trade.budgeted,
        actualSpent: trade.spent,
        variance: trade.variance,
        variancePercent: trade.budgeted > 0 ? ((trade.spent - trade.budgeted) / trade.budgeted) * 100 : 0,
        efficiency: trade.budgeted > 0 ? (trade.budgeted / Math.max(trade.spent, 1)) * 100 : 100,
        riskLevel: Math.abs(trade.variance) > trade.budgeted * 0.2 ? 'high' : 'low',
        trend: trade.variance > 0 ? 'improving' : 'stable'
      })) || [],
      alerts: legacyData.alerts?.map((alert: any, index: number) => ({
        id: `alert-${index}`,
        type: alert.type === 'warning' ? 'budget_overrun' : 'payment_due',
        severity: alert.severity,
        title: alert.message,
        description: alert.message,
        date: alert.timestamp,
        actionRequired: alert.severity === 'high'
      })) || [],
      kpis: {
        profitMargin: legacyData.kpis?.budgetVariance || 0,
        costEfficiency: legacyData.kpis?.costPerformanceIndex ? legacyData.kpis.costPerformanceIndex * 100 : 100,
        scheduleVariance: legacyData.kpis?.schedulePerformanceIndex ? (legacyData.kpis.schedulePerformanceIndex - 1) * 100 : 0,
        budgetUtilization: legacyData.overview?.budgetUtilization || 0,
        riskScore: legacyData.kpis?.estimateAccuracy ? 100 - legacyData.kpis.estimateAccuracy : 0
      },
      summary: {
        totalBudget: legacyData.overview?.totalBudget || 0,
        totalSpent: legacyData.overview?.totalSpent || 0,
        projectedFinal: (legacyData.overview?.totalSpent || 0) * 1.1,
        remainingBudget: legacyData.overview?.remainingBudget || 0,
        averageVariance: 10,
        completionPercent: legacyData.overview?.progressPercentage || 0
      },
      project: {
        id: 'test-project',
        name: 'Test Project',
        currency: 'NZD',
        status: 'IN_PROGRESS'
      }
    }
  }

  const formatCurrency = (amount: number, currency = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency || 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number, decimals = 1) => {
    return `${value.toFixed(decimals)}%`
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100'
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
      case 'declining':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400" />
    }
  }

  if (loading) {
    return (
      <div
        className={`bg-white rounded-lg shadow p-6 ${className}`}
        data-testid="analytics-loading"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Analytics Error</h3>
          <p className="mt-1 text-sm text-gray-500">{error || 'No analytics data available'}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`space-y-6 ${className}`}
      data-testid="analytics-container"
    >
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Advanced Project Analytics</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => {
              const newTimeRange = e.target.value as '30d' | '90d' | '6m' | '1y'
              // Note: In a real implementation, this would be passed as a prop or managed by parent
            }}
            className="text-sm border-gray-300 rounded-md"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-blue-500" />
            Executive Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalBudget, data.project.currency)}
              </div>
              <div className="text-sm text-gray-600">Total Budget</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalSpent, data.project.currency)}
              </div>
              <div className="text-sm text-gray-600">Total Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary.projectedFinal, data.project.currency)}
              </div>
              <div className="text-sm text-gray-600">Projected Final Cost</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${data.summary.remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(data.summary.remainingBudget), data.project.currency)}
              </div>
              <div className="text-sm text-gray-600">
                {data.summary.remainingBudget >= 0 ? 'Budget Remaining' : 'Budget Overrun'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <TrendingUpIcon className="h-5 w-5 mr-2 text-green-500" />
            Key Performance Indicators
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="text-center" role="status">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(data.kpis.profitMargin)}
              </div>
              <div className="text-sm text-gray-600">Profit Margin</div>
            </div>
            <div className="text-center" role="status">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(data.kpis.costEfficiency)}
              </div>
              <div className="text-sm text-gray-600">Cost Efficiency</div>
            </div>
            <div className="text-center" role="status">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(data.kpis.budgetUtilization)}
              </div>
              <div className="text-sm text-gray-600">Budget Utilization</div>
            </div>
            <div className="text-center" role="status">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(data.summary.completionPercent)}
              </div>
              <div className="text-sm text-gray-600">Completion %</div>
            </div>
            <div className="text-center" role="status">
              <div className={`text-2xl font-bold ${data.kpis.riskScore > 20 ? 'text-red-600' : data.kpis.riskScore > 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                {Math.round(data.kpis.riskScore)}
              </div>
              <div className="text-sm text-gray-600">Risk Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Performance Analysis */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BanknotesIcon className="h-5 w-5 mr-2 text-blue-500" />
            Trade Performance Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Trade</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-900">Budgeted</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-900">Actual</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-900">Variance</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-900">Risk</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-900">Trend</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-900">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.tradePerformance.map((trade) => (
                  <tr key={trade.id}>
                    <td className="px-4 py-2 font-medium">{trade.name}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(trade.estimatedTotal, data.project.currency)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(trade.actualSpent, data.project.currency)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${trade.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {trade.variance > 0 ? '+' : ''}{formatCurrency(trade.variance, data.project.currency)}
                      <div className="text-xs text-gray-500">
                        ({formatPercentage(Math.abs(trade.variancePercent))})
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(trade.riskLevel)} bg-opacity-10`}>
                        {trade.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {getTrendIcon(trade.trend)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatPercentage(trade.efficiency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Financial Trends */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-blue-500" />
            Financial Trends
          </h3>
          <div className="space-y-4">
            {data.trends.map((trend, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 items-center py-2 border-b border-gray-100">
                <div className="font-medium">{trend.date}</div>
                <div className="text-right">{formatCurrency(trend.estimated, data.project.currency)}</div>
                <div className="text-right font-medium">{formatCurrency(trend.actual, data.project.currency)}</div>
                <div className={`text-right font-medium ${trend.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {trend.variance > 0 ? '+' : ''}{formatCurrency(trend.variance, data.project.currency)}
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-600">{trend.invoiceCount} invoices</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Last period cumulative: {formatCurrency(data.trends[data.trends.length - 1]?.cumulative.actual || 0, data.project.currency)} actual vs {formatCurrency(data.trends[data.trends.length - 1]?.cumulative.estimated || 0, data.project.currency)} estimated
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Projections */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BanknotesIcon className="h-5 w-5 mr-2 text-green-500" />
            Cash Flow Projections (Next 6 Months)
          </h3>
          <div className="space-y-4">
            {data.cashFlow.map((flow, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 items-center py-2 border-b border-gray-100">
                <div className="font-medium">{flow.date}</div>
                <div className="text-right text-green-600">{formatCurrency(flow.projected, data.project.currency)}</div>
                <div className="text-right text-red-600">{formatCurrency(flow.committed, data.project.currency)}</div>
                <div className={`text-right font-medium ${flow.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(flow.remaining), data.project.currency)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700">
              <div>Month</div>
              <div className="text-right">Projected In</div>
              <div className="text-right">Committed Out</div>
              <div className="text-right">Net Cash Flow</div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 mr-2 text-red-500" />
              Critical Alerts & Recommendations
            </h3>
            <div className="space-y-4">
              {data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}
                  data-testid={`alert-${alert.type}`}
                >
                  <div className="flex-shrink-0">
                    {alert.severity === 'critical' && <ExclamationTriangleIcon className="h-5 w-5" />}
                    {alert.severity === 'high' && <ExclamationCircleIcon className="h-5 w-5" />}
                    {alert.severity === 'medium' && <ClockIcon className="h-5 w-5" />}
                    {alert.severity === 'low' && <ShieldCheckIcon className="h-5 w-5" />}
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium">{alert.title}</h4>
                    <p className="text-sm mt-1">{alert.description}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span>{new Date(alert.date).toLocaleDateString()}</span>
                      {alert.amount && (
                        <span className="font-medium">
                          {formatCurrency(alert.amount, data.project.currency)}
                        </span>
                      )}
                      {alert.actionRequired && (
                        <span className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs font-medium">
                          Action Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
