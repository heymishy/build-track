'use client'

import { useState, useEffect } from 'react'
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { reportGenerator, ReportConfig } from '@/lib/report-generator'

interface Project {
  id: string
  name: string
  status: string
  totalBudget: number
  currency: string
}

interface ReportManagerProps {
  className?: string
  projectId?: string
  projects?: Project[]
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  type: 'project' | 'invoice' | 'analytics' | 'cost-tracking' | 'summary'
  icon: React.ElementType
  formats: Array<'pdf' | 'csv' | 'xlsx' | 'json'>
  requiresProject: boolean
}

export function ReportManager({ className = '', projectId, projects = [] }: ReportManagerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    format: 'pdf',
    template: 'standard',
    includeCharts: true,
    includeTables: true,
    includeDetails: true,
    orientation: 'portrait',
    pageSize: 'A4',
  })
  const [selectedProject, setSelectedProject] = useState<string>(projectId || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'project-comprehensive',
      name: 'Comprehensive Project Report',
      description: 'Complete project overview including budget, trades, milestones, and analytics',
      type: 'project',
      icon: DocumentTextIcon,
      formats: ['pdf', 'csv', 'json'],
      requiresProject: true,
    },
    {
      id: 'project-executive',
      name: 'Executive Project Summary',
      description: 'High-level project summary for executives and stakeholders',
      type: 'project',
      icon: ChartBarIcon,
      formats: ['pdf'],
      requiresProject: true,
    },
    {
      id: 'cost-tracking',
      name: 'Cost Tracking Report',
      description: 'Detailed cost analysis with budget vs actual comparisons',
      type: 'cost-tracking',
      icon: CurrencyDollarIcon,
      formats: ['pdf', 'csv', 'xlsx'],
      requiresProject: true,
    },
    {
      id: 'invoice-summary',
      name: 'Invoice Summary Report',
      description: 'Invoice overview with status breakdown and payment tracking',
      type: 'invoice',
      icon: DocumentArrowDownIcon,
      formats: ['pdf', 'csv', 'xlsx'],
      requiresProject: false,
    },
    {
      id: 'analytics-dashboard',
      name: 'Analytics Dashboard Report',
      description: 'Visual analytics report with trends and performance metrics',
      type: 'analytics',
      icon: ChartBarIcon,
      formats: ['pdf'],
      requiresProject: true,
    },
    {
      id: 'milestone-tracking',
      name: 'Milestone Progress Report',
      description: 'Milestone status and progress tracking with timeline analysis',
      type: 'project',
      icon: ClockIcon,
      formats: ['pdf', 'csv'],
      requiresProject: true,
    },
  ]

  const handleGenerateReport = async (template: ReportTemplate) => {
    if (template.requiresProject && !selectedProject) {
      setGenerationStatus({
        type: 'error',
        message: 'Please select a project for this report type',
      })
      return
    }

    setSelectedTemplate(template)
    setShowConfigModal(true)
  }

  const handleConfirmGeneration = async () => {
    if (!selectedTemplate) return

    try {
      setIsGenerating(true)
      setGenerationStatus({ type: null, message: '' })

      let result

      switch (selectedTemplate.type) {
        case 'project':
          if (selectedTemplate.id === 'project-executive') {
            result = await reportGenerator.generateExecutiveSummary(
              selectedProject ? [selectedProject] : undefined,
              { ...reportConfig, template: 'executive' }
            )
          } else {
            result = await reportGenerator.generateProjectReport(selectedProject, reportConfig)
          }
          break
        case 'invoice':
          result = await reportGenerator.generateInvoiceReport(
            selectedProject ? { projectId: selectedProject } : undefined,
            reportConfig
          )
          break
        case 'analytics':
          result = await reportGenerator.generateAnalyticsReport(
            selectedProject,
            '90d',
            reportConfig
          )
          break
        case 'cost-tracking':
          result = await reportGenerator.generateCostTrackingReport(selectedProject, reportConfig)
          break
        default:
          throw new Error(`Unsupported report type: ${selectedTemplate.type}`)
      }

      if (result.success) {
        if (result.url) {
          // Download the file
          const link = document.createElement('a')
          link.href = result.url
          link.download = `${selectedTemplate.name.toLowerCase().replace(/\s+/g, '-')}.${reportConfig.format}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(result.url)
        }

        setGenerationStatus({
          type: 'success',
          message: 'Report generated successfully!',
        })
      } else {
        throw new Error(result.error || 'Report generation failed')
      }
    } catch (error) {
      console.error('Report generation error:', error)
      setGenerationStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate report',
      })
    } finally {
      setIsGenerating(false)
      setShowConfigModal(false)
      setTimeout(() => setGenerationStatus({ type: null, message: '' }), 5000)
    }
  }

  const getStatusColor = (type: 'success' | 'error') => {
    return type === 'success' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Report Generator</h2>
          <p className="text-sm text-gray-600 mt-1">
            Generate comprehensive reports for projects, invoices, and analytics
          </p>
        </div>
        {projects.length > 1 && (
          <div className="flex items-center space-x-2">
            <label htmlFor="project-select" className="text-sm font-medium text-gray-700">
              Project:
            </label>
            <select
              id="project-select"
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Status Message */}
      {generationStatus.type && (
        <div className={`p-4 rounded-md ${getStatusColor(generationStatus.type)}`}>
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            <p className="text-sm font-medium">{generationStatus.message}</p>
          </div>
        </div>
      )}

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTemplates.map(template => {
          const Icon = template.icon
          const isDisabled = template.requiresProject && !selectedProject && projects.length > 0

          return (
            <Card key={template.id} className={isDisabled ? 'opacity-50' : ''}>
              <Card.Body className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <Icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">{template.description}</p>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Available Formats:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.formats.map(format => (
                        <span
                          key={format}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
                        >
                          {format.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {template.requiresProject && (
                    <div className="flex items-center text-xs text-gray-500">
                      <InformationCircleIcon className="h-3 w-3 mr-1" />
                      <span>Requires project selection</span>
                    </div>
                  )}

                  <Button
                    onClick={() => handleGenerateReport(template)}
                    disabled={isDisabled || isGenerating}
                    className="w-full"
                    icon={<DocumentArrowDownIcon className="h-4 w-4" />}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )
        })}
      </div>

      {/* Configuration Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title={`Configure ${selectedTemplate?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <select
              value={reportConfig.format}
              onChange={e =>
                setReportConfig(prev => ({
                  ...prev,
                  format: e.target.value as any,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {selectedTemplate?.formats.map(format => (
                <option key={format} value={format}>
                  {format.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template Style</label>
            <select
              value={reportConfig.template}
              onChange={e =>
                setReportConfig(prev => ({
                  ...prev,
                  template: e.target.value as any,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="standard">Standard</option>
              <option value="detailed">Detailed</option>
              <option value="executive">Executive Summary</option>
              <option value="financial">Financial Focus</option>
            </select>
          </div>

          {reportConfig.format === 'pdf' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Orientation
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="portrait"
                      checked={reportConfig.orientation === 'portrait'}
                      onChange={e =>
                        setReportConfig(prev => ({
                          ...prev,
                          orientation: e.target.value as any,
                        }))
                      }
                      className="mr-2"
                    />
                    Portrait
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="landscape"
                      checked={reportConfig.orientation === 'landscape'}
                      onChange={e =>
                        setReportConfig(prev => ({
                          ...prev,
                          orientation: e.target.value as any,
                        }))
                      }
                      className="mr-2"
                    />
                    Landscape
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                <select
                  value={reportConfig.pageSize}
                  onChange={e =>
                    setReportConfig(prev => ({
                      ...prev,
                      pageSize: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A4">A4</option>
                  <option value="letter">Letter</option>
                  <option value="legal">Legal</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Include Content</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportConfig.includeCharts}
                  onChange={e =>
                    setReportConfig(prev => ({
                      ...prev,
                      includeCharts: e.target.checked,
                    }))
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Charts and graphs</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportConfig.includeTables}
                  onChange={e =>
                    setReportConfig(prev => ({
                      ...prev,
                      includeTables: e.target.checked,
                    }))
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Data tables</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reportConfig.includeDetails}
                  onChange={e =>
                    setReportConfig(prev => ({
                      ...prev,
                      includeDetails: e.target.checked,
                    }))
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Detailed breakdowns</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setShowConfigModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmGeneration}
              disabled={isGenerating}
              icon={isGenerating ? undefined : <DocumentArrowDownIcon className="h-4 w-4" />}
            >
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
