'use client'

import { useState, useEffect, useRef } from 'react'
import {
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface InvoiceImageViewerProps {
  pdfFile: File | string
  className?: string
  pageNumber?: number
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

export function InvoiceImageViewer({
  pdfFile,
  className = '',
  pageNumber = 1,
  onPageChange,
  highlightRegions = [],
}: InvoiceImageViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(0.5) // Default to 50% size
  const [currentPage, setCurrentPage] = useState(pageNumber)
  const [numPages] = useState(1) // For now, just show first page as image
  const imgRef = useRef<HTMLImageElement>(null)

  // Update currentPage when pageNumber prop changes
  useEffect(() => {
    setCurrentPage(pageNumber)
  }, [pageNumber])

  useEffect(() => {
    loadPdfAsImage()
  }, [pdfFile, pageNumber])

  const loadPdfAsImage = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`Loading PDF page ${pageNumber} for invoice viewer`)

      if (typeof pdfFile === 'string') {
        // If it's a URL, use it directly (though this won't work for PDF)
        setImageUrl(pdfFile)
        setLoading(false)
        return
      }

      // For File objects, we'll convert PDF to image using PDF.js
      const pdfjs = await import('pdfjs-dist')
      
      // Set up worker - use local worker to avoid CORS issues
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
      }

      const arrayBuffer = await pdfFile.arrayBuffer()
      const pdf = await pdfjs.getDocument(arrayBuffer).promise
      console.log(`PDF loaded, total pages: ${pdf.numPages}, requesting page: ${pageNumber}`)
      const page = await pdf.getPage(pageNumber) // Get specified page

      const viewport = page.getViewport({ scale: 2.0 }) // Higher scale for better quality
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Could not get canvas context')
      }

      canvas.height = viewport.height
      canvas.width = viewport.width

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise

      const imageDataUrl = canvas.toDataURL('image/png')
      setImageUrl(imageDataUrl)
      setLoading(false)
    } catch (err) {
      console.error('Error loading PDF as image:', err)
      setError('Failed to load PDF. Please try uploading the file again.')
      setLoading(false)
    }
  }

  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in' && scale < 3.0) {
      setScale(prev => Math.min(prev + 0.2, 3.0))
    } else if (direction === 'out' && scale > 0.5) {
      setScale(prev => Math.max(prev - 0.2, 0.5))
    }
  }

  const downloadPdf = () => {
    if (typeof pdfFile === 'string') {
      window.open(pdfFile, '_blank')
    } else {
      const url = URL.createObjectURL(pdfFile)
      const link = document.createElement('a')
      link.href = url
      link.download = pdfFile.name || 'invoice.pdf'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-300 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Converting PDF to image...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-300 p-8 text-center ${className}`}>
        <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">PDF Load Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          onClick={loadPdfAsImage}
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-300 ${className}`}>
      {/* Image Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <button
              disabled
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-700 min-w-0">
              Page {pageNumber}
            </span>
            <button
              disabled
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
              <MagnifyingGlassMinusIcon className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-700 min-w-0">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => handleZoom('in')}
              disabled={scale >= 3.0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In"
            >
              <MagnifyingGlassPlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={downloadPdf}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
          Download PDF
        </button>
      </div>

      {/* Image Display */}
      <div className="relative overflow-auto max-h-[600px] bg-gray-50">
        <div className="flex justify-center p-4">
          {imageUrl && (
            <div className="relative">
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Invoice PDF"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  maxWidth: 'none',
                }}
                className="border border-gray-200 rounded shadow-sm"
              />
              
              {/* Highlight Regions - if any */}
              {highlightRegions
                .filter(region => region.page === currentPage)
                .map((region, index) => (
                  <div
                    key={index}
                    className="absolute border-2 border-yellow-400 bg-yellow-100 bg-opacity-30 pointer-events-none"
                    style={{
                      left: `${region.x * scale}px`,
                      top: `${region.y * scale}px`,
                      width: `${region.width * scale}px`,
                      height: `${region.height * scale}px`,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                    }}
                    title={`${region.label}${region.confidence ? ` (${Math.round(region.confidence * 100)}%)` : ''}`}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}