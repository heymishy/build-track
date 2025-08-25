/**
 * Supplier Management Component
 * Manages supplier/subcontractor access for invoice upload portal
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'react-hot-toast'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'

interface Supplier {
  id: string
  email: string
  name: string
  type: 'SUPPLIER' | 'SUBCONTRACTOR'
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  _count?: {
    invoiceUploads: number
  }
}

interface SupplierFormData {
  email: string
  name: string
  type: 'SUPPLIER' | 'SUBCONTRACTOR'
}

export function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState<SupplierFormData>({
    email: '',
    name: '',
    type: 'SUPPLIER',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.suppliers || [])
      } else {
        toast.error('Failed to load suppliers')
      }
    } catch (error) {
      console.error('Error loading suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSupplier = () => {
    setFormData({ email: '', name: '', type: 'SUPPLIER' })
    setEditingSupplier(null)
    setIsCreateModalOpen(true)
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setFormData({
      email: supplier.email,
      name: supplier.name,
      type: supplier.type,
    })
    setEditingSupplier(supplier)
    setIsCreateModalOpen(true)
  }

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (
      !confirm(
        `Are you sure you want to delete supplier "${supplier.name}"? This will also delete all associated invoice uploads.`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        toast.success('Supplier deleted successfully')
        await loadSuppliers()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete supplier')
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error('Failed to delete supplier')
    }
  }

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          isActive: !supplier.isActive,
        }),
      })

      if (response.ok) {
        toast.success(`Supplier ${supplier.isActive ? 'deactivated' : 'activated'} successfully`)
        await loadSuppliers()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update supplier')
      }
    } catch (error) {
      console.error('Error updating supplier:', error)
      toast.error('Failed to update supplier')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers'
      const method = editingSupplier ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(`Supplier ${editingSupplier ? 'updated' : 'created'} successfully`)
        setIsCreateModalOpen(false)
        await loadSuppliers()
      } else {
        const error = await response.json()
        toast.error(error.message || `Failed to ${editingSupplier ? 'update' : 'create'} supplier`)
      }
    } catch (error) {
      console.error('Error submitting supplier:', error)
      toast.error(`Failed to ${editingSupplier ? 'update' : 'create'} supplier`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Supplier Portal Access</h2>
          <p className="text-sm text-gray-600">
            Manage email addresses that can upload invoices via the supplier portal. Suppliers and
            subcontractors can access the portal using only their approved email address.
          </p>
        </div>
        <Button onClick={handleCreateSupplier} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {/* Portal Information */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <EnvelopeIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">Portal Access</h3>
            <p className="text-sm text-blue-700 mb-2">
              Share this link with approved suppliers:{' '}
              <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                {typeof window !== 'undefined' ? `${window.location.origin}/portal` : '/portal'}
              </code>
            </p>
            <p className="text-xs text-blue-600">
              Only suppliers with approved email addresses can access the portal and upload
              invoices.
            </p>
          </div>
        </div>
      </Card>

      {/* Suppliers List */}
      {suppliers.length === 0 ? (
        <Card className="p-8 text-center">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers added</h3>
          <p className="text-gray-600 mb-4">
            Add suppliers and subcontractors to allow them to upload invoices via the portal.
          </p>
          <Button onClick={handleCreateSupplier}>Add your first supplier</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suppliers.map(supplier => (
            <Card key={supplier.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{supplier.name}</h3>
                      <Badge
                        className={
                          supplier.type === 'SUPPLIER'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }
                      >
                        {supplier.type === 'SUPPLIER' ? 'Supplier' : 'Subcontractor'}
                      </Badge>
                      <Badge
                        className={
                          supplier.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <EnvelopeIcon className="h-4 w-4" />
                        {supplier.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <ClipboardDocumentListIcon className="h-4 w-4" />
                        {supplier._count?.invoiceUploads || 0} uploads
                      </div>
                      <div className="text-xs text-gray-500">
                        Added {new Date(supplier.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleToggleActive(supplier)}>
                    {supplier.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditSupplier(supplier)}>
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSupplier(supplier)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="supplier@company.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              This email address will be used to authenticate portal access
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company/Contractor Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Company Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={formData.type}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  type: e.target.value as 'SUPPLIER' | 'SUBCONTRACTOR',
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SUPPLIER">Supplier</option>
              <option value="SUBCONTRACTOR">Subcontractor</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
