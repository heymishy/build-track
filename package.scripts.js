/**
 * Helper script to run test setup tasks
 */

const { execSync } = require('child_process')
const { generateTestPDFs } = require('./tests/fixtures/generate-test-pdfs')

// Generate test PDF fixtures
console.log('Generating test PDF fixtures...')
generateTestPDFs()

console.log('Test fixtures ready!')
console.log('To run Playwright tests: npm run test:e2e')
console.log('To run component tests: npm test')
