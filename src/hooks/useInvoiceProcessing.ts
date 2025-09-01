/**
 * Invoice Processing Hook
 * Manages invoice processing state and progress tracking
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { startLLMProcessing, endLLMProcessing } from '@/lib/llm-status'
import { ProcessingStep, ProcessingStats } from '@/components/invoices/InvoiceProcessingProgress'

export interface InvoiceProcessingOptions {
  onProgress?: (step: ProcessingStep) => void
  onStatsUpdate?: (stats: ProcessingStats) => void
  onComplete?: (result: any) => void
  onError?: (error: string) => void
}

export interface ProcessedInvoiceResult {
  success: boolean
  totalInvoices: number
  totalAmount: number
  qualityScore?: number
  invoices?: any[]
  error?: string
}

export function useInvoiceProcessing() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [steps, setSteps] = useState<ProcessingStep[]>([])
  const [stats, setStats] = useState<ProcessingStats>({
    totalInvoices: 0,
    processedInvoices: 0,
    totalAmount: 0,
    processedAmount: 0,
    successRate: 0,
    averageProcessingTime: 0,
    errors: [],
  })
  const [currentStep, setCurrentStep] = useState<string | undefined>()
  
  const abortController = useRef<AbortController | null>(null)
  const stepTimings = useRef<Map<string, number>>(new Map())

  // Initialize default processing steps
  const initializeSteps = useCallback(() => {
    return [
      {
        id: 'upload',
        name: 'File Upload',
        status: 'pending' as const,
        description: 'Uploading and validating PDF file',
      },
      {
        id: 'extraction',
        name: 'Text Extraction',
        status: 'pending' as const,
        description: 'Extracting text content from PDF',
      },
      {
        id: 'parsing',
        name: 'AI Parsing',
        status: 'pending' as const,
        description: 'Using AI to parse invoice data',
      },
      {
        id: 'validation',
        name: 'Data Validation',
        status: 'pending' as const,
        description: 'Validating extracted invoice data',
      },
      {
        id: 'saving',
        name: 'Saving to Database',
        status: 'pending' as const,
        description: 'Saving processed invoices to your project',
      },
    ]
  }, [])

  const updateStep = useCallback((stepId: string, updates: Partial<ProcessingStep>) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        // Track timing
        if (updates.status === 'in_progress') {
          stepTimings.current.set(stepId, Date.now())
          setCurrentStep(stepId)
        } else if (updates.status === 'completed' || updates.status === 'error') {
          const startTime = stepTimings.current.get(stepId)
          if (startTime) {
            updates.duration = Date.now() - startTime
          }
        }
        
        return { ...step, ...updates }
      }
      return step
    }))
  }, [])

  const updateStats = useCallback((updates: Partial<ProcessingStats>) => {
    setStats(prev => ({ ...prev, ...updates }))
  }, [])

  const addError = useCallback((message: string, type: 'warning' | 'error' = 'error') => {
    setStats(prev => ({
      ...prev,
      errors: [...prev.errors, {
        message,
        type,
        timestamp: new Date(),
      }],
    }))
  }, [])

  const processInvoices = useCallback(async (
    file: File, 
    options: InvoiceProcessingOptions = {}
  ): Promise<ProcessedInvoiceResult> => {
    try {
      setIsProcessing(true)
      setSteps(initializeSteps())
      setStats({
        totalInvoices: 0,
        processedInvoices: 0,
        totalAmount: 0,
        processedAmount: 0,
        successRate: 0,
        averageProcessingTime: 0,
        errors: [],
      })
      setCurrentStep(undefined)
      
      // Create abort controller for cancellation
      abortController.current = new AbortController()
      
      // Start global LLM processing indicator
      startLLMProcessing('Processing invoices...', `Parsing ${file.name}`)

      const startTime = Date.now()

      // Step 1: File Upload
      updateStep('upload', { status: 'in_progress', progress: 0 })
      
      const formData = new FormData()
      formData.append('file', file)
      
      updateStep('upload', { status: 'completed', progress: 100 })
      updateStep('extraction', { status: 'in_progress', progress: 0 })

      // Step 2-5: API Call with progress tracking
      const response = await fetch('/api/invoices/parse', {
        method: 'POST',
        body: formData,
        signal: abortController.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process invoices')
      }

      const result = await response.json()
      
      // Update steps to completed
      updateStep('extraction', { status: 'completed', progress: 100 })
      updateStep('parsing', { status: 'completed', progress: 100 })
      updateStep('validation', { status: 'completed', progress: 100 })
      updateStep('saving', { status: 'completed', progress: 100 })

      // Calculate final stats
      const processingTime = Date.now() - startTime
      const finalStats: ProcessingStats = {
        totalInvoices: result.totalInvoices || 0,
        processedInvoices: result.totalInvoices || 0,
        totalAmount: result.totalAmount || 0,
        processedAmount: result.totalAmount || 0,
        successRate: result.success ? 1 : 0,
        averageProcessingTime: processingTime,
        qualityScore: result.qualityMetrics?.overallAccuracy,
        errors: result.qualityMetrics?.issuesFound?.map((issue: string) => ({
          message: issue,
          type: 'warning' as const,
          timestamp: new Date(),
        })) || [],
      }

      setStats(finalStats)
      
      // Notify callbacks
      if (options.onStatsUpdate) {
        options.onStatsUpdate(finalStats)
      }
      
      if (options.onComplete) {
        options.onComplete(result)
      }

      return {
        success: true,
        totalInvoices: result.totalInvoices || 0,
        totalAmount: result.totalAmount || 0,
        qualityScore: result.qualityMetrics?.overallAccuracy,
        invoices: result.invoices || [],
      }

    } catch (error: any) {
      // Handle cancellation
      if (error.name === 'AbortError') {
        updateStep(currentStep || 'upload', { status: 'error', error: 'Processing cancelled' })
        addError('Processing was cancelled by user')
        return { success: false, totalInvoices: 0, totalAmount: 0, error: 'Cancelled' }
      }

      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      updateStep(currentStep || 'upload', { status: 'error', error: errorMessage })
      addError(errorMessage, 'error')
      
      if (options.onError) {
        options.onError(errorMessage)
      }

      return {
        success: false,
        totalInvoices: 0,
        totalAmount: 0,
        error: errorMessage,
      }
      
    } finally {
      setIsProcessing(false)
      setCurrentStep(undefined)
      endLLMProcessing()
    }
  }, [initializeSteps, updateStep, updateStats, addError, currentStep])

  const cancelProcessing = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
    }
  }, [])

  const resetProcessing = useCallback(() => {
    setIsProcessing(false)
    setSteps(initializeSteps())
    setStats({
      totalInvoices: 0,
      processedInvoices: 0,
      totalAmount: 0,
      processedAmount: 0,
      successRate: 0,
      averageProcessingTime: 0,
      errors: [],
    })
    setCurrentStep(undefined)
    stepTimings.current.clear()
  }, [initializeSteps])

  return {
    // State
    isProcessing,
    steps,
    stats,
    currentStep,
    
    // Actions
    processInvoices,
    cancelProcessing,
    resetProcessing,
    updateStep,
    updateStats,
    addError,
  }
}