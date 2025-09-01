/**
 * Invoice Processing Progress Component
 * Comprehensive progress tracking for invoice parsing and processing
 */

'use client'

import { useState, useEffect } from 'react'
import {
  DocumentIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

export interface ProcessingStep {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  description?: string
  progress?: number // 0-100
  duration?: number // milliseconds
  error?: string
}

export interface ProcessingStats {
  totalInvoices: number
  processedInvoices: number
  totalAmount: number
  processedAmount: number
  successRate: number
  averageProcessingTime: number
  qualityScore?: number
  errors: Array<{
    message: string
    type: 'warning' | 'error'
    timestamp: Date
  }>
}

interface InvoiceProcessingProgressProps {
  isProcessing: boolean
  steps: ProcessingStep[]
  stats: ProcessingStats
  currentStep?: string
  onCancel?: () => void
  className?: string
}

export function InvoiceProcessingProgress({
  isProcessing,
  steps,
  stats,
  currentStep,
  onCancel,
  className = '',
}: InvoiceProcessingProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    if (!isProcessing) return

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [isProcessing, startTime])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
  }

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
        )
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const overallProgress =
    steps.length > 0 ? (steps.filter(s => s.status === 'completed').length / steps.length) * 100 : 0

  return (
    <div className={`bg-white rounded-lg shadow-lg border ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CpuChipIcon
              className={`h-6 w-6 ${isProcessing ? 'text-blue-600 animate-pulse' : 'text-gray-600'}`}
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isProcessing ? 'Processing Invoices...' : 'Processing Complete'}
              </h3>
              <p className="text-sm text-gray-600">
                {isProcessing
                  ? `Elapsed time: ${formatTime(elapsedTime)}`
                  : `Completed in ${formatTime(elapsedTime)}`}
              </p>
            </div>
          </div>
          {onCancel && isProcessing && (
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <DocumentIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats.processedInvoices}/{stats.totalInvoices}
            </div>
            <div className="text-xs text-gray-600">Invoices</div>
          </div>

          <div className="text-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              ${stats.processedAmount.toFixed(0)}
            </div>
            <div className="text-xs text-gray-600">of ${stats.totalAmount.toFixed(0)}</div>
          </div>

          <div className="text-center">
            <ChartBarIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {(stats.successRate * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>

          <div className="text-center">
            <ClockIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats.averageProcessingTime > 0
                ? `${(stats.averageProcessingTime / 1000).toFixed(1)}s`
                : '-'}
            </div>
            <div className="text-xs text-gray-600">Avg Time</div>
          </div>
        </div>

        {/* Quality Score */}
        {stats.qualityScore !== undefined && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-medium text-gray-900">Extraction Quality</span>
              </div>
              <div
                className={`text-lg font-bold ${
                  stats.qualityScore >= 0.8
                    ? 'text-green-600'
                    : stats.qualityScore >= 0.6
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {(stats.qualityScore * 100).toFixed(0)}%
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  stats.qualityScore >= 0.8
                    ? 'bg-green-600'
                    : stats.qualityScore >= 0.6
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                }`}
                style={{ width: `${stats.qualityScore * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Processing Steps */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Processing Steps</h4>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">{getStepIcon(step)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5
                    className={`text-sm font-medium ${
                      step.status === 'error'
                        ? 'text-red-900'
                        : step.status === 'completed'
                          ? 'text-green-900'
                          : step.status === 'in_progress'
                            ? 'text-blue-900'
                            : 'text-gray-900'
                    }`}
                  >
                    {step.name}
                    {step.status === 'in_progress' && currentStep === step.id && (
                      <span className="ml-2 text-xs text-blue-600">(Current)</span>
                    )}
                  </h5>
                  {step.duration && (
                    <span className="text-xs text-gray-500">{formatTime(step.duration)}</span>
                  )}
                </div>

                {step.description && (
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                )}

                {step.error && <p className="text-sm text-red-600 mt-1">{step.error}</p>}

                {/* Step Progress Bar */}
                {step.status === 'in_progress' && step.progress !== undefined && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Errors Section */}
      {stats.errors.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mr-2" />
            Issues Found ({stats.errors.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {stats.errors.map((error, index) => (
              <div
                key={index}
                className={`text-xs p-2 rounded ${
                  error.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                <div className="font-medium">{error.message}</div>
                <div className="text-xs opacity-75 mt-1">
                  {error.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
