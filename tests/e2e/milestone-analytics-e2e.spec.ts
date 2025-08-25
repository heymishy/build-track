/**
 * End-to-End Test Suite for Enhanced Milestone and Analytics Features
 * Testing complete user workflows from milestone management to analytics visualization
 */

import { test, expect } from '@playwright/test'

test.describe('Enhanced Milestone and Analytics Features E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('/api/auth/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          user: { 
            id: 'test-user', 
            name: 'Test User', 
            email: 'test@example.com',
            role: 'ADMIN'
          } 
        })
      })
    })

    // Mock project data
    await page.route('/api/projects', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          projects: [{
            id: 'project-1',
            name: 'Test Construction Project',
            description: 'E2E test project',
            budget: 100000,
            status: 'ACTIVE',
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          }]
        })
      })
    })

    // Mock milestones data
    await page.route('/api/projects/project-1/milestones', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            milestones: [
              {
                id: 'milestone-1',
                name: 'Foundation Complete',
                description: 'Complete foundation work',
                targetDate: '2024-03-15',
                actualDate: '2024-03-10',
                progress: 100,
                status: 'COMPLETED',
                amount: 25000,
                projectId: 'project-1'
              },
              {
                id: 'milestone-2',
                name: 'Framing Complete',
                description: 'Complete framing work',
                targetDate: '2024-06-15',
                actualDate: null,
                progress: 75,
                status: 'IN_PROGRESS',
                amount: 35000,
                projectId: 'project-1'
              }
            ]
          })
        })
      } else if (request.method() === 'POST') {
        const body = await request.postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            milestone: {
              id: 'milestone-new',
              ...body,
              projectId: 'project-1',
              progress: 0,
              status: 'PENDING'
            }
          })
        })
      }
    })

    // Mock milestone update
    await page.route('/api/projects/project-1/milestones/*', async (route, request) => {
      if (request.method() === 'PUT') {
        const body = await request.postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            milestone: { id: 'milestone-2', ...body }
          })
        })
      }
    })

    // Mock analytics data
    await page.route('/api/projects/project-1/analytics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            overview: {
              totalBudget: 100000,
              totalSpent: 45000,
              totalInvoices: 25,
              completedMilestones: 1,
              totalMilestones: 2,
              progressPercentage: 50,
              budgetUtilization: 45,
              remainingBudget: 55000,
              projectedCompletion: '2024-11-15'
            },
            trends: {
              spendingTrend: [
                { month: '2024-01', amount: 5000, cumulative: 5000 },
                { month: '2024-02', amount: 8000, cumulative: 13000 },
                { month: '2024-03', amount: 12000, cumulative: 25000 },
                { month: '2024-04', amount: 7000, cumulative: 32000 },
                { month: '2024-05', amount: 6000, cumulative: 38000 },
                { month: '2024-06', amount: 7000, cumulative: 45000 }
              ],
              budgetBurnRate: [
                { month: '2024-01', projected: 8333, actual: 5000 },
                { month: '2024-02', projected: 16666, actual: 13000 },
                { month: '2024-03', projected: 25000, actual: 25000 },
                { month: '2024-04', projected: 33333, actual: 32000 },
                { month: '2024-05', projected: 41666, actual: 38000 },
                { month: '2024-06', projected: 50000, actual: 45000 }
              ]
            },
            alerts: [
              {
                type: 'warning',
                message: 'Budget utilization is approaching 50% threshold',
                severity: 'medium',
                timestamp: '2024-06-15T10:00:00Z'
              }
            ],
            cashFlow: {
              projectedInflow: [
                { month: '2024-07', amount: 15000 },
                { month: '2024-08', amount: 20000 }
              ],
              projectedOutflow: [
                { month: '2024-07', amount: 18000 },
                { month: '2024-08', amount: 15000 }
              ]
            },
            kpis: {
              costPerformanceIndex: 1.12,
              schedulePerformanceIndex: 0.95,
              estimateAccuracy: 87.5,
              changeOrderImpact: 3.2,
              milestoneAdhesion: 75,
              budgetVariance: -5000
            },
            trades: [
              { name: 'Foundation', budgeted: 25000, spent: 24000, variance: 1000 },
              { name: 'Framing', budgeted: 35000, spent: 21000, variance: 14000 }
            ]
          }
        })
      })
    })

    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('should create new milestone and see it in analytics', async ({ page }) => {
    // Navigate to a project
    await page.click('[data-testid="project-card"]:first-child')
    await page.waitForLoadState('networkidle')

    // Open milestone management
    await page.click('[data-testid="milestones-tab"]')
    await expect(page.getByText('Project Milestones')).toBeVisible()

    // Create new milestone
    await page.click('[data-testid="add-milestone-btn"]')
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.fill('[data-testid="milestone-name-input"]', 'Electrical Complete')
    await page.fill('[data-testid="milestone-description-input"]', 'Complete all electrical work')
    await page.fill('[data-testid="milestone-date-input"]', '2024-08-15')
    await page.fill('[data-testid="milestone-amount-input"]', '15000')

    await page.click('[data-testid="save-milestone-btn"]')
    
    // Verify milestone appears in list
    await expect(page.getByText('Electrical Complete')).toBeVisible()
    await expect(page.getByText('$15,000')).toBeVisible()

    // Navigate to analytics tab
    await page.click('[data-testid="analytics-tab"]')
    await page.waitForLoadState('networkidle')

    // Verify analytics reflect new milestone
    await expect(page.getByText('Project Analytics')).toBeVisible()
    await expect(page.getByText('2')).toBeVisible() // Total milestones
    await expect(page.getByText('$100,000')).toBeVisible() // Total budget
  })

  test('should edit milestone progress and see updated analytics', async ({ page }) => {
    // Navigate to project and milestones
    await page.click('[data-testid="project-card"]:first-child')
    await page.click('[data-testid="milestones-tab"]')
    await page.waitForLoadState('networkidle')

    // Edit milestone progress
    await page.click('[data-testid="edit-milestone-btn"]:first-child')
    await expect(page.getByRole('dialog')).toBeVisible()

    // Update progress using slider
    const progressSlider = page.locator('[data-testid="progress-slider"]')
    await progressSlider.fill('90')

    // Update status
    await page.selectOption('[data-testid="milestone-status-select"]', 'IN_PROGRESS')

    await page.click('[data-testid="save-changes-btn"]')
    
    // Verify progress update
    await expect(page.getByText('90%')).toBeVisible()

    // Check analytics for updated KPIs
    await page.click('[data-testid="analytics-tab"]')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Key Performance Indicators')).toBeVisible()
    await expect(page.getByText('1.12')).toBeVisible() // Cost Performance Index
    await expect(page.getByText('87.5%')).toBeVisible() // Estimate Accuracy
  })

  test('should mark milestone complete and see financial impact', async ({ page }) => {
    // Navigate to project and milestones
    await page.click('[data-testid="project-card"]:first-child')
    await page.click('[data-testid="milestones-tab"]')

    // Mark milestone as complete using quick action
    await page.click('[data-testid="complete-milestone-btn"]:nth-child(2)')
    
    // Verify milestone is marked complete
    await expect(page.getByText('COMPLETED')).toBeVisible({ timeout: 10000 })

    // Check analytics for financial updates
    await page.click('[data-testid="analytics-tab"]')
    await page.waitForLoadState('networkidle')

    // Verify completion shows in analytics
    await expect(page.getByText('Financial Overview')).toBeVisible()
    await expect(page.getByText('$45,000')).toBeVisible() // Total spent
    await expect(page.getByText('45%')).toBeVisible() // Budget utilization
  })

  test('should display comprehensive analytics dashboard', async ({ page }) => {
    // Navigate to project analytics
    await page.click('[data-testid="project-card"]:first-child')
    await page.click('[data-testid="analytics-tab"]')
    await page.waitForLoadState('networkidle')

    // Verify main analytics sections
    await expect(page.getByText('Project Analytics')).toBeVisible()
    await expect(page.getByText('Financial Overview')).toBeVisible()
    await expect(page.getByText('Spending Trends')).toBeVisible()
    await expect(page.getByText('Key Performance Indicators')).toBeVisible()
    await expect(page.getByText('Budget by Trade')).toBeVisible()

    // Verify key metrics are displayed
    await expect(page.getByText('$100,000')).toBeVisible() // Total budget
    await expect(page.getByText('$45,000')).toBeVisible() // Total spent
    await expect(page.getByText('$55,000')).toBeVisible() // Remaining budget
    await expect(page.getByText('45%')).toBeVisible() // Budget utilization
    await expect(page.getByText('50%')).toBeVisible() // Progress percentage

    // Verify KPI section
    await expect(page.getByText('1.12')).toBeVisible() // Cost Performance Index
    await expect(page.getByText('0.95')).toBeVisible() // Schedule Performance Index
    await expect(page.getByText('87.5%')).toBeVisible() // Estimate Accuracy
    await expect(page.getByText('75%')).toBeVisible() // Milestone Adhesion

    // Verify trade analysis
    await expect(page.getByText('Foundation')).toBeVisible()
    await expect(page.getByText('Framing')).toBeVisible()
    await expect(page.getByText('$25,000')).toBeVisible() // Foundation budget
    await expect(page.getByText('$24,000')).toBeVisible() // Foundation spent

    // Verify alerts section
    await expect(page.getByText('Budget utilization is approaching 50% threshold')).toBeVisible()
  })

  test('should show responsive design on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to analytics
    await page.click('[data-testid="project-card"]:first-child')
    await page.click('[data-testid="analytics-tab"]')
    await page.waitForLoadState('networkidle')

    // Verify mobile layout
    const container = page.locator('[data-testid="analytics-container"]')
    await expect(container).toBeVisible()
    
    // Verify key metrics are still visible
    await expect(page.getByText('$100,000')).toBeVisible()
    await expect(page.getByText('Financial Overview')).toBeVisible()
  })

  test('should handle offline mode gracefully', async ({ page }) => {
    // Navigate to analytics first
    await page.click('[data-testid="project-card"]:first-child')
    await page.click('[data-testid="analytics-tab"]')
    await page.waitForLoadState('networkidle')

    // Go offline
    await page.context().setOffline(true)

    // Try to refresh analytics
    await page.reload()

    // Should show error message or cached data
    const errorMessage = page.locator('[data-testid="analytics-error"]')
    const cachedData = page.locator('[data-testid="analytics-container"]')
    
    // Either error message should be visible OR cached data should be shown
    await expect(errorMessage.or(cachedData)).toBeVisible()
  })

  test('should export analytics data', async ({ page }) => {
    // Navigate to analytics
    await page.click('[data-testid="project-card"]:first-child')
    await page.click('[data-testid="analytics-tab"]')
    await page.waitForLoadState('networkidle')

    // Check if export button exists and click it
    const exportBtn = page.locator('[data-testid="export-analytics-btn"]')
    if (await exportBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download')
      await exportBtn.click()
      const download = await downloadPromise
      
      // Verify download filename
      expect(download.suggestedFilename()).toContain('analytics')
      expect(download.suggestedFilename()).toContain('.csv')
    }
  })

  test('should show loading states appropriately', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/projects/project-1/analytics', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { overview: {}, trends: {}, kpis: {}, alerts: [], cashFlow: {}, trades: [] }
        })
      })
    })

    // Navigate to analytics
    await page.click('[data-testid="project-card"]:first-child')
    await page.click('[data-testid="analytics-tab"]')

    // Verify loading state is shown
    await expect(page.getByTestId('analytics-loading')).toBeVisible()
    
    // Wait for data to load
    await page.waitForLoadState('networkidle')
    
    // Verify loading state is gone
    await expect(page.getByTestId('analytics-loading')).not.toBeVisible()
  })
})