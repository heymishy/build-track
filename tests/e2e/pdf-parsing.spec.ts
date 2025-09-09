/**
 * PDF Parsing End-to-End Tests
 * Tests PDF upload, parsing, and UI display functionality
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { loginUser, TEST_USERS } from './helpers/auth'

test.describe('PDF Invoice Parsing', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test user using API helper
    await loginUser(page, TEST_USERS.user)

    // Wait for dashboard to be visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should upload PDF and display parsed invoice data', async ({ page }) => {
    // Create a test PDF file path
    const testPdfPath = path.join(__dirname, '../fixtures/test-invoice.pdf')

    // Navigate to invoice upload section (assuming there's a button or link)
    await page.click('button:has-text("Upload Invoice")')

    // Upload PDF file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Wait for PDF parsing to complete
    await page.waitForSelector('[data-testid="parsed-invoices"]', { timeout: 30000 })

    // Verify parsed invoice data is displayed
    const invoiceContainer = page.locator('[data-testid="parsed-invoices"]')
    await expect(invoiceContainer).toBeVisible()

    // Check for invoice number
    const invoiceNumber = page.locator('[data-testid="invoice-number"]')
    await expect(invoiceNumber).toBeVisible()
    await expect(invoiceNumber).not.toBeEmpty()

    // Check for vendor name
    const vendorName = page.locator('[data-testid="vendor-name"]')
    await expect(vendorName).toBeVisible()

    // Check for total amount
    const totalAmount = page.locator('[data-testid="total-amount"]')
    await expect(totalAmount).toBeVisible()
    await expect(totalAmount).toContainText('$')

    // Check for invoice date
    const invoiceDate = page.locator('[data-testid="invoice-date"]')
    await expect(invoiceDate).toBeVisible()
  })

  test('should handle multiple invoices in PDF', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../fixtures/multi-invoice.pdf')

    // Upload multi-page PDF
    await page.click('button:has-text("Upload Invoice")')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Wait for parsing
    await page.waitForSelector('[data-testid="parsed-invoices"]', { timeout: 30000 })

    // Check multiple invoices are displayed
    const invoiceItems = page.locator('[data-testid="invoice-item"]')
    const count = await invoiceItems.count()
    expect(count).toBeGreaterThan(1)

    // Verify each invoice has required fields
    for (let i = 0; i < count; i++) {
      const invoice = invoiceItems.nth(i)
      await expect(invoice.locator('[data-testid="invoice-number"]')).toBeVisible()
      await expect(invoice.locator('[data-testid="total-amount"]')).toBeVisible()
    }
  })

  test('should assign parsed invoices to project', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../fixtures/test-invoice.pdf')

    // First create a test project
    await page.click('button:has-text("New Project")')
    await page.fill('input[name="name"]', 'Test Project for PDF')
    await page.fill('input[name="totalBudget"]', '50000')
    await page.click('button[type="submit"]')
    await page.waitForSelector('text=Project created successfully')

    // Upload and parse PDF
    await page.click('button:has-text("Upload Invoice")')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Wait for parsing
    await page.waitForSelector('[data-testid="parsed-invoices"]', { timeout: 30000 })

    // Click assign to project button
    await page.click('button:has-text("Assign to Project")')

    // Select project in modal
    await page.click('[data-testid="project-selector"]')
    await page.click('text=Test Project for PDF')

    // Ensure invoices are selected (should be by default)
    const selectedInvoices = page.locator('input[type="checkbox"]:checked')
    const selectedCount = await selectedInvoices.count()
    expect(selectedCount).toBeGreaterThan(0)

    // Submit assignment
    await page.click('button:has-text("Assign")')

    // Wait for success message
    await page.waitForSelector('text=Assignment Complete!')
    await expect(page.locator('text=Successfully saved')).toBeVisible()

    // Verify invoices appear in project
    await page.goto('/dashboard')
    await page.click('text=Test Project for PDF')
    await expect(page.locator('[data-testid="project-invoices"]')).toBeVisible()
  })

  test('should show confidence indicators for low confidence parsing', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../fixtures/poor-quality-invoice.pdf')

    // Upload low quality PDF
    await page.click('button:has-text("Upload Invoice")')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Wait for parsing
    await page.waitForSelector('[data-testid="parsed-invoices"]', { timeout: 30000 })

    // Check for low confidence indicators
    const lowConfidenceBadge = page.locator('text=Low confidence')
    await expect(lowConfidenceBadge).toBeVisible()

    // Verify warning message
    const warningMessage = page.locator('[data-testid="confidence-warning"]')
    await expect(warningMessage).toBeVisible()
    await expect(warningMessage).toContainText('review')
  })

  test('should handle PDF parsing errors gracefully', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../fixtures/corrupted-file.pdf')

    // Upload corrupted PDF
    await page.click('button:has-text("Upload Invoice")')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Check for error message
    await page.waitForSelector('[data-testid="parsing-error"]', { timeout: 30000 })
    const errorMessage = page.locator('[data-testid="parsing-error"]')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText('Failed to parse')
  })

  test('should validate parsed invoice data accuracy', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../fixtures/known-invoice.pdf')

    // Upload PDF with known values
    await page.click('button:has-text("Upload Invoice")')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Wait for parsing
    await page.waitForSelector('[data-testid="parsed-invoices"]', { timeout: 30000 })

    // Verify specific expected values (these would be known from the test PDF)
    await expect(page.locator('[data-testid="invoice-number"]')).toContainText('INV-2024-001')
    await expect(page.locator('[data-testid="vendor-name"]')).toContainText('ABC Construction')
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$1,250.00')
    await expect(page.locator('[data-testid="invoice-date"]')).toContainText('2024-01-15')

    // Check line items if displayed
    const lineItems = page.locator('[data-testid="line-item"]')
    const lineItemCount = await lineItems.count()
    expect(lineItemCount).toBeGreaterThan(0)
  })

  test('should allow manual correction of parsed data', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../fixtures/test-invoice.pdf')

    // Upload PDF
    await page.click('button:has-text("Upload Invoice")')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Wait for parsing
    await page.waitForSelector('[data-testid="parsed-invoices"]', { timeout: 30000 })

    // Edit parsed data
    const editButton = page.locator('[data-testid="edit-invoice"]')
    await editButton.click()

    // Modify vendor name
    const vendorInput = page.locator('input[name="vendorName"]')
    await vendorInput.clear()
    await vendorInput.fill('Corrected Vendor Name')

    // Modify total amount
    const totalInput = page.locator('input[name="total"]')
    await totalInput.clear()
    await totalInput.fill('2500.00')

    // Save changes
    await page.click('button:has-text("Save Changes")')

    // Verify changes are reflected
    await expect(page.locator('[data-testid="vendor-name"]')).toContainText('Corrected Vendor Name')
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$2,500.00')
  })

  test('should show progress indicator during PDF processing', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../fixtures/large-invoice.pdf')

    // Upload large PDF
    await page.click('button:has-text("Upload Invoice")')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="parsing-progress"]')
    await expect(loadingIndicator).toBeVisible()
    await expect(loadingIndicator).toContainText('Processing')

    // Wait for completion
    await page.waitForSelector('[data-testid="parsed-invoices"]', { timeout: 60000 })

    // Verify loading indicator is gone
    await expect(loadingIndicator).not.toBeVisible()
  })
})

test.describe('PDF Training System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should allow training on misparsed invoices', async ({ page }) => {
    // Navigate to training section
    await page.click('text=Training')

    // Upload PDF for training
    const testPdfPath = path.join(__dirname, '../fixtures/training-invoice.pdf')
    await page.click('button:has-text("Upload for Training")')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Wait for parsing
    await page.waitForSelector('[data-testid="training-invoice"]', { timeout: 30000 })

    // Correct misparsed values
    await page.fill('input[name="correctVendor"]', 'Correct Vendor Name')
    await page.fill('input[name="correctTotal"]', '1500.00')
    await page.fill('input[name="correctDate"]', '2024-02-01')

    // Submit training data
    await page.click('button:has-text("Submit Training")')

    // Verify training success
    await expect(page.locator('text=Training data saved')).toBeVisible()

    // Check training stats update
    const trainingStats = page.locator('[data-testid="training-stats"]')
    await expect(trainingStats).toContainText('1 training sample')
  })
})
