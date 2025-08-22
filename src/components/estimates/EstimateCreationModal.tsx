/**
 * Estimate Creation Modal
 * Choose between importing from file or creating manually
 */

'use client'

import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  PencilSquareIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { EstimateImportModal } from './EstimateImportModal'
import { ManualEstimateCreator } from './ManualEstimateCreator'

interface EstimateCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (result: any) => void
  projectId?: string
  allowCreateProject?: boolean
}

type CreationMode = 'selection' | 'import' | 'manual'

export function EstimateCreationModal({
  isOpen,
  onClose,
  onComplete,
  projectId,
  allowCreateProject = true
}: EstimateCreationModalProps) {
  const [mode, setMode] = useState<CreationMode>('selection')

  const handleBack = () => {
    setMode('selection')
  }

  const handleModeComplete = (result: any) => {
    onComplete(result)
    onClose()
    setMode('selection')
  }

  const handleModalClose = () => {
    onClose()
    setMode('selection')
  }

  if (mode === 'import') {
    return (
      <EstimateImportModal
        isOpen={isOpen}
        onClose={handleModalClose}
        onImportComplete={handleModeComplete}
        projectId={projectId}
        allowCreateProject={allowCreateProject}
      />
    )
  }

  if (mode === 'manual') {
    return (
      <Dialog open={isOpen} onClose={handleModalClose} className="relative z-50">
        <div className="fixed inset-0 bg-black bg-opacity-25" />
        
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-7xl w-full bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="flex items-center">
                  <button
                    onClick={handleBack}
                    className="mr-3 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    Create Estimate Manually
                  </Dialog.Title>
                </div>
                <button onClick={handleModalClose} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-0">
                <ManualEstimateCreator
                  projectId={projectId}
                  onSave={handleModeComplete}
                  onCancel={handleBack}
                />
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onClose={handleModalClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-25" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <Dialog.Title className="text-lg font-medium text-gray-900">
                Create Project Estimate
              </Dialog.Title>
              <button onClick={handleModalClose} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-6">
                Choose how you'd like to create your project estimate
              </p>

              <div className="space-y-4">
                {/* Import from File */}
                <button
                  onClick={() => setMode('import')}
                  className="w-full flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <DocumentArrowUpIcon className="h-6 w-6 text-blue-600 mt-1 mr-4 flex-shrink-0" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">Import from File</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Upload a PDF, Excel, or CSV file with your estimate data. 
                      Perfect for existing estimates or QS reports.
                    </p>
                    <div className="flex items-center mt-2 text-xs text-blue-600">
                      <span className="bg-blue-100 px-2 py-1 rounded">AI-Powered</span>
                      <span className="ml-2">Supports PDF text extraction</span>
                    </div>
                  </div>
                </button>

                {/* Create Manually */}
                <button
                  onClick={() => setMode('manual')}
                  className="w-full flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <PencilSquareIcon className="h-6 w-6 text-green-600 mt-1 mr-4 flex-shrink-0" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">Create Manually</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Build your estimate from scratch with flexible input options.
                      Perfect for new projects or detailed custom estimates.
                    </p>
                    <div className="flex items-center mt-2 text-xs text-green-600">
                      <span className="bg-green-100 px-2 py-1 rounded">Flexible</span>
                      <span className="ml-2">Hourly rates • Fixed costs • Quantities</span>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-6 text-xs text-gray-500">
                <p>💡 <strong>Tip:</strong> You can always switch between methods or import additional data later.</p>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )
}