/**
 * Page Object Models for BuildTrack Application
 * Provides reusable page interactions and element selectors
 */

import { Page, expect } from '@playwright/test'

export abstract class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string) {
    await this.page.goto(path)
  }

  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle')
  }

  async clickButton(text: string) {
    await this.page.click(`button:has-text("${text}"), input[value="${text}"]`)
  }

  async fillField(name: string, value: string) {
    const input = this.page.locator(`input[name="${name}"], input[id="${name}"]`)
    await input.fill(value)
  }

  async expectToBeVisible(text: string) {
    await expect(this.page.locator(`text=${text}`)).toBeVisible()
  }
}

export class LoginPage extends BasePage {
  // Selectors
  private readonly emailInput = 'input[id="email"]'
  private readonly passwordInput = 'input[id="password"]'
  private readonly signInButton = 'button[type="submit"]'
  private readonly errorMessage = '.text-red-800'
  private readonly signUpLink = 'a[href="/register"]'

  async goto() {
    await super.goto('/login')
    await expect(this.page.locator('h2:text("Sign in to your account")')).toBeVisible()
  }

  async login(email: string, password: string) {
    await this.page.fill(this.emailInput, email)
    await this.page.fill(this.passwordInput, password)
    await this.page.click(this.signInButton)
  }

  async expectLoginError(message: string) {
    await expect(this.page.locator(this.errorMessage)).toContainText(message)
  }

  async expectOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login/)
    await expect(this.page.locator('h2:text("Sign in to your account")')).toBeVisible()
  }

  async clickSignUp() {
    await this.page.click(this.signUpLink)
  }
}

export class DashboardPage extends BasePage {
  // Selectors
  private readonly pageTitle = '[data-testid="dashboard"], h1:text("Dashboard")'
  private readonly navigation = 'nav'
  private readonly projectCard = '[data-testid="project-card"]'
  private readonly newProjectButton = 'button:text("New Project"), a:text("New Project")'
  private readonly projectsLink = 'a[href="/projects"]'
  private readonly userManagementLink = 'a:text("User Management")'

  async goto() {
    await super.goto('/dashboard')
    await this.expectToBeDashboard()
  }

  async expectToBeDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/)
    await expect(this.page.locator(this.pageTitle)).toBeVisible()
  }

  async expectAdminDashboard() {
    await this.expectToBeDashboard()
    await expect(this.page.locator(this.navigation)).toContainText('User Management')
  }

  async expectUserDashboard() {
    await this.expectToBeDashboard()
    await expect(this.page.locator(this.navigation)).toContainText('Projects')
    await expect(this.page.locator(this.userManagementLink)).not.toBeVisible()
  }

  async clickNewProject() {
    await this.page.click(this.newProjectButton)
  }

  async expectProjectCards(count: number) {
    await expect(this.page.locator(this.projectCard)).toHaveCount(count)
  }

  async clickProjectCard(projectName: string) {
    await this.page.click(`${this.projectCard}:has-text("${projectName}")`)
  }
}

export class ProjectsPage extends BasePage {
  // Selectors
  private readonly projectList = '[data-testid="project-list"]'
  private readonly newProjectButton = 'button:text("New Project")'
  private readonly searchInput = 'input[placeholder*="Search"]'
  private readonly statusFilter = 'select[name="status"]'
  private readonly typeFilter = 'select[name="type"]'

  async goto() {
    await super.goto('/projects')
    await expect(this.page.locator(this.projectList)).toBeVisible()
  }

  async clickNewProject() {
    await this.page.click(this.newProjectButton)
  }

  async searchProjects(query: string) {
    await this.page.fill(this.searchInput, query)
    await this.page.keyboard.press('Enter')
  }

  async filterByStatus(status: string) {
    await this.page.selectOption(this.statusFilter, status)
  }

  async filterByType(type: string) {
    await this.page.selectOption(this.typeFilter, type)
  }

  async expectProjectsContaining(text: string) {
    await expect(this.page.locator(`${this.projectList} :text("${text}")`)).toBeVisible()
  }
}

export class NewProjectModal extends BasePage {
  // Selectors
  private readonly modal = '[data-testid="new-project-modal"], [role="dialog"]'
  private readonly nameInput = 'input[name="name"], input[name="projectName"]'
  private readonly descriptionInput = 'textarea[name="description"]'
  private readonly budgetInput = 'input[name="budget"]'
  private readonly typeSelect = 'select[name="type"], select[name="projectType"]'
  private readonly createButton = 'button:text("Create Project")'
  private readonly cancelButton = 'button:text("Cancel")'

  async expectModalVisible() {
    await expect(this.page.locator(this.modal)).toBeVisible()
  }

  async fillProjectForm(data: { name: string; description: string; budget: string; type: string }) {
    await this.page.fill(this.nameInput, data.name)
    await this.page.fill(this.descriptionInput, data.description)
    await this.page.fill(this.budgetInput, data.budget)
    await this.page.selectOption(this.typeSelect, data.type)
  }

  async clickCreate() {
    await this.page.click(this.createButton)
  }

  async clickCancel() {
    await this.page.click(this.cancelButton)
  }
}

export class ProjectDetailPage extends BasePage {
  // Selectors
  private readonly projectTitle = 'h1, [data-testid="project-title"]'
  private readonly budgetDisplay = '[data-testid="budget"], .budget'
  private readonly statusDisplay = '[data-testid="status"], .status'
  private readonly editButton = 'button:text("Edit")'
  private readonly teamSection = '[data-testid="team-section"]'
  private readonly addMemberButton = 'button:text("Add Member")'
  private readonly milestonesSection = '[data-testid="milestones-section"]'
  private readonly newMilestoneButton = 'button:text("New Milestone")'
  private readonly archiveButton = 'button:text("Archive")'

  async expectProjectTitle(title: string) {
    await expect(this.page.locator(this.projectTitle)).toContainText(title)
  }

  async expectBudget(amount: string) {
    await expect(this.page.locator(this.budgetDisplay)).toContainText(amount)
  }

  async expectStatus(status: string) {
    await expect(this.page.locator(this.statusDisplay)).toContainText(status)
  }

  async clickEdit() {
    await this.page.click(this.editButton)
  }

  async clickAddMember() {
    await this.page.click(this.addMemberButton)
  }

  async expectTeamMember(email: string, role: string) {
    const teamMember = this.page.locator(`${this.teamSection} :text("${email}")`)
    await expect(teamMember).toBeVisible()
    await expect(teamMember.locator('..')).toContainText(role)
  }

  async clickNewMilestone() {
    await this.page.click(this.newMilestoneButton)
  }

  async expectMilestone(name: string, status: string) {
    const milestone = this.page.locator(`${this.milestonesSection} :text("${name}")`)
    await expect(milestone).toBeVisible()
    await expect(milestone.locator('..')).toContainText(status)
  }

  async clickArchive() {
    await this.page.click(this.archiveButton)
  }
}

export class SettingsPage extends BasePage {
  // Selectors
  private readonly googleIntegrationsSection = '[data-testid="google-integrations"]'
  private readonly connectGoogleDriveButton = 'button:text("Connect Google Drive")'
  private readonly connectionStatus = '[data-testid="connection-status"]'

  async goto() {
    await super.goto('/settings')
    await expect(this.page.locator('h1:text("Settings")')).toBeVisible()
  }

  async navigateToGoogleIntegrations() {
    await this.page.click('text=Google Integrations')
    await expect(this.page.locator(this.googleIntegrationsSection)).toBeVisible()
  }

  async clickConnectGoogleDrive() {
    await this.page.click(this.connectGoogleDriveButton)
  }

  async expectConnectionStatus(status: string) {
    await expect(this.page.locator(this.connectionStatus)).toContainText(status)
  }
}

export class SupplierPortalPage extends BasePage {
  // Selectors
  private readonly emailValidationInput = 'input[name="email"]'
  private readonly validateButton = 'button:text("Validate Email")'
  private readonly uploadTab = 'button:text("Upload Invoice")'
  private readonly googleDriveImportOption = 'button:text("Google Drive Import")'
  private readonly sharedFolderUrlInput = 'input[placeholder*="folder URL"]'
  private readonly connectGoogleAccountButton = 'button:text("Connect Your Google Account")'

  async goto() {
    await super.goto('/portal')
    await expect(this.page.locator('h1:text("Supplier Portal")')).toBeVisible()
  }

  async validateEmail(email: string) {
    await this.page.fill(this.emailValidationInput, email)
    await this.page.click(this.validateButton)
  }

  async navigateToUpload() {
    await this.page.click(this.uploadTab)
  }

  async clickGoogleDriveImport() {
    await this.page.click(this.googleDriveImportOption)
  }

  async enterSharedFolderUrl(url: string) {
    await this.page.fill(this.sharedFolderUrlInput, url)
  }

  async clickConnectGoogleAccount() {
    await this.page.click(this.connectGoogleAccountButton)
  }
}

// Page Object Factory
export class PageObjectManager {
  private pages = new Map<string, BasePage>()

  constructor(private page: Page) {}

  getLoginPage(): LoginPage {
    if (!this.pages.has('login')) {
      this.pages.set('login', new LoginPage(this.page))
    }
    return this.pages.get('login') as LoginPage
  }

  getDashboardPage(): DashboardPage {
    if (!this.pages.has('dashboard')) {
      this.pages.set('dashboard', new DashboardPage(this.page))
    }
    return this.pages.get('dashboard') as DashboardPage
  }

  getProjectsPage(): ProjectsPage {
    if (!this.pages.has('projects')) {
      this.pages.set('projects', new ProjectsPage(this.page))
    }
    return this.pages.get('projects') as ProjectsPage
  }

  getNewProjectModal(): NewProjectModal {
    if (!this.pages.has('newProjectModal')) {
      this.pages.set('newProjectModal', new NewProjectModal(this.page))
    }
    return this.pages.get('newProjectModal') as NewProjectModal
  }

  getProjectDetailPage(): ProjectDetailPage {
    if (!this.pages.has('projectDetail')) {
      this.pages.set('projectDetail', new ProjectDetailPage(this.page))
    }
    return this.pages.get('projectDetail') as ProjectDetailPage
  }

  getSettingsPage(): SettingsPage {
    if (!this.pages.has('settings')) {
      this.pages.set('settings', new SettingsPage(this.page))
    }
    return this.pages.get('settings') as SettingsPage
  }

  getSupplierPortalPage(): SupplierPortalPage {
    if (!this.pages.has('supplierPortal')) {
      this.pages.set('supplierPortal', new SupplierPortalPage(this.page))
    }
    return this.pages.get('supplierPortal') as SupplierPortalPage
  }
}
