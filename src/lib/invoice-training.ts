/**
 * Invoice Training System
 * Learns from user corrections to improve parsing accuracy
 */

export interface TrainingExample {
  id: string
  text: string // Raw text from PDF page
  correctValues: {
    invoiceNumber?: string
    date?: string
    vendorName?: string
    description?: string
    amount?: number
    tax?: number
    total?: number
  }
  parsedValues: {
    invoiceNumber?: string
    date?: string
    vendorName?: string
    description?: string
    amount?: number
    tax?: number
    total?: number
  }
  patterns?: LearnedPattern[]
  timestamp: Date
  userId?: string
  invoiceType?: string // e.g., "construction", "electrical", "plumbing"
}

export interface LearnedPattern {
  field: keyof TrainingExample['correctValues']
  pattern: string
  confidence: number
  examples: string[]
  context?: string // Surrounding text that helps identify the pattern
}

export interface InvoiceTemplate {
  id: string
  name: string
  description: string
  vendorPatterns: string[]
  fieldPatterns: Record<string, LearnedPattern[]>
  accuracy: number
  usageCount: number
  lastUsed: Date
}

/**
 * Training data manager
 */
export class InvoiceTrainingManager {
  private trainingData: TrainingExample[] = []
  private learnedPatterns: LearnedPattern[] = []
  private templates: InvoiceTemplate[] = []

  constructor() {
    this.loadTrainingData()
  }

  /**
   * Add a training example from user correction
   */
  addTrainingExample(
    text: string,
    parsedValues: TrainingExample['parsedValues'],
    correctValues: TrainingExample['correctValues'],
    invoiceType?: string
  ): string {
    const example: TrainingExample = {
      id: this.generateId(),
      text,
      correctValues,
      parsedValues,
      timestamp: new Date(),
      invoiceType,
    }

    this.trainingData.push(example)
    this.analyzeAndLearnPatterns(example)
    this.saveTrainingData()

    return example.id
  }

  /**
   * Learn patterns from training examples
   */
  private analyzeAndLearnPatterns(example: TrainingExample): void {
    const { text, correctValues } = example

    // Learn patterns for each field that was corrected
    Object.entries(correctValues).forEach(([field, correctValue]) => {
      if (correctValue !== undefined && correctValue !== null) {
        const patterns = this.extractPatternsForField(
          text,
          correctValue,
          field as keyof TrainingExample['correctValues']
        )

        patterns.forEach(pattern => {
          this.addOrUpdatePattern(pattern)
        })
      }
    })
  }

  /**
   * Extract patterns for a specific field and value
   */
  private extractPatternsForField(
    text: string,
    value: string | number,
    field: keyof TrainingExample['correctValues']
  ): LearnedPattern[] {
    const patterns: LearnedPattern[] = []
    const valueStr = value.toString()

    // Find all occurrences of the value in the text
    const regex = new RegExp(this.escapeRegex(valueStr), 'gi')
    let match

    while ((match = regex.exec(text)) !== null) {
      const start = match.index
      const end = start + valueStr.length

      // Extract context before and after the value
      const beforeContext = text.substring(Math.max(0, start - 50), start)
      const afterContext = text.substring(end, Math.min(text.length, end + 50))

      // Create pattern based on the context
      const pattern = this.createPatternFromContext(beforeContext, afterContext, field)

      if (pattern) {
        patterns.push({
          field,
          pattern: pattern.source,
          confidence: 0.7, // Initial confidence
          examples: [valueStr],
          context: beforeContext.trim() + ' [VALUE] ' + afterContext.trim(),
        })
      }
    }

    return patterns
  }

  /**
   * Create regex pattern from context
   */
  private createPatternFromContext(
    before: string,
    after: string,
    field: keyof TrainingExample['correctValues']
  ): RegExp | null {
    // Clean up context
    const beforeClean = this.normalizeContext(before)
    const afterClean = this.normalizeContext(after)

    let patternStr = ''

    // Add before context if meaningful
    if (beforeClean.length > 0) {
      const beforePattern = this.extractMeaningfulWords(beforeClean)
      if (beforePattern) {
        patternStr += `(?:${beforePattern})\\s*:?\\s*`
      }
    }

    // Add value capture group based on field type
    if (field === 'amount' || field === 'tax' || field === 'total') {
      patternStr += `(?:NZ\\$|\\$|AUD|USD)?\\s*([\\d,]+\\.?\\d*)`
    } else if (field === 'date') {
      patternStr += `([\\d]{1,2}[\\-\\/]\\d{1,2}[\\-\\/]\\d{4}|[A-Za-z]{3,9}\\s+\\d{1,2},?\\s+\\d{4})`
    } else {
      patternStr += `([^\\n\\r]+?)`
    }

    // Add after context if meaningful
    if (afterClean.length > 0) {
      const afterPattern = this.extractMeaningfulWords(afterClean)
      if (afterPattern) {
        patternStr += `\\s*${afterPattern}`
      }
    }

    try {
      return new RegExp(patternStr, 'i')
    } catch (e) {
      console.warn('Failed to create pattern:', patternStr, e)
      return null
    }
  }

  /**
   * Extract meaningful words from context for pattern creation
   */
  private extractMeaningfulWords(context: string): string | null {
    // Common meaningful words for invoice parsing
    const meaningfulWords = [
      'invoice',
      'number',
      'total',
      'amount',
      'due',
      'date',
      'vendor',
      'company',
      'bill',
      'to',
      'from',
      'tax',
      'gst',
      'vat',
      'subtotal',
      'cost',
      'price',
      'fee',
      'charge',
      'payment',
      'balance',
      'owing',
    ]

    const words = context
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)

    const meaningful = words.filter(
      word => meaningfulWords.includes(word) || /\d/.test(word) || word.length > 4
    )

    if (meaningful.length === 0) return null

    // Create flexible pattern from meaningful words
    return meaningful.map(word => this.escapeRegex(word)).join('\\s*(?:\\w+\\s*)*?') // Allow words in between
  }

  /**
   * Normalize context text for pattern creation
   */
  private normalizeContext(context: string): string {
    return context
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s:$]/g, ' ')
      .trim()
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Add or update learned pattern
   */
  private addOrUpdatePattern(newPattern: LearnedPattern): void {
    const existingIndex = this.learnedPatterns.findIndex(
      p => p.field === newPattern.field && p.pattern === newPattern.pattern
    )

    if (existingIndex >= 0) {
      // Update existing pattern
      const existing = this.learnedPatterns[existingIndex]
      existing.confidence = Math.min(1.0, existing.confidence + 0.1)
      existing.examples = [...new Set([...existing.examples, ...newPattern.examples])]
    } else {
      // Add new pattern
      this.learnedPatterns.push(newPattern)
    }
  }

  /**
   * Get learned patterns for a specific field
   */
  getLearnedPatterns(field: keyof TrainingExample['correctValues']): LearnedPattern[] {
    return this.learnedPatterns
      .filter(p => p.field === field)
      .sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Apply learned patterns to text parsing
   */
  applyLearnedPatterns(
    text: string,
    field: keyof TrainingExample['correctValues']
  ): string | number | null {
    const patterns = this.getLearnedPatterns(field)

    for (const learnedPattern of patterns) {
      try {
        const regex = new RegExp(learnedPattern.pattern, 'i')
        const match = text.match(regex)

        if (match && match[1]) {
          const value = match[1].trim()

          // Convert to appropriate type
          if (field === 'amount' || field === 'tax' || field === 'total') {
            const numValue = parseFloat(value.replace(/,/g, ''))
            if (!isNaN(numValue)) {
              return Math.round(numValue * 100) / 100
            }
          } else {
            return value
          }
        }
      } catch (e) {
        console.warn('Error applying learned pattern:', learnedPattern.pattern, e)
      }
    }

    return null
  }

  /**
   * Create template from training data
   */
  createTemplate(name: string, description: string, examples: TrainingExample[]): InvoiceTemplate {
    const template: InvoiceTemplate = {
      id: this.generateId(),
      name,
      description,
      vendorPatterns: [],
      fieldPatterns: {},
      accuracy: 0.8, // Initial estimate
      usageCount: 0,
      lastUsed: new Date(),
    }

    // Analyze examples to create patterns
    const fieldGroups: Record<string, LearnedPattern[]> = {}

    examples.forEach(example => {
      Object.entries(example.correctValues).forEach(([field, value]) => {
        if (value !== undefined && value !== null) {
          const patterns = this.extractPatternsForField(
            example.text,
            value,
            field as keyof TrainingExample['correctValues']
          )

          if (!fieldGroups[field]) {
            fieldGroups[field] = []
          }
          fieldGroups[field].push(...patterns)
        }
      })
    })

    template.fieldPatterns = fieldGroups

    this.templates.push(template)
    this.saveTrainingData()

    return template
  }

  /**
   * Get training statistics
   */
  getTrainingStats() {
    const totalExamples = this.trainingData.length
    const fieldCounts = this.trainingData.reduce(
      (acc, example) => {
        Object.keys(example.correctValues).forEach(field => {
          acc[field] = (acc[field] || 0) + 1
        })
        return acc
      },
      {} as Record<string, number>
    )

    const invoiceTypes = [...new Set(this.trainingData.map(e => e.invoiceType).filter(Boolean))]

    return {
      totalExamples,
      fieldCounts,
      learnedPatterns: this.learnedPatterns.length,
      templates: this.templates.length,
      invoiceTypes,
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Save training data to localStorage
   */
  private saveTrainingData(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        console.log('localStorage not available (server-side rendering)')
        return
      }
      
      localStorage.setItem(
        'invoice-training-data',
        JSON.stringify({
          trainingData: this.trainingData,
          learnedPatterns: this.learnedPatterns,
          templates: this.templates,
        })
      )
    } catch (e) {
      console.warn('Failed to save training data:', e)
    }
  }

  /**
   * Load training data from localStorage
   */
  private loadTrainingData(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        console.log('localStorage not available (server-side rendering)')
        return
      }
      
      const saved = localStorage.getItem('invoice-training-data')
      if (saved) {
        const data = JSON.parse(saved)
        this.trainingData = data.trainingData || []
        this.learnedPatterns = data.learnedPatterns || []
        this.templates = data.templates || []
      }
    } catch (e) {
      console.warn('Failed to load training data:', e)
    }
  }
}

// Global training manager instance
export const trainingManager = new InvoiceTrainingManager()
