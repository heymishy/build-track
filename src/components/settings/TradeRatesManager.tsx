/**
 * Trade Rates Manager
 * Manage hourly rates for different trades and skill levels
 */

'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

interface TradeRate {
  id: string
  tradeName: string
  skillLevel: 'Apprentice' | 'Journeyman' | 'Foreman' | 'Specialist'
  hourlyRate: number
  markupPercent: number
  overheadPercent: number
  description?: string
}

const SKILL_LEVELS = [
  { value: 'Apprentice', label: 'Apprentice', color: 'bg-gray-100 text-gray-800' },
  { value: 'Journeyman', label: 'Journeyman', color: 'bg-blue-100 text-blue-800' },
  { value: 'Foreman', label: 'Foreman', color: 'bg-green-100 text-green-800' },
  { value: 'Specialist', label: 'Specialist', color: 'bg-purple-100 text-purple-800' },
] as const

const DEFAULT_TRADE_RATES: Omit<TradeRate, 'id'>[] = [
  {
    tradeName: 'Concrete',
    skillLevel: 'Apprentice',
    hourlyRate: 28,
    markupPercent: 15,
    overheadPercent: 10,
  },
  {
    tradeName: 'Concrete',
    skillLevel: 'Journeyman',
    hourlyRate: 45,
    markupPercent: 15,
    overheadPercent: 10,
  },
  {
    tradeName: 'Concrete',
    skillLevel: 'Foreman',
    hourlyRate: 58,
    markupPercent: 15,
    overheadPercent: 10,
  },

  {
    tradeName: 'Plumbing',
    skillLevel: 'Journeyman',
    hourlyRate: 55,
    markupPercent: 20,
    overheadPercent: 12,
  },
  {
    tradeName: 'Plumbing',
    skillLevel: 'Foreman',
    hourlyRate: 68,
    markupPercent: 20,
    overheadPercent: 12,
  },

  {
    tradeName: 'Electrical',
    skillLevel: 'Journeyman',
    hourlyRate: 58,
    markupPercent: 20,
    overheadPercent: 12,
  },
  {
    tradeName: 'Electrical',
    skillLevel: 'Foreman',
    hourlyRate: 72,
    markupPercent: 20,
    overheadPercent: 12,
  },

  {
    tradeName: 'Carpentry',
    skillLevel: 'Apprentice',
    hourlyRate: 25,
    markupPercent: 18,
    overheadPercent: 10,
  },
  {
    tradeName: 'Carpentry',
    skillLevel: 'Journeyman',
    hourlyRate: 48,
    markupPercent: 18,
    overheadPercent: 10,
  },
  {
    tradeName: 'Carpentry',
    skillLevel: 'Foreman',
    hourlyRate: 62,
    markupPercent: 18,
    overheadPercent: 10,
  },

  {
    tradeName: 'Painting',
    skillLevel: 'Journeyman',
    hourlyRate: 42,
    markupPercent: 15,
    overheadPercent: 8,
  },
  {
    tradeName: 'Roofing',
    skillLevel: 'Journeyman',
    hourlyRate: 52,
    markupPercent: 18,
    overheadPercent: 10,
  },
  {
    tradeName: 'Tiling',
    skillLevel: 'Journeyman',
    hourlyRate: 48,
    markupPercent: 16,
    overheadPercent: 10,
  },
  {
    tradeName: 'Plastering',
    skillLevel: 'Journeyman',
    hourlyRate: 46,
    markupPercent: 15,
    overheadPercent: 10,
  },
]

export function TradeRatesManager() {
  const [tradeRates, setTradeRates] = useState<TradeRate[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRate, setNewRate] = useState<Omit<TradeRate, 'id'>>({
    tradeName: '',
    skillLevel: 'Journeyman',
    hourlyRate: 0,
    markupPercent: 0,
    overheadPercent: 0,
  })

  // Initialize with default rates
  useEffect(() => {
    const initRates = DEFAULT_TRADE_RATES.map((rate, index) => ({
      ...rate,
      id: `rate-${index}-${Date.now()}`,
    }))
    setTradeRates(initRates)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  const calculateEffectiveRate = (rate: TradeRate) => {
    const markupAmount = rate.hourlyRate * (rate.markupPercent / 100)
    const overheadAmount = rate.hourlyRate * (rate.overheadPercent / 100)
    return rate.hourlyRate + markupAmount + overheadAmount
  }

  const addTradeRate = () => {
    if (!newRate.tradeName || newRate.hourlyRate <= 0) return

    const rate: TradeRate = {
      ...newRate,
      id: `rate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }

    setTradeRates([...tradeRates, rate])
    setNewRate({
      tradeName: '',
      skillLevel: 'Journeyman',
      hourlyRate: 0,
      markupPercent: 0,
      overheadPercent: 0,
    })
    setShowAddForm(false)
  }

  const updateTradeRate = (id: string, updates: Partial<TradeRate>) => {
    setTradeRates(tradeRates.map(rate => (rate.id === id ? { ...rate, ...updates } : rate)))
  }

  const deleteTradeRate = (id: string) => {
    setTradeRates(tradeRates.filter(rate => rate.id !== id))
  }

  const groupedRates = tradeRates.reduce(
    (groups, rate) => {
      if (!groups[rate.tradeName]) {
        groups[rate.tradeName] = []
      }
      groups[rate.tradeName].push(rate)
      return groups
    },
    {} as Record<string, TradeRate[]>
  )

  const getSkillLevelStyle = (skillLevel: string) => {
    const level = SKILL_LEVELS.find(l => l.value === skillLevel)
    return level?.color || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trade Rates Management</h1>
            <p className="text-gray-600">
              Manage hourly rates for different trades and skill levels
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Trade Rate
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600">Total Trades</div>
            <div className="text-2xl font-bold text-blue-700">
              {Object.keys(groupedRates).length}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600">Total Rates</div>
            <div className="text-2xl font-bold text-green-700">{tradeRates.length}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600">Avg Base Rate</div>
            <div className="text-2xl font-bold text-orange-700">
              {formatCurrency(
                tradeRates.reduce((sum, r) => sum + r.hourlyRate, 0) / tradeRates.length || 0
              )}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600">Avg Effective Rate</div>
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(
                tradeRates.reduce((sum, r) => sum + calculateEffectiveRate(r), 0) /
                  tradeRates.length || 0
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Trade Rate</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Trade Name</label>
              <input
                type="text"
                value={newRate.tradeName}
                onChange={e => setNewRate({ ...newRate, tradeName: e.target.value })}
                placeholder="e.g., Electrical"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>
              <select
                value={newRate.skillLevel}
                onChange={e => setNewRate({ ...newRate, skillLevel: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SKILL_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
              <input
                type="number"
                value={newRate.hourlyRate || ''}
                onChange={e =>
                  setNewRate({ ...newRate, hourlyRate: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Markup %</label>
              <input
                type="number"
                value={newRate.markupPercent || ''}
                onChange={e =>
                  setNewRate({ ...newRate, markupPercent: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={addTradeRate}
                className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={!newRate.tradeName || newRate.hourlyRate <= 0}
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewRate({
                    tradeName: '',
                    skillLevel: 'Journeyman',
                    hourlyRate: 0,
                    markupPercent: 0,
                    overheadPercent: 0,
                  })
                }}
                className="p-2 bg-gray-300 text-gray-600 rounded-md hover:bg-gray-400"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Rates by Category */}
      <div className="space-y-6">
        {Object.entries(groupedRates).map(([tradeName, rates]) => (
          <div key={tradeName} className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{tradeName}</h3>
              <p className="text-sm text-gray-500">{rates.length} skill levels configured</p>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {rates.map(rate => (
                  <div
                    key={rate.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getSkillLevelStyle(rate.skillLevel)}`}
                      >
                        {rate.skillLevel}
                      </span>

                      {editingId === rate.id ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="number"
                            value={rate.hourlyRate}
                            onChange={e =>
                              updateTradeRate(rate.id, {
                                hourlyRate: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-sm text-gray-500">+</span>
                          <input
                            type="number"
                            value={rate.markupPercent}
                            onChange={e =>
                              updateTradeRate(rate.id, {
                                markupPercent: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="%"
                          />
                          <span className="text-sm text-gray-500">markup</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex items-center space-x-2">
                            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{rate.hourlyRate}/hr</span>
                          </div>
                          {rate.markupPercent > 0 && (
                            <div className="text-sm text-gray-500">
                              +{rate.markupPercent}% markup
                            </div>
                          )}
                          <div className="text-sm font-medium text-blue-600">
                            = {formatCurrency(calculateEffectiveRate(rate))}/hr effective
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {editingId === rate.id ? (
                        <>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-gray-600 hover:text-gray-800"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingId(rate.id)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTradeRate(rate.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groupedRates).length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Trade Rates Configured</h3>
          <p className="text-gray-500 mb-4">
            Add your first trade rate to get started with hourly estimates.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Trade Rate
          </button>
        </div>
      )}
    </div>
  )
}
