'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  DocumentTextIcon,
  FolderIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
  DocumentIcon
} from '@heroicons/react/24/outline'

interface Document {
  id: string
  filename: string
  originalName: string
  fileType: string
  fileSize: number
  category: DocumentCategory
  phase: ProjectPhase
  uploadDate: Date
  uploadedBy: string
  description?: string
  version: number
  tags: string[]
  url?: string
}

type DocumentCategory = 
  | 'PLANS' | 'PERMITS' | 'CONTRACTS' | 'ESTIMATES' | 'DESIGNS'
  | 'PHOTOS' | 'INSPECTIONS' | 'CHANGE_ORDERS' | 'INVOICES'
  | 'WARRANTIES' | 'AS_BUILT' | 'MANUALS' | 'CERTIFICATES'

type ProjectPhase = 'PLANNING' | 'CONSTRUCTION' | 'COMPLETION'

interface DocumentManagerProps {
  projectId?: string
  phase?: ProjectPhase
  compact?: boolean
}

const documentCategories = {
  PLANNING: [
    { key: 'PLANS' as DocumentCategory, label: 'Architectural Plans', icon: DocumentIcon, color: 'bg-blue-100 text-blue-800' },
    { key: 'PERMITS' as DocumentCategory, label: 'Permits & Approvals', icon: DocumentTextIcon, color: 'bg-green-100 text-green-800' },
    { key: 'CONTRACTS' as DocumentCategory, label: 'Contracts', icon: DocumentTextIcon, color: 'bg-purple-100 text-purple-800' },
    { key: 'ESTIMATES' as DocumentCategory, label: 'Cost Estimates', icon: DocumentIcon, color: 'bg-yellow-100 text-yellow-800' },
    { key: 'DESIGNS' as DocumentCategory, label: 'Design Documents', icon: DocumentIcon, color: 'bg-indigo-100 text-indigo-800' }
  ],
  CONSTRUCTION: [
    { key: 'PHOTOS' as DocumentCategory, label: 'Progress Photos', icon: DocumentIcon, color: 'bg-orange-100 text-orange-800' },
    { key: 'INSPECTIONS' as DocumentCategory, label: 'Inspection Reports', icon: DocumentTextIcon, color: 'bg-red-100 text-red-800' },
    { key: 'CHANGE_ORDERS' as DocumentCategory, label: 'Change Orders', icon: DocumentTextIcon, color: 'bg-yellow-100 text-yellow-800' },
    { key: 'INVOICES' as DocumentCategory, label: 'Invoices & Receipts', icon: DocumentIcon, color: 'bg-green-100 text-green-800' }
  ],
  COMPLETION: [
    { key: 'WARRANTIES' as DocumentCategory, label: 'Warranties', icon: DocumentTextIcon, color: 'bg-blue-100 text-blue-800' },
    { key: 'AS_BUILT' as DocumentCategory, label: 'As-Built Drawings', icon: DocumentIcon, color: 'bg-purple-100 text-purple-800' },
    { key: 'MANUALS' as DocumentCategory, label: 'User Manuals', icon: DocumentTextIcon, color: 'bg-indigo-100 text-indigo-800' },
    { key: 'CERTIFICATES' as DocumentCategory, label: 'Certificates', icon: DocumentTextIcon, color: 'bg-green-100 text-green-800' }
  ]
}

export function DocumentManager({ projectId, phase, compact = false }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
  }, [projectId, phase])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      
      // Mock data - in real implementation, this would come from API
      const mockDocuments: Document[] = [
        {
          id: '1',
          filename: 'architectural-plans-v2.pdf',
          originalName: 'Architectural Plans v2.pdf',
          fileType: 'application/pdf',
          fileSize: 2450000,
          category: 'PLANS',
          phase: 'PLANNING',
          uploadDate: new Date('2024-08-15'),
          uploadedBy: 'John Architect',
          description: 'Updated architectural plans with client revisions',
          version: 2,
          tags: ['plans', 'architecture', 'v2']
        },
        {
          id: '2', 
          filename: 'building-permit.pdf',
          originalName: 'Building Permit - City Council.pdf',
          fileType: 'application/pdf',
          fileSize: 890000,
          category: 'PERMITS',
          phase: 'PLANNING',
          uploadDate: new Date('2024-08-20'),
          uploadedBy: 'Sarah Manager',
          description: 'Approved building permit from city council',
          version: 1,
          tags: ['permit', 'approved', 'city']
        },
        {
          id: '3',
          filename: 'progress-week-3.jpg',
          originalName: 'Progress Photos Week 3.jpg', 
          fileType: 'image/jpeg',
          fileSize: 1200000,
          category: 'PHOTOS',
          phase: 'CONSTRUCTION',
          uploadDate: new Date('2024-09-10'),
          uploadedBy: 'Mike Builder',
          description: 'Foundation completion photos',
          version: 1,
          tags: ['progress', 'foundation', 'week3']
        }
      ]

      // Filter by phase if specified
      const filteredDocs = phase ? 
        mockDocuments.filter(doc => doc.phase === phase) : 
        mockDocuments

      setDocuments(filteredDocs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        // Mock upload - in real implementation, would upload to server/cloud storage
        const newDoc: Document = {
          id: Date.now().toString(),
          filename: file.name.toLowerCase().replace(/[^a-z0-9.-]/g, '-'),
          originalName: file.name,
          fileType: file.type,
          fileSize: file.size,
          category: 'PLANS', // Default category
          phase: phase || 'PLANNING',
          uploadDate: new Date(),
          uploadedBy: 'Current User',
          version: 1,
          tags: []
        }

        setDocuments(prev => [...prev, newDoc])
      }
      
      alert('Files uploaded successfully!')
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    handleFileUpload(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesSearch
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getCategoryInfo = (category: DocumentCategory) => {
    for (const phaseCategories of Object.values(documentCategories)) {
      const found = phaseCategories.find(cat => cat.key === category)
      if (found) return found
    }
    return { key: category, label: category, icon: DocumentIcon, color: 'bg-gray-100 text-gray-800' }
  }

  const availableCategories = phase ? documentCategories[phase] : 
    Object.values(documentCategories).flat()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (compact) {
    return (
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
            <Badge className="bg-blue-100 text-blue-800">
              {documents.length} files
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="space-y-3">
            {documents.slice(0, 3).map(doc => {
              const categoryInfo = getCategoryInfo(doc.category)
              const Icon = categoryInfo.icon
              
              return (
                <div key={doc.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                  <Icon className="h-4 w-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {doc.originalName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(doc.fileSize)} • {doc.uploadDate.toLocaleDateString()}
                    </div>
                  </div>
                  <Badge className={`${categoryInfo.color} text-xs`}>
                    {categoryInfo.label.split(' ')[0]}
                  </Badge>
                </div>
              )
            })}
            
            {documents.length > 3 && (
              <div className="text-center pt-2">
                <button 
                  onClick={() => window.location.href = `/documents${phase ? `?tab=${phase.toLowerCase()}` : ''}${projectId ? `&projectId=${projectId}` : ''}`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View all {documents.length} documents →
                </button>
              </div>
            )}
            
            {documents.length <= 3 && documents.length > 0 && (
              <div className="text-center pt-2">
                <button 
                  onClick={() => window.location.href = `/documents${phase ? `?tab=${phase.toLowerCase()}` : ''}${projectId ? `&projectId=${projectId}` : ''}`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Manage documents →
                </button>
              </div>
            )}
            
            {documents.length === 0 && (
              <div className="text-center py-4">
                <DocumentIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-500">No documents uploaded yet</div>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <Card.Body 
          className={`p-8 border-2 border-dashed transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-center">
            <CloudArrowUpIcon className={`mx-auto h-12 w-12 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {dragOver ? 'Drop files here' : 'Upload Documents'}
            </h3>
            <p className="mt-2 text-gray-500">
              {dragOver 
                ? 'Release to upload files'
                : 'Drag and drop files here, or click to select files'
              }
            </p>
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
              />
              {!dragOver && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Select Files'}
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Supports PDF, DOC, images, and spreadsheets up to 10MB
            </p>
          </div>
        </Card.Body>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              selectedCategory === 'ALL' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Categories
          </button>
          {availableCategories.map(category => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                selectedCategory === category.key
                  ? category.color
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {category.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Document List */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Documents ({filteredDocuments.length})
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Total: {formatFileSize(documents.reduce((sum, doc) => sum + doc.fileSize, 0))}
              </span>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500">
                {searchQuery ? 'No documents match your search' : 'No documents found'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map(doc => {
                    const categoryInfo = getCategoryInfo(doc.category)
                    const Icon = categoryInfo.icon
                    
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Icon className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {doc.originalName}
                              </div>
                              {doc.description && (
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {doc.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={categoryInfo.color}>
                            {categoryInfo.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(doc.fileSize)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {doc.uploadDate.toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <UserIcon className="h-3 w-3 mr-1" />
                            {doc.uploadedBy}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button className="text-blue-600 hover:text-blue-900">
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}