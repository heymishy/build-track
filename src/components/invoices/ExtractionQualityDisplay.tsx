/**
 * Extraction Quality Display Component
 * Shows PDF extraction accuracy, quality metrics, and validation results
 */

'use client'

import { useState } from 'react'
import type { MultiInvoiceResult, ParsedInvoice, ExtractionQuality } from '@/lib/pdf-parser'

interface ExtractionQualityDisplayProps {
  result: MultiInvoiceResult
  className?: string
}

const QualityBadge = ({
  score,
  label,
  type = 'default',
}: {
  score: number
  label: string
  type?: 'success' | 'warning' | 'error' | 'default'
}) => {
  const percentage = Math.round(score * 100)
  const getColorClasses = () => {
    if (type === 'error' || percentage < 30) {
      return 'bg-red-100 text-red-800 border-red-200'
    }
    if (type === 'warning' || percentage < 70) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    if (type === 'success' || percentage >= 70) {
      return 'bg-green-100 text-green-800 border-green-200'
    }
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getColorClasses()}`}
    >
      <span className="mr-1">{label}:</span>
      <span className="font-bold">{percentage}%</span>
    </div>
  )
}

const ProgressBar = ({
  value,
  max = 1,
  className = '',
}: {
  value: number
  max?: number
  className?: string
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const colorClass =
    percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className={`h-2 rounded-full transition-all duration-300 ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

const InvoiceQualityCard = ({ invoice, index }: { invoice: ParsedInvoice; index: number }) => {
  const [expanded, setExpanded] = useState(false)

  if (!invoice.extractionQuality && !invoice.fieldScores) return null

  const quality = invoice.extractionQuality
  const fieldScores = invoice.fieldScores
  const validationScore = invoice.validationScore || 0

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">
          Page {invoice.pageNumber || index + 1}
          {invoice.invoiceNumber && (
            <span className="ml-2 text-sm text-gray-500">({invoice.invoiceNumber})</span>
          )}
        </h4>
        <div className="flex items-center space-x-2">
          <QualityBadge
            score={validationScore}
            label="Overall"
            type={validationScore >= 0.7 ? 'success' : validationScore >= 0.4 ? 'warning' : 'error'}
          />
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {/* Basic Quality Metrics */}
      {quality && (
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Text Clarity</div>
            <ProgressBar value={quality.textClarity} />
            <div className="text-xs text-gray-600 mt-1">
              {Math.round(quality.textClarity * 100)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Structure</div>
            <ProgressBar value={quality.structureDetection} />
            <div className="text-xs text-gray-600 mt-1">
              {Math.round(quality.structureDetection * 100)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Completeness</div>
            <ProgressBar value={quality.completeness} />
            <div className="text-xs text-gray-600 mt-1">
              {Math.round(quality.completeness * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Field Scores */}
      {fieldScores && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <QualityBadge score={fieldScores.invoiceNumber} label="Number" />
          <QualityBadge score={fieldScores.date} label="Date" />
          <QualityBadge score={fieldScores.vendorName} label="Vendor" />
          <QualityBadge score={fieldScores.amounts} label="Amount" />
        </div>
      )}

      {/* Expanded Details */}
      {expanded && quality && (
        <div className="mt-4 pt-4 border-t">
          {/* Warnings */}
          {quality.warnings && quality.warnings.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium text-yellow-800 mb-2">⚠️ Warnings</div>
              <ul className="text-xs text-yellow-700 space-y-1">
                {quality.warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Corruption Indicators */}
          {quality.corruptionIndicators && quality.corruptionIndicators.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium text-red-800 mb-2">🚨 Corruption Detected</div>
              <ul className="text-xs text-red-700 space-y-1">
                {quality.corruptionIndicators.map((indicator, i) => (
                  <li key={i}>• {indicator}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sample Text */}
          {invoice.rawText && (
            <div>
              <div className="text-sm font-medium text-gray-800 mb-2">📄 Extracted Text Sample</div>
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                {invoice.rawText.substring(0, 500)}
                {invoice.rawText.length > 500 && '...'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ExtractionQualityDisplay({
  result,
  className = '',
}: ExtractionQualityDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)
  const qualityMetrics = result.qualityMetrics

  if (!qualityMetrics) {
    return (
      <div className={`bg-gray-50 border rounded-lg p-4 ${className}`}>
        <div className="text-gray-500 text-sm">Quality metrics not available</div>
      </div>
    )
  }

  const getOverallStatus = () => {
    if (qualityMetrics.overallAccuracy >= 0.8)
      return { icon: '✅', text: 'Excellent', color: 'text-green-600' }
    if (qualityMetrics.overallAccuracy >= 0.6)
      return { icon: '✅', text: 'Good', color: 'text-green-600' }
    if (qualityMetrics.overallAccuracy >= 0.4)
      return { icon: '⚠️', text: 'Fair', color: 'text-yellow-600' }
    return { icon: '❌', text: 'Poor', color: 'text-red-600' }
  }

  const status = getOverallStatus()

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{status.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">PDF Extraction Quality</h3>
              <p className={`text-sm ${status.color}`}>
                {status.text} • {Math.round(qualityMetrics.overallAccuracy * 100)}% accuracy
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {/* Quick Overview */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(qualityMetrics.overallAccuracy * 100)}%
            </div>
            <div className="text-xs text-gray-500">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(qualityMetrics.parsingSuccess * 100)}%
            </div>
            <div className="text-xs text-gray-500">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(qualityMetrics.dataCompleteness * 100)}%
            </div>
            <div className="text-xs text-gray-500">Completeness</div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${qualityMetrics.corruptionDetected ? 'text-red-600' : 'text-green-600'}`}
            >
              {qualityMetrics.corruptionDetected ? 'Yes' : 'No'}
            </div>
            <div className="text-xs text-gray-500">Corruption</div>
          </div>
        </div>

        {/* Recommended Action */}
        {qualityMetrics.recommendedAction && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-900">💡 Recommendation</div>
            <div className="text-sm text-blue-800 mt-1">{qualityMetrics.recommendedAction}</div>
          </div>
        )}

        {/* Issues Summary */}
        {qualityMetrics.issuesFound && qualityMetrics.issuesFound.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-900 mb-2">
              ⚠️ Issues Found ({qualityMetrics.issuesFound.length})
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {qualityMetrics.issuesFound.slice(0, 3).map((issue, i) => (
                <div key={i} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                  {issue}
                </div>
              ))}
              {qualityMetrics.issuesFound.length > 3 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{qualityMetrics.issuesFound.length - 3} more issues...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Per-Invoice Quality */}
      {showDetails && (
        <div className="px-6 py-4 border-t bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-4">Per-Page Quality Analysis</h4>
          <div className="space-y-4">
            {result.invoices.map((invoice, index) => (
              <InvoiceQualityCard key={index} invoice={invoice} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
