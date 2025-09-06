/**
 * BDD Scenario Runner
 * Parses markdown scenario files and executes Playwright tests
 */

import { test, expect, Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export interface ScenarioStep {
  type: 'given' | 'when' | 'then' | 'and' | 'but'
  action: string
  parameters?: Record<string, any>
}

export interface TestScenario {
  feature: string
  story: string
  scenario: string
  background?: ScenarioStep[]
  steps: ScenarioStep[]
  tags?: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export interface FeatureFile {
  feature: string
  description: string
  scenarios: TestScenario[]
}

export class ScenarioRunner {
  private page: Page
  private stepDefinitions: Map<string, (page: Page, params?: any) => Promise<void>>

  constructor(page: Page) {
    this.page = page
    this.stepDefinitions = new Map()
    this.setupStepDefinitions()
  }

  /**
   * Parse markdown feature file into scenarios
   */
  static parseFeatureFile(filePath: string): FeatureFile {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    const feature: FeatureFile = {
      feature: '',
      description: '',
      scenarios: []
    }

    let currentSection = 'header'
    let currentScenario: TestScenario | null = null
    let backgroundSteps: ScenarioStep[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('# Feature:')) {
        feature.feature = line.replace('# Feature:', '').trim()
        currentSection = 'description'
      } else if (line.startsWith('## Background')) {
        currentSection = 'background'
      } else if (line.startsWith('## Scenario:')) {
        if (currentScenario) {
          feature.scenarios.push(currentScenario)
        }
        
        const scenarioTitle = line.replace('## Scenario:', '').trim()
        const tags = this.extractTags(lines[i - 1] || '')
        
        currentScenario = {
          feature: feature.feature,
          story: '',
          scenario: scenarioTitle,
          background: [...backgroundSteps],
          steps: [],
          tags,
          priority: this.getPriorityFromTags(tags)
        }
        currentSection = 'scenario'
      } else if (line.startsWith('**As a**') || line.startsWith('**I want**') || line.startsWith('**So that**')) {
        if (currentScenario) {
          currentScenario.story += line.replace(/\*\*/g, '') + ' '
        }
      } else if (this.isStep(line)) {
        const step = this.parseStep(line)
        if (currentSection === 'background') {
          backgroundSteps.push(step)
        } else if (currentScenario) {
          currentScenario.steps.push(step)
        }
      } else if (currentSection === 'description' && line) {
        feature.description += line + ' '
      }
    }

    if (currentScenario) {
      feature.scenarios.push(currentScenario)
    }

    return feature
  }

  private static extractTags(line: string): string[] {
    const tagMatch = line.match(/<!--\s*@(\w+(?:,\s*\w+)*)\s*-->/)
    return tagMatch ? tagMatch[1].split(',').map(tag => tag.trim()) : []
  }

  private static getPriorityFromTags(tags: string[]): 'critical' | 'high' | 'medium' | 'low' {
    if (tags.includes('critical')) return 'critical'
    if (tags.includes('high')) return 'high' 
    if (tags.includes('medium')) return 'medium'
    return 'low'
  }

  private static isStep(line: string): boolean {
    return /^(Given|When|Then|And|But)\s/.test(line)
  }

  private static parseStep(line: string): ScenarioStep {
    const match = line.match(/^(Given|When|Then|And|But)\s(.+)/)
    if (!match) throw new Error(`Invalid step format: ${line}`)
    
    const [, type, action] = match
    return {
      type: type.toLowerCase() as ScenarioStep['type'],
      action: action.trim(),
      parameters: this.extractParameters(action)
    }
  }

  private static extractParameters(action: string): Record<string, any> {
    const params: Record<string, any> = {}
    
    // Extract quoted strings
    const stringMatches = action.match(/"([^"]+)"/g)
    if (stringMatches) {
      stringMatches.forEach((match, index) => {
        params[`string_${index}`] = match.replace(/"/g, '')
      })
    }

    // Extract numbers
    const numberMatches = action.match(/\b(\d+)\b/g)
    if (numberMatches) {
      numberMatches.forEach((match, index) => {
        params[`number_${index}`] = parseInt(match)
      })
    }

    // Extract email addresses
    const emailMatch = action.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
    if (emailMatch) {
      params.email = emailMatch[0]
    }

    return params
  }

  /**
   * Execute a scenario
   */
  async runScenario(scenario: TestScenario): Promise<void> {
    console.log(`🎬 Running scenario: ${scenario.scenario}`)

    // Execute background steps
    if (scenario.background) {
      for (const step of scenario.background) {
        await this.executeStep(step)
      }
    }

    // Execute scenario steps
    for (const step of scenario.steps) {
      await this.executeStep(step)
    }
  }

  private async executeStep(step: ScenarioStep): Promise<void> {
    const stepKey = this.normalizeStepAction(step.action)
    const stepDefinition = this.stepDefinitions.get(stepKey)
    
    if (!stepDefinition) {
      throw new Error(`No step definition found for: "${step.action}"`)
    }

    console.log(`  📝 ${step.type}: ${step.action}`)
    await stepDefinition(this.page, step.parameters)
  }

  private normalizeStepAction(action: string): string {
    // Convert parameterized steps to normalized keys
    return action
      .replace(/"[^"]*"/g, '{string}')
      .replace(/\b\d+\b/g, '{number}')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '{email}')
      .toLowerCase()
  }

  /**
   * Define step implementations
   */
  private setupStepDefinitions(): void {
    // Navigation steps
    this.stepDefinitions.set('i visit {string}', async (page, params) => {
      await page.goto(params.string_0)
    })

    this.stepDefinitions.set('i am on the {string} page', async (page, params) => {
      await expect(page).toHaveURL(new RegExp(params.string_0))
    })

    // Authentication steps
    this.stepDefinitions.set('i am logged in as a {string}', async (page, params) => {
      const role = params.string_0.toLowerCase()
      const credentials = this.getCredentialsForRole(role)
      
      await page.goto('/login')
      await page.fill('input[type="email"]', credentials.email)
      await page.fill('input[type="password"]', credentials.password)
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard')
    })

    this.stepDefinitions.set('i enter {email} in the email field', async (page, params) => {
      await page.fill('input[type="email"], input[name="email"]', params.email)
    })

    this.stepDefinitions.set('i enter {string} in the password field', async (page, params) => {
      await page.fill('input[type="password"], input[name="password"]', params.string_0)
    })

    this.stepDefinitions.set('i click the {string} button', async (page, params) => {
      await page.click(`button:has-text("${params.string_0}"), input[value="${params.string_0}"]`)
    })

    // Form interaction steps
    this.stepDefinitions.set('i fill {string} with {string}', async (page, params) => {
      const field = params.string_0.toLowerCase()
      const value = params.string_1
      
      const selector = this.getFieldSelector(field)
      await page.fill(selector, value)
    })

    this.stepDefinitions.set('i select {string} from the {string} dropdown', async (page, params) => {
      const option = params.string_0
      const dropdown = params.string_1.toLowerCase()
      
      const selector = this.getDropdownSelector(dropdown)
      await page.selectOption(selector, option)
    })

    // File upload steps
    this.stepDefinitions.set('i upload a file {string}', async (page, params) => {
      const fileName = params.string_0
      const testFile = this.createTestFile(fileName)
      
      await page.setInputFiles('input[type="file"]', testFile)
    })

    // Assertion steps
    this.stepDefinitions.set('i should see {string}', async (page, params) => {
      await expect(page.locator(`text=${params.string_0}`)).toBeVisible()
    })

    this.stepDefinitions.set('i should be on the {string} page', async (page, params) => {
      await expect(page).toHaveURL(new RegExp(params.string_0))
    })

    this.stepDefinitions.set('the {string} should contain {string}', async (page, params) => {
      const element = params.string_0.toLowerCase()
      const text = params.string_1
      
      const selector = this.getElementSelector(element)
      await expect(page.locator(selector)).toContainText(text)
    })

    this.stepDefinitions.set('i should see {number} {string}', async (page, params) => {
      const count = params.number_0
      const element = params.string_0.toLowerCase()
      
      const selector = this.getElementSelector(element)
      await expect(page.locator(selector)).toHaveCount(count)
    })

    // Wait steps
    this.stepDefinitions.set('i wait for {string} to appear', async (page, params) => {
      const element = params.string_0.toLowerCase()
      const selector = this.getElementSelector(element)
      await page.waitForSelector(selector, { state: 'visible' })
    })

    this.stepDefinitions.set('i wait {number} seconds', async (page, params) => {
      await page.waitForTimeout(params.number_0 * 1000)
    })
  }

  private getCredentialsForRole(role: string) {
    const credentials = {
      admin: { email: 'admin@buildtrack.com', password: 'admin123' },
      user: { email: 'user@buildtrack.com', password: 'user123' },
      viewer: { email: 'viewer@buildtrack.com', password: 'viewer123' }
    }
    
    return credentials[role as keyof typeof credentials] || credentials.user
  }

  private getFieldSelector(fieldName: string): string {
    const fieldMap: Record<string, string> = {
      'name': 'input[name="name"], input[placeholder*="name"]',
      'email': 'input[name="email"], input[type="email"]',
      'password': 'input[name="password"], input[type="password"]',
      'phone': 'input[name="phone"], input[type="tel"]',
      'description': 'textarea[name="description"], textarea[placeholder*="description"]',
      'budget': 'input[name="budget"], input[placeholder*="budget"]',
      'project name': 'input[name="projectName"], input[name="name"]',
    }
    
    return fieldMap[fieldName] || `input[name="${fieldName}"], input[placeholder*="${fieldName}"]`
  }

  private getDropdownSelector(dropdownName: string): string {
    const dropdownMap: Record<string, string> = {
      'project': 'select[name="projectId"], [data-testid="project-selector"]',
      'status': 'select[name="status"]',
      'priority': 'select[name="priority"]',
      'role': 'select[name="role"]',
    }
    
    return dropdownMap[dropdownName] || `select[name="${dropdownName}"]`
  }

  private getElementSelector(elementName: string): string {
    const elementMap: Record<string, string> = {
      'dashboard': '[data-testid="dashboard"], main',
      'invoices': '[data-testid="invoices"], [data-testid="invoice-list"]',
      'projects': '[data-testid="projects"], [data-testid="project-list"]',
      'notifications': '[data-testid="notifications"], .notification',
      'error message': '.error, [data-testid="error"], .alert-error',
      'success message': '.success, [data-testid="success"], .alert-success',
      'loading indicator': '.loading, [data-testid="loading"], .spinner',
    }
    
    return elementMap[elementName] || `[data-testid="${elementName}"]`
  }

  private createTestFile(fileName: string): { name: string; mimeType: string; buffer: Buffer } {
    let mimeType = 'application/octet-stream'
    let content = 'Test file content'
    
    if (fileName.endsWith('.pdf')) {
      mimeType = 'application/pdf'
      // Simple PDF content
      content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
xref
0 1
trailer
<< /Size 1 /Root 1 0 R >>
%%EOF`
    } else if (fileName.endsWith('.csv')) {
      mimeType = 'text/csv'
      content = 'Name,Amount\nTest Invoice,1000.00'
    }
    
    return {
      name: fileName,
      mimeType,
      buffer: Buffer.from(content)
    }
  }
}

/**
 * Create a test from a markdown scenario file
 */
export function createTestFromFeature(featureFilePath: string, options?: { 
  tags?: string[],
  priority?: string[],
  skip?: string[]
}) {
  const feature = ScenarioRunner.parseFeatureFile(featureFilePath)
  
  test.describe(`Feature: ${feature.feature}`, () => {
    for (const scenario of feature.scenarios) {
      // Skip scenarios based on options
      if (options?.skip?.some(tag => scenario.tags?.includes(tag))) {
        continue
      }
      
      // Filter by tags if specified
      if (options?.tags && !options.tags.some(tag => scenario.tags?.includes(tag))) {
        continue
      }
      
      // Filter by priority if specified
      if (options?.priority && !options.priority.includes(scenario.priority)) {
        continue
      }

      test(`${scenario.scenario}`, async ({ page }) => {
        const runner = new ScenarioRunner(page)
        await runner.runScenario(scenario)
      })
    }
  })
}