/**
 * Invoice Matching Widget for Dashboard
 * Shows summary of pending invoice matching opportunities
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  SparklesIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface MatchingSummary {
  totalProjects: number
  totalPendingInvoices: number
  totalPendingAmount: number
  totalHighConfidenceMatches: number
  projectsWithPending: Array<{
    id: string
    name: string
    pendingInvoices: number
    pendingAmount: number
    matchingRate: number
  }>
}

export function InvoiceMatchingWidget() {
  const router = useRouter()
  const [summary, setSummary] = useState<MatchingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMatchingSummary()
  }, [])

  const fetchMatchingSummary = async () => {
    try {
      setLoading(true)
      
      // Get all projects with invoices
      const projectsResponse = await fetch('/api/projects')
      const projectsData = await projectsResponse.json()
      
      if (!projectsData.success) {
        throw new Error('Failed to fetch projects')
      }
      
      // Filter projects with pending invoices
      const projectsWithPending = projectsData.projects
        .filter((p: any) => p.stats.pendingInvoiceAmount > 0)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          pendingInvoices: 0, // Will be populated from matching API
          pendingAmount: p.stats.pendingInvoiceAmount,
          matchingRate: 0 // Will be populated from matching API
        }))
      
      // Get matching data for each project with pending invoices
      const matchingPromises = projectsWithPending.map(async (project: any) => {
        try {
          const matchingResponse = await fetch(`/api/invoices/matching?projectId=${project.id}`)
          const matchingData = await matchingResponse.json()
          
          if (matchingData.success) {
            return {
              ...project,
              pendingInvoices: matchingData.data.summary.totalPendingInvoices,
              matchingRate: matchingData.data.summary.matchingRate
            }
          }
          return project
        } catch (err) {
          return project
        }
      })
      
      const projectsWithMatchingData = await Promise.all(matchingPromises)
      
      const summary: MatchingSummary = {
        totalProjects: projectsWithMatchingData.length,
        totalPendingInvoices: projectsWithMatchingData.reduce((sum, p) => sum + p.pendingInvoices, 0),
        totalPendingAmount: projectsWithMatchingData.reduce((sum, p) => sum + p.pendingAmount, 0),
        totalHighConfidenceMatches: 0, // Could be calculated from individual project data
        projectsWithPending: projectsWithMatchingData
      }
      
      setSummary(summary)
    } catch (err) {
      setError('Failed to fetch matching summary')
      console.error('Matching summary error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  const handleViewMatching = () => {
    router.push('/invoices')
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">Invoice Matching</h3>
            <p className="text-sm text-gray-500">Unable to load matching data</p>
          </div>
        </div>
      </div>
    )
  }

  if (summary.totalPendingInvoices === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3">
          <SparklesIcon className="h-5 w-5 text-green-400" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">Invoice Matching</h3>
            <p className="text-sm text-gray-500">All invoices are matched!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SparklesIcon className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">Smart Invoice Matching</h3>
            <p className="text-sm text-gray-500">
              {summary.totalPendingInvoices} pending invoices need matching
            </p>
          </div>
        </div>
        
        <button
          onClick={handleViewMatching}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
        >
          <span>View All</span>
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center">
              <DocumentTextIcon className="h-4 w-4 text-orange-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {summary.totalPendingInvoices}
                </p>
                <p className="text-xs text-gray-500">Pending Invoices</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center">
              <SparklesIcon className="h-4 w-4 text-blue-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(summary.totalPendingAmount)}
                </p>
                <p className="text-xs text-gray-500">Total Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Projects with Pending Invoices */}
        {summary.projectsWithPending.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">Projects Needing Attention</h4>
            <div className="space-y-2">
              {summary.projectsWithPending.slice(0, 3).map(project => (
                <div key={project.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {project.pendingInvoices} invoices • {formatCurrency(project.pendingAmount)}
                    </p>
                  </div>
                  
                  {project.matchingRate > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        project.matchingRate >= 70 ? 'bg-green-400' :
                        project.matchingRate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></div>
                      <span className="text-xs text-gray-500">{project.matchingRate}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <button
          onClick={handleViewMatching}
          className="w-full mt-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium py-2 px-3 rounded-md border border-blue-200 transition-colors"
        >
          Start Smart Matching
        </button>
      </div>
    </div>
  )
}