/**
 * PDF Preview Component
 * Displays PDF pages as images for manual verification
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { DocumentTextIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline'
import * as pdfjsLib from 'pdfjs-dist'

// Set up the worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
}

interface PDFPreviewProps {
  pdfFile?: File
  pdfUrl?: string
  highlightPageNumber?: number
  className?: string
  height?: number
}

interface RenderedPage {
  pageNumber: number
  canvas: HTMLCanvasElement
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  pdfFile,
  pdfUrl,
  highlightPageNumber = 1,
  className = '',
  height = 600,
}) => {
  const [pages, setPages] = useState<RenderedPage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1.0)
  const [totalPages, setTotalPages] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pdfFile) {
      renderPDFFromFile(pdfFile)
    } else if (pdfUrl) {
      renderPDFFromUrl(pdfUrl)
    }
  }, [pdfFile, pdfUrl, scale])

  const renderPDFFromFile = async (file: File) => {
    try {
      setLoading(true)
      setError(null)

      const arrayBuffer = await file.arrayBuffer()
      await renderPDFFromArrayBuffer(arrayBuffer)
    } catch (err) {
      console.error('Error rendering PDF from file:', err)
      setError('Failed to load PDF file')
    } finally {
      setLoading(false)
    }
  }

  const renderPDFFromUrl = async (url: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      await renderPDFFromArrayBuffer(arrayBuffer)
    } catch (err) {
      console.error('Error rendering PDF from URL:', err)
      setError('Failed to load PDF from URL')
    } finally {
      setLoading(false)
    }
  }

  const renderPDFFromArrayBuffer = async (arrayBuffer: ArrayBuffer) => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setTotalPages(pdf.numPages)

      const renderedPages: RenderedPage[] = []

      // Render all pages (limit to first 20 for performance)
      const maxPages = Math.min(pdf.numPages, 20)
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        
        if (!context) continue

        canvas.height = viewport.height
        canvas.width = viewport.width

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise

        renderedPages.push({
          pageNumber: pageNum,
          canvas,
        })
      }

      setPages(renderedPages)
    } catch (err) {
      console.error('Error rendering PDF pages:', err)
      setError('Failed to render PDF pages')
    }
  }

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.4))
  }

  const scrollToPage = (pageNumber: number) => {
    const pageElement = document.getElementById(`pdf-page-${pageNumber}`)
    if (pageElement && containerRef.current) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  useEffect(() => {
    if (highlightPageNumber && pages.length > 0) {
      // Slight delay to ensure DOM is ready
      setTimeout(() => {
        scrollToPage(highlightPageNumber)
      }, 100)
    }
  }, [highlightPageNumber, pages])

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Failed to load PDF</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No PDF to display</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">
            {pages.length} of {totalPages} page{totalPages === 1 ? '' : 's'}
          </span>
          {totalPages > 20 && (
            <span className="text-xs text-orange-600">
              (Showing first 20 pages)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-gray-200"
            disabled={scale <= 0.4}
          >
            <MagnifyingGlassMinusIcon className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-gray-200"
            disabled={scale >= 3.0}
          >
            <MagnifyingGlassPlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF Pages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-100"
        style={{ height: height - 60 }} // Account for controls height
      >
        <div className="space-y-6">
          {pages.map((page) => (
            <div
              key={page.pageNumber}
              id={`pdf-page-${page.pageNumber}`}
              className={`bg-white shadow-lg mx-auto ${
                page.pageNumber === highlightPageNumber
                  ? 'ring-2 ring-blue-500 ring-offset-2'
                  : ''
              }`}
              style={{ width: 'fit-content' }}
            >
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    Page {page.pageNumber}
                  </span>
                  {page.pageNumber === highlightPageNumber && (
                    <span className="text-xs text-blue-600 font-medium">
                      Invoice Location
                    </span>
                  )}
                </div>
                <div className="border border-gray-300">
                  <canvas
                    ref={(canvas) => {
                      if (canvas && page.canvas) {
                        const ctx = canvas.getContext('2d')
                        if (ctx) {
                          canvas.width = page.canvas.width
                          canvas.height = page.canvas.height
                          ctx.drawImage(page.canvas, 0, 0)
                        }
                      }
                    }}
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page Navigation */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm text-gray-600 mr-4">Go to page:</span>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => scrollToPage(pageNum)}
                className={`px-2 py-1 text-xs rounded ${
                  pageNum === highlightPageNumber
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {pageNum}
              </button>
            ))}
            {totalPages > 10 && (
              <span className="text-xs text-gray-500">...</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}