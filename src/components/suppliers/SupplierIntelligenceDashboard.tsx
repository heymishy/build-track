/**
 * Supplier Intelligence Dashboard
 * AI-powered insights and performance analytics for suppliers
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  ChartBarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ArrowPathIcon,
  CpuChipIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline'

interface SupplierAnalytics {
  uploadMetrics: {
    totalUploads: number
    successfulUploads: number
    avgProcessingTime: number
    successRate: number
    lastUpload: string
  }
  matchingPerformance: {
    avgConfidence: number
    highConfidenceRate: number
    autoMatchRate: number
    manualOverrideRate: number
    improvementTrend: number
  }
  aiInsights: {
    learnedPatterns: number
    patternAccuracy: number
    timesSaved: number
    costOptimization: number
    nextSuggestion?: string
  }
  projectCompatibility: {
    bestMatchedProjects: Array<{
      projectId: string
      projectName: string
      matchRate: number
      totalInvoices: number
    }>
    avgProjectConfidence: number
  }
  improvements: Array<{
    type: 'accuracy' | 'speed' | 'consistency' | 'format'
    title: string
    description: string
    impact: 'low' | 'medium' | 'high'
    implemented?: boolean
  }>
}

interface SupplierIntelligenceDashboardProps {
  supplierEmail: string
  supplierName: string
  className?: string
}

export function SupplierIntelligenceDashboard({
  supplierEmail,
  supplierName,
  className = '',
}: SupplierIntelligenceDashboardProps) {
  const [analytics, setAnalytics] = useState<SupplierAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [supplierEmail])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/portal/analytics?email=${encodeURIComponent(supplierEmail)}`
      )
      const result = await response.json()

      if (result.success) {
        setAnalytics(result.analytics)
      } else {
        setError(result.error || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('Analytics loading error:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAnalytics()
    setRefreshing(false)
  }

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`
  const formatDuration = (milliseconds: number) => {
    const seconds = Math.round(milliseconds / 1000)
    return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}min`
  }

  const getImprovementIcon = (type: string) => {
    switch (type) {
      case 'accuracy':
        return <SparklesIcon className="h-4 w-4" />
      case 'speed':
        return <ClockIcon className="h-4 w-4" />
      case 'consistency':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'format':
        return <CpuChipIcon className="h-4 w-4" />
      default:
        return <LightBulbIcon className="h-4 w-4" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'medium':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-gray-700 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0.05) return <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
    if (trend < -0.05) return <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
    return <div className="h-4 w-4" /> // Neutral
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`} data-testid="intelligence-dashboard-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`} data-testid="intelligence-dashboard-error">
        <Card className="p-6 text-center">
          <BeakerIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="primary">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className={`${className}`} data-testid="intelligence-dashboard-empty">
        <Card className="p-8 text-center">
          <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Available</h3>
          <p className="text-gray-600">
            Upload some invoices to start seeing AI-powered insights and performance analytics.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid="intelligence-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-purple-600" />
            AI Performance Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Your upload performance and AI matching insights for {supplierName}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Upload Success Rate */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Upload Success</h3>
            <Badge className="bg-green-100 text-green-800">
              {formatPercentage(analytics.uploadMetrics.successRate)}
            </Badge>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-gray-900">
              {analytics.uploadMetrics.successfulUploads}
            </p>
            <p className="text-sm text-gray-600">
              of {analytics.uploadMetrics.totalUploads} uploads
            </p>
          </div>
        </Card>

        {/* AI Matching Confidence */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">AI Confidence</h3>
            <div className="flex items-center gap-1">
              {getTrendIcon(analytics.matchingPerformance.improvementTrend)}
              <Badge className="bg-purple-100 text-purple-800">
                {formatPercentage(analytics.matchingPerformance.avgConfidence)}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-gray-900">
              {formatPercentage(analytics.matchingPerformance.highConfidenceRate)}
            </p>
            <p className="text-sm text-gray-600">high confidence matches</p>
          </div>
        </Card>

        {/* Processing Speed */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Processing Speed</h3>
            <ClockIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-gray-900">
              {formatDuration(analytics.uploadMetrics.avgProcessingTime)}
            </p>
            <p className="text-sm text-gray-600">average processing time</p>
          </div>
        </Card>

        {/* AI Patterns Learned */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">AI Learning</h3>
            <Badge className="bg-blue-100 text-blue-800">
              {analytics.aiInsights.learnedPatterns}
            </Badge>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-gray-900">
              {formatPercentage(analytics.aiInsights.patternAccuracy)}
            </p>
            <p className="text-sm text-gray-600">pattern accuracy</p>
          </div>
        </Card>
      </div>

      {/* AI Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matching Performance Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CpuChipIcon className="h-5 w-5 text-blue-600" />
            AI Matching Performance
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Auto-Match Rate</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${analytics.matchingPerformance.autoMatchRate * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {formatPercentage(analytics.matchingPerformance.autoMatchRate)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Manual Overrides</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{ width: `${analytics.matchingPerformance.manualOverrideRate * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {formatPercentage(analytics.matchingPerformance.manualOverrideRate)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">High Confidence</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${analytics.matchingPerformance.highConfidenceRate * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {formatPercentage(analytics.matchingPerformance.highConfidenceRate)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Project Compatibility */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-green-600" />
            Project Compatibility
          </h3>

          <div className="space-y-3">
            {analytics.projectCompatibility.bestMatchedProjects.map((project, index) => (
              <div
                key={project.projectId}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{project.projectName}</p>
                  <p className="text-xs text-gray-600">{project.totalInvoices} invoices</p>
                </div>
                <Badge
                  className={
                    project.matchRate > 0.8
                      ? 'bg-green-100 text-green-800'
                      : project.matchRate > 0.6
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }
                >
                  {formatPercentage(project.matchRate)} match
                </Badge>
              </div>
            ))}

            {analytics.projectCompatibility.bestMatchedProjects.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No project matches available yet. Upload more invoices to see compatibility
                insights.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* AI Impact & Efficiency */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BeakerIcon className="h-5 w-5 text-purple-600" />
          AI Impact & Efficiency
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {Math.round(analytics.aiInsights.timesSaved)} min
            </p>
            <p className="text-sm text-gray-600">time saved by AI matching</p>
          </div>

          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              ${analytics.aiInsights.costOptimization.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">estimated cost savings</p>
          </div>

          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {formatPercentage(analytics.aiInsights.patternAccuracy)}
            </p>
            <p className="text-sm text-gray-600">pattern recognition accuracy</p>
          </div>
        </div>

        {analytics.aiInsights.nextSuggestion && (
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <LightBulbIcon className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">💡 AI Recommendation</h4>
                <p className="text-sm text-purple-700 mt-1">
                  {analytics.aiInsights.nextSuggestion}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Improvement Suggestions */}
      {analytics.improvements.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
            Improvement Opportunities
          </h3>

          <div className="space-y-4">
            {analytics.improvements.map((improvement, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  improvement.implemented
                    ? 'bg-green-50 border-green-400'
                    : improvement.impact === 'high'
                      ? 'bg-orange-50 border-orange-400'
                      : 'bg-blue-50 border-blue-400'
                }`}
                data-testid={`improvement-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {improvement.implemented ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      getImprovementIcon(improvement.type)
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{improvement.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{improvement.description}</p>
                    </div>
                  </div>
                  <Badge className={`${getImpactColor(improvement.impact)} border`}>
                    {improvement.impact} impact
                  </Badge>
                </div>
                {improvement.implemented && (
                  <div className="mt-2 text-sm text-green-700">
                    ✅ This improvement has been implemented automatically by our AI system.
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
