import { Page } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  name: string
  role: string
}

export const TEST_USERS = {
  user: {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'USER',
  },
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'ADMIN',
  },
} as const

/**
 * Login via API and set the auth token cookie
 * This is faster and more reliable than filling forms
 */
export async function loginUser(page: Page, user: TestUser): Promise<void> {
  // Login via API
  const response = await page.request.post('/api/auth/login', {
    data: {
      email: user.email,
      password: user.password,
    },
  })

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`)
  }

  const data = await response.json()
  if (!data.success) {
    throw new Error(`Login failed: ${data.error}`)
  }

  // Navigate to dashboard and wait for it to load
  await page.goto('/dashboard')

  // Wait for the page to indicate we're logged in
  // Look for the main navigation or dashboard content
  await page.waitForLoadState('networkidle')
}

/**
 * Login via form interaction (for testing the UI)
 */
export async function loginViaForm(page: Page, user: TestUser): Promise<void> {
  await page.goto('/')

  // Fill the login form
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')

  // Wait for redirect
  await page.waitForURL('/dashboard', { timeout: 10000 })
  await page.waitForLoadState('networkidle')
}
