/**
 * LLM Processing Status Utilities
 * Provides functions to control the global LLM processing indicator in the header
 */

interface LLMProcessingEvent {
  operation: string
  details?: string
}

/**
 * Start LLM processing indicator
 * @param operation - Description of the operation being performed
 * @param details - Additional details (optional)
 */
export function startLLMProcessing(operation: string, details?: string) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('llm-processing-start', {
      detail: { operation, details }
    })
    window.dispatchEvent(event)
  }
}

/**
 * End LLM processing indicator
 */
export function endLLMProcessing() {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('llm-processing-end')
    window.dispatchEvent(event)
  }
}

/**
 * Hook for using LLM processing status in components
 */
export function useLLMProcessing() {
  return {
    start: startLLMProcessing,
    end: endLLMProcessing,
  }
}

/**
 * Common LLM operation names for consistency
 */
export const LLMOperations = {
  PARSING_INVOICE: 'Parsing invoice...',
  MATCHING_INVOICES: 'Matching invoices...',
  ANALYZING_DOCUMENT: 'Analyzing document...',
  GENERATING_ESTIMATE: 'Generating estimate...',
  PROCESSING_BATCH: 'Processing batch...',
  EXTRACTING_DATA: 'Extracting data...',
} as const