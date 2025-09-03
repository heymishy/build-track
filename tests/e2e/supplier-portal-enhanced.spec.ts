/**
 * E2E Tests for Enhanced Supplier Portal
 * Complete workflow testing for AI-enhanced supplier experience
 */

import { test, expect, Page } from '@playwright/test'
import { createTestPDF } from '../helpers/test-utils'

// Test data
const testSupplier = {
  email: 'test.supplier@construction.com',
  name: 'Test Construction Supplies Co',
  type: 'SUPPLIER',
}

const testProject = {
  id: 'test-project-1',
  name: 'Commercial Office Complex',
  description: 'High-rise office building construction',
}

const mockInvoice = {
  number: 'INV-2024-001',
  date: '2024-01-15',
  supplier: 'Test Construction Supplies Co',
  total: 5000,
  items: [
    {
      description: 'Steel beams structural grade',
      quantity: 25,
      unitPrice: 120,
      total: 3000,
      category: 'MATERIAL',
    },
    {
      description: 'Construction labor services',
      quantity: 40,
      unitPrice: 50,
      total: 2000,
      category: 'LABOR',
    },
  ],
}

class SupplierPortalPage {
  constructor(private page: Page) {}

  async navigateToPortal() {
    await this.page.goto('/portal')
  }

  async validateEmail(email: string) {
    await this.page.getByTestId('email-input').fill(email)
    await this.page.getByTestId('validate-email-button').click()
  }

  async selectTab(tab: 'upload' | 'history' | 'analytics') {
    await this.page.getByRole('button', { name: new RegExp(tab, 'i') }).click()
  }

  async uploadFile(filePath: string) {
    const fileInput = this.page.getByTestId('file-input')
    await fileInput.setInputFiles(filePath)
  }

  async dragAndDropFile(filePath: string) {
    const dropZone = this.page.getByTestId('file-drop-zone')
    await dropZone.setInputFiles(filePath)
  }

  async selectProject(projectName: string) {
    await this.page.getByTestId('project-selector').selectOption({ label: projectName })
  }

  async addNotes(notes: string) {
    await this.page.getByTestId('notes-textarea').fill(notes)
  }

  async submitUpload() {
    await this.page.getByTestId('upload-button').click()
  }

  async waitForAIProcessing() {
    await this.page.waitForSelector('[data-testid="ai-processing"]', { state: 'visible' })
    await this.page.waitForSelector('[data-testid="ai-processing"]', {
      state: 'hidden',
      timeout: 30000,
    })
  }

  async clickProjectSuggestion(index: number) {
    await this.page.getByTestId(`project-suggestion-${index}`).click()
  }

  async refreshAnalytics() {
    await this.page.getByRole('button', { name: /refresh/i }).click()
  }
}

test.describe('Enhanced Supplier Portal', () => {
  let portalPage: SupplierPortalPage
  let mockPDFPath: string

  test.beforeEach(async ({ page }) => {
    portalPage = new SupplierPortalPage(page)

    // Create mock PDF file for testing
    const pdfBuffer = createTestPDF()
    mockPDFPath = { name: 'test-invoice.pdf', mimeType: 'application/pdf', buffer: pdfBuffer }

    // Mock API responses
    await page.route('/api/portal/validate', async route => {
      await route.fulfill({
        json: {
          success: true,
          supplier: testSupplier,
          projects: [testProject],
        },
      })
    })

    await page.route('/api/portal/ai-preview', async route => {
      await route.fulfill({
        json: {
          success: true,
          preview: {
            parsedInvoice: {
              invoiceNumber: mockInvoice.number,
              invoiceDate: mockInvoice.date,
              supplierName: mockInvoice.supplier,
              totalAmount: mockInvoice.total,
              lineItems: mockInvoice.items,
            },
            confidence: 0.89,
            projectSuggestions: [
              {
                projectId: testProject.id,
                projectName: testProject.name,
                confidence: 0.92,
                reasoning: 'Steel beams match project structural requirements',
                estimatedMatches: 8,
              },
            ],
            extractedLineItems: 2,
            totalAmount: 5000,
            processingTime: 2300,
          },
        },
      })
    })

    await page.route('/api/portal/upload', async route => {
      await route.fulfill({
        json: {
          success: true,
          uploadId: 'upload-123',
          message: 'Invoice uploaded successfully with AI processing',
        },
      })
    })

    await page.route('/api/portal/upload*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            success: true,
            uploads: [
              {
                id: 'upload-123',
                fileName: 'test-invoice.pdf',
                uploadedAt: '2024-01-15T10:30:00Z',
                status: 'PROCESSED',
                project: testProject,
              },
            ],
          },
        })
      }
    })
  })

  test.describe('Email Validation & Navigation', () => {
    test('should validate supplier email and show upload interface', async ({ page }) => {
      await portalPage.navigateToPortal()

      // Check initial state
      await expect(page.getByText('Verify Your Email Address')).toBeVisible()
      await expect(page.getByText('AI-Enhanced Upload')).not.toBeVisible()

      // Validate email
      await portalPage.validateEmail(testSupplier.email)

      // Should show supplier interface
      await expect(page.getByText(testSupplier.name)).toBeVisible()
      await expect(page.getByText('SUPPLIER')).toBeVisible()
      await expect(page.getByRole('button', { name: /upload invoice/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /upload history/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /ai insights/i })).toBeVisible()
    })

    test('should handle invalid email validation', async ({ page }) => {
      await page.route('/api/portal/validate', async route => {
        await route.fulfill({
          json: {
            success: false,
            error: 'Email not authorized for portal access',
          },
        })
      })

      await portalPage.navigateToPortal()
      await portalPage.validateEmail('invalid@email.com')

      // Should show error message
      await expect(page.getByText('Email not authorized for portal access')).toBeVisible()
      await expect(page.getByText('AI-Enhanced Upload')).not.toBeVisible()
    })

    test('should navigate between tabs correctly', async ({ page }) => {
      await portalPage.navigateToPortal()
      await portalPage.validateEmail(testSupplier.email)

      // Test upload tab
      await portalPage.selectTab('upload')
      await expect(page.getByText('AI-Enhanced Upload')).toBeVisible()

      // Test history tab
      await portalPage.selectTab('history')
      await expect(page.getByText('Upload History')).toBeVisible()

      // Test analytics tab
      await portalPage.selectTab('analytics')
      await expect(page.getByText('AI Performance Dashboard')).toBeVisible()
    })
  })

  test.describe('Enhanced Upload Experience', () => {
    test.beforeEach(async ({ page }) => {
      await portalPage.navigateToPortal()
      await portalPage.validateEmail(testSupplier.email)
      await portalPage.selectTab('upload')
    })

    test('should show enhanced upload interface', async ({ page }) => {
      await expect(page.getByText('AI-Enhanced Upload')).toBeVisible()
      await expect(page.getByText('Drop your invoice here or click to browse')).toBeVisible()
      await expect(
        page.getByText('AI will instantly analyze your invoice and suggest the best project match')
      ).toBeVisible()
      await expect(page.getByTestId('file-drop-zone')).toBeVisible()
    })

    test('should handle file selection and show AI preview', async ({ page }) => {
      await portalPage.uploadFile(mockPDFPath)

      // Should show file selected
      await expect(page.getByText('test-invoice.pdf')).toBeVisible()

      // Wait for AI processing
      await expect(page.getByText('AI Processing Your Invoice')).toBeVisible()

      // Should show AI preview results
      await expect(page.getByText('AI Analysis Results')).toBeVisible()
      await expect(page.getByText('Processed in 2.3s')).toBeVisible()
      await expect(page.getByText('Line Items:')).toBeVisible()
      await expect(page.getByText('2')).toBeVisible()
      await expect(page.getByText('Total Amount:')).toBeVisible()
      await expect(page.getByText('$5000.00')).toBeVisible()
      await expect(page.getByText('89%')).toBeVisible() // Confidence
    })

    test('should show and handle AI project suggestions', async ({ page }) => {
      await portalPage.uploadFile(mockPDFPath)

      // Wait for AI processing to complete
      await expect(page.getByText('AI Analysis Results')).toBeVisible()

      // Should show project recommendations
      await expect(page.getByText('AI Project Recommendations')).toBeVisible()
      await expect(page.getByText(testProject.name)).toBeVisible()
      await expect(page.getByText('92%')).toBeVisible() // Suggestion confidence
      await expect(page.getByText('🏆 AI Recommended')).toBeVisible()
      await expect(
        page.getByText('Steel beams match project structural requirements')
      ).toBeVisible()

      // Should auto-select high-confidence project
      const projectSelector = page.getByTestId('project-selector')
      await expect(projectSelector).toHaveValue(testProject.id)
    })

    test('should allow manual project suggestion selection', async ({ page }) => {
      await portalPage.uploadFile(mockPDFPath)
      await expect(page.getByText('AI Analysis Results')).toBeVisible()

      // Click on project suggestion
      await portalPage.clickProjectSuggestion(0)

      // Should update project selector
      const projectSelector = page.getByTestId('project-selector')
      await expect(projectSelector).toHaveValue(testProject.id)
    })

    test('should handle drag and drop file upload', async ({ page }) => {
      await portalPage.dragAndDropFile(mockPDFPath)

      // Should show file selected and start AI processing
      await expect(page.getByText('test-invoice.pdf')).toBeVisible()
      await expect(page.getByText('AI Processing Your Invoice')).toBeVisible()
    })

    test('should validate file types and sizes', async ({ page }) => {
      // Test with non-PDF file (mock by changing route)
      await page.route('/api/portal/ai-preview', async route => {
        await route.fulfill({
          json: {
            success: false,
            error: 'Please select a PDF file',
          },
        })
      })

      const fileInput = page.getByTestId('file-input')
      // This would normally upload a txt file, but we're mocking the error
      await fileInput.setInputFiles([
        {
          name: 'document.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('test content'),
        },
      ])

      await expect(page.getByText('Please select a PDF file')).toBeVisible()
    })

    test('should complete upload workflow successfully', async ({ page }) => {
      await portalPage.uploadFile(mockPDFPath)
      await expect(page.getByText('AI Analysis Results')).toBeVisible()

      // Add notes
      await portalPage.addNotes('Test upload with enhanced AI processing')

      // Submit upload
      await portalPage.submitUpload()

      // Should show success message and redirect to history
      await expect(
        page.getByText('Invoice uploaded successfully with AI processing!')
      ).toBeVisible()
      await expect(page.getByText('Upload History')).toBeVisible()
    })

    test('should handle AI processing errors gracefully', async ({ page }) => {
      await page.route('/api/portal/ai-preview', async route => {
        await route.fulfill({
          json: {
            success: false,
            error: 'AI service temporarily unavailable',
          },
        })
      })

      await portalPage.uploadFile(mockPDFPath)

      // Should show fallback message
      await expect(
        page.getByText('AI processing unavailable - you can still upload manually')
      ).toBeVisible()

      // Should still allow manual upload
      await expect(page.getByTestId('upload-button')).toBeEnabled()
    })
  })

  test.describe('Upload History', () => {
    test.beforeEach(async ({ page }) => {
      await portalPage.navigateToPortal()
      await portalPage.validateEmail(testSupplier.email)
      await portalPage.selectTab('history')
    })

    test('should display upload history', async ({ page }) => {
      await expect(page.getByText('Upload History')).toBeVisible()
      await expect(page.getByText('test-invoice.pdf')).toBeVisible()
      await expect(page.getByText('Status: PROCESSED')).toBeVisible()
      await expect(page.getByText(`Project: ${testProject.name}`)).toBeVisible()
    })

    test('should show export to sheets option', async ({ page }) => {
      await expect(page.getByRole('button', { name: /export to sheets/i })).toBeVisible()
    })

    test('should handle empty history state', async ({ page }) => {
      await page.route('/api/portal/upload*', async route => {
        await route.fulfill({
          json: {
            success: true,
            uploads: [],
          },
        })
      })

      await portalPage.selectTab('upload') // Refresh by switching tabs
      await portalPage.selectTab('history')

      await expect(page.getByText('No invoices uploaded yet')).toBeVisible()
    })
  })

  test.describe('AI Analytics Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('/api/portal/analytics*', async route => {
        await route.fulfill({
          json: {
            success: true,
            analytics: {
              uploadMetrics: {
                totalUploads: 25,
                successfulUploads: 23,
                avgProcessingTime: 145000,
                successRate: 0.92,
                lastUpload: '2024-01-15T10:30:00Z',
              },
              matchingPerformance: {
                avgConfidence: 0.78,
                highConfidenceRate: 0.65,
                autoMatchRate: 0.73,
                manualOverrideRate: 0.27,
                improvementTrend: 0.08,
              },
              aiInsights: {
                learnedPatterns: 8,
                patternAccuracy: 0.84,
                timesSaved: 47,
                costOptimization: 345.5,
                nextSuggestion:
                  'Try including more detailed item descriptions in your invoices for better AI matching.',
              },
              projectCompatibility: {
                bestMatchedProjects: [
                  {
                    projectId: 'proj-1',
                    projectName: 'Commercial Office Building',
                    matchRate: 0.89,
                    totalInvoices: 8,
                  },
                ],
                avgProjectConfidence: 0.68,
              },
              improvements: [
                {
                  type: 'accuracy',
                  title: 'Pattern Recognition Optimization',
                  description:
                    'Our AI has learned your invoice patterns and optimized matching algorithms.',
                  impact: 'high',
                  implemented: true,
                },
              ],
            },
          },
        })
      })

      await portalPage.navigateToPortal()
      await portalPage.validateEmail(testSupplier.email)
      await portalPage.selectTab('analytics')
    })

    test('should display AI performance dashboard', async ({ page }) => {
      await expect(page.getByText('AI Performance Dashboard')).toBeVisible()
      await expect(
        page.getByText(`Your upload performance and AI matching insights for ${testSupplier.name}`)
      ).toBeVisible()
    })

    test('should show key performance metrics', async ({ page }) => {
      // Upload success metrics
      await expect(page.getByText('Upload Success')).toBeVisible()
      await expect(page.getByText('92%')).toBeVisible()
      await expect(page.getByText('23')).toBeVisible()
      await expect(page.getByText('of 25 uploads')).toBeVisible()

      // AI confidence metrics
      await expect(page.getByText('AI Confidence')).toBeVisible()
      await expect(page.getByText('78%')).toBeVisible()
      await expect(page.getByText('65%')).toBeVisible()
      await expect(page.getByText('high confidence matches')).toBeVisible()

      // Processing speed
      await expect(page.getByText('Processing Speed')).toBeVisible()
      await expect(page.getByText('2min')).toBeVisible()

      // AI learning
      await expect(page.getByText('AI Learning')).toBeVisible()
      await expect(page.getByText('8')).toBeVisible()
      await expect(page.getByText('84%')).toBeVisible()
    })

    test('should display detailed matching performance', async ({ page }) => {
      await expect(page.getByText('AI Matching Performance')).toBeVisible()
      await expect(page.getByText('Auto-Match Rate')).toBeVisible()
      await expect(page.getByText('Manual Overrides')).toBeVisible()
      await expect(page.getByText('High Confidence')).toBeVisible()
      await expect(page.getByText('73%')).toBeVisible()
      await expect(page.getByText('27%')).toBeVisible()
    })

    test('should show project compatibility analysis', async ({ page }) => {
      await expect(page.getByText('Project Compatibility')).toBeVisible()
      await expect(page.getByText('Commercial Office Building')).toBeVisible()
      await expect(page.getByText('89% match')).toBeVisible()
      await expect(page.getByText('8 invoices')).toBeVisible()
    })

    test('should display AI impact metrics', async ({ page }) => {
      await expect(page.getByText('AI Impact & Efficiency')).toBeVisible()
      await expect(page.getByText('47 min')).toBeVisible()
      await expect(page.getByText('time saved by AI matching')).toBeVisible()
      await expect(page.getByText('$345.50')).toBeVisible()
      await expect(page.getByText('estimated cost savings')).toBeVisible()
    })

    test('should show AI recommendations', async ({ page }) => {
      await expect(page.getByText('💡 AI Recommendation')).toBeVisible()
      await expect(
        page.getByText(
          'Try including more detailed item descriptions in your invoices for better AI matching.'
        )
      ).toBeVisible()
    })

    test('should display improvement suggestions', async ({ page }) => {
      await expect(page.getByText('Improvement Opportunities')).toBeVisible()
      await expect(page.getByText('Pattern Recognition Optimization')).toBeVisible()
      await expect(page.getByText('high impact')).toBeVisible()
      await expect(
        page.getByText('✅ This improvement has been implemented automatically by our AI system.')
      ).toBeVisible()
    })

    test('should handle analytics refresh', async ({ page }) => {
      await portalPage.refreshAnalytics()

      // Should reload the dashboard
      await expect(page.getByText('AI Performance Dashboard')).toBeVisible()
    })

    test('should handle analytics loading and error states', async ({ page }) => {
      await page.route('/api/portal/analytics*', async route => {
        await route.fulfill({
          json: {
            success: false,
            error: 'Analytics service unavailable',
          },
        })
      })

      await portalPage.selectTab('upload') // Refresh by switching tabs
      await portalPage.selectTab('analytics')

      await expect(page.getByText('Unable to Load Analytics')).toBeVisible()
      await expect(page.getByText('Analytics service unavailable')).toBeVisible()
      await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
    })
  })

  test.describe('Complete Workflow Integration', () => {
    test('should complete full supplier workflow with AI enhancement', async ({ page }) => {
      // 1. Email validation
      await portalPage.navigateToPortal()
      await portalPage.validateEmail(testSupplier.email)
      await expect(page.getByText(testSupplier.name)).toBeVisible()

      // 2. AI-enhanced upload
      await portalPage.selectTab('upload')
      await portalPage.uploadFile(mockPDFPath)
      await expect(page.getByText('AI Analysis Results')).toBeVisible()
      await expect(page.getByText('🏆 AI Recommended')).toBeVisible()

      // 3. Complete upload with AI suggestions
      await portalPage.addNotes('Full workflow test with AI enhancement')
      await portalPage.submitUpload()
      await expect(
        page.getByText('Invoice uploaded successfully with AI processing!')
      ).toBeVisible()

      // 4. Check history
      await expect(page.getByText('Upload History')).toBeVisible()
      await expect(page.getByText('test-invoice.pdf')).toBeVisible()

      // 5. View analytics
      await portalPage.selectTab('analytics')
      await expect(page.getByText('AI Performance Dashboard')).toBeVisible()
      await expect(page.getByText('Upload Success')).toBeVisible()

      // 6. Export functionality
      await portalPage.selectTab('history')
      await expect(page.getByRole('button', { name: /export to sheets/i })).toBeVisible()
    })

    test('should maintain consistent UX across all tabs', async ({ page }) => {
      await portalPage.navigateToPortal()
      await portalPage.validateEmail(testSupplier.email)

      // Check header consistency
      await expect(page.getByText(testSupplier.name)).toBeVisible()
      await expect(page.getByText('SUPPLIER')).toBeVisible()

      // Test navigation between tabs maintains state
      await portalPage.selectTab('upload')
      await expect(page.getByText(testSupplier.name)).toBeVisible()

      await portalPage.selectTab('history')
      await expect(page.getByText(testSupplier.name)).toBeVisible()

      await portalPage.selectTab('analytics')
      await expect(page.getByText(testSupplier.name)).toBeVisible()
    })

    test('should handle offline/error scenarios gracefully', async ({ page }) => {
      await portalPage.navigateToPortal()
      await portalPage.validateEmail(testSupplier.email)

      // Test upload with network error
      await portalPage.selectTab('upload')
      await page.route('/api/portal/ai-preview', async route => {
        await route.abort()
      })

      await portalPage.uploadFile(mockPDFPath)
      await expect(
        page.getByText('AI processing unavailable - you can still upload manually')
      ).toBeVisible()

      // Should still allow manual completion
      await expect(page.getByTestId('upload-button')).toBeEnabled()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size
    })

    test('should work correctly on mobile devices', async ({ page }) => {
      await portalPage.navigateToPortal()
      await portalPage.validateEmail(testSupplier.email)

      // Should show mobile-friendly interface
      await expect(page.getByText(testSupplier.name)).toBeVisible()
      await expect(page.getByRole('button', { name: /upload invoice/i })).toBeVisible()

      // Test upload on mobile
      await portalPage.selectTab('upload')
      await expect(page.getByText('AI-Enhanced Upload')).toBeVisible()
      await expect(page.getByTestId('file-drop-zone')).toBeVisible()

      // Upload should work on mobile
      await portalPage.uploadFile(mockPDFPath)
      await expect(page.getByText('AI Analysis Results')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load quickly and respond promptly', async ({ page }) => {
      const startTime = Date.now()

      await portalPage.navigateToPortal()
      await portalPage.validateEmail(testSupplier.email)

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds

      // Test upload performance
      const uploadStartTime = Date.now()
      await portalPage.selectTab('upload')
      await portalPage.uploadFile(mockPDFPath)
      await expect(page.getByText('AI Analysis Results')).toBeVisible()

      const uploadProcessTime = Date.now() - uploadStartTime
      expect(uploadProcessTime).toBeLessThan(10000) // AI processing within 10 seconds
    })
  })
})
