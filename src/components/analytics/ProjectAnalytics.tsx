'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface AnalyticsData {
  totalProjects: number
  totalBudget: number
  totalSpent: number
  avgBudgetVariance: number
  projectsOverBudget: number
  avgProjectDuration: number
  completedProjects: number
  activeProjects: number
  totalInvoices: number
  avgInvoiceValue: number
  monthlySpending: Array<{
    month: string
    amount: number
    budget: number
  }>
  topVendors: Array<{
    name: string
    totalSpent: number
    invoiceCount: number
  }>
  budgetVarianceByProject: Array<{
    name: string
    budgetUsed: number
    budgetTotal: number
    variance: number
    status: string
  }>
  spendingByCategory: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

interface ProjectAnalyticsProps {
  className?: string
  projectId?: string // Optional: filter by specific project
}

export function ProjectAnalytics({ className = '', projectId }: ProjectAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [projectId, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        timeRange,
        ...(projectId && { projectId })
      })
      
      const response = await fetch(`/api/analytics?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        // Mock data for development
        setData(generateMockData())
      }
    } catch (err) {
      setError('Failed to load analytics data')
      // Use mock data as fallback
      setData(generateMockData())
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = (): AnalyticsData => ({
    totalProjects: 5,
    totalBudget: 500000,
    totalSpent: 387500,
    avgBudgetVariance: -2.5,
    projectsOverBudget: 1,
    avgProjectDuration: 180,
    completedProjects: 2,
    activeProjects: 3,
    totalInvoices: 45,
    avgInvoiceValue: 8600,
    monthlySpending: [
      { month: 'Jan', amount: 45000, budget: 50000 },
      { month: 'Feb', amount: 52000, budget: 55000 },
      { month: 'Mar', amount: 48000, budget: 45000 },
      { month: 'Apr', amount: 67000, budget: 60000 },
      { month: 'May', amount: 58000, budget: 65000 },
      { month: 'Jun', amount: 72000, budget: 70000 }
    ],
    topVendors: [
      { name: 'ABC Construction Supply', totalSpent: 85000, invoiceCount: 12 },
      { name: 'Smith Electrical', totalSpent: 45000, invoiceCount: 8 },
      { name: 'Quality Plumbing Co', totalSpent: 32000, invoiceCount: 6 },
      { name: 'Premium Materials Ltd', totalSpent: 28000, invoiceCount: 9 },
      { name: 'BuildRight Tools', totalSpent: 15000, invoiceCount: 4 }
    ],
    budgetVarianceByProject: [
      { name: 'Kitchen Renovation', budgetUsed: 45000, budgetTotal: 50000, variance: -10, status: 'IN_PROGRESS' },
      { name: 'Bathroom Remodel', budgetUsed: 32000, budgetTotal: 30000, variance: 6.7, status: 'COMPLETED' },
      { name: 'Deck Construction', budgetUsed: 18000, budgetTotal: 25000, variance: -28, status: 'IN_PROGRESS' },
      { name: 'Garage Addition', budgetUsed: 125000, budgetTotal: 120000, variance: 4.2, status: 'IN_PROGRESS' }
    ],
    spendingByCategory: [
      { category: 'Materials', amount: 195000, percentage: 50.3 },
      { category: 'Labor', amount: 140000, percentage: 36.1 },
      { category: 'Equipment', amount: 35000, percentage: 9.0 },
      { category: 'Permits & Fees', amount: 12500, percentage: 3.2 },
      { category: 'Other', amount: 5000, percentage: 1.3 }
    ]
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getVarianceColor = (variance: number) => {
    if (variance > 5) return 'text-red-600'
    if (variance > 0) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getVarianceIcon = (variance: number) => {
    return variance >= 0 ? TrendingUpIcon : TrendingDownIcon
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">Analytics Unavailable</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
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
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          {projectId ? 'Project Analytics' : 'Portfolio Analytics'}
        </h2>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Performance Indicators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Budget Performance */}
            <div className="relative p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">Budget Performance</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatPercentage(data.avgBudgetVariance)}
                  </p>
                  <p className="text-xs text-blue-600">
                    {formatCurrency(data.totalSpent)} / {formatCurrency(data.totalBudget)}
                  </p>
                </div>
              </div>
            </div>

            {/* Project Completion Rate */}
            <div className="relative p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-900">
                    {Math.round((data.completedProjects / data.totalProjects) * 100)}%
                  </p>
                  <p className="text-xs text-green-600">
                    {data.completedProjects} of {data.totalProjects} projects
                  </p>
                </div>
              </div>
            </div>

            {/* Average Project Duration */}
            <div className="relative p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-800">Avg Duration</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {Math.round(data.avgProjectDuration / 30)}
                  </p>
                  <p className="text-xs text-purple-600">months per project</p>
                </div>
              </div>
            </div>

            {/* Cost Per Invoice */}
            <div className="relative p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <div className="flex items-center">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">$</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-800">Avg Invoice</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCurrency(data.avgInvoiceValue)}
                  </p>
                  <p className="text-xs text-orange-600">
                    {data.totalInvoices} invoices total
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Trend */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Spending Trends</h3>
            <div className="space-y-3">
              {data.monthlySpending.map((month, index) => {
                const variance = ((month.amount - month.budget) / month.budget) * 100
                const VarianceIcon = getVarianceIcon(variance)
                
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{month.month}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {formatCurrency(month.amount)}
                          </span>
                          <div className={`flex items-center ${getVarianceColor(variance)}`}>
                            <VarianceIcon className="h-3 w-3 mr-1" />
                            <span className="text-xs font-medium">
                              {formatPercentage(variance)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            month.amount > month.budget ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, (month.amount / month.budget) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Budget Variance by Project */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Budget Performance</h3>
            <div className="space-y-3">
              {data.budgetVarianceByProject.map((project, index) => {
                const VarianceIcon = getVarianceIcon(project.variance)
                
                return (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{project.name}</span>
                      <div className={`flex items-center ${getVarianceColor(project.variance)}`}>
                        <VarianceIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">
                          {formatPercentage(project.variance)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>
                        {formatCurrency(project.budgetUsed)} / {formatCurrency(project.budgetTotal)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vendors */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Vendors</h3>
            <div className="space-y-3">
              {data.topVendors.map((vendor, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-xs text-gray-500">{vendor.invoiceCount} invoices</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(vendor.totalSpent)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(vendor.totalSpent / vendor.invoiceCount)} avg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Spending by Category */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Spending Categories</h3>
            <div className="space-y-4">
              {data.spendingByCategory.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{category.category}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(category.amount)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {category.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}