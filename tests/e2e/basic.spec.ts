import { test, expect } from '@playwright/test'

test.describe('Basic E2E Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to load and check for basic Next.js content
    await expect(page).toHaveTitle(/build-track/i)

    // Check that the page loaded successfully
    await expect(page.locator('body')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Page should still load correctly on mobile
    await expect(page.locator('body')).toBeVisible()
  })
})
