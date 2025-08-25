'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface BudgetTrackingWidgetProps {
  projectId?: string
  compact?: boolean
}

interface TrackingData {
  totalBudget: number
  spentAmount: number
  commitedAmount: number
  remainingBudget: number
  budgetUsedPercent: number
  categories: {
    name: string
    budget: number
    spent: number
    committed: number
    variance: number
    status: 'on-track' | 'over-budget' | 'at-risk'
  }[]
}

export function BudgetTrackingWidget({ projectId, compact = false }: BudgetTrackingWidgetProps) {
  // Mock data - in real implementation, this would come from API
  const trackingData: TrackingData = {
    totalBudget: 413285,
    spentAmount: 12302,
    commitedAmount: 45000,
    remainingBudget: 355983,
    budgetUsedPercent: 3.0,
    categories: [
      {
        name: 'Materials',
        budget: 150000,
        spent: 8500,
        committed: 25000,
        variance: -116500,
        status: 'on-track'
      },
      {
        name: 'Labor', 
        budget: 180000,
        spent: 3802,
        committed: 15000,
        variance: -161198,
        status: 'on-track'
      },
      {
        name: 'Equipment',
        budget: 50000,
        spent: 0,
        committed: 5000,
        variance: -45000,
        status: 'on-track'
      },
      {
        name: 'Permits & Fees',
        budget: 15000,
        spent: 0,
        committed: 0,
        variance: -15000,
        status: 'on-track'
      }
    ]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'bg-green-100 text-green-800'
      case 'at-risk': return 'bg-yellow-100 text-yellow-800' 
      case 'over-budget': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track': return CheckCircleIcon
      case 'at-risk': return ExclamationTriangleIcon
      case 'over-budget': return ExclamationTriangleIcon
      default: return ChartBarIcon
    }
  }

  if (compact) {
    return (
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Budget Summary</h3>
            <Badge className="bg-green-100 text-green-800">On Track</Badge>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                ${trackingData.spentAmount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${trackingData.remainingBudget.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Budget Used</span>
              <span>{trackingData.budgetUsedPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{width: `${trackingData.budgetUsedPercent}%`}}
              ></div>
            </div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <Card.Body className="p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  ${trackingData.totalBudget.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Budget</div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body className="p-6">
            <div className="flex items-center">
              <ArrowUpIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  ${trackingData.spentAmount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Spent</div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body className="p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  ${trackingData.commitedAmount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Committed</div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body className="p-6">
            <div className="flex items-center">
              <ArrowDownIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  ${trackingData.remainingBudget.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">Budget Progress</h3>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-500">{trackingData.budgetUsedPercent}% used</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="flex h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-red-600 transition-all duration-300" 
                  style={{width: `${(trackingData.spentAmount / trackingData.totalBudget) * 100}%`}}
                  title="Spent"
                ></div>
                <div 
                  className="bg-yellow-600 transition-all duration-300" 
                  style={{width: `${(trackingData.commitedAmount / trackingData.totalBudget) * 100}%`}}
                  title="Committed"
                ></div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-600 rounded mr-1"></div>
                Spent: ${trackingData.spentAmount.toLocaleString()}
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-600 rounded mr-1"></div>
                Committed: ${trackingData.commitedAmount.toLocaleString()}
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-600 rounded mr-1"></div>
                Available: ${trackingData.remainingBudget.toLocaleString()}
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

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
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Committed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trackingData.categories.map((category, index) => {
                  const available = category.budget - category.spent - category.committed
                  const usedPercent = ((category.spent + category.committed) / category.budget) * 100
                  const StatusIcon = getStatusIcon(category.status)
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {category.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ${category.budget.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-red-600">
                          ${category.spent.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-yellow-600">
                          ${category.committed.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ${available.toLocaleString()}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className={`h-1.5 rounded-full ${
                              usedPercent > 90 ? 'bg-red-600' : 
                              usedPercent > 75 ? 'bg-yellow-600' : 'bg-green-600'
                            }`}
                            style={{width: `${Math.min(usedPercent, 100)}%`}}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Badge className={getStatusColor(category.status)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {category.status.replace('-', ' ')}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}