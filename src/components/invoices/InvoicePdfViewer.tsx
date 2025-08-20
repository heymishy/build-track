'use client'

import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ZoomInIcon,
  ZoomOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface InvoicePdfViewerProps {
  pdfFile: File | string // File object or URL
  className?: string
  onPageChange?: (pageNumber: number) => void
  highlightRegions?: Array<{
    page: number
    x: number
    y: number
    width: number
    height: number
    label: string
    confidence?: number
  }>
}

export function InvoicePdfViewer({
  pdfFile,
  className = '',
  onPageChange,
  highlightRegions = [],
}: InvoicePdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    setError(`Failed to load PDF: ${error.message}`)
    setLoading(false)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage)
      onPageChange?.(newPage)
    }
  }

  const handleZoom = (direction: 'in' | 'out') => {
    setScale(prev => {
      if (direction === 'in') {
        return Math.min(prev + 0.2, 3.0)
      } else {
        return Math.max(prev - 0.2, 0.5)
      }
    })
  }

  const downloadPdf = () => {
    if (typeof pdfFile === 'string') {
      // Handle URL download
      const link = document.createElement('a')
      link.href = pdfFile
      link.download = 'invoice.pdf'
      link.click()
    } else {
      // Handle File object download
      const url = URL.createObjectURL(pdfFile)
      const link = document.createElement('a')
      link.href = url
      link.download = pdfFile.name || 'invoice.pdf'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  // Get highlights for current page
  const currentPageHighlights = highlightRegions.filter(region => region.page === currentPage)

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-300 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Loading PDF...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-300 p-8 text-center ${className}`}>
        <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">PDF Load Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-300 ${className}`}>
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-700 min-w-0">
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoom('out')}
              disabled={scale <= 0.5}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom Out"
            >
              <ZoomOutIcon className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-700 min-w-0">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => handleZoom('in')}
              disabled={scale >= 3.0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In"
            >
              <ZoomInIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={downloadPdf}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
          Download
        </button>
      </div>

      {/* PDF Display */}
      <div className="relative overflow-auto max-h-[600px]">
        <div className="flex justify-center p-4" ref={pageRef}>
          <div className="relative">
            <Document
              file={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
              error=""
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            {/* Highlight Overlays */}
            {currentPageHighlights.map((highlight, index) => (
              <div
                key={index}
                className="absolute border-2 border-blue-400 bg-blue-100 bg-opacity-30 pointer-events-none"
                style={{
                  left: `${highlight.x * scale}px`,
                  top: `${highlight.y * scale}px`,
                  width: `${highlight.width * scale}px`,
                  height: `${highlight.height * scale}px`,
                }}
                title={`${highlight.label}${highlight.confidence ? ` (${Math.round(highlight.confidence * 100)}% confidence)` : ''}`}
              >
                <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {highlight.label}
                  {highlight.confidence && (
                    <span className="ml-1 opacity-75">
                      ({Math.round(highlight.confidence * 100)}%)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page Thumbnails for multi-page PDFs */}
      {numPages > 1 && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <span className="text-xs text-gray-500 whitespace-nowrap mr-2">Pages:</span>
            {Array.from(new Array(numPages), (el, index) => (
              <button
                key={`page_${index + 1}`}
                onClick={() => handlePageChange(index + 1)}
                className={`flex-shrink-0 w-12 h-16 border-2 rounded text-xs hover:bg-gray-50 ${
                  currentPage === index + 1 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <Document file={pdfFile} loading="">
                  <Page
                    pageNumber={index + 1}
                    scale={0.2}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
