/**
 * Training Statistics Component
 * Displays training progress and learned patterns
 */

'use client'

import { useState, useEffect } from 'react'
import { AcademicCapIcon, ChartBarIcon, CogIcon } from '@heroicons/react/24/outline'

interface TrainingStatsData {
  totalExamples: number
  fieldCounts: Record<string, number>
  learnedPatterns: number
  templates: number
  invoiceTypes: string[]
}

export function TrainingStats() {
  const [stats, setStats] = useState<TrainingStatsData | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && !stats && !loading) {
      fetchTrainingStats()
    }
  }, [isOpen, stats, loading])

  const fetchTrainingStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/invoices/training/stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      } else {
        console.error('Failed to fetch training stats:', data.error)
        setStats({
          totalExamples: 0,
          fieldCounts: {},
          learnedPatterns: 0,
          templates: 0,
          invoiceTypes: [],
        })
      }
    } catch (error) {
      console.error('Error fetching training stats:', error)
      setStats({
        totalExamples: 0,
        fieldCounts: {},
        learnedPatterns: 0,
        templates: 0,
        invoiceTypes: [],
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <AcademicCapIcon className="h-4 w-4 mr-2" />
        Training Stats
      </button>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <AcademicCapIcon className="h-5 w-5 mr-2 text-blue-600" />
          AI Training Statistics
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Training Examples */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Training Examples</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalExamples}</p>
              </div>
            </div>
            <p className="text-xs text-blue-700 mt-2">Total corrections provided by users</p>
          </div>

          {/* Learned Patterns */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CogIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Learned Patterns</p>
                <p className="text-2xl font-bold text-green-600">{stats.learnedPatterns}</p>
              </div>
            </div>
            <p className="text-xs text-green-700 mt-2">AI patterns generated from training</p>
          </div>

          {/* Invoice Templates */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="h-8 w-8 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Templates</p>
                <p className="text-2xl font-bold text-purple-600">{stats.templates}</p>
              </div>
            </div>
            <p className="text-xs text-purple-700 mt-2">Specialized invoice type templates</p>
          </div>

          {/* Field Training Breakdown */}
          <div className="md:col-span-2">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Training by Field</h4>
            <div className="space-y-2">
              {Object.entries(stats.fieldCounts).map(([field, count]) => (
                <div key={field} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-600">
                    {field.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, (count / Math.max(...Object.values(stats.fieldCounts))) * 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-gray-900 font-medium w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Types */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Invoice Types</h4>
            <div className="space-y-1">
              {stats.invoiceTypes.map((type, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full mr-1 mb-1"
                >
                  {type}
                </span>
              ))}
              {stats.invoiceTypes.length === 0 && (
                <p className="text-xs text-gray-500">No specialized types trained yet</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading training statistics...</p>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-yellow-50 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">How Training Works</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Click "Train" on any incorrectly parsed invoice</li>
                  <li>Correct the fields and submit your corrections</li>
                  <li>The AI learns patterns from your corrections</li>
                  <li>Future similar invoices are parsed more accurately</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
