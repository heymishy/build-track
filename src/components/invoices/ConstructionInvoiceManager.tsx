'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'

interface Invoice {
  id: string
  invoiceNumber: string
  supplierName: string
  totalAmount: number
  gstAmount: number
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'
  invoiceDate: string // Changed from Date to string
  dueDate?: string // Changed from Date to string
  matchedLineItems?: number
  totalLineItems?: number
  confidence?: number
  projectId: string
  lineItems?: any[] // Added to get actual line items
}

interface Estimate {
  id: string
  category: string
  description: string
  estimatedCost: number
  actualCost: number
  variance: number
  variancePercent: number
}

interface ConstructionInvoiceManagerProps {
  projectId?: string
}

export function ConstructionInvoiceManager({ projectId }: ConstructionInvoiceManagerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'tracking'>('overview')

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return date.toLocaleDateString('en-NZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return 'Invalid date'
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load invoices with line items to calculate matching status
      const invoiceResponse = await fetch(
        `/api/invoices${projectId ? `?projectId=${projectId}` : ''}`
      )
      const invoiceResult = await invoiceResponse.json()

      if (invoiceResult.success) {
        // Process invoices to calculate matching status
        const processedInvoices = (invoiceResult.invoices || []).map((invoice: any) => ({
          ...invoice,
          totalLineItems: invoice.lineItems?.length || 0,
          matchedLineItems: invoice.lineItems?.filter((item: any) => item.lineItemId).length || 0,
        }))
        setInvoices(processedInvoices)
      }

      // TODO: Load estimates and actual costs
      // For now, using mock data
      setEstimates([
        {
          id: '1',
          category: 'Electrical',
          description: 'Electrical installation',
          estimatedCost: 15000,
          actualCost: 12500,
          variance: -2500,
          variancePercent: -16.7,
        },
        {
          id: '2',
          category: 'Plumbing',
          description: 'Plumbing installation',
          estimatedCost: 8000,
          actualCost: 9200,
          variance: 1200,
          variancePercent: 15.0,
        },
      ])
    } catch (error) {
      console.error('Failed to load invoice data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewMatching = async () => {
    if (!projectId) {
      alert('Project ID is required for matching')
      return
    }

    try {
      // Navigate to existing invoice matching interface
      window.location.href = `/invoices?projectId=${projectId}&tab=matching`
    } catch (error) {
      console.error('Failed to navigate to matching:', error)
      alert('Failed to open matching interface')
    }
  }

  const handleMatchInvoice = async (invoiceId: string) => {
    if (!projectId) {
      alert('Project ID is required for matching')
      return
    }

    try {
      // Navigate to existing invoice matching interface for specific invoice
      window.location.href = `/invoices?projectId=${projectId}&tab=matching&invoice=${invoiceId}`
    } catch (error) {
      console.error('Failed to navigate to matching:', error)
      alert('Failed to open matching interface')
    }
  }

  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
        }),
      })

      const result = await response.json()
      if (result.success) {
        // Refresh the data
        await loadData()
        alert('Invoice approved successfully')
      } else {
        alert('Failed to approve invoice: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to approve invoice:', error)
      alert('Failed to approve invoice')
    }
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalInvoices = invoices.length
    const matchedInvoices = invoices.filter(i => (i.matchedLineItems || 0) > 0).length
    const unmatchedInvoices = totalInvoices - matchedInvoices
    const pendingApproval = invoices.filter(i => i.status === 'PENDING').length
    const totalValue = invoices.reduce((sum, i) => sum + i.totalAmount, 0)
    const paidValue = invoices
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + i.totalAmount, 0)

    const totalEstimated = estimates.reduce((sum, e) => sum + e.estimatedCost, 0)
    const totalActual = estimates.reduce((sum, e) => sum + e.actualCost, 0)
    const totalVariance = totalActual - totalEstimated
    const variancePercent = totalEstimated > 0 ? (totalVariance / totalEstimated) * 100 : 0

    return {
      totalInvoices,
      matchedInvoices,
      unmatchedInvoices,
      pendingApproval,
      totalValue,
      paidValue,
      totalEstimated,
      totalActual,
      totalVariance,
      variancePercent,
    }
  }, [invoices, estimates])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'invoices', name: 'Invoice Status', icon: DocumentTextIcon },
            { id: 'tracking', name: 'Budget Tracking', icon: CurrencyDollarIcon },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Invoice Statistics */}
          <Card>
            <Card.Body className="p-6">
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</div>
                  <div className="text-sm text-gray-600">Total Invoices</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">✓ Matched</span>
                  <span className="font-medium">{stats.matchedInvoices}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">○ Unmatched</span>
                  <span className="font-medium">{stats.unmatchedInvoices}</span>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Approval Status */}
          <Card>
            <Card.Body className="p-6">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{stats.pendingApproval}</div>
                  <div className="text-sm text-gray-600">Pending Approval</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs text-gray-500">Requires attention</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{
                      width: `${(stats.pendingApproval / Math.max(stats.totalInvoices, 1)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Invoice Value */}
          <Card>
            <Card.Body className="p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    ${stats.totalValue.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Value</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs text-gray-500">
                  ${stats.paidValue.toLocaleString()} paid
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(stats.paidValue / Math.max(stats.totalValue, 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Budget Variance */}
          <Card>
            <Card.Body className="p-6">
              <div className="flex items-center">
                <ChartBarIcon
                  className={`h-8 w-8 ${stats.variancePercent > 0 ? 'text-red-600' : 'text-green-600'}`}
                />
                <div className="ml-4">
                  <div
                    className={`text-2xl font-bold ${stats.variancePercent > 0 ? 'text-red-900' : 'text-green-900'}`}
                  >
                    {stats.variancePercent > 0 ? '+' : ''}
                    {stats.variancePercent.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Budget Variance</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs text-gray-500">
                  ${Math.abs(stats.totalVariance).toLocaleString()}{' '}
                  {stats.variancePercent > 0 ? 'over' : 'under'}
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Invoice Status Tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          {/* Unmatched Invoices Alert */}
          {stats.unmatchedInvoices > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <Card.Body className="p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      {stats.unmatchedInvoices} invoice{stats.unmatchedInvoices !== 1 ? 's' : ''}{' '}
                      need matching
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      These invoices haven't been matched to project estimates yet.
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Button
                      onClick={handleReviewMatching}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
                    >
                      Review Matching
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Invoice List */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Invoice Status</h3>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Matching
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map(invoice => {
                      const isMatched = (invoice.matchedLineItems || 0) > 0
                      const matchPercent = invoice.totalLineItems
                        ? (invoice.matchedLineItems! / invoice.totalLineItems) * 100
                        : 0

                      return (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <div className="text-sm font-medium text-gray-900">
                                {invoice.invoiceNumber}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(invoice.invoiceDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{invoice.supplierName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              ${invoice.totalAmount.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              +${invoice.gstAmount.toLocaleString()} GST
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isMatched ? (
                              <div className="flex items-center">
                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                <span className="text-sm text-green-600">
                                  {invoice.matchedLineItems}/{invoice.totalLineItems} matched
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1" />
                                <span className="text-sm text-red-600">Unmatched</span>
                              </div>
                            )}
                            {invoice.confidence && (
                              <div className="text-xs text-gray-500">
                                {invoice.confidence}% confidence
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              className={
                                invoice.status === 'PAID'
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.status === 'APPROVED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : invoice.status === 'PENDING'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                              }
                            >
                              {invoice.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {!isMatched && (
                              <button
                                onClick={() => handleMatchInvoice(invoice.id)}
                                className="text-orange-600 hover:text-orange-900 mr-3"
                              >
                                Match
                              </button>
                            )}
                            {invoice.status === 'PENDING' && (
                              <button
                                onClick={() => handleApproveInvoice(invoice.id)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {invoices.length === 0 && (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="text-gray-500">No invoices found</div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Budget Tracking Tab */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <Card.Body className="p-6 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${stats.totalEstimated.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Estimated</div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Body className="p-6 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  ${stats.totalActual.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Actual Costs</div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Body className="p-6 text-center">
                <div
                  className={`text-2xl font-bold ${stats.variancePercent > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {stats.variancePercent > 0 ? '+' : ''}$
                  {Math.abs(stats.totalVariance).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  {stats.variancePercent > 0 ? 'Over' : 'Under'} Budget
                </div>
              </Card.Body>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estimated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actual
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estimates.map(estimate => (
                      <tr key={estimate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <BuildingOffice2Icon className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {estimate.category}
                              </div>
                              <div className="text-xs text-gray-500">{estimate.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${estimate.estimatedCost.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${estimate.actualCost.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className={`text-sm font-medium ${
                              estimate.variancePercent > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {estimate.variancePercent > 0 ? '+' : ''}$
                            {Math.abs(estimate.variance).toLocaleString()}
                            <span className="text-xs ml-1">
                              ({estimate.variancePercent > 0 ? '+' : ''}
                              {estimate.variancePercent.toFixed(1)}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                estimate.variancePercent > 10
                                  ? 'bg-red-600'
                                  : estimate.variancePercent > 0
                                    ? 'bg-yellow-600'
                                    : 'bg-green-600'
                              }`}
                              style={{
                                width: `${Math.min((estimate.actualCost / estimate.estimatedCost) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {((estimate.actualCost / estimate.estimatedCost) * 100).toFixed(1)}% of
                            budget
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  )
}
