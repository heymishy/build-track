/**
 * BDD Feature Test Runner
 * Automatically runs all markdown-defined scenarios
 */

import { createTestFromFeature } from './framework/scenario-runner.js'
import { EnhancedScenarioRunner } from './framework/enhanced-scenario-runner.js'
import path from 'path'
import fs from 'fs'

// Get all feature files
const featuresDir = path.join(__dirname, 'features')
const featureFiles = fs
  .readdirSync(featuresDir)
  .filter(file => file.endsWith('.feature.md'))
  .map(file => path.join(featuresDir, file))

// Environment-based test filtering
const testTags = process.env.TEST_TAGS?.split(',') || []
const testPriority = process.env.TEST_PRIORITY?.split(',') || ['critical', 'high', 'medium', 'low']
const skipTags = process.env.SKIP_TAGS?.split(',') || []

console.log('🧪 BDD Test Runner Configuration:')
console.log(`  Feature files: ${featureFiles.length}`)
console.log(`  Tags filter: ${testTags.length ? testTags.join(', ') : 'all'}`)
console.log(`  Priority filter: ${testPriority.join(', ')}`)
console.log(`  Skip tags: ${skipTags.length ? skipTags.join(', ') : 'none'}`)

// Create tests for each feature file
for (const featureFile of featureFiles) {
  const fileName = path.basename(featureFile, '.feature.md')

  console.log(`📁 Loading feature: ${fileName}`)

  createTestFromFeature(featureFile, {
    tags: testTags.length ? testTags : undefined,
    priority: testPriority,
    skip: skipTags,
  })
}
