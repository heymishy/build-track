'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Trade {
  id: string
  name: string
  description?: string
  sortOrder: number
}

interface AddLineItemModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  projectId: string
  trades: Trade[]
}

interface LineItemFormData {
  tradeId: string
  description: string
  quantity: number
  unit: string
  materialCostEst: number
  laborCostEst: number
  equipmentCostEst: number
  markupPercent: number
  overheadPercent: number
}

export function AddLineItemModal({
  isOpen,
  onClose,
  onComplete,
  projectId,
  trades,
}: AddLineItemModalProps) {
  const [formData, setFormData] = useState<LineItemFormData>({
    tradeId: '',
    description: '',
    quantity: 1,
    unit: 'ea',
    materialCostEst: 0,
    laborCostEst: 0,
    equipmentCostEst: 0,
    markupPercent: 15,
    overheadPercent: 10,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateTrade, setShowCreateTrade] = useState(false)
  const [newTradeName, setNewTradeName] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        tradeId: trades.length > 0 ? trades[0].id : '',
        description: '',
        quantity: 1,
        unit: 'ea',
        materialCostEst: 0,
        laborCostEst: 0,
        equipmentCostEst: 0,
        markupPercent: 15,
        overheadPercent: 10,
      })
      setError(null)
      setShowCreateTrade(false)
      setNewTradeName('')
    }
  }, [isOpen, trades])

  const calculateTotal = () => {
    const baseTotal = formData.materialCostEst + formData.laborCostEst + formData.equipmentCostEst
    const markup = baseTotal * (formData.markupPercent / 100)
    const overhead = baseTotal * (formData.overheadPercent / 100)
    const unitTotal = baseTotal + markup + overhead
    return unitTotal * formData.quantity
  }

  const handleInputChange = (field: keyof LineItemFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    setError(null)
  }

  const handleCreateTrade = async () => {
    if (!newTradeName.trim()) return

    try {
      const response = await fetch(`/api/projects/${projectId}/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTradeName.trim(),
          description: `Trade created for line item: ${formData.description}`,
          sortOrder: trades.length,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update form to use the new trade
        setFormData(prev => ({ ...prev, tradeId: data.trade.id }))
        setShowCreateTrade(false)
        setNewTradeName('')
        // Note: Parent component will need to refresh trades list
      } else {
        setError(data.error || 'Failed to create trade')
      }
    } catch (err) {
      setError('Failed to create trade')
      console.error('Create trade error:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tradeId) {
      setError('Please select or create a trade')
      return
    }

    if (!formData.description.trim()) {
      setError('Please enter a description')
      return
    }

    if (formData.quantity <= 0) {
      setError('Quantity must be greater than 0')
      return
    }

    const totalCosts = formData.materialCostEst + formData.laborCostEst + formData.equipmentCostEst
    if (totalCosts <= 0) {
      setError('At least one cost field (Material, Labor, or Equipment) must be greater than 0')
      return
    }

    try {
      setSubmitting(true)

      // First, check if we need to create a new trade
      let tradeId = formData.tradeId
      if (showCreateTrade && newTradeName.trim()) {
        await handleCreateTrade()
        // The tradeId would be updated in formData by handleCreateTrade
        tradeId = formData.tradeId
      }

      // Create the line item
      const response = await fetch(`/api/projects/${projectId}/trades/${tradeId}/line-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description.trim(),
          quantity: formData.quantity,
          unit: formData.unit,
          materialCostEst: formData.materialCostEst,
          laborCostEst: formData.laborCostEst,
          equipmentCostEst: formData.equipmentCostEst,
          markupPercent: formData.markupPercent,
          overheadPercent: formData.overheadPercent,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onComplete()
        onClose()
      } else {
        setError(data.error || 'Failed to add line item')
      }
    } catch (err) {
      setError('Failed to add line item')
      console.error('Add line item error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Line Item" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Trade Selection */}
        <div>
          <label htmlFor="tradeId" className="block text-sm font-medium text-gray-700 mb-1">
            Trade Category
          </label>
          {!showCreateTrade ? (
            <div className="flex space-x-2">
              <select
                id="tradeId"
                value={formData.tradeId}
                onChange={e => handleInputChange('tradeId', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a trade...</option>
                {trades.map(trade => (
                  <option key={trade.id} value={trade.id}>
                    {trade.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateTrade(true)}
                icon={<PlusIcon className="h-4 w-4" />}
              >
                New Trade
              </Button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Input
                value={newTradeName}
                onChange={e => setNewTradeName(e.target.value)}
                placeholder="Enter new trade name"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateTrade}
                disabled={!newTradeName.trim()}
                icon={<PlusIcon className="h-4 w-4" />}
              >
                Create
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateTrade(false)}
                icon={<XMarkIcon className="h-4 w-4" />}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <Input
              id="description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder="Enter line item description"
              required
            />
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <Input
              id="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.quantity}
              onChange={e => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              id="unit"
              value={formData.unit}
              onChange={e => handleInputChange('unit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ea">Each</option>
              <option value="m">Meter</option>
              <option value="m²">Square Meter</option>
              <option value="m³">Cubic Meter</option>
              <option value="kg">Kilogram</option>
              <option value="hr">Hour</option>
              <option value="day">Day</option>
              <option value="sqft">Square Foot</option>
              <option value="cuft">Cubic Foot</option>
              <option value="lf">Linear Foot</option>
              <option value="ton">Ton</option>
              <option value="lot">Lot</option>
            </select>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Cost Breakdown (per unit)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="materialCost"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Material Cost
              </label>
              <Input
                id="materialCost"
                type="number"
                min="0"
                step="0.01"
                value={formData.materialCostEst}
                onChange={e =>
                  handleInputChange('materialCostEst', parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="laborCost" className="block text-sm font-medium text-gray-700 mb-1">
                Labor Cost
              </label>
              <Input
                id="laborCost"
                type="number"
                min="0"
                step="0.01"
                value={formData.laborCostEst}
                onChange={e => handleInputChange('laborCostEst', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label
                htmlFor="equipmentCost"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Equipment Cost
              </label>
              <Input
                id="equipmentCost"
                type="number"
                min="0"
                step="0.01"
                value={formData.equipmentCostEst}
                onChange={e =>
                  handleInputChange('equipmentCostEst', parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Markup and Overhead */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Markup & Overhead</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="markup" className="block text-sm font-medium text-gray-700 mb-1">
                Markup Percentage
              </label>
              <div className="relative">
                <Input
                  id="markup"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.markupPercent}
                  onChange={e =>
                    handleInputChange('markupPercent', parseFloat(e.target.value) || 0)
                  }
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="overhead" className="block text-sm font-medium text-gray-700 mb-1">
                Overhead Percentage
              </label>
              <div className="relative">
                <Input
                  id="overhead"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.overheadPercent}
                  onChange={e =>
                    handleInputChange('overheadPercent', parseFloat(e.target.value) || 0)
                  }
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Calculation */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Total Cost ({formData.quantity} × unit cost):
            </span>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(calculateTotal())}
            </span>
          </div>

          {formData.quantity > 1 && (
            <div className="mt-1 text-xs text-gray-600">
              Unit cost: {formatCurrency(calculateTotal() / formData.quantity)}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} icon={<PlusIcon className="h-4 w-4" />}>
            {submitting ? 'Adding...' : 'Add Line Item'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
