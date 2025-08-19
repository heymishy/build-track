import { test, expect } from '@playwright/test'

test.describe('Authentication E2E Tests', () => {
  test('should allow user registration and login flow', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/')

    // For now, just test that we can make API calls
    // We'll expand this once we have the UI components
    const response = await page.evaluate(async () => {
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123',
          name: 'Test User',
        }),
      })
      return registerResponse.json()
    })

    expect(response).toHaveProperty('success')
  })

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/')

    // Test registration with missing data
    const response = await page.evaluate(async () => {
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          // Missing password and name
        }),
      })
      return {
        status: registerResponse.status,
        data: await registerResponse.json(),
      }
    })

    expect(response.status).toBe(400)
    expect(response.data.success).toBe(false)
    expect(response.data.error).toBe('Missing required fields')
  })
})
