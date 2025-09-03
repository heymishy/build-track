/**
 * Test utilities for E2E testing
 * Common helper functions for Playwright tests
 */

import { Page, expect } from '@playwright/test'

/**
 * Create a mock PDF file for testing uploads
 */
export const createTestPDF = () => {
  // Simple PDF header for testing
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
0
%%EOF`

  return Buffer.from(pdfContent)
}

/**
 * Wait for network requests to complete
 */
export const waitForNetworkIdle = async (page: Page, timeout = 5000) => {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Upload a file to a file input
 */
export const uploadFile = async (
  page: Page,
  inputSelector: string,
  fileName: string,
  content?: Buffer
) => {
  const fileContent = content || createTestPDF()

  await page.setInputFiles(inputSelector, {
    name: fileName,
    mimeType: 'application/pdf',
    buffer: fileContent,
  })
}

/**
 * Wait for element to be visible and interactable
 */
export const waitForElement = async (page: Page, selector: string, timeout = 10000) => {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

/**
 * Fill form field with proper waiting
 */
export const fillField = async (page: Page, selector: string, value: string) => {
  await waitForElement(page, selector)
  await page.fill(selector, value)
}

/**
 * Click element with proper waiting
 */
export const clickElement = async (page: Page, selector: string) => {
  await waitForElement(page, selector)
  await page.click(selector)
}

/**
 * Wait for toast notification and verify content
 */
export const waitForToast = async (page: Page, expectedText: string, timeout = 5000) => {
  // Wait for toast to appear - adjust selector based on your toast implementation
  const toastSelector = '[role="alert"], .toast, .notification'

  try {
    await page.waitForSelector(toastSelector, { timeout })
    const toastText = await page.textContent(toastSelector)
    expect(toastText).toContain(expectedText)
  } catch (error) {
    console.warn(`Toast with text "${expectedText}" not found within ${timeout}ms`)
    // Take screenshot for debugging
    await page.screenshot({ path: `test-results/toast-missing-${Date.now()}.png` })
    throw error
  }
}

/**
 * Create supplier access for testing
 */
export const createTestSupplier = () => ({
  email: 'test@supplier.com',
  name: 'Test Supplier Co',
  type: 'SUPPLIER' as const,
  isActive: true,
})

/**
 * Create mock project data for testing
 */
export const createTestProject = () => ({
  id: 'test-project-1',
  name: 'Test Construction Project',
  description: 'A test project for E2E testing',
  totalBudget: 100000,
  status: 'IN_PROGRESS',
})

/**
 * Create mock AI preview response
 */
export const createMockAIPreview = () => ({
  success: true,
  preview: {
    parsedInvoice: {
      invoiceNumber: 'INV-TEST-001',
      invoiceDate: '2024-01-15',
      supplierName: 'Test Supplier Co',
      totalAmount: 5000,
      lineItems: [
        {
          description: 'Test construction materials',
          quantity: 10,
          unitPrice: 500,
          totalPrice: 5000,
          category: 'MATERIAL',
        },
      ],
    },
    confidence: 0.85,
    extractedLineItems: 1,
    totalAmount: 5000,
    processingTime: 2300,
    projectSuggestions: [
      {
        projectId: 'test-project-1',
        projectName: 'Test Construction Project',
        confidence: 0.8,
        reasoning: 'Materials match project requirements',
        estimatedMatches: 1,
      },
    ],
  },
})

/**
 * Setup API route mocking for tests
 */
export const setupAPIMocks = async (page: Page) => {
  // Mock supplier validation
  await page.route('**/api/portal/validate', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        supplier: createTestSupplier(),
        projects: [createTestProject()],
      }),
    })
  })

  // Mock AI preview
  await page.route('**/api/portal/ai-preview', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createMockAIPreview()),
    })
  })

  // Mock upload history
  await page.route('**/api/portal/upload', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          uploads: [],
        }),
      })
    } else {
      // POST - file upload
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Invoice uploaded successfully',
        }),
      })
    }
  })

  // Mock analytics
  await page.route('**/api/portal/analytics', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        analytics: {
          uploadMetrics: {
            totalUploads: 5,
            successfulUploads: 4,
            avgProcessingTime: 15000,
            successRate: 0.8,
            lastUpload: new Date().toISOString(),
          },
          matchingPerformance: {
            avgConfidence: 0.75,
            highConfidenceRate: 0.6,
            autoMatchRate: 0.7,
            manualOverrideRate: 0.3,
            improvementTrend: 0.1,
          },
          aiInsights: {
            learnedPatterns: 8,
            patternAccuracy: 0.85,
            timesSaved: 120,
            costOptimization: 450,
            nextSuggestion: 'Consider standardizing invoice format for better matching',
          },
          projectCompatibility: {
            bestMatchedProjects: [
              {
                projectId: 'test-project-1',
                projectName: 'Test Construction Project',
                matches: 3,
                totalItems: 4,
                totalInvoices: 2,
                matchRate: 0.75,
              },
            ],
            avgProjectConfidence: 0.75,
          },
          improvements: [
            {
              type: 'accuracy',
              title: 'Invoice Format Optimization',
              description: 'Your invoice format is well-suited for AI processing',
              impact: 'medium',
              implemented: true,
            },
          ],
        },
      }),
    })
  })
}

/**
 * Common assertions for responsive design
 */
export const assertResponsiveDesign = async (page: Page) => {
  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 })
  await page.waitForTimeout(500) // Allow layout to adjust

  // Check that content is still visible and accessible
  const body = await page.locator('body')
  await expect(body).toBeVisible()

  // Test tablet viewport
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.waitForTimeout(500)
  await expect(body).toBeVisible()

  // Test desktop viewport
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.waitForTimeout(500)
  await expect(body).toBeVisible()
}

/**
 * Performance testing utilities
 */
export const measurePagePerformance = async (page: Page) => {
  const navigationStart = await page.evaluate(() => performance.timing.navigationStart)
  const loadComplete = await page.evaluate(() => performance.timing.loadEventEnd)
  const loadTime = loadComplete - navigationStart

  return {
    loadTime,
    navigationStart,
    loadComplete,
  }
}

/**
 * Accessibility testing utilities
 */
export const checkAccessibility = async (page: Page) => {
  // Basic accessibility checks
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').count()
  const images = await page.locator('img').count()
  const imagesWithAlt = await page.locator('img[alt]').count()
  const buttons = await page.locator('button, input[type="button"], input[type="submit"]').count()
  const buttonsWithLabels = await page
    .locator('button[aria-label], input[aria-label], button:has-text("")')
    .count()

  return {
    hasHeadings: headings > 0,
    imageAltTextCoverage: images > 0 ? imagesWithAlt / images : 1,
    buttonLabelCoverage: buttons > 0 ? buttonsWithLabels / buttons : 1,
  }
}
