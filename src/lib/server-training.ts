/**
 * Server-side Training System
 * Applies learned patterns from database during PDF parsing
 */

interface LearnedPattern {
  field: string
  pattern: string
  flags: string
  confidence: number
  examples: string[]
}

let cachedPatterns: LearnedPattern[] = []
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch learned patterns directly from database (server-side only)
 */
async function fetchLearnedPatterns(): Promise<LearnedPattern[]> {
  try {
    // Check cache first
    const now = Date.now()
    if (cachedPatterns.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
      return cachedPatterns
    }

    // Import prisma on-demand to avoid client-side bundle issues
    const { prisma } = await import('@/lib/prisma')

    // Get all training records from the database directly
    const trainingRecords = await prisma.invoice.findMany({
      where: {
        supplierName: 'Training Data', // Special marker for training records
      },
      select: {
        id: true,
        notes: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to recent training data
    })

    // Parse and aggregate training patterns
    const patterns = new Map<
      string,
      {
        field: string
        pattern: RegExp
        confidence: number
        examples: string[]
      }
    >()

    for (const record of trainingRecords) {
      if (!record.notes) continue

      try {
        const trainingData = JSON.parse(record.notes)
        if (trainingData.type !== 'training_data') continue

        const { originalExtraction, correctedData } = trainingData

        // Create patterns for each corrected field
        for (const [field, correctedValue] of Object.entries(correctedData)) {
          if (correctedValue && originalExtraction[field] !== correctedValue) {
            // This is a field that was corrected - learn from it
            const patternKey = `${field}_${String(correctedValue).toLowerCase()}`

            if (patterns.has(patternKey)) {
              const existing = patterns.get(patternKey)!
              existing.confidence = Math.min(1.0, existing.confidence + 0.1)
              existing.examples.push(String(correctedValue))
            } else {
              // Create simple patterns based on field type
              let pattern: RegExp

              if (field.includes('amount') || field.includes('total') || field.includes('tax')) {
                // Numeric fields - look for currency patterns
                const escapedValue = String(correctedValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                pattern = new RegExp(`\\$?\\s*${escapedValue}`, 'i')
              } else if (field.includes('date')) {
                // Date fields
                const escapedValue = String(correctedValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                pattern = new RegExp(escapedValue, 'i')
              } else {
                // Text fields
                const escapedValue = String(correctedValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                pattern = new RegExp(escapedValue, 'i')
              }

              patterns.set(patternKey, {
                field,
                pattern,
                confidence: 0.7,
                examples: [String(correctedValue)],
              })
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse training data:', e)
      }
    }

    // Convert patterns to serializable format and cache
    cachedPatterns = Array.from(patterns.values()).map(pattern => ({
      field: pattern.field,
      pattern: pattern.pattern.source,
      flags: pattern.pattern.flags,
      confidence: pattern.confidence,
      examples: [...new Set(pattern.examples)], // Remove duplicates
    }))

    cacheTimestamp = now
    console.log(`Loaded ${cachedPatterns.length} learned patterns from database`)
    return cachedPatterns
  } catch (error) {
    console.warn('Error fetching learned patterns:', error)
    return []
  }
}

/**
 * Apply learned patterns to extract field values from text
 */
export async function applyLearnedPatterns(
  text: string,
  field: string
): Promise<string | number | null> {
  try {
    const patterns = await fetchLearnedPatterns()
    const fieldPatterns = patterns
      .filter(p => p.field === field)
      .sort((a, b) => b.confidence - a.confidence) // High confidence first

    for (const pattern of fieldPatterns) {
      try {
        const regex = new RegExp(pattern.pattern, pattern.flags || 'i')
        const match = text.match(regex)

        if (match) {
          let value = match[1] || match[0]
          value = value.trim()

          // Convert to appropriate type
          if (field.includes('amount') || field.includes('total') || field.includes('tax')) {
            // Remove currency symbols and parse as number
            const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''))
            if (!isNaN(numValue) && numValue > 0) {
              console.log(
                `Applied learned pattern for ${field}: ${numValue} (confidence: ${pattern.confidence})`
              )
              return Math.round(numValue * 100) / 100 // Round to 2 decimal places
            }
          } else if (value && value.length > 0) {
            console.log(
              `Applied learned pattern for ${field}: ${value} (confidence: ${pattern.confidence})`
            )
            return value
          }
        }
      } catch (e) {
        console.warn(`Error applying pattern for ${field}:`, pattern.pattern, e)
      }
    }

    return null
  } catch (error) {
    console.warn(`Error applying learned patterns for ${field}:`, error)
    return null
  }
}

/**
 * Get training statistics (for server-side use only)
 */
export async function getTrainingStats() {
  // Server-side only - don't call from client
  if (typeof window !== 'undefined') {
    console.warn('getTrainingStats should not be called from client-side')
    return {
      totalExamples: 0,
      fieldCounts: {},
      learnedPatterns: 0,
      templates: 0,
      invoiceTypes: [],
    }
  }

  try {
    const patterns = await fetchLearnedPatterns()
    const fieldCounts: Record<string, number> = {}

    patterns.forEach(pattern => {
      fieldCounts[pattern.field] = (fieldCounts[pattern.field] || 0) + 1
    })

    return {
      totalExamples: 0, // Would need to track separately
      fieldCounts,
      learnedPatterns: patterns.length,
      templates: 0, // Not implemented yet
      invoiceTypes: [],
    }
  } catch (error) {
    console.warn('Error getting training stats:', error)
    return {
      totalExamples: 0,
      fieldCounts: {},
      learnedPatterns: 0,
      templates: 0,
      invoiceTypes: [],
    }
  }
}
