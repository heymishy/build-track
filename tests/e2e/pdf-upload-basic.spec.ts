/**
 * Basic PDF Upload Test
 * Tests the PDF upload functionality without authentication complexity
 */

import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('PDF Upload Basic Test', () => {
  test('should show login page and form elements', async ({ page }) => {
    // Go to the login page
    await page.goto('/')

    // Verify login page elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should display PDF upload interface after mock login', async ({ page }) => {
    // Mock the authentication by setting localStorage directly
    await page.goto('/')

    // Set up mock user in localStorage to bypass authentication
    await page.evaluate(() => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('user', JSON.stringify(mockUser))
    })

    // Navigate to dashboard
    await page.goto('/dashboard')

    // Verify dashboard loads
    await expect(page.locator('h1')).toContainText('BuildTrack')

    // Verify PDF upload interface is present
    await expect(page.locator('text=Upload Invoice PDF')).toBeVisible()
    await expect(page.locator('input[type="file"]')).toBePresent()
    await expect(page.locator('text=Upload Invoice')).toBeVisible()
  })

  test('should validate file type on upload', async ({ page }) => {
    // Set up mock authentication
    await page.goto('/')
    await page.evaluate(() => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('user', JSON.stringify(mockUser))
    })

    await page.goto('/dashboard')

    // Try to upload a non-PDF file (create a text file)
    const testFilePath = path.join(__dirname, '../fixtures/test.txt')

    // Create the file content temporarily for testing
    await page.evaluate(() => {
      // Create a mock file input change to simulate wrong file type
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) {
        const event = new Event('change', { bubbles: true })
        Object.defineProperty(event, 'target', {
          value: {
            files: [
              {
                name: 'test.txt',
                type: 'text/plain',
                size: 100,
              },
            ],
          },
          writable: false,
        })
        fileInput.dispatchEvent(event)
      }
    })

    // Check for error message about file type
    await expect(page.locator('text=Please select a PDF file')).toBeVisible()
  })

  test('should show PDF processing interface', async ({ page }) => {
    // Set up mock authentication
    await page.goto('/')
    await page.evaluate(() => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('user', JSON.stringify(mockUser))
    })

    await page.goto('/dashboard')

    // Verify the parsed invoice data section is present
    await expect(page.locator('text=Parsed Invoice Data')).toBeVisible()
    await expect(page.locator('text=No invoice data yet')).toBeVisible()
    await expect(page.locator('text=Upload a PDF to see parsed data here')).toBeVisible()
  })

  test('should show training section', async ({ page }) => {
    // Set up mock authentication
    await page.goto('/')
    await page.evaluate(() => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('user', JSON.stringify(mockUser))
    })

    await page.goto('/dashboard')

    // Verify training section elements are present
    // Note: This will depend on the TrainingStats component implementation
    // For now, just verify the dashboard structure is working
    await expect(page.locator('text=Project Overview')).toBeVisible()
    await expect(page.locator('text=Total Projects')).toBeVisible()
    await expect(page.locator('text=Active Invoices')).toBeVisible()
    await expect(page.locator('text=Total Spend')).toBeVisible()
  })
})
