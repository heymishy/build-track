/**
 * Accuracy Meter Component
 * Displays LLM import accuracy metrics and provides measurement tools
 */

'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline'

interface AccuracyData {
  overallAccuracy: number
  totalAccuracy: number
  lineItemAccuracy: number
  tradeAccuracy: number
  accuracyGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  missingTrades: string[]
  incorrectAmounts: Array<{
    trade: string
    expected: number
    actual: number
    difference: number
    percentError: number
  }>
  recommendations: string[]
}

interface AccuracyMeterProps {
  projectId?: string
  className?: string
  onMeasureAccuracy?: (data: AccuracyData) => void
}

interface ManualAccuracyTest {
  expectedTotal: number
  expectedLineItems: number
  trades: Array<{
    name: string
    expectedAmount: number
  }>
}

export function AccuracyMeter({
  projectId,
  className = '',
  onMeasureAccuracy,
}: AccuracyMeterProps) {
  const [accuracy, setAccuracy] = useState<AccuracyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showTestForm, setShowTestForm] = useState(false)
  const [testData, setTestData] = useState<ManualAccuracyTest>({
    expectedTotal: 475277,
    expectedLineItems: 25,
    trades: [],
  })

  // Sample test data for common estimates
  const sampleTests = {
    'Sample Construction Estimate': {
      expectedTotal: 475277,
      expectedLineItems: 25,
      trades: [
        { name: 'Concrete pump', expectedAmount: 2500 },
        { name: 'Plumber', expectedAmount: 21000 },
        { name: 'Electrician', expectedAmount: 25000 },
        { name: 'Materials', expectedAmount: 89231 },
        { name: 'Labour Only', expectedAmount: 45000 },
      ],
    },
  }

  const runAccuracyTest = async (actualData: {
    actualTotal: number
    actualLineItems: number
    actualTrades: Array<{ name: string; amount: number }>
  }) => {
    try {
      setLoading(true)

      // Map actual trades to expected format
      const tradesComparison = testData.trades.map(expectedTrade => {
        const actualTrade = actualData.actualTrades.find(
          t =>
            t.name.toLowerCase().includes(expectedTrade.name.toLowerCase()) ||
            expectedTrade.name.toLowerCase().includes(t.name.toLowerCase())
        )

        return {
          name: expectedTrade.name,
          expectedAmount: expectedTrade.expectedAmount,
          actualAmount: actualTrade?.amount,
          found: !!actualTrade,
        }
      })

      const response = await fetch('/api/estimates/accuracy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          expectedTotal: testData.expectedTotal,
          expectedLineItems: testData.expectedLineItems,
          actualTotal: actualData.actualTotal,
          actualLineItems: actualData.actualLineItems,
          trades: tradesComparison,
          importMethod: 'llm',
          filename: 'test-estimate.pdf',
        }),
      })

      const result = await response.json()

      if (result.success) {
        setAccuracy(result.accuracy)
        onMeasureAccuracy?.(result.accuracy)
      }
    } catch (error) {
      console.error('Accuracy test failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-green-600 bg-green-100'
      case 'B':
        return 'text-blue-600 bg-blue-100'
      case 'C':
        return 'text-yellow-600 bg-yellow-100'
      case 'D':
        return 'text-orange-600 bg-orange-100'
      case 'F':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy >= 90) return <CheckCircleIcon className="h-5 w-5 text-green-600" />
    if (accuracy >= 75) return <InformationCircleIcon className="h-5 w-5 text-yellow-600" />
    return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BeakerIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">LLM Accuracy Testing</h3>
          </div>
          <button
            onClick={() => setShowTestForm(!showTestForm)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            {showTestForm ? 'Hide Test' : 'Test Accuracy'}
          </button>
        </div>
      </div>

      <div className="px-6 py-4">
        {/* Accuracy Results */}
        {accuracy && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">Accuracy Results</h4>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(accuracy.accuracyGrade)}`}
              >
                Grade {accuracy.accuracyGrade}
              </span>
            </div>

            {/* Accuracy Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center">
                  {getAccuracyIcon(accuracy.overallAccuracy)}
                  <div className="ml-2">
                    <p className="text-xs text-gray-500">Overall Accuracy</p>
                    <p className="text-sm font-medium text-gray-900">
                      {accuracy.overallAccuracy.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center">
                  {getAccuracyIcon(accuracy.totalAccuracy)}
                  <div className="ml-2">
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-sm font-medium text-gray-900">
                      {accuracy.totalAccuracy.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center">
                  {getAccuracyIcon(accuracy.tradeAccuracy)}
                  <div className="ml-2">
                    <p className="text-xs text-gray-500">Trade Detection</p>
                    <p className="text-sm font-medium text-gray-900">
                      {accuracy.tradeAccuracy.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Issues */}
            {(accuracy.missingTrades.length > 0 || accuracy.incorrectAmounts.length > 0) && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Issues Found</h5>

                {accuracy.missingTrades.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-red-600 font-medium">Missing Trades:</p>
                    <ul className="text-xs text-gray-600 pl-4">
                      {accuracy.missingTrades.map((trade, index) => (
                        <li key={index}>• {trade}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {accuracy.incorrectAmounts.length > 0 && (
                  <div>
                    <p className="text-xs text-orange-600 font-medium">Incorrect Amounts:</p>
                    <ul className="text-xs text-gray-600 pl-4 space-y-1">
                      {accuracy.incorrectAmounts.map((item, index) => (
                        <li key={index}>
                          • {item.trade}: Expected {formatCurrency(item.expected)}, Got{' '}
                          {formatCurrency(item.actual)} ({item.percentError.toFixed(1)}% error)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {accuracy.recommendations.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  {accuracy.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <InformationCircleIcon className="h-3 w-3 text-blue-500 mr-1 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Test Form */}
        {showTestForm && (
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Manual Accuracy Test</h4>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Total</label>
                  <input
                    type="number"
                    value={testData.expectedTotal}
                    onChange={e =>
                      setTestData(prev => ({ ...prev, expectedTotal: Number(e.target.value) }))
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expected Line Items
                  </label>
                  <input
                    type="number"
                    value={testData.expectedLineItems}
                    onChange={e =>
                      setTestData(prev => ({ ...prev, expectedLineItems: Number(e.target.value) }))
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  onClick={() => setTestData({ ...sampleTests['Sample Construction Estimate'] })}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Load Sample Test Data ($475K Construction Estimate)
                </button>
              </div>

              <div>
                <p className="text-sm text-gray-600">
                  To test accuracy, import an estimate and then enter the actual results here for
                  comparison.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
