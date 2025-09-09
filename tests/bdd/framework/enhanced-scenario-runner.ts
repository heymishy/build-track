/**
 * Enhanced BDD Scenario Runner with Page Objects and Test Data
 * Integrates with BuildTrack-specific components
 */

import { Page, expect } from '@playwright/test'
import { PageObjectManager } from './page-objects.js'
import { TestDataManager, getEnvironmentData } from './test-data.js'
import { ScenarioRunner, ScenarioStep } from './scenario-runner.js'

export class EnhancedScenarioRunner extends ScenarioRunner {
  private pageObjects: PageObjectManager
  private envData: ReturnType<typeof getEnvironmentData>

  constructor(page: Page) {
    super(page)
    this.pageObjects = new PageObjectManager(page)
    this.envData = getEnvironmentData()
    this.setupEnhancedStepDefinitions()
  }

  private setupEnhancedStepDefinitions() {
    // Authentication steps with page objects
    this.stepDefinitions.set('i am logged in as a {string}', async (page, params) => {
      const role = params.string_0.toLowerCase()
      let user

      try {
        user = TestDataManager.getUserByRole(role.toUpperCase() as any)
      } catch {
        user = TestDataManager.getUser(role)
      }

      const loginPage = this.pageObjects.getLoginPage()
      await loginPage.goto()
      await loginPage.login(user.email, user.password)

      // Wait for successful login
      const dashboardPage = this.pageObjects.getDashboardPage()
      await dashboardPage.expectToBeDashboard()
    })

    // Enhanced login steps
    this.stepDefinitions.set('i enter {string} in the email field', async (page, params) => {
      const email = params.string_0
      await page.fill('input[id="email"]', email)
    })

    this.stepDefinitions.set('i enter {string} in the password field', async (page, params) => {
      const password = params.string_0
      await page.fill('input[id="password"]', password)
    })

    // Navigation with page objects
    this.stepDefinitions.set('i visit the {string} page', async (page, params) => {
      const pageName = params.string_0.toLowerCase()
      await this.navigateToPage(pageName)
    })

    this.stepDefinitions.set('i am on the {string} page', async (page, params) => {
      const pageName = params.string_0.toLowerCase()
      await this.expectCurrentPage(pageName)
    })

    this.stepDefinitions.set('i should be on the {string} page', async (page, params) => {
      const pageName = params.string_0.toLowerCase()
      await this.expectCurrentPage(pageName)
    })

    // Button interactions
    this.stepDefinitions.set('i click the {string} button', async (page, params) => {
      const buttonText = params.string_0

      // Handle special buttons with page objects
      if (buttonText === 'Sign In') {
        await page.click('button[type="submit"]')
      } else if (buttonText === 'New Project') {
        const dashboardPage = this.pageObjects.getDashboardPage()
        await dashboardPage.clickNewProject()
      } else {
        await page.click(`button:has-text("${buttonText}"), input[value="${buttonText}"]`)
      }
    })

    // Form interactions
    this.stepDefinitions.set('i fill {string} with {string}', async (page, params) => {
      const fieldName = params.string_0.toLowerCase()
      const value = params.string_1

      if (fieldName.includes('name') || fieldName.includes('project name')) {
        await page.fill('input[name="name"], input[name="projectName"]', value)
      } else if (fieldName.includes('description')) {
        await page.fill('textarea[name="description"]', value)
      } else if (fieldName.includes('budget')) {
        await page.fill('input[name="budget"]', value)
      } else {
        await page.fill(`input[name="${fieldName}"], input[placeholder*="${fieldName}"]`, value)
      }
    })

    this.stepDefinitions.set(
      'i select {string} from the {string} dropdown',
      async (page, params) => {
        const option = params.string_0
        const dropdownName = params.string_1.toLowerCase()

        if (dropdownName.includes('project type')) {
          await page.selectOption('select[name="type"], select[name="projectType"]', option)
        } else if (dropdownName.includes('role')) {
          await page.selectOption('select[name="role"]', option)
        } else if (dropdownName.includes('user')) {
          await page.selectOption('select[name="userId"], select[name="user"]', option)
        } else {
          await page.selectOption(`select[name="${dropdownName}"]`, option)
        }
      }
    )

    // Project management steps with test data
    this.stepDefinitions.set('i have {number} projects in the system', async (page, params) => {
      const count = params.number_0
      console.log(`📊 Assuming ${count} projects exist in test environment`)
      // In real implementation, this would seed the database
    })

    this.stepDefinitions.set('i have a project called {string}', async (page, params) => {
      const projectName = params.string_0
      console.log(`📊 Assuming project "${projectName}" exists in test environment`)
    })

    // Dashboard assertions
    this.stepDefinitions.set('i should see {string}', async (page, params) => {
      const text = params.string_0

      // Handle special cases
      if (text === 'Admin Dashboard') {
        const dashboardPage = this.pageObjects.getDashboardPage()
        await dashboardPage.expectAdminDashboard()
      } else if (text === 'Project Dashboard') {
        const dashboardPage = this.pageObjects.getDashboardPage()
        await dashboardPage.expectUserDashboard()
      } else if (text.includes('created successfully') || text.includes('updated successfully')) {
        // Success messages
        await expect(page.locator('.alert-success, .text-green-800, .bg-green-50')).toContainText(
          text
        )
      } else if (text.includes('Invalid') || text.includes('error')) {
        // Error messages
        const loginPage = this.pageObjects.getLoginPage()
        await loginPage.expectLoginError(text)
      } else {
        await expect(page.locator(`text=${text}`)).toBeVisible({
          timeout: this.envData.timeouts.element,
        })
      }
    })

    // Navigation assertions
    this.stepDefinitions.set('the {string} should contain {string}', async (page, params) => {
      const section = params.string_0.toLowerCase()
      const text = params.string_1

      if (section.includes('navigation')) {
        await expect(page.locator('nav')).toContainText(text)
      } else if (section.includes('budget')) {
        await expect(page.locator('[data-testid="budget"], .budget')).toContainText(text)
      } else if (section.includes('status')) {
        await expect(page.locator('[data-testid="status"], .status')).toContainText(text)
      } else {
        const selector = this.getElementSelector(section)
        await expect(page.locator(selector)).toContainText(text)
      }
    })

    this.stepDefinitions.set('the {string} should not contain {string}', async (page, params) => {
      const section = params.string_0.toLowerCase()
      const text = params.string_1

      if (section.includes('navigation')) {
        await expect(page.locator('nav')).not.toContainText(text)
      } else {
        const selector = this.getElementSelector(section)
        await expect(page.locator(selector)).not.toContainText(text)
      }
    })

    // Count assertions
    this.stepDefinitions.set('i should see {number} {string}', async (page, params) => {
      const count = params.number_0
      const element = params.string_1.toLowerCase()

      if (element.includes('project')) {
        const dashboardPage = this.pageObjects.getDashboardPage()
        await dashboardPage.expectProjectCards(count)
      } else {
        const selector = this.getElementSelector(element)
        await expect(page.locator(selector)).toHaveCount(count)
      }
    })

    // Google Drive specific steps
    this.stepDefinitions.set('google drive integration is configured', async (page, params) => {
      console.log('🔧 Assuming Google Drive integration is configured')
      // This would verify environment variables or configuration
    })

    this.stepDefinitions.set('i navigate to the {string} section', async (page, params) => {
      const sectionName = params.string_0
      if (sectionName === 'Google Integrations') {
        const settingsPage = this.pageObjects.getSettingsPage()
        await settingsPage.navigateToGoogleIntegrations()
      }
    })

    // Supplier portal steps
    this.stepDefinitions.set('i have validated my email', async (page, params) => {
      console.log('📧 Assuming email validation is completed')
      // This would simulate the email validation flow
    })

    this.stepDefinitions.set('i navigate to the {string} tab', async (page, params) => {
      const tabName = params.string_0
      if (tabName === 'Upload Invoice') {
        const supplierPortalPage = this.pageObjects.getSupplierPortalPage()
        await supplierPortalPage.navigateToUpload()
      }
    })

    // Wait steps
    this.stepDefinitions.set('i wait for {string} to appear', async (page, params) => {
      const element = params.string_0.toLowerCase()
      const selector = this.getElementSelector(element)
      await page.waitForSelector(selector, { timeout: this.envData.timeouts.element })
    })

    this.stepDefinitions.set('i wait for {string} to complete', async (page, params) => {
      const process = params.string_0.toLowerCase()

      if (process.includes('ai processing') || process.includes('processing')) {
        // Wait for loading indicators to disappear
        await page.waitForSelector('.loading, .spinner', { state: 'detached', timeout: 30000 })
      } else if (process.includes('folder scanning')) {
        await page.waitForSelector('text=Scanning complete', { timeout: 15000 })
      } else {
        await page.waitForTimeout(2000) // General wait
      }
    })

    // Project phase transitions
    this.stepDefinitions.set('i have a project in {string} phase', async (page, params) => {
      const phase = params.string_0
      console.log(`📊 Assuming project exists in ${phase} phase`)
    })

    this.stepDefinitions.set('the project phase should be {string}', async (page, params) => {
      const expectedPhase = params.string_0
      const projectDetailPage = this.pageObjects.getProjectDetailPage()
      await projectDetailPage.expectStatus(expectedPhase)
    })

    // Team management
    this.stepDefinitions.set('i should see {string} in the team list', async (page, params) => {
      const email = params.string_0
      await expect(page.locator('[data-testid="team-section"]')).toContainText(email)
    })

    this.stepDefinitions.set('their role should be {string}', async (page, params) => {
      const role = params.string_0
      await expect(page.locator('[data-testid="team-section"]')).toContainText(role)
    })
  }

  private async navigateToPage(pageName: string) {
    switch (pageName) {
      case 'login':
        await this.pageObjects.getLoginPage().goto()
        break
      case 'dashboard':
        await this.pageObjects.getDashboardPage().goto()
        break
      case 'projects':
        await this.pageObjects.getProjectsPage().goto()
        break
      case 'settings':
        await this.pageObjects.getSettingsPage().goto()
        break
      case 'portal':
      case 'supplier portal':
        await this.pageObjects.getSupplierPortalPage().goto()
        break
      default:
        await this.page.goto(`/${pageName}`)
    }
  }

  private async expectCurrentPage(pageName: string) {
    switch (pageName) {
      case 'login':
        await this.pageObjects.getLoginPage().expectOnLoginPage()
        break
      case 'dashboard':
        await this.pageObjects.getDashboardPage().expectToBeDashboard()
        break
      case 'projects':
      case 'project':
        await expect(this.page).toHaveURL(/\/(projects|project)/)
        break
      case 'settings':
        await expect(this.page).toHaveURL(/\/settings/)
        break
      default:
        await expect(this.page).toHaveURL(new RegExp(pageName))
    }
  }

  private override getElementSelector(elementName: string): string {
    const elementMap: Record<string, string> = {
      dashboard: '[data-testid="dashboard"], main',
      invoices: '[data-testid="invoices"], [data-testid="invoice-list"]',
      projects: '[data-testid="projects"], [data-testid="project-list"]',
      'project cards': '[data-testid="project-card"]',
      notifications: '[data-testid="notifications"], .notification',
      'error message': '.error, [data-testid="error"], .alert-error',
      'success message': '.success, [data-testid="success"], .alert-success',
      'loading indicator': '.loading, [data-testid="loading"], .spinner',
      navigation: 'nav',
      budget: '[data-testid="budget"], .budget',
      status: '[data-testid="status"], .status',
    }

    return elementMap[elementName] || `[data-testid="${elementName}"]`
  }
}
